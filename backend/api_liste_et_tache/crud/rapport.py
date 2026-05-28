from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ..core.function import (
    _get_member_or_404,
    _get_member_scope_liste_id,
    _require_member_management_access,
    _require_member_self_or_management_access,
    _require_member_workflow_read_access,
    _require_report_owner_or_management_access,
    _require_report_read_access,
    commit_or_raise,
)
from ..models import Rapport, Membre, Utilisateur
from .notification_events import commit_notification_events, notify_report_created


def _serialize_report(rapport: Rapport) -> dict:
    owner_name = "inconnu"
    if rapport.membres and rapport.membres.utilisateur:
        user = rapport.membres.utilisateur
        owner_name = f"{user.nom or ''} {user.prenoms or ''}".strip() or user.username
    elif rapport.membres and not rapport.membres.utilisateur:
        owner_name = "Utilisateur supprimé"
    elif hasattr(rapport, "owner_user_id") and rapport.owner_user_id:
        pass

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
    }


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
) -> Rapport:
    membre = _get_member_or_404(db, id_membre)
    _get_member_scope_liste_id(db, membre)
    _require_member_self_or_management_access(db, id_membre, current_user_id)

    rapport = Rapport(
        titre=titre,
        realisations=realisations,
        difficultes_et_solutions=difficultes_et_solutions,
        commentaire=commentaire,
        fichier_joint=fichier_joint,
        periode_debut=periode_debut,
        periode_fin=periode_fin,
        id_membre=id_membre,
    )
    db.add(rapport)
    commit_or_raise(
        db,
        detail="Impossible de creer ce rapport.",
        refresh_instance=rapport,
    )
    notify_report_created(db, report_member=membre, report_title=titre, actor_user_id=current_user_id)
    commit_notification_events(db)
    return rapport


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
        try:
            _require_member_workflow_read_access(db, rapport.id_membre, current_user_id)
            membre = _get_member_or_404(db, rapport.id_membre)
        except HTTPException:
            continue

        member_liste_id = _get_member_scope_liste_id(db, membre)
        if liste_id and member_liste_id != liste_id:
            continue
        if not liste_id and espace_id and (not membre.liste or membre.liste.id_espace != espace_id):
            continue
        if not liste_id and workspace_id:
            member_workspace_id = membre.liste.id_workspace if membre.liste else None
            if membre.liste and membre.liste.id_espace and membre.liste.espace:
                member_workspace_id = membre.liste.espace.id_workspace
            if member_workspace_id != workspace_id:
                continue

        payload = _serialize_report(rapport)
        payload["liste_id"] = member_liste_id
        payload["owner_user_id"] = membre.id_utilisateur
        results.append(payload)
        if len(results) >= limit:
            break
    return results


def get_report(db: Session, *, report_id: str, current_user_id: str) -> Rapport:
    rapport, _membre = _require_report_read_access(db, report_id, current_user_id)
    return rapport


def update_report(
    db: Session,
    *,
    report_id: str,
    current_user_id: str,
    **updates,
) -> Rapport:
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
    return rapport


def delete_report(db: Session, *, report_id: str, current_user_id: str) -> None:
    rapport, _membre, actor_kind = _require_report_owner_or_management_access(db, report_id, current_user_id)
    if actor_kind != "owner":
        raise HTTPException(status_code=403, detail="Seul l'auteur du rapport peut le supprimer.")
    db.delete(rapport)
    commit_or_raise(db, detail="Impossible de supprimer ce rapport.")
