from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from ..models import Espace, Liste, Membre, Notification, Tache, Utilisateur, Workspace


MANAGEMENT_ROLES = {"Créateur", "Administrateur"}
logger = logging.getLogger(__name__)


def _display_user(user: Utilisateur | None) -> str:
    if not user:
        return "Un utilisateur"
    return f"{user.nom or ''} {user.prenoms or ''}".strip() or user.username or user.email or "Un utilisateur"


def _create_notification(db: Session, *, user_id: str | None, message: str, type_: str = "info") -> None:
    if not user_id:
        return
    notification = Notification(
        id_utilisateur=user_id,
        type=type_,
        message=message,
        est_lu=False,
        est_globale=False,
    )
    db.add(notification)


def commit_notification_events(db: Session) -> None:
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("Notification non enregistree: %s", exc)


def _liste_workspace_id(db: Session, liste: Liste) -> str | None:
    if liste.id_workspace:
        return liste.id_workspace
    if liste.id_espace:
        espace = db.query(Espace).filter(Espace.id == liste.id_espace).first()
        return espace.id_workspace if espace else None
    return None


def _ancestor_espace_ids(db: Session, espace_id: str | None) -> list[str]:
    ids: list[str] = []
    current_id = espace_id
    visited: set[str] = set()

    while current_id and current_id not in visited:
        visited.add(current_id)
        espace = db.query(Espace).filter(Espace.id == current_id).first()
        if not espace:
            break
        ids.append(espace.id)
        current_id = espace.id_espace_parent

    return ids


def _unique_user_ids(user_ids: list[str | None], *, exclude_user_id: str | None = None) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for user_id in user_ids:
        if not user_id or user_id == exclude_user_id or user_id in seen:
            continue
        seen.add(user_id)
        result.append(user_id)
    return result


def _direct_list_manager_user_ids(db: Session, liste_id: str, *, exclude_user_id: str | None = None) -> list[str]:
    members = (
        db.query(Membre)
        .filter(
            Membre.id_liste == liste_id,
            Membre.statut == "Actif",
            Membre.role.in_(MANAGEMENT_ROLES),
        )
        .all()
    )
    return _unique_user_ids([member.id_utilisateur for member in members], exclude_user_id=exclude_user_id)


def _inherited_list_manager_user_ids(db: Session, liste: Liste, *, exclude_user_id: str | None = None) -> list[str]:
    user_ids: list[str | None] = []

    espace_ids = _ancestor_espace_ids(db, liste.id_espace)
    if espace_ids:
        espace_members = (
            db.query(Membre)
            .filter(
                Membre.id_espace.in_(espace_ids),
                Membre.statut == "Actif",
                Membre.role.in_(MANAGEMENT_ROLES),
            )
            .all()
        )
        user_ids.extend(member.id_utilisateur for member in espace_members)

    workspace_id = _liste_workspace_id(db, liste)
    if workspace_id:
        workspace_members = (
            db.query(Membre)
            .filter(
                Membre.id_workspace == workspace_id,
                Membre.statut == "Actif",
                Membre.role.in_(MANAGEMENT_ROLES),
            )
            .all()
        )
        user_ids.extend(member.id_utilisateur for member in workspace_members)

        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if workspace:
            user_ids.append(workspace.id_utilisateur)

    return _unique_user_ids(user_ids, exclude_user_id=exclude_user_id)


def notify_report_created(db: Session, *, report_member: Membre, report_title: str, actor_user_id: str) -> None:
    liste = db.query(Liste).filter(Liste.id == report_member.id_liste).first()
    if not liste:
        return

    author = db.query(Utilisateur).filter(Utilisateur.id == report_member.id_utilisateur).first()
    author_name = _display_user(author)
    liste_name = liste.nom or "une liste"
    message = f"{author_name} a envoyé un rapport dans la liste « {liste_name} » : {report_title}."

    if report_member.role == "Membre":
        recipients = _direct_list_manager_user_ids(db, liste.id, exclude_user_id=actor_user_id)
    else:
        recipients = _inherited_list_manager_user_ids(db, liste, exclude_user_id=actor_user_id)

    for user_id in recipients:
        _create_notification(db, user_id=user_id, message=message, type_="info")


def notify_absence_created(db: Session, *, absence_member: Membre, actor_user_id: str, is_absence: bool) -> None:
    liste = db.query(Liste).filter(Liste.id == absence_member.id_liste).first()
    if not liste:
        return

    if not is_absence:
        message = f"Un congé a été planifié pour vous dans la liste « {liste.nom or 'une liste'} »."
        _create_notification(db, user_id=absence_member.id_utilisateur, message=message, type_="evenement")
        return

    author = db.query(Utilisateur).filter(Utilisateur.id == absence_member.id_utilisateur).first()
    author_name = _display_user(author)
    message = f"{author_name} a créé une demande d'absence dans la liste « {liste.nom or 'une liste'} »."

    if absence_member.role == "Membre":
        recipients = _direct_list_manager_user_ids(db, liste.id, exclude_user_id=actor_user_id)
    else:
        recipients = _inherited_list_manager_user_ids(db, liste, exclude_user_id=actor_user_id)

    for user_id in recipients:
        _create_notification(db, user_id=user_id, message=message, type_="alerte")


def notify_absence_decision(db: Session, *, absence_member: Membre, accepted: bool) -> None:
    status_label = "acceptée" if accepted else "refusée"
    type_ = "evenement" if accepted else "warning"
    message = f"Votre demande d'absence a été {status_label}."
    _create_notification(db, user_id=absence_member.id_utilisateur, message=message, type_=type_)


def notify_task_assigned(db: Session, *, tache: Tache, assigned_user_id: str) -> None:
    liste_name = ""
    if tache.id_liste:
        liste = db.query(Liste).filter(Liste.id == tache.id_liste).first()
        liste_name = f" dans la liste « {liste.nom} »" if liste else ""
    message = f"La tâche « {tache.titre} » vous a été assignée{liste_name}."
    _create_notification(db, user_id=assigned_user_id, message=message, type_="info")
