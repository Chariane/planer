# backend/api_liste_et_tache/crud/notification_events.py
from __future__ import annotations

import logging
from datetime import datetime, time, timedelta

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from ..core.emails import send_notification_email_background
from ..core.function import commit_or_raise, _has_overlapping_approved_leave
from ..models import AbsenceEtConge, Espace, Liste, Membre, Rapport, Tache, Utilisateur, Workspace


MANAGEMENT_ROLES = {"Créateur", "Administrateur"}
logger = logging.getLogger(__name__)


def _display_user(user: Utilisateur | None) -> str:
    if not user:
        return "Un utilisateur"
    return f"{user.nom or ''} {user.prenoms or ''}".strip() or user.username or user.email or "Un utilisateur"


def _already_notified_today(db: Session, *, user_id: str, message: str, type_: str) -> bool:
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    return db.execute(
        text(
            """
            SELECT 1
            FROM notification
            WHERE id_utilisateur = :user_id
              AND type = :type
              AND message = :message
              AND date_creation >= :today_start
              AND date_creation < :tomorrow_start
            LIMIT 1
            """
        ),
        {
            "user_id": user_id,
            "type": type_,
            "message": message,
            "today_start": today_start,
            "tomorrow_start": tomorrow_start,
        },
    ).first() is not None


def _create_notification(
    db: Session,
    *,
    user_id: str | None,
    message: str,
    type_: str = "info",
    dedupe_today: bool = False,
    target_type: str | None = None,
    target_id: str | None = None,
) -> bool:
    if not user_id:
        return False

    if target_type and target_id:
        message = f"[[{target_type}:{target_id}]] {message}"

    if dedupe_today and _already_notified_today(db, user_id=user_id, message=message, type_=type_):
        return False
    try:
        db.execute(
            text(
                """
                WITH inserted AS (
                    INSERT INTO notification (id_utilisateur, type, message, est_lu, est_globale)
                    VALUES (:user_id, :type, :message, false, false)
                    RETURNING
                        id,
                        type,
                        COALESCE(message, 'Notification indisponible') AS message,
                        COALESCE(est_lu, false) AS est_lu,
                        COALESCE(est_globale, false) AS est_globale,
                        date_creation,
                        date_modif,
                        date_lecture,
                        id_utilisateur
                )
                SELECT pg_notify(
                    'kplanner_notifications',
                    json_build_object(
                        'event', 'notification.created',
                        'notification', json_build_object(
                            'id', id,
                            'type', type,
                            'message', message,
                            'est_lu', est_lu,
                            'est_globale', est_globale,
                            'date_creation', date_creation,
                            'date_modif', date_modif,
                            'date_lecture', date_lecture,
                            'id_utilisateur', id_utilisateur
                        )
                    )::text
                )
                FROM inserted
                """
            ),
            {
                "user_id": str(user_id) if user_id else None,
                "type": type_,
                "message": message,
            },
        )
        user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
        if user and user.email:
            try:
                send_notification_email_background(
                    email=user.email,
                    message_text=message,
                    type_=type_,
                    target_type=target_type,
                    target_id=target_id,
                )
            except Exception as mail_exc:
                logger.warning("Erreur déclenchement email notification: %s", mail_exc)

        return True
    except Exception as exc:
        logger.error("Erreur lors de la création de la notification locale : %s", exc)
        return False


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


def _direct_list_admin_user_ids(db: Session, liste_id: str, *, exclude_user_id: str | None = None) -> list[str]:
    members = (
        db.query(Membre)
        .filter(
            Membre.id_liste == liste_id,
            Membre.statut == "Actif",
            Membre.role == "Administrateur",
        )
        .all()
    )
    return _unique_user_ids([member.id_utilisateur for member in members], exclude_user_id=exclude_user_id)


def _direct_espace_admin_user_ids(db: Session, espace_id: str, *, exclude_user_id: str | None = None) -> list[str]:
    members = (
        db.query(Membre)
        .filter(
            Membre.id_espace == espace_id,
            Membre.id_liste.is_(None),
            Membre.statut == "Actif",
            Membre.role == "Administrateur",
        )
        .all()
    )
    return _unique_user_ids([member.id_utilisateur for member in members], exclude_user_id=exclude_user_id)


def _direct_list_creator_user_ids(db: Session, liste_id: str, *, exclude_user_id: str | None = None) -> list[str]:
    members = (
        db.query(Membre)
        .filter(
            Membre.id_liste == liste_id,
            Membre.statut == "Actif",
            Membre.role == "Créateur",
        )
        .all()
    )
    return _unique_user_ids([member.id_utilisateur for member in members], exclude_user_id=exclude_user_id)


def _direct_espace_creator_user_ids(db: Session, espace_id: str, *, exclude_user_id: str | None = None) -> list[str]:
    members = (
        db.query(Membre)
        .filter(
            Membre.id_espace == espace_id,
            Membre.statut == "Actif",
            Membre.role == "Créateur",
        )
        .all()
    )
    return _unique_user_ids([member.id_utilisateur for member in members], exclude_user_id=exclude_user_id)


def _workspace_admin_user_ids(db: Session, workspace_id: str, *, exclude_user_id: str | None = None) -> list[str]:
    members = (
        db.query(Membre)
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.id_liste.is_(None),
            Membre.id_espace.is_(None),
            Membre.statut == "Actif",
            Membre.role == "Administrateur",
        )
        .all()
    )
    return _unique_user_ids([member.id_utilisateur for member in members], exclude_user_id=exclude_user_id)


def _workspace_creator_user_ids(db: Session, workspace_id: str, *, exclude_user_id: str | None = None) -> list[str]:
    user_ids: list[str | None] = []
    members = (
        db.query(Membre)
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.statut == "Actif",
            Membre.role == "Créateur",
        )
        .all()
    )
    user_ids.extend(member.id_utilisateur for member in members)

    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace:
        user_ids.append(workspace.id_utilisateur)

    return _unique_user_ids(user_ids, exclude_user_id=exclude_user_id)


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


def _inherited_espace_manager_user_ids(db: Session, espace: Espace, *, exclude_user_id: str | None = None) -> list[str]:
    user_ids: list[str | None] = []

    ancestor_ids = _ancestor_espace_ids(db, espace.id_espace_parent)
    if ancestor_ids:
        espace_members = (
            db.query(Membre)
            .filter(
                Membre.id_espace.in_(ancestor_ids),
                Membre.statut == "Actif",
                Membre.role.in_(MANAGEMENT_ROLES),
            )
            .all()
        )
        user_ids.extend(member.id_utilisateur for member in espace_members)

    if espace.id_workspace:
        workspace_members = (
            db.query(Membre)
            .filter(
                Membre.id_workspace == espace.id_workspace,
                Membre.statut == "Actif",
                Membre.role.in_(MANAGEMENT_ROLES),
            )
            .all()
        )
        user_ids.extend(member.id_utilisateur for member in workspace_members)

        workspace = db.query(Workspace).filter(Workspace.id == espace.id_workspace).first()
        if workspace:
            user_ids.append(workspace.id_utilisateur)

    return _unique_user_ids(user_ids, exclude_user_id=exclude_user_id)


# ========== NOTIFICATION RAPPORT (AVEC PÉRIODE DU RAPPORT) ==========

def notify_report_created(db: Session, *, report_member: Membre, report_title: str, actor_user_id: str, rapport: Rapport) -> None:
    """
    Envoie une notification aux administrateurs disponibles sur la période du rapport,
    ou au créateur de la liste si aucun admin n'est disponible.
    """
    author = db.query(Utilisateur).filter(Utilisateur.id == report_member.id_utilisateur).first()
    author_name = _display_user(author)

    recipients: list[str] = []
    target_type: str | None = None
    target_id: str | None = None

    if report_member.id_liste:
        liste = db.query(Liste).filter(Liste.id == report_member.id_liste).first()
        if not liste:
            return

        resource_name = liste.nom or "une liste"
        message = f"{author_name} a envoyé un rapport dans la liste « {resource_name} » : {report_title}."
        target_type = "liste"
        target_id = liste.id

        if report_member.role == "Membre":
            # Récupérer les administrateurs directs
            admins = db.query(Membre).filter(
                Membre.id_liste == liste.id,
                Membre.statut == "Actif",
                Membre.role == "Administrateur"
            ).all()

            # Période du rapport
            date_debut = rapport.periode_debut or rapport.created_at
            date_fin = rapport.periode_fin or rapport.created_at

            # Filtrer les administrateurs disponibles sur la période
            disponibles = [
                admin for admin in admins
                if admin.id_utilisateur and not _has_overlapping_approved_leave(
                    db,
                    user_id=admin.id_utilisateur,
                    date_debut=date_debut,
                    date_fin=date_fin,
                )
            ]

            if disponibles:
                recipients = [admin.id_utilisateur for admin in disponibles if admin.id_utilisateur != actor_user_id]
            else:
                # Si aucun admin disponible, notifier le créateur de la liste
                createurs = db.query(Membre).filter(
                    Membre.id_liste == liste.id,
                    Membre.statut == "Actif",
                    Membre.role == "Créateur"
                ).all()
                recipients = [c.id_utilisateur for c in createurs if c.id_utilisateur and c.id_utilisateur != actor_user_id]

        elif report_member.role == "Administrateur":
            # Rapport d'un admin → notifier le créateur
            createurs = db.query(Membre).filter(
                Membre.id_liste == liste.id,
                Membre.statut == "Actif",
                Membre.role == "Créateur"
            ).all()
            recipients = [c.id_utilisateur for c in createurs if c.id_utilisateur and c.id_utilisateur != actor_user_id]
        else:
            return

    elif report_member.id_espace:
        espace = db.query(Espace).filter(Espace.id == report_member.id_espace).first()
        if not espace:
            return
        resource_name = espace.nom or "un espace"
        message = f"{author_name} a envoyé un rapport dans l'espace « {resource_name} » : {report_title}."
        target_type = "espace"
        target_id = espace.id

        # Pour les espaces, on applique une règle similaire : si membre → admins disponibles ou créateur
        if report_member.role == "Membre":
            admins = db.query(Membre).filter(
                Membre.id_espace == espace.id,
                Membre.statut == "Actif",
                Membre.role == "Administrateur"
            ).all()
            date_debut = rapport.periode_debut or rapport.created_at
            date_fin = rapport.periode_fin or rapport.created_at
            disponibles = [
                admin for admin in admins
                if admin.id_utilisateur and not _has_overlapping_approved_leave(
                    db,
                    user_id=admin.id_utilisateur,
                    date_debut=date_debut,
                    date_fin=date_fin,
                )
            ]
            if disponibles:
                recipients = [admin.id_utilisateur for admin in disponibles if admin.id_utilisateur != actor_user_id]
            else:
                createurs = db.query(Membre).filter(
                    Membre.id_espace == espace.id,
                    Membre.statut == "Actif",
                    Membre.role == "Créateur"
                ).all()
                recipients = [c.id_utilisateur for c in createurs if c.id_utilisateur != actor_user_id]
        elif report_member.role == "Administrateur":
            createurs = db.query(Membre).filter(
                Membre.id_espace == espace.id,
                Membre.statut == "Actif",
                Membre.role == "Créateur"
            ).all()
            recipients = [c.id_utilisateur for c in createurs if c.id_utilisateur != actor_user_id]
        else:
            return

    elif report_member.id_workspace:
        workspace = db.query(Workspace).filter(Workspace.id == report_member.id_workspace).first()
        if not workspace:
            return
        resource_name = workspace.nom or "un workspace"
        message = f"{author_name} a envoyé un rapport dans le workspace « {resource_name} » : {report_title}."
        target_type = "workspace"
        target_id = workspace.id

        if report_member.role == "Membre":
            admins = db.query(Membre).filter(
                Membre.id_workspace == workspace.id,
                Membre.statut == "Actif",
                Membre.role == "Administrateur"
            ).all()
            date_debut = rapport.periode_debut or rapport.created_at
            date_fin = rapport.periode_fin or rapport.created_at
            disponibles = [
                admin for admin in admins
                if admin.id_utilisateur and not _has_overlapping_approved_leave(
                    db,
                    user_id=admin.id_utilisateur,
                    date_debut=date_debut,
                    date_fin=date_fin,
                )
            ]
            if disponibles:
                recipients = [admin.id_utilisateur for admin in disponibles if admin.id_utilisateur != actor_user_id]
            else:
                createurs = db.query(Membre).filter(
                    Membre.id_workspace == workspace.id,
                    Membre.statut == "Actif",
                    Membre.role == "Créateur"
                ).all()
                recipients = [c.id_utilisateur for c in createurs if c.id_utilisateur != actor_user_id]
        elif report_member.role == "Administrateur":
            createurs = db.query(Membre).filter(
                Membre.id_workspace == workspace.id,
                Membre.statut == "Actif",
                Membre.role == "Créateur"
            ).all()
            recipients = [c.id_utilisateur for c in createurs if c.id_utilisateur != actor_user_id]
        else:
            return
    else:
        return

    for user_id in recipients:
        _create_notification(
            db,
            user_id=user_id,
            message=message,
            type_="info",
            dedupe_today=True,
            target_type=target_type,
            target_id=target_id,
        )


def notify_absence_created(db: Session, *, absence_member: Membre, actor_user_id: str, is_absence: bool) -> None:
    # Import local pour éviter les problèmes de circularité
    from ..core.function import _is_user_available_now

    resource_name = "une ressource"
    resource_type_label = "la ressource"
    target_type: str | None = None
    target_id: str | None = None
    
    liste = None
    espace = None
    
    if absence_member.id_liste:
        liste = db.query(Liste).filter(Liste.id == absence_member.id_liste).first()
        if liste:
            resource_name = liste.nom or "une liste"
            resource_type_label = "la liste"
            target_type = "liste"
            target_id = liste.id
    elif absence_member.id_espace:
        espace = db.query(Espace).filter(Espace.id == absence_member.id_espace).first()
        if espace:
            resource_name = espace.nom or "un espace"
            resource_type_label = "l'espace"
            target_type = "espace"
            target_id = espace.id

    author = db.query(Utilisateur).filter(Utilisateur.id == absence_member.id_utilisateur).first()
    author_name = _display_user(author)
    request_type = "d'absence" if is_absence else "de congé"
    message = f"{author_name} a créé une demande {request_type} dans {resource_type_label} « {resource_name} »."

    recipients = []
    if absence_member.role == "Membre":
        if absence_member.id_liste:
            admins = _direct_list_admin_user_ids(db, absence_member.id_liste, exclude_user_id=actor_user_id)
            creator_ids = _direct_list_creator_user_ids(db, absence_member.id_liste, exclude_user_id=actor_user_id)
        else:
            admins = _direct_espace_admin_user_ids(db, absence_member.id_espace, exclude_user_id=actor_user_id)
            creator_ids = _direct_espace_creator_user_ids(db, absence_member.id_espace, exclude_user_id=actor_user_id)
            
        available_admins = [uid for uid in admins if _is_user_available_now(db, uid)]
        if available_admins:
            recipients = available_admins
        else:
            recipients = creator_ids
    else:
        if absence_member.id_liste and liste:
            recipients = _inherited_list_manager_user_ids(db, liste, exclude_user_id=actor_user_id)
        elif absence_member.id_espace and espace:
            recipients = _inherited_espace_manager_user_ids(db, espace, exclude_user_id=actor_user_id)

    for user_id in recipients:
        _create_notification(
            db,
            user_id=user_id,
            message=message,
            type_="alerte",
            dedupe_today=True,
            target_type=target_type,
            target_id=target_id,
        )


def notify_absence_decision(db: Session, *, absence_member: Membre, accepted: bool) -> None:
    status_label = "acceptée" if accepted else "refusée"
    type_ = "evenement" if accepted else "warning"
    message = f"Votre demande d'absence/congé a été {status_label}."
    _create_notification(
        db,
        user_id=absence_member.id_utilisateur,
        message=message,
        type_=type_,
        dedupe_today=True,
        target_type=None,  # pas de cible spécifique pour la décision
        target_id=None,
    )


def notify_task_assigned(db: Session, *, tache: Tache, assigned_user_id: str) -> None:
    liste_name = ""
    if tache.id_liste:
        liste = db.query(Liste).filter(Liste.id == tache.id_liste).first()
        liste_name = f" dans la liste « {liste.nom} »" if liste else ""
    message = f"La tâche « {tache.titre} » vous a été assignée{liste_name}."
    _create_notification(
        db,
        user_id=assigned_user_id,
        message=message,
        type_="info",
        dedupe_today=True,
        target_type="tache",
        target_id=tache.id,
    )


def notify_overdue_tasks_for_liste(db: Session, *, liste_id: str) -> None:
    now = datetime.now()
    today = now.date()
    overdue_tasks = (
        db.query(Tache)
        .filter(
            Tache.id_liste == liste_id,
            Tache.date_fin_prevue.isnot(None),
            func.date(Tache.date_fin_prevue) < today,
            func.lower(Tache.statut) != "terminé",
        )
        .all()
    )
    if not overdue_tasks:
        return

    liste = db.query(Liste).filter(Liste.id == liste_id).first()
    if not liste:
        return

    manager_ids = _unique_user_ids(
        _direct_list_manager_user_ids(db, liste_id)
        + _inherited_list_manager_user_ids(db, liste)
    )

    for tache in overdue_tasks:
        assigned_members = (
            db.query(Membre)
            .filter(
                Membre.id_tache == tache.id,
                Membre.statut == "Actif",
            )
            .all()
        )
        assigned_user_ids = [member.id_utilisateur for member in assigned_members]
        recipients = _unique_user_ids(manager_ids + assigned_user_ids)
        if not recipients:
            continue

        due_date = tache.date_fin_prevue.strftime("%d/%m/%Y") if tache.date_fin_prevue else "date prévue dépassée"
        message = f"La tâche « {tache.titre} » est en retard depuis le {due_date} dans la liste « {liste.nom or 'une liste'} »."
        for user_id in recipients:
            _create_notification(
                db,
                user_id=user_id,
                message=message,
                type_="warning",
                dedupe_today=True,
                target_type="tache",
                target_id=tache.id,
            )


def _task_notification_recipients(db: Session, *, tache: Tache, liste: Liste) -> list[str]:
    manager_ids = _unique_user_ids(
        _direct_list_manager_user_ids(db, liste.id)
        + _inherited_list_manager_user_ids(db, liste)
    )
    assigned_members = (
        db.query(Membre)
        .filter(
            Membre.id_tache == tache.id,
            Membre.statut == "Actif",
        )
        .all()
    )
    assigned_user_ids = [member.id_utilisateur for member in assigned_members]
    return _unique_user_ids(manager_ids + assigned_user_ids)


def _notify_task_deadline(
    db: Session,
    *,
    tache: Tache,
    liste: Liste,
    message: str,
    type_: str,
) -> tuple[int, int]:
    recipients = _task_notification_recipients(db, tache=tache, liste=liste)
    created_count = 0
    for user_id in recipients:
        created = _create_notification(
            db,
            user_id=user_id,
            message=message,
            type_=type_,
            dedupe_today=True,
            target_type="tache",
            target_id=tache.id,
        )
        if created:
            created_count += 1
    return len(recipients), created_count


def notify_deadline_reminders(db: Session, *, now: datetime | None = None) -> dict[str, int]:
    """Scan all open tasks and emit deadline reminders.

    Notifications are deduplicated per recipient/message/day by _create_notification,
    so this function is safe to run periodically.
    """
    now = now or datetime.now()
    today_start = datetime.combine(now.date(), time.min)
    tomorrow_start = today_start + timedelta(days=1)

    open_statuses = ["en attente", "en cours", "bloqué"]
    tasks = (
        db.query(Tache)
        .filter(
            Tache.date_fin_prevue.isnot(None),
            func.date(Tache.date_fin_prevue) <= tomorrow_start.date(),
            func.lower(Tache.statut).in_(open_statuses),
        )
        .all()
    )

    stats = {
        "tasks_scanned": len(tasks),
        "overdue_tasks": 0,
        "due_today_tasks": 0,
        "due_tomorrow_tasks": 0,
        "notifications_targets": 0,
        "notifications_created": 0,
        "skipped_lock": 0,
    }

    for tache in tasks:
        if not tache.id_liste:
            continue

        liste = db.query(Liste).filter(Liste.id == tache.id_liste).first()
        if not liste or not tache.date_fin_prevue:
            continue

        due_date = tache.date_fin_prevue.strftime("%d/%m/%Y")

        task_due_day = tache.date_fin_prevue.date()

        if task_due_day < now.date():
            stats["overdue_tasks"] += 1
            message = (
                f"La tâche « {tache.titre} » est en retard depuis le {due_date} "
                f"dans la liste « {liste.nom or 'une liste'} »."
            )
            targets, created = _notify_task_deadline(
                db,
                tache=tache,
                liste=liste,
                message=message,
                type_="warning",
            )
            stats["notifications_targets"] += targets
            stats["notifications_created"] += created
            continue

        if task_due_day == today_start.date():
            stats["due_today_tasks"] += 1
            message = (
                f"Rappel deadline : la tâche « {tache.titre} » arrive à échéance aujourd'hui "
                f"dans la liste « {liste.nom or 'une liste'} »."
            )
            targets, created = _notify_task_deadline(
                db,
                tache=tache,
                liste=liste,
                message=message,
                type_="alerte",
            )
            stats["notifications_targets"] += targets
            stats["notifications_created"] += created
            continue

        if task_due_day == tomorrow_start.date():
            stats["due_tomorrow_tasks"] += 1
            message = (
                f"Rappel deadline : la tâche « {tache.titre} » arrive à échéance demain "
                f"dans la liste « {liste.nom or 'une liste'} »."
            )
            targets, created = _notify_task_deadline(
                db,
                tache=tache,
                liste=liste,
                message=message,
                type_="info",
            )
            stats["notifications_targets"] += targets
            stats["notifications_created"] += created

    return stats