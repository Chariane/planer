from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ..core.function import (
    _get_member_or_404,
    _get_member_scope_liste_id,
    _member_has_assigned_task_in_list,
    _require_member_management_access,
    _require_member_read_access,
    _require_report_owner_or_management_access,
    _require_report_read_access,
    _require_report_workflow_read_access,
    commit_or_raise,
)
from ..models import Rapport, Membre, Liste
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
) -> dict:
    if not id_membre:
        raise HTTPException(status_code=400, detail="Vous devez etre membre direct de la liste pour creer un rapport.")

    membre = _get_member_or_404(db, id_membre)
    liste_id = _get_member_scope_liste_id(db, membre)

    if membre.id_utilisateur != current_user_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez creer un rapport que pour vous-meme.")

    if not membre.id_liste:
        raise HTTPException(
            status_code=403,
            detail="Les rapports doivent etre envoyes depuis votre appartenance directe a la liste.",
        )

    _require_member_read_access(db, id_membre, current_user_id)

    if membre.role == "Invité":
        raise HTTPException(status_code=403, detail="Un invite de liste ne peut pas creer de rapport.")

    if membre.role == "Membre" and not _member_has_assigned_task_in_list(
        db,
        liste_id=liste_id,
        user_id=current_user_id,
    ):
        raise HTTPException(
            status_code=403,
            detail="Un membre de liste doit avoir au moins une tache assignee pour creer un rapport.",
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

        member_liste_id = rapport.id_liste or (_get_member_scope_liste_id(db, membre) if membre else None)
        if not member_liste_id:
            continue
        if liste_id and member_liste_id != liste_id:
            continue
        report_liste = membre.liste if membre and membre.liste else db.query(Liste).filter(Liste.id == member_liste_id).first()
        if not liste_id and espace_id and (not report_liste or report_liste.id_espace != espace_id):
            continue
        if not liste_id and workspace_id:
            member_workspace_id = report_liste.id_workspace if report_liste else None
            if report_liste and report_liste.id_espace and report_liste.espace:
                member_workspace_id = report_liste.espace.id_workspace
            if member_workspace_id != workspace_id:
                continue

        payload = _serialize_report(rapport)
        payload["liste_id"] = member_liste_id
        payload["id_liste"] = member_liste_id
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
