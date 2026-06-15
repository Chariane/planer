from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ..core.function import (
    ESPACE_ADMIN_ROLE,
    ESPACE_OWNER_ROLE,
    LISTE_ADMIN_ROLE,
    LISTE_GUEST_ROLE,
    LISTE_MEMBER_ROLE,
    LISTE_OWNER_ROLE,
    ResourceType,
    WORKSPACE_ADMIN_ROLE,
    _get_member_or_404,
    _require_espace_read_access,
    _member_has_assigned_task_in_list,
    _require_member_management_access,
    _require_member_read_access,
    _require_report_owner_or_management_access,
    _require_report_read_access,
    _require_report_workflow_read_access,
    _require_workspace_read_access,
    commit_or_raise,
)
from ..models import Rapport, Membre, Liste, Espace
from .notification_events import commit_notification_events, notify_report_created


def _member_owner_name(membre: Membre) -> str:
    if membre.utilisateur:
        user = membre.utilisateur
        return f"{user.nom or ''} {user.prenoms or ''}".strip() or user.username or user.email or "Utilisateur"
    return "Utilisateur supprimé"


def _serialize_report(rapport: Rapport) -> dict:
    owner_name = rapport.owner_name_snapshot or "inconnu"
    if rapport.membres and rapport.membres.utilisateur:
        owner_name = _member_owner_name(rapport.membres)
    elif rapport.membres and not rapport.membres.utilisateur:
        owner_name = "Utilisateur supprimé"

    owner_user_id = rapport.owner_user_id or (rapport.membres.id_utilisateur if rapport.membres else None)
    author_role = rapport.author_role or (rapport.membres.role if rapport.membres else None)
    liste_id = rapport.id_liste or (rapport.membres.id_liste if rapport.membres else None)
    espace_id = rapport.id_espace or (rapport.membres.id_espace if rapport.membres else None)
    workspace_id = rapport.id_workspace or (rapport.membres.id_workspace if rapport.membres else None)
    scope_type = ResourceType.LISTE if liste_id else ResourceType.ESPACE if espace_id else ResourceType.WORKSPACE if workspace_id else None
    scope_id = liste_id or espace_id or workspace_id

    return {
        "id": rapport.id,
        "titre": rapport.titre,
        "realisations": rapport.realisations,
        "difficultes_et_solutions": rapport.difficultes_et_solutions,
        "commentaire": rapport.commentaire,
        "fichier_joint": rapport.fichier_joint,
        "periode_debut": rapport.periode_debut,
        "periode_fin": rapport.periode_fin,
        "created_at": rapport.created_at,
        "id_membre": rapport.id_membre,
        "owner_name": owner_name,
        "owner_user_id": owner_user_id,
        "author_role": author_role,
        "id_liste": liste_id,
        "liste_id": liste_id,
        "id_espace": espace_id,
        "id_workspace": workspace_id,
        "scope_type": scope_type,
        "scope_id": scope_id,
    }


def _is_creator_of_any_direct_child_in_space(db: Session, *, espace_id: str, user_id: str) -> bool:
    """Vérifie si l'utilisateur est Créateur d'au moins un sous-espace ou d'une liste directement rattaché à cet espace."""
    has_subspace_creator = (
        db.query(Membre.id)
        .join(Espace, Membre.id_espace == Espace.id)
        .filter(
            Espace.id_espace_parent == espace_id,
            Membre.id_utilisateur == user_id,
            Membre.role == ESPACE_OWNER_ROLE,
            Membre.statut == "Actif",
        )
        .first()
    )
    if has_subspace_creator:
        return True

    has_list_creator = (
        db.query(Membre.id)
        .join(Liste, Membre.id_liste == Liste.id)
        .filter(
            Liste.id_espace == espace_id,
            Membre.id_utilisateur == user_id,
            Membre.role == LISTE_OWNER_ROLE,
            Membre.statut == "Actif",
        )
        .first()
    )
    return bool(has_list_creator)


def _is_creator_of_any_direct_child_in_workspace(db: Session, *, workspace_id: str, user_id: str) -> bool:
    """Vérifie si l'utilisateur est Créateur d'au moins un espace ou d'une liste directement rattaché à ce workspace."""
    has_space_creator = (
        db.query(Membre.id)
        .join(Espace, Membre.id_espace == Espace.id)
        .filter(
            Espace.id_workspace == workspace_id,
            Espace.id_espace_parent.is_(None),
            Membre.id_utilisateur == user_id,
            Membre.role == ESPACE_OWNER_ROLE,
            Membre.statut == "Actif",
        )
        .first()
    )
    if has_space_creator:
        return True

    has_list_creator = (
        db.query(Membre.id)
        .join(Liste, Membre.id_liste == Liste.id)
        .filter(
            Liste.id_workspace == workspace_id,
            Membre.id_utilisateur == user_id,
            Membre.role == LISTE_OWNER_ROLE,
            Membre.statut == "Actif",
        )
        .first()
    )
    return bool(has_list_creator)


def create_report(
    db: Session,
    *,
    current_user_id: str,
    titre: str,
    realisations: Optional[str] = None,
    difficultes_et_solutions: Optional[str] = None,
    commentaire: Optional[str] = None,
    fichier_joint: Optional[str] = None,
    periode_debut=None,
    periode_fin=None,
    id_membre: str,
) -> dict:
    if not id_membre:
        raise HTTPException(status_code=400, detail="Vous devez etre membre direct de la ressource pour creer un rapport.")

    membre = _get_member_or_404(db, id_membre)

    if membre.id_utilisateur != current_user_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez creer un rapport que pour vous-meme.")

    liste_id = membre.id_liste
    espace_id = membre.id_espace
    workspace_id = membre.id_workspace

    if liste_id:
        _require_member_read_access(db, id_membre, current_user_id)

        if membre.role == LISTE_GUEST_ROLE:
            raise HTTPException(status_code=403, detail="Un invite de liste ne peut pas creer de rapport.")

        if membre.role not in {LISTE_MEMBER_ROLE, LISTE_ADMIN_ROLE}:
            raise HTTPException(
                status_code=403,
                detail="Seuls les membres assignes et les administrateurs directs de la liste peuvent produire un rapport.",
            )

        if membre.role == LISTE_MEMBER_ROLE and not _member_has_assigned_task_in_list(
            db,
            liste_id=liste_id,
            user_id=current_user_id,
        ):
            raise HTTPException(
                status_code=403,
                detail="Un membre de liste doit avoir au moins une tache assignee pour creer un rapport.",
            )
    elif espace_id:
        _require_espace_read_access(db, espace_id, current_user_id)
        # Seuls les Admins qui sont Créateurs d'au moins un fils direct peuvent produire
        if membre.role == ESPACE_ADMIN_ROLE and _is_creator_of_any_direct_child_in_space(db, espace_id=espace_id, user_id=current_user_id):
            pass
        else:
            raise HTTPException(
                status_code=403,
                detail="Seuls les administrateurs qui sont créateurs directs d'au moins une liste ou un sous-espace peuvent produire un rapport dans cet espace.",
            )
    elif workspace_id:
        _require_workspace_read_access(db, workspace_id, current_user_id)
        # Seuls les Admins qui sont Créateurs d'au moins un fils direct peuvent produire
        if membre.role == WORKSPACE_ADMIN_ROLE and _is_creator_of_any_direct_child_in_workspace(db, workspace_id=workspace_id, user_id=current_user_id):
            pass
        else:
            raise HTTPException(
                status_code=403,
                detail="Seuls les administrateurs qui sont créateurs directs d'au moins une liste ou un espace peuvent produire un rapport dans ce workspace.",
            )
    else:
        raise HTTPException(
            status_code=400,
            detail="Cette appartenance n'est rattachee a aucune ressource pouvant recevoir un rapport.",
        )

    rapport = Rapport(
        titre=titre,
        realisations=realisations,
        difficultes_et_solutions=difficultes_et_solutions,
        commentaire=commentaire,
        fichier_joint=fichier_joint,
        periode_debut=periode_debut,
        periode_fin=periode_fin,
        id_membre=id_membre,
        owner_user_id=current_user_id,
        owner_name_snapshot=_member_owner_name(membre),
        author_role=membre.role,
        id_liste=liste_id,
        id_espace=espace_id,
        id_workspace=workspace_id,
    )
    db.add(rapport)
    commit_or_raise(
        db,
        detail="Impossible de creer ce rapport.",
        refresh_instance=rapport,
    )
    notify_report_created(db, report_member=membre, report_title=titre, actor_user_id=current_user_id)
    commit_notification_events(db)
    return _serialize_report(rapport)


def list_accessible_reports(
    db: Session,
    *,
    current_user_id: str,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    member_id: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 100,
) -> list[dict]:
    query = (
        db.query(Rapport)
        .options(joinedload(Rapport.membres).joinedload(Membre.utilisateur))
        .order_by(Rapport.created_at.desc())
    )
    if member_id:
        query = query.filter(Rapport.id_membre == member_id)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            (Rapport.titre.ilike(pattern))
            | (Rapport.realisations.ilike(pattern))
            | (Rapport.difficultes_et_solutions.ilike(pattern))
            | (Rapport.commentaire.ilike(pattern))
        )

    reports = query.limit(max(limit, 1) * 6).all()
    results: list[dict] = []
    for rapport in reports:
        membre = None
        try:
            membre = _require_report_workflow_read_access(db, rapport, current_user_id)
        except HTTPException:
            continue

        member_liste_id = rapport.id_liste or (membre.id_liste if membre else None)
        member_espace_id = rapport.id_espace or (membre.id_espace if membre else None)
        member_workspace_id = rapport.id_workspace or (membre.id_workspace if membre else None)

        if liste_id:
            if member_liste_id != liste_id:
                continue
        elif espace_id:
            if member_espace_id != espace_id or member_liste_id or member_workspace_id:
                continue
        elif workspace_id:
            if member_workspace_id != workspace_id or member_liste_id or member_espace_id:
                continue

        if not member_liste_id and not member_espace_id and not member_workspace_id:
            continue

        payload = _serialize_report(rapport)
        payload["liste_id"] = member_liste_id
        payload["id_liste"] = member_liste_id
        payload["id_espace"] = member_espace_id
        payload["id_workspace"] = member_workspace_id
        payload["owner_user_id"] = payload.get("owner_user_id") or (membre.id_utilisateur if membre else None)
        results.append(payload)
        if len(results) >= limit:
            break
    return results


def get_report(db: Session, *, report_id: str, current_user_id: str) -> dict:
    rapport, _membre = _require_report_read_access(db, report_id, current_user_id)
    return _serialize_report(rapport)


def update_report(
    db: Session,
    *,
    report_id: str,
    current_user_id: str,
    **updates,
) -> dict:
    rapport, _membre, actor_kind = _require_report_owner_or_management_access(db, report_id, current_user_id)

    if actor_kind != "owner":
        raise HTTPException(status_code=403, detail="Seul l'auteur du rapport peut le modifier.")

    if actor_kind == "owner" and "id_membre" in updates and updates["id_membre"] != rapport.id_membre:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas reassigner votre rapport a un autre membre.")

    if "id_membre" in updates and updates["id_membre"] and updates["id_membre"] != rapport.id_membre:
        _require_member_management_access(db, updates["id_membre"], current_user_id)

    for key, value in updates.items():
        if hasattr(rapport, key) and value is not None:
            setattr(rapport, key, value)

    commit_or_raise(
        db,
        detail="Impossible de mettre a jour ce rapport.",
        refresh_instance=rapport,
    )
    return _serialize_report(rapport)


def delete_report(db: Session, *, report_id: str, current_user_id: str) -> None:
    rapport, _membre, actor_kind = _require_report_owner_or_management_access(db, report_id, current_user_id)
    if actor_kind != "owner":
        raise HTTPException(status_code=403, detail="Seul l'auteur du rapport peut le supprimer.")
    db.delete(rapport)
    commit_or_raise(db, detail="Impossible de supprimer ce rapport.")
