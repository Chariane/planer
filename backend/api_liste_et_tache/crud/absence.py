from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ..core.function import (
    _get_absence_or_404,
    _get_member_or_404,
    _get_member_scope_liste_id,
    _require_absence_management_access,
    _require_absence_read_access,
    _require_absence_self_or_management_access,
    _require_member_management_access,
    commit_or_raise,
)
from ..models import AbsenceEtConge, Membre, Tache
from .notification_events import commit_notification_events, notify_absence_created, notify_absence_decision


ABSENCE_STATUS_ALIASES = {
    "en_attente": "en_attente",
    "en attente": "en_attente",
    "pending": "en_attente",
    "approuvee": "approuvee",
    "approuvée": "approuvee",
    "accepte": "approuvee",
    "accepté": "approuvee",
    "approved": "approuvee",
    "rejetee": "rejetee",
    "rejetée": "rejetee",
    "refusee": "rejetee",
    "refusée": "rejetee",
    "rejected": "rejetee",
    "annulee": "annulee",
    "annulée": "annulee",
    "cancelled": "annulee",
    "terminee": "terminee",
    "terminée": "terminee",
    "effectue": "terminee",
    "effectué": "terminee",
    "done": "terminee",
}

ABSENCE_ALLOWED_DB_STATUSES = {"en_attente", "approuvee", "rejetee", "annulee", "terminee"}


def _normalize_absence_status(value: Optional[str], *, default: str = "en_attente") -> str:
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
    owner_name = "Utilisateur supprimé"
    author_role = "Membre"
    if absence.membres:
        author_role = absence.membres.role
        if absence.membres.utilisateur:
            user = absence.membres.utilisateur
            owner_name = f"{user.nom or ''} {user.prenoms or ''}".strip() or user.username
        else:
            owner_name = "Utilisateur supprimé"
        
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
        "owner_name": owner_name,
        "author_role": author_role
    }


def _member_has_assigned_task_in_list(db: Session, *, liste_id: str, user_id: str) -> bool:
    return (
        db.query(Membre.id)
        .join(Tache, Membre.id_tache == Tache.id)
        .filter(
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif",
            Membre.id_tache.isnot(None),
            Tache.id_liste == liste_id,
        )
        .first()
        is not None
    )


def _require_self_leave_request_access(db: Session, *, membre: Membre, current_user_id: str) -> str:
    if membre.id_utilisateur != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="Vous ne pouvez créer une demande d'absence ou de congé que pour vous-même.",
        )

    if not membre.id_liste:
        raise HTTPException(
            status_code=400,
            detail="La demande doit être rattachée à votre rôle direct dans la liste (V1).",
        )

    if membre.role == "Créateur":
        raise HTTPException(
            status_code=403,
            detail="Le créateur d'une liste ne fait pas de demande d'absences/congés dans sa propre liste.",
        )

    liste_id = _get_member_scope_liste_id(db, membre)
    
    # On autorise tout membre direct (Membre, Admin, Créateur) à faire une demande dans sa liste.
    # Pour V1 : Le créateur peut créer une demande mais elle restera 'en_attente' 
    # car il n'a pas de validateur direct supérieur dans la liste.
    return liste_id


def get_absence_impact(db: Session, *, absence_id: str, current_user_id: str) -> dict:
    absence, _membre = _require_absence_read_access(db, absence_id, current_user_id)
    target_membre = _get_member_or_404(db, absence.id_membre)
    liste_id = _get_member_scope_liste_id(db, target_membre)
    
    # 1. Tâches assignées à l'utilisateur dans cette liste
    assigned_tasks = (
        db.query(Tache)
        .join(Membre, Tache.id == Membre.id_tache)
        .filter(
            Membre.id_utilisateur == target_membre.id_utilisateur,
            Membre.statut == "Actif",
            Tache.id_liste == liste_id,
            Tache.statut != "terminé"
        )
        .all()
    )
    
    overlapping = []
    overdue = []
    high_priority = []
    
    now = datetime.utcnow()
    
    for task in assigned_tasks:
        # Chevauchement
        if _date_overlap(absence.date_debut, absence.date_fin, task.date_debut, task.date_fin_prevue):
            overlapping.append(task)
            if task.priorite in {"haute", "critique"}:
                high_priority.append(task)
        
        # En retard
        if task.date_fin_prevue and task.date_fin_prevue < now and task.statut != "terminé":
            overdue.append(task)
            
    # Conflits avec d'autres absences
    conflicts = detect_leave_conflicts_for_member(
        db, 
        member_id=absence.id_membre, 
        date_debut=absence.date_debut, 
        date_fin=absence.date_fin,
        exclude_absence_id=absence.id
    )
    
    return {
        "overlapping_tasks": overlapping,
        "overdue_tasks": overdue,
        "high_priority_tasks": high_priority,
        "conflicting_absences": conflicts
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
        if absence.statut not in {"en_attente", "approuvee"}:
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
    _require_self_leave_request_access(db, membre=membre, current_user_id=current_user_id)

    absence = AbsenceEtConge(
        id_membre=id_membre,
        is_absence=is_absence,
        date_debut=date_debut,
        date_fin=date_fin,
        statut=_normalize_absence_status(statut, default="en_attente"),
        statut_date=datetime.utcnow(),
        motif=motif,
        is_conge_planifie=is_conge_planifie,
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

    if actor_kind == "owner" and absence.statut != "en_attente":
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
    absence, target_membre = _require_absence_management_access(db, absence_id, current_user_id)
    if absence.statut != "en_attente":
        raise HTTPException(
            status_code=409,
            detail="Cette demande a deja ete traitee.",
        )
    
    # --- CIRCUIT DE VALIDATION HIÉRARCHIQUE ---
    actor_direct_member = db.query(Membre).filter(
        Membre.id_liste == target_membre.id_liste,
        Membre.id_utilisateur == current_user_id,
        Membre.statut == "Actif"
    ).first()
    
    if not actor_direct_member:
        # TODO: Gérer l'héritage parent (Workspace/Espace) en V2
        raise HTTPException(status_code=403, detail="Seul un gestionnaire direct de la liste peut valider en V1.")

    if target_membre.role == "Membre":
        if actor_direct_member.role not in {"Administrateur", "Créateur"}:
            raise HTTPException(status_code=403, detail="Seul un Administrateur ou le Créateur peut valider la demande d'un Membre.")
    elif target_membre.role == "Administrateur":
        if actor_direct_member.role != "Créateur":
            raise HTTPException(status_code=403, detail="Seul le Créateur de la liste peut valider la demande d'un Administrateur.")
    elif target_membre.role == "Créateur":
        raise HTTPException(status_code=403, detail="La demande du Créateur doit être validée par la hiérarchie supérieure (Espace/Workspace).")

    absence.statut = "approuvee"
    absence.statut_date = datetime.utcnow()
    commit_or_raise(db, detail="Impossible d'approuver cette demande.", refresh_instance=absence)
    notify_absence_decision(db, absence_member=target_membre, accepted=True)
    commit_notification_events(db)
    return absence


def reject_leave(db: Session, *, absence_id: str, current_user_id: str, motif_rejet: Optional[str] = None) -> AbsenceEtConge:
    absence, target_membre = _require_absence_management_access(db, absence_id, current_user_id)
    if absence.statut != "en_attente":
        raise HTTPException(
            status_code=409,
            detail="Cette demande a deja ete traitee.",
        )
    
    # --- CIRCUIT DE VALIDATION HIÉRARCHIQUE ---
    actor_direct_member = db.query(Membre).filter(
        Membre.id_liste == target_membre.id_liste,
        Membre.id_utilisateur == current_user_id,
        Membre.statut == "Actif"
    ).first()
    
    if not actor_direct_member:
        raise HTTPException(status_code=403, detail="Seul un gestionnaire direct de la liste peut rejeter en V1.")

    if target_membre.role == "Membre":
        if actor_direct_member.role not in {"Administrateur", "Créateur"}:
            raise HTTPException(status_code=403, detail="Seul un Administrateur ou le Créateur peut rejeter la demande d'un Membre.")
    elif target_membre.role == "Administrateur":
        if actor_direct_member.role != "Créateur":
            raise HTTPException(status_code=403, detail="Seul le Créateur de la liste peut rejeter la demande d'un Administrateur.")
    elif target_membre.role == "Créateur":
        raise HTTPException(status_code=403, detail="La demande du Créateur ne devrait pas exister (V1).")

    absence.statut = "rejetee"
    absence.statut_date = datetime.utcnow()
    if motif_rejet:
        absence.motif = (absence.motif or "") + f" [REJET: {motif_rejet}]"
        
    commit_or_raise(db, detail="Impossible de refuser cette demande.", refresh_instance=absence)
    notify_absence_decision(db, absence_member=target_membre, accepted=False)
    commit_notification_events(db)
    return absence


def finish_leave(db: Session, *, absence_id: str, current_user_id: str) -> AbsenceEtConge:
    absence, _membre = _require_absence_management_access(db, absence_id, current_user_id)
    absence.statut = "terminee"
    absence.statut_date = datetime.utcnow()
    commit_or_raise(db, detail="Impossible de cloturer cette demande.", refresh_instance=absence)
    return absence


def cancel_leave(db: Session, *, absence_id: str, current_user_id: str) -> AbsenceEtConge:
    absence, _membre, actor_kind = _require_absence_self_or_management_access(db, absence_id, current_user_id)
    if actor_kind == "owner" and absence.statut != "en_attente":
        raise HTTPException(
            status_code=403,
            detail="Vous ne pouvez annuler que vos demandes encore en attente.",
        )
    absence.statut = "annulee"
    absence.statut_date = datetime.utcnow()
    commit_or_raise(db, detail="Impossible d'annuler cette demande.", refresh_instance=absence)
    return absence


def get_user_availability_for_liste(
    db: Session, 
    *, 
    liste_id: str, 
    user_ids: list[str],
    reference_date: Optional[datetime] = None
) -> list[dict]:
    if not reference_date:
        reference_date = datetime.utcnow()
        
    # On récupère tous les membres actifs de la liste pour ces utilisateurs
    active_members = db.query(Membre).filter(
        Membre.id_liste == liste_id,
        Membre.id_utilisateur.in_(user_ids),
        Membre.statut == "Actif"
    ).all()
    
    member_map = {m.id: m.id_utilisateur for m in active_members}
    member_ids = list(member_map.keys())
    
    # On cherche les absences approuvées qui couvrent la date de référence
    absences = db.query(AbsenceEtConge).filter(
        AbsenceEtConge.id_membre.in_(member_ids),
        AbsenceEtConge.statut == "approuvee",
        AbsenceEtConge.date_debut <= reference_date,
        (AbsenceEtConge.date_fin.is_(None) | (AbsenceEtConge.date_fin >= reference_date))
    ).all()
    
    absent_user_ids = {member_map[a.id_membre]: a for a in absences}
    
    results = []
    for uid in user_ids:
        absence = absent_user_ids.get(uid)
        results.append({
            "id_utilisateur": uid,
            "is_available": absence is None,
            "current_absence": _serialize_absence(absence) if absence else None
        })
    return results


def delete_absence(db: Session, *, absence_id: str, current_user_id: str) -> None:
    absence, _membre, actor_kind = _require_absence_self_or_management_access(db, absence_id, current_user_id)
    if actor_kind == "owner" and absence.statut != "en_attente":
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
