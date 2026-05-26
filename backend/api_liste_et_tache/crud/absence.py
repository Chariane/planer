from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from ..core.function import (
    _get_absence_or_404,
    _get_inherited_list_management_grant,
    _get_member_or_404,
    _get_member_scope_liste_id,
    _require_absence_management_access,
    _require_absence_read_access,
    _require_absence_self_or_management_access,
    _require_member_management_access,
    _require_member_self_or_management_access,
    commit_or_raise,
)
from ..models import AbsenceEtConge, Membre, Utilisateur
from .notification_events import commit_notification_events, notify_absence_created, notify_absence_decision


ABSENCE_STATUS_ALIASES = {
    "en attente": "En attente",
    "en_attente": "En attente",
    "pending": "En attente",
    "validee": "Accepté",
    "validee": "Accepté",
    "validée": "Accepté",
    "validé": "Accepté",
    "accepte": "Accepté",
    "accepté": "Accepté",
    "accepted": "Accepté",
    "refusee": "Refusé",
    "refusée": "Refusé",
    "refuse": "Refusé",
    "refusé": "Refusé",
    "rejected": "Refusé",
    "terminee": "Effectué",
    "terminée": "Effectué",
    "effectue": "Effectué",
    "effectué": "Effectué",
    "done": "Effectué",
}

ABSENCE_ALLOWED_DB_STATUSES = {"En attente", "Accepté", "Refusé", "Effectué"}


def _normalize_absence_status(value: Optional[str], *, default: str = "En attente") -> str:
    if value is None:
        return default
    normalized = ABSENCE_STATUS_ALIASES.get(value.strip().lower())
    if normalized:
        return normalized
    if value in ABSENCE_ALLOWED_DB_STATUSES:
        return value
    raise HTTPException(
        status_code=400,
        detail="Statut d'absence invalide pour le schema actuel.",
    )


def _serialize_absence(absence: AbsenceEtConge) -> dict:
    owner_name = "inconnu"
    if absence.membres and absence.membres.utilisateur:
        user = absence.membres.utilisateur
        owner_name = f"{user.nom or ''} {user.prenoms or ''}".strip() or user.username
        
    return {
        "id": absence.id,
        "is_absence": absence.is_absence,
        "date_debut": absence.date_debut,
        "date_fin": absence.date_fin,
        "statut": absence.statut,
        "statut_date": absence.statut_date,
        "motif": absence.motif,
        "is_conge_planifie": absence.is_conge_planifie,
        "created_at": absence.created_at,
        "duree_demandee_en_jours": absence.duree_demandee_en_jours,
        "conge_interrompu_at": absence.conge_interrompu_at,
        "id_membre": absence.id_membre,
        "owner_name": owner_name
    }


def _date_overlap(start_a, end_a, start_b, end_b) -> bool:
    a_end = end_a or start_a
    b_end = end_b or start_b
    return start_a <= b_end and start_b <= a_end


def detect_leave_conflicts_for_member(
    db: Session,
    *,
    member_id: str,
    date_debut,
    date_fin,
    exclude_absence_id: Optional[str] = None,
) -> list[AbsenceEtConge]:
    membre = _get_member_or_404(db, member_id)
    liste_id = _get_member_scope_liste_id(db, membre)

    sibling_member_ids = [
        item.id
        for item in db.query(Membre)
        .filter(Membre.id_liste == liste_id, Membre.statut == "Actif")
        .all()
    ]

    conflicts: list[AbsenceEtConge] = []
    for absence in (
        db.query(AbsenceEtConge)
        .filter(AbsenceEtConge.id_membre.in_(sibling_member_ids))
        .order_by(AbsenceEtConge.date_debut.asc())
        .all()
    ):
        if exclude_absence_id and absence.id == exclude_absence_id:
            continue
        if absence.statut not in {"En attente", "Accepté"}:
            continue
        if _date_overlap(date_debut, date_fin, absence.date_debut, absence.date_fin):
            conflicts.append(absence)
    return conflicts


def create_leave_request(
    db: Session,
    *,
    current_user_id: str,
    id_membre: str,
    is_absence: bool = True,
    date_debut=None,
    date_fin=None,
    statut: Optional[str] = None,
    motif: Optional[str] = None,
    is_conge_planifie: Optional[bool] = False,
    duree_demandee_en_jours: Optional[int] = None,
    conge_interrompu_at=None,
) -> AbsenceEtConge:
    membre = _get_member_or_404(db, id_membre)
    liste_id = _get_member_scope_liste_id(db, membre)

    if is_absence:
        _require_member_self_or_management_access(db, id_membre, current_user_id)
    else:
        _get_inherited_list_management_grant(db, liste_id, current_user_id)
        is_conge_planifie = True
        if statut is None:
            statut = "Accepté"

    absence = AbsenceEtConge(
        id_membre=id_membre,
        is_absence=is_absence,
        date_debut=date_debut,
        date_fin=date_fin,
        statut=_normalize_absence_status(statut),
        statut_date=datetime.utcnow(),
        motif=motif,
        is_conge_planifie=bool(is_conge_planifie),
        duree_demandee_en_jours=duree_demandee_en_jours,
        conge_interrompu_at=conge_interrompu_at,
    )
    db.add(absence)
    commit_or_raise(
        db,
        detail="Impossible de creer cette demande d'absence ou de conge.",
        refresh_instance=absence,
    )
    notify_absence_created(db, absence_member=membre, actor_user_id=current_user_id, is_absence=is_absence)
    commit_notification_events(db)
    return absence


def list_accessible_absences(
    db: Session,
    *,
    current_user_id: str,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    member_id: Optional[str] = None,
    statut: Optional[str] = None,
    date_from=None,
    date_to=None,
    limit: int = 100,
) -> list[dict]:
    query = (
        db.query(AbsenceEtConge)
        .options(joinedload(AbsenceEtConge.membres).joinedload(Membre.utilisateur))
        .order_by(AbsenceEtConge.date_debut.desc())
    )
    if member_id:
        query = query.filter(AbsenceEtConge.id_membre == member_id)
    if statut:
        query = query.filter(AbsenceEtConge.statut == _normalize_absence_status(statut))
    if date_from:
        query = query.filter(AbsenceEtConge.date_debut >= date_from)
    if date_to:
        query = query.filter(AbsenceEtConge.date_debut <= date_to)

    absences = query.limit(max(limit, 1) * 6).all()
    results: list[dict] = []
    for absence in absences:
        try:
            _require_absence_read_access(db, absence.id, current_user_id)
        except HTTPException:
            continue
        membre = _get_member_or_404(db, absence.id_membre)
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
        payload = _serialize_absence(absence)
        payload["liste_id"] = member_liste_id
        payload["owner_user_id"] = membre.id_utilisateur
        results.append(payload)
        if len(results) >= limit:
            break
    return results


def get_absence(db: Session, *, absence_id: str, current_user_id: str) -> AbsenceEtConge:
    absence, _membre = _require_absence_read_access(db, absence_id, current_user_id)
    return absence


def update_absence(
    db: Session,
    *,
    absence_id: str,
    current_user_id: str,
    **updates,
) -> AbsenceEtConge:
    absence, membre, actor_kind = _require_absence_self_or_management_access(db, absence_id, current_user_id)

    if actor_kind == "owner" and absence.statut != "En attente":
        raise HTTPException(
            status_code=403,
            detail="Vous ne pouvez modifier que vos demandes encore en attente.",
        )

    if "statut" in updates and updates["statut"] is not None:
        updates["statut"] = _normalize_absence_status(updates["statut"], default=absence.statut)
        updates["statut_date"] = datetime.utcnow()

    if actor_kind == "owner" and "id_membre" in updates and updates["id_membre"] != absence.id_membre:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas reassigner cette demande.")

    if "id_membre" in updates and updates["id_membre"] and updates["id_membre"] != absence.id_membre:
        _require_member_management_access(db, updates["id_membre"], current_user_id)

    for key, value in updates.items():
        if hasattr(absence, key) and value is not None:
            setattr(absence, key, value)

    commit_or_raise(
        db,
        detail="Impossible de mettre a jour cette demande d'absence.",
        refresh_instance=absence,
    )
    return absence


def approve_leave(db: Session, *, absence_id: str, current_user_id: str) -> AbsenceEtConge:
    absence, membre = _require_absence_management_access(db, absence_id, current_user_id)
    absence.statut = "Accepté"
    absence.statut_date = datetime.utcnow()
    commit_or_raise(db, detail="Impossible d'approuver cette demande.", refresh_instance=absence)
    notify_absence_decision(db, absence_member=membre, accepted=True)
    commit_notification_events(db)
    return absence


def reject_leave(db: Session, *, absence_id: str, current_user_id: str) -> AbsenceEtConge:
    absence, membre = _require_absence_management_access(db, absence_id, current_user_id)
    absence.statut = "Refusé"
    absence.statut_date = datetime.utcnow()
    commit_or_raise(db, detail="Impossible de refuser cette demande.", refresh_instance=absence)
    notify_absence_decision(db, absence_member=membre, accepted=False)
    commit_notification_events(db)
    return absence


def finish_leave(db: Session, *, absence_id: str, current_user_id: str) -> AbsenceEtConge:
    absence, _membre = _require_absence_management_access(db, absence_id, current_user_id)
    absence.statut = "Effectué"
    absence.statut_date = datetime.utcnow()
    commit_or_raise(db, detail="Impossible de cloturer cette demande.", refresh_instance=absence)
    return absence


def cancel_leave(db: Session, *, absence_id: str, current_user_id: str) -> AbsenceEtConge:
    absence, _membre, actor_kind = _require_absence_self_or_management_access(db, absence_id, current_user_id)
    if actor_kind == "owner" and absence.statut != "En attente":
        raise HTTPException(
            status_code=403,
            detail="Vous ne pouvez annuler que vos demandes encore en attente.",
        )
    absence.statut = "Refusé"
    absence.statut_date = datetime.utcnow()
    commit_or_raise(db, detail="Impossible d'annuler cette demande.", refresh_instance=absence)
    return absence


def delete_absence(db: Session, *, absence_id: str, current_user_id: str) -> None:
    absence, _membre, actor_kind = _require_absence_self_or_management_access(db, absence_id, current_user_id)
    if actor_kind == "owner" and absence.statut != "En attente":
        raise HTTPException(
            status_code=403,
            detail="Vous ne pouvez supprimer que vos demandes encore en attente.",
        )
    db.delete(absence)
    commit_or_raise(db, detail="Impossible de supprimer cette demande.")


def get_team_calendar(
    db: Session,
    *,
    current_user_id: str,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    date_from=None,
    date_to=None,
    limit: int = 200,
) -> list[dict]:
    entries = list_accessible_absences(
        db,
        current_user_id=current_user_id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )
    return [
        {
            "id": item["id"],
            "id_membre": item["id_membre"],
            "date_debut": item["date_debut"],
            "date_fin": item["date_fin"],
            "statut": item["statut"],
            "motif": item["motif"],
            "is_absence": item["is_absence"],
            "is_conge_planifie": item["is_conge_planifie"],
            "created_at": item["created_at"],
        }
        for item in entries
    ]


def get_absence_conflicts(
    db: Session,
    *,
    absence_id: str,
    current_user_id: str,
) -> list[dict]:
    absence, membre = _require_absence_read_access(db, absence_id, current_user_id)
    conflicts = detect_leave_conflicts_for_member(
        db,
        member_id=absence.id_membre,
        date_debut=absence.date_debut,
        date_fin=absence.date_fin,
        exclude_absence_id=absence.id,
    )
    return [
        {
            "id": conflict.id,
            "id_membre": conflict.id_membre,
            "date_debut": conflict.date_debut,
            "date_fin": conflict.date_fin,
            "statut": conflict.statut,
            "motif": conflict.motif,
        }
        for conflict in conflicts
    ]
