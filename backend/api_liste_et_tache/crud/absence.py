# backend/api_liste_et_tache/crud/absence.py
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ..core.function import (
    _get_absence_or_404,
    _get_member_or_404,
    _get_member_scope_liste_id,
    _is_user_available_now,
    _require_absence_management_access,
    _require_absence_read_access,
    _require_absence_self_or_management_access,
    _require_member_management_access,
    _get_all_descendant_espace_ids,
    _get_all_descendant_lists,
    commit_or_raise,
    _require_direct_workspace_admin_grant,
    _require_workspace_creator_grant,
    _get_active_workspace_membership,
    _date_overlap,                         
    _has_overlapping_leave_for_user,       
    _get_user_active_memberships,          
)
from ..models import AbsenceEtConge, Membre, Tache, Utilisateur, Espace, Liste, Workspace
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


def _serialize_absence(db: Session, absence: AbsenceEtConge) -> dict:
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
        "decision_commentaire": absence.decision_commentaire,
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


def _get_absence_scope_for_member(db: Session, membre: Membre) -> tuple[str, str]:
    if membre.id_liste:
        return "liste", _get_member_scope_liste_id(db, membre)
    if membre.id_espace and membre.id_liste is None and membre.id_tache is None:
        return "espace", membre.id_espace
    if membre.id_workspace and membre.id_espace is None and membre.id_liste is None and membre.id_tache is None:
        return "workspace", membre.id_workspace
    raise HTTPException(
        status_code=400,
        detail="La demande doit être rattachée à un rôle direct dans une liste, un espace ou un workspace.",
    )


def _require_self_leave_request_access(db: Session, *, membre: Membre, current_user_id: str) -> tuple[str, str]:
    """
    Vérifie que l'utilisateur peut créer une demande pour lui-même.
    Retourne le scope direct de la demande : ("liste", id), ("espace", id) ou ("workspace", id).
    """
    if membre.id_utilisateur != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="Vous ne pouvez créer une demande d'absence ou de congé que pour vous-même.",
        )

    if not membre.id_liste and not membre.id_espace and not membre.id_workspace:
        raise HTTPException(
            status_code=400,
            detail="La demande doit être rattachée à votre rôle direct dans la liste, l'espace ou le workspace.",
        )

    if membre.role == "Créateur":
        raise HTTPException(
            status_code=403,
            detail="Le créateur d'une ressource ne fait pas de demande d'absences/congés dans sa propre ressource.",
        )

    if membre.role == "Invité":
        raise HTTPException(
            status_code=403,
            detail="Les invités peuvent consulter la liste, mais ne peuvent pas créer de demande d'absence ou de congé.",
        )

    # Pour le workspace : autoriser les Membres également (s'ils ne sont pas rattachés à une liste/espace)
    if (
        membre.id_workspace
        and membre.id_espace is None
        and membre.id_liste is None
        and membre.id_tache is None
        and membre.role not in ["Administrateur", "Membre"]
    ):
        raise HTTPException(
            status_code=403,
            detail="Dans un workspace, seuls les administrateurs et les membres directs peuvent créer une demande d'absence ou de congé.",
        )

    return _get_absence_scope_for_member(db, membre)


def _has_overlapping_approved_leave(
    db: Session,
    *,
    user_id: str,
    date_debut,
    date_fin,
    exclude_absence_id: Optional[str] = None,
) -> bool:
    query = (
        db.query(AbsenceEtConge)
        .join(Membre, AbsenceEtConge.id_membre == Membre.id)
        .filter(
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif",
            AbsenceEtConge.statut == "approuvee",
        )
    )
    if exclude_absence_id:
        query = query.filter(AbsenceEtConge.id != exclude_absence_id)
    return any(
        _date_overlap(date_debut, date_fin, absence.date_debut, absence.date_fin)
        for absence in query.all()
    )


def _direct_resource_members(db: Session, *, resource_type: str, resource_id: str, role: Optional[str] = None) -> list[Membre]:
    query = db.query(Membre).filter(Membre.statut == "Actif")
    if resource_type == "liste":
        query = query.filter(Membre.id_liste == resource_id)
    elif resource_type == "espace":
        query = query.filter(
            Membre.id_espace == resource_id,
            Membre.id_liste.is_(None),
            Membre.id_tache.is_(None),
        )
    elif resource_type == "workspace":
        query = query.filter(
            Membre.id_workspace == resource_id,
            Membre.id_espace.is_(None),
            Membre.id_liste.is_(None),
            Membre.id_tache.is_(None),
        )
    else:
        return []
    if role:
        query = query.filter(Membre.role == role)
    return query.all()


def _available_direct_admins(
    db: Session,
    *,
    resource_type: str,
    resource_id: str,
    date_debut,
    date_fin,
    exclude_absence_id: Optional[str] = None,
) -> list[Membre]:
    admins = _direct_resource_members(db, resource_type=resource_type, resource_id=resource_id, role="Administrateur")
    return [
        admin
        for admin in admins
        if admin.id_utilisateur and not _has_overlapping_approved_leave(
            db,
            user_id=admin.id_utilisateur,
            date_debut=date_debut,
            date_fin=date_fin,
            exclude_absence_id=exclude_absence_id,
        )
    ]


def _user_direct_role_in_resource(db: Session, *, user_id: str, resource_type: str, resource_id: str) -> Optional[str]:
    query = db.query(Membre).filter(
        Membre.id_utilisateur == user_id,
        Membre.statut == "Actif",
    )
    if resource_type == "liste":
        query = query.filter(Membre.id_liste == resource_id)
    elif resource_type == "espace":
        query = query.filter(
            Membre.id_espace == resource_id,
            Membre.id_liste.is_(None),
            Membre.id_tache.is_(None),
        )
    elif resource_type == "workspace":
        query = query.filter(
            Membre.id_workspace == resource_id,
            Membre.id_espace.is_(None),
            Membre.id_liste.is_(None),
            Membre.id_tache.is_(None),
        )
    else:
        return None
    membre = query.first()
    return membre.role if membre else None


def get_absence_impact(db: Session, *, absence_id: str, current_user_id: str) -> dict:
    absence, _membre = _require_absence_read_access(db, absence_id, current_user_id)
    target_membre = _get_member_or_404(db, absence.id_membre)
    scope_type, scope_id = _get_absence_scope_for_member(db, target_membre)

    assigned_tasks: list[Tache] = []
    sole_admin_resources: list[dict] = []
    sole_creator_resources: list[dict] = []

    if scope_type == "liste":
        assigned_tasks = (
            db.query(Tache)
            .join(Membre, Tache.id == Membre.id_tache)
            .filter(
                Membre.id_utilisateur == target_membre.id_utilisateur,
                Membre.statut == "Actif",
                Tache.id_liste == scope_id,
                Tache.statut != "terminé",
            )
            .all()
        )

    elif scope_type == "espace":
        direct_lists = db.query(Liste).filter(Liste.id_espace == scope_id).all()
        direct_subspaces = db.query(Espace).filter(Espace.id_espace_parent == scope_id).all()
        direct_children = [
            *[
                {"type": "liste", "id": liste.id, "nom": liste.nom, "resource_type": "liste"}
                for liste in direct_lists
            ],
            *[
                {"type": "sous-espace", "id": espace.id, "nom": espace.nom, "resource_type": "espace"}
                for espace in direct_subspaces
            ],
        ]

        for child in direct_children:
            child_role = _user_direct_role_in_resource(
                db,
                user_id=target_membre.id_utilisateur,
                resource_type=child["resource_type"],
                resource_id=child["id"],
            )
            available_admins = _available_direct_admins(
                db,
                resource_type=child["resource_type"],
                resource_id=child["id"],
                date_debut=absence.date_debut,
                date_fin=absence.date_fin,
                exclude_absence_id=absence.id,
            )

            if target_membre.role == "Membre" and child_role == "Administrateur":
                other_available_admins = [
                    admin for admin in available_admins
                    if admin.id_utilisateur != target_membre.id_utilisateur
                ]
                if not other_available_admins:
                    sole_admin_resources.append({
                        "type": child["type"],
                        "id": child["id"],
                        "nom": child["nom"],
                    })

            if target_membre.role == "Administrateur" and child_role == "Créateur":
                if not available_admins:
                    sole_creator_resources.append({
                        "type": child["type"],
                        "id": child["id"],
                        "nom": child["nom"],
                    })

    elif scope_type == "workspace":
        # Pour un workspace, on regarde les espaces et listes directs
        direct_espaces = db.query(Espace).filter(Espace.id_workspace == scope_id).all()
        direct_listes = db.query(Liste).filter(Liste.id_workspace == scope_id).all()
        direct_children = [
            *[
                {"type": "espace", "id": espace.id, "nom": espace.nom, "resource_type": "espace"}
                for espace in direct_espaces
            ],
            *[
                {"type": "liste", "id": liste.id, "nom": liste.nom, "resource_type": "liste"}
                for liste in direct_listes
            ],
        ]

        for child in direct_children:
            child_role = _user_direct_role_in_resource(
                db,
                user_id=target_membre.id_utilisateur,
                resource_type=child["resource_type"],
                resource_id=child["id"],
            )
            available_admins = _available_direct_admins(
                db,
                resource_type=child["resource_type"],
                resource_id=child["id"],
                date_debut=absence.date_debut,
                date_fin=absence.date_fin,
                exclude_absence_id=absence.id,
            )

            if target_membre.role == "Membre" and child_role == "Administrateur":
                other_available_admins = [
                    admin for admin in available_admins
                    if admin.id_utilisateur != target_membre.id_utilisateur
                ]
                if not other_available_admins:
                    sole_admin_resources.append({
                        "type": child["type"],
                        "id": child["id"],
                        "nom": child["nom"],
                    })

            if target_membre.role == "Administrateur" and child_role == "Créateur":
                if not available_admins:
                    sole_creator_resources.append({
                        "type": child["type"],
                        "id": child["id"],
                        "nom": child["nom"],
                    })

    overlapping = []
    overdue = []
    high_priority = []
    now = datetime.utcnow()

    for task in assigned_tasks:
        if _date_overlap(absence.date_debut, absence.date_fin, task.date_debut, task.date_fin_prevue):
            overlapping.append(task)
            if task.priorite in {"haute", "critique"}:
                high_priority.append(task)

        if task.date_fin_prevue and task.date_fin_prevue < now and task.statut != "terminé":
            overdue.append(task)

    conflicts = detect_leave_conflicts_for_member(
        db,
        member_id=absence.id_membre,
        date_debut=absence.date_debut,
        date_fin=absence.date_fin,
        exclude_absence_id=absence.id,
    )

    # Statistiques d'absences/congés approuvés sur les 3 derniers mois (90 jours)
    limit_date = datetime.utcnow() - timedelta(days=90)
    recent_approved = (
        db.query(AbsenceEtConge)
        .filter(
            AbsenceEtConge.id_membre == target_membre.id,
            AbsenceEtConge.statut == "approuvee",
            AbsenceEtConge.date_debut >= limit_date,
        )
        .all()
    )

    approved_count = len(recent_approved)
    approved_days = 0
    for a in recent_approved:
        if a.duree_demandee_en_jours:
            approved_days += a.duree_demandee_en_jours
        elif a.date_debut:
            end_val = a.date_fin or a.date_debut
            delta = end_val - a.date_debut
            approved_days += delta.days + 1

    risk_level = "faible"
    if high_priority or overdue or sole_admin_resources or sole_creator_resources:
        risk_level = "eleve"
    elif overlapping or conflicts:
        risk_level = "moyen"

    risk_reasons: list[str] = []
    if high_priority:
        risk_reasons.append(f"{len(high_priority)} tâche(s) prioritaire(s) touchée(s)")
    if overdue:
        risk_reasons.append(f"{len(overdue)} tâche(s) déjà en retard")
    if overlapping:
        risk_reasons.append(f"{len(overlapping)} tâche(s) chevauchent la période")
    if conflicts:
        risk_reasons.append(f"{len(conflicts)} autre(s) demande(s) sur la même période")
    if sole_admin_resources:
        risk_reasons.append(f"Seul administrateur disponible dans {len(sole_admin_resources)} ressource(s) enfant(s) directe(s)")
    if sole_creator_resources:
        risk_reasons.append(f"Créateur direct de {len(sole_creator_resources)} ressource(s) enfant(s) sans administrateur disponible")

    if approved_count > 3:
        risk_reasons.append(f"Le membre a déjà eu {approved_count} absences approuvées ces 3 derniers mois")
    if approved_days > 15:
        risk_reasons.append(f"Le membre cumule déjà {approved_days} jours d'absence ces 3 derniers mois")

    if risk_level == "eleve":
        recommendation = "Impact élevé : sécurisez les ressources enfants ou les tâches critiques avant d'approuver."
    elif risk_level == "moyen":
        recommendation = "Impact modéré : vérifiez les chevauchements avant décision."
    else:
        recommendation = "Impact faible : aucun risque opérationnel majeur détecté."

    return {
        "overlapping_tasks": overlapping,
        "overdue_tasks": overdue,
        "high_priority_tasks": high_priority,
        "conflicting_absences": conflicts,
        "sole_admin_resources": sole_admin_resources,
        "sole_creator_resources": sole_creator_resources,
        "risk_level": risk_level,
        "recommendation": recommendation,
        "risk_reasons": risk_reasons,
        "approved_absences_last_3_months": approved_count,
        "approved_days_last_3_months": approved_days,
    }


def _date_overlap(start_a, end_a, start_b, end_b) -> bool:
    start_a = _as_naive_datetime(start_a)
    end_a = _as_naive_datetime(end_a)
    start_b = _as_naive_datetime(start_b)
    end_b = _as_naive_datetime(end_b)
    if not start_a or not start_b:
        return False
    a_end = end_a or start_a
    b_end = end_b or start_b
    return start_a <= b_end and start_b <= a_end


def _as_naive_datetime(value):
    if value is None:
        return None
    if isinstance(value, datetime) and value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _ensure_no_overlapping_active_leave(
    db: Session,
    *,
    user_id: str,
    scope_type: str,
    scope_id: str,
    date_debut,
    date_fin,
    exclude_absence_id: Optional[str] = None,
) -> None:
    if not date_debut:
        raise HTTPException(
            status_code=400,
            detail="La date de début est obligatoire pour une demande d'absence ou de congé.",
        )

    query = (
        db.query(AbsenceEtConge)
        .join(Membre, AbsenceEtConge.id_membre == Membre.id)
        .filter(
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif",
            AbsenceEtConge.statut.in_(["en_attente", "approuvee"]),
        )
    )
    if scope_type == "liste":
        query = query.filter(Membre.id_liste == scope_id)
    elif scope_type == "espace":
        query = query.filter(
            Membre.id_espace == scope_id,
            Membre.id_liste.is_(None),
            Membre.id_tache.is_(None),
        )
    elif scope_type == "workspace":
        query = query.filter(
            Membre.id_workspace == scope_id,
            Membre.id_espace.is_(None),
            Membre.id_liste.is_(None),
            Membre.id_tache.is_(None),
        )
    else:
        raise HTTPException(status_code=400, detail="Scope de demande invalide.")
    if exclude_absence_id:
        query = query.filter(AbsenceEtConge.id != exclude_absence_id)

    for existing in query.all():
        if _date_overlap(date_debut, date_fin, existing.date_debut, existing.date_fin):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Vous avez déjà une demande d'absence ou de congé en attente ou approuvée "
                    "sur cette période. Annulez ou modifiez la demande existante avant d'en créer une autre."
                ),
            )


def detect_leave_conflicts_for_member(
    db: Session,
    *,
    member_id: str,
    date_debut,
    date_fin,
    exclude_absence_id: Optional[str] = None,
) -> list[AbsenceEtConge]:
    membre = _get_member_or_404(db, member_id)
    scope_type, scope_id = _get_absence_scope_for_member(db, membre)

    siblings_query = db.query(Membre).filter(Membre.statut == "Actif")
    if scope_type == "liste":
        siblings_query = siblings_query.filter(Membre.id_liste == scope_id)
    elif scope_type == "espace":
        siblings_query = siblings_query.filter(
            Membre.id_espace == scope_id,
            Membre.id_liste.is_(None),
            Membre.id_tache.is_(None),
        )
    elif scope_type == "workspace":
        siblings_query = siblings_query.filter(
            Membre.id_workspace == scope_id,
            Membre.id_espace.is_(None),
            Membre.id_liste.is_(None),
            Membre.id_tache.is_(None),
        )
    else:
        return []
    sibling_member_ids = [item.id for item in siblings_query.all()]

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


def _validate_absence_dates(date_debut: Any, date_fin: Any = None):
    """
    Valide la cohérence des dates d'absence/congé.
    """
    if not date_debut:
        raise HTTPException(status_code=400, detail="La date de début est obligatoire.")
    
    try:
        start_date = date_debut if isinstance(date_debut, datetime) else datetime.fromisoformat(str(date_debut).replace('Z', '+00:00'))
        if start_date.year < 2000 or start_date.year > 2100:
            raise HTTPException(status_code=400, detail=f"L'année {start_date.year} n'est pas valide. Veuillez saisir une année entre 2000 et 2100.")

        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        check_start = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        if check_start < today:
            raise HTTPException(
                status_code=400, 
                detail=f"La date de début ({start_date.strftime('%d/%m/%Y')}) ne peut pas être dans le passé."
            )
        
        if date_fin:
            end_date = date_fin if isinstance(date_fin, datetime) else datetime.fromisoformat(str(date_fin).replace('Z', '+00:00'))
            if end_date.year < 2000 or end_date.year > 2100:
                raise HTTPException(status_code=400, detail=f"L'année {end_date.year} n'est pas valide.")
            if end_date < start_date:
                raise HTTPException(
                    status_code=400, 
                    detail=f"La date de fin ({end_date.strftime('%d/%m/%Y')}) ne peut pas être antérieure à la date de début ({start_date.strftime('%d/%m/%Y')})."
                )
    except (ValueError, TypeError) as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail="Format de date invalide.")


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
    is_conge_planifie: Optional[bool] = None,
    duree_demandee_en_jours: Optional[int] = None,
) -> AbsenceEtConge:
    membre = _get_member_or_404(db, id_membre)
    scope_type, scope_id = _require_self_leave_request_access(db, membre=membre, current_user_id=current_user_id)
    
    _validate_absence_dates(date_debut, date_fin)

    _ensure_no_overlapping_active_leave(
        db,
        user_id=membre.id_utilisateur,
        scope_type=scope_type,
        scope_id=scope_id,
        date_debut=date_debut,
        date_fin=date_fin,
    )

    if is_conge_planifie is None:
        is_conge_planifie = not is_absence

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
        .options(
            joinedload(AbsenceEtConge.membres).joinedload(Membre.utilisateur)
        )
        .order_by(AbsenceEtConge.date_debut.desc())
    )
    if member_id:
        query = query.filter(AbsenceEtConge.id_membre == member_id)
    if statut:
        query = query.filter(AbsenceEtConge.statut == _normalize_absence_status(statut))
    else:
        query = query.filter(AbsenceEtConge.statut != "annulee")
    if date_from:
        query = query.filter(AbsenceEtConge.date_debut >= date_from)
    if date_to:
        query = query.filter(AbsenceEtConge.date_debut <= date_to)

    absences = query.limit(max(limit, 1) * 6).all()
    results: list[dict] = []
    for absence in absences:
        membre = _get_member_or_404(db, absence.id_membre)
        
        if liste_id:
            if membre.id_liste != liste_id:
                continue
        elif espace_id:
            if membre.id_espace != espace_id or membre.id_liste is not None:
                continue
        elif workspace_id:
            if membre.id_workspace != workspace_id or membre.id_espace is not None or membre.id_liste is not None:
                continue
        
        try:
            _require_absence_read_access(db, absence.id, current_user_id)
        except HTTPException:
            continue
            
        payload = _serialize_absence(db, absence)
        payload["liste_id"] = membre.id_liste
        payload["espace_id"] = membre.id_espace
        payload["workspace_id"] = membre.id_workspace
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

    next_member_id = updates.get("id_membre") or absence.id_membre
    next_member = _get_member_or_404(db, next_member_id)
    next_scope_type, next_scope_id = _get_absence_scope_for_member(db, next_member)
    next_date_debut = updates.get("date_debut") or absence.date_debut
    next_date_fin = updates.get("date_fin") if "date_fin" in updates else absence.date_fin
    
    if "date_debut" in updates or "date_fin" in updates:
        _validate_absence_dates(next_date_debut, next_date_fin)

    next_status = updates.get("statut") or absence.statut
    if next_status in {"en_attente", "approuvee"}:
        _ensure_no_overlapping_active_leave(
            db,
            user_id=next_member.id_utilisateur,
            scope_type=next_scope_type,
            scope_id=next_scope_id,
            date_debut=next_date_debut,
            date_fin=next_date_fin,
            exclude_absence_id=absence.id,
        )

    for key, value in updates.items():
        if hasattr(absence, key) and value is not None:
            setattr(absence, key, value)

    commit_or_raise(
        db,
        detail="Impossible de mettre a jour cette demande d'absence.",
        refresh_instance=absence,
    )
    return absence


def approve_leave(db: Session, *, absence_id: str, current_user_id: str, commentaire: Optional[str] = None) -> AbsenceEtConge:
    absence, target_membre = _require_absence_management_access(db, absence_id, current_user_id)
    if absence.statut != "en_attente":
        raise HTTPException(
            status_code=409,
            detail="Cette demande a deja ete traitee.",
        )
    
    # --- CIRCUIT DE VALIDATION HIÉRARCHIQUE ---
    # Trouver le rôle direct de l'acteur sur la même ressource que le demandeur
    actor_direct_member = None
    if target_membre.id_liste:
        actor_direct_member = db.query(Membre).filter(
            Membre.id_liste == target_membre.id_liste,
            Membre.id_utilisateur == current_user_id,
            Membre.statut == "Actif"
        ).first()
    elif target_membre.id_espace:
        actor_direct_member = db.query(Membre).filter(
            Membre.id_espace == target_membre.id_espace,
            Membre.id_liste.is_(None),
            Membre.id_tache.is_(None),
            Membre.id_utilisateur == current_user_id,
            Membre.statut == "Actif"
        ).first()
    elif target_membre.id_workspace:
        actor_direct_member = db.query(Membre).filter(
            Membre.id_workspace == target_membre.id_workspace,
            Membre.id_espace.is_(None),
            Membre.id_liste.is_(None),
            Membre.id_tache.is_(None),
            Membre.id_utilisateur == current_user_id,
            Membre.statut == "Actif"
        ).first()

    if not actor_direct_member:
        res_label = "le workspace" if target_membre.id_workspace else ("l'espace" if target_membre.id_espace else "la liste")
        raise HTTPException(status_code=403, detail=f"Seul un gestionnaire direct de {res_label} peut valider.")

    # Règles selon le rôle du demandeur
    if target_membre.role == "Membre":
        if actor_direct_member.role == "Créateur":
            # Vérifier s'il existe un administrateur direct disponible
            active_admins = _direct_resource_members(
                db,
                resource_type="liste" if target_membre.id_liste else "espace" if target_membre.id_espace else "workspace",
                resource_id=target_membre.id_liste or target_membre.id_espace or target_membre.id_workspace,
                role="Administrateur"
            )
            available_admins = [a for a in active_admins if _is_user_available_now(db, a.id_utilisateur)]
            if available_admins:
                raise HTTPException(
                    status_code=403, 
                    detail="Seul un Administrateur disponible peut valider la demande d'un Membre."
                )
        elif actor_direct_member.role != "Administrateur":
            raise HTTPException(status_code=403, detail="Seul un Administrateur ou le Créateur peut valider la demande d'un Membre.")
            
    elif target_membre.role == "Administrateur":
        if actor_direct_member.role != "Créateur":
            raise HTTPException(status_code=403, detail="Seul le Créateur peut valider la demande d'un Administrateur.")
            
    elif target_membre.role == "Créateur":
        raise HTTPException(status_code=403, detail="La demande du Créateur doit être validée par la hiérarchie supérieure.")

    # Construction du texte de décision
    user = db.query(Utilisateur).filter(Utilisateur.id == current_user_id).first()
    user_name = f"{user.nom or ''} {user.prenoms or ''}".strip() or user.username or user.email
    decision_text = f"Approuvé par {user_name} (id: {current_user_id}) le {datetime.utcnow().strftime('%d/%m/%Y à %H:%M')}"
    if commentaire:
        decision_text += f" - Commentaire : {commentaire}"

    absence.statut = "approuvee"
    absence.statut_date = datetime.utcnow()
    absence.decision_commentaire = decision_text
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
    
    actor_direct_member = None
    if target_membre.id_liste:
        actor_direct_member = db.query(Membre).filter(
            Membre.id_liste == target_membre.id_liste,
            Membre.id_utilisateur == current_user_id,
            Membre.statut == "Actif"
        ).first()
    elif target_membre.id_espace:
        actor_direct_member = db.query(Membre).filter(
            Membre.id_espace == target_membre.id_espace,
            Membre.id_liste.is_(None),
            Membre.id_tache.is_(None),
            Membre.id_utilisateur == current_user_id,
            Membre.statut == "Actif"
        ).first()
    elif target_membre.id_workspace:
        actor_direct_member = db.query(Membre).filter(
            Membre.id_workspace == target_membre.id_workspace,
            Membre.id_espace.is_(None),
            Membre.id_liste.is_(None),
            Membre.id_tache.is_(None),
            Membre.id_utilisateur == current_user_id,
            Membre.statut == "Actif"
        ).first()

    if not actor_direct_member:
        res_label = "le workspace" if target_membre.id_workspace else ("l'espace" if target_membre.id_espace else "la liste")
        raise HTTPException(status_code=403, detail=f"Seul un gestionnaire direct de {res_label} peut rejeter.")

    if target_membre.role == "Membre":
        if actor_direct_member.role == "Créateur":
            active_admins = _direct_resource_members(
                db,
                resource_type="liste" if target_membre.id_liste else "espace" if target_membre.id_espace else "workspace",
                resource_id=target_membre.id_liste or target_membre.id_espace or target_membre.id_workspace,
                role="Administrateur"
            )
            available_admins = [a for a in active_admins if _is_user_available_now(db, a.id_utilisateur)]
            if available_admins:
                raise HTTPException(
                    status_code=403, 
                    detail="Seul un Administrateur disponible peut rejeter la demande d'un Membre."
                )
        elif actor_direct_member.role != "Administrateur":
            raise HTTPException(status_code=403, detail="Seul un Administrateur ou le Créateur peut rejeter la demande d'un Membre.")
            
    elif target_membre.role == "Administrateur":
        if actor_direct_member.role != "Créateur":
            raise HTTPException(status_code=403, detail="Seul le Créateur peut rejeter la demande d'un Administrateur.")
            
    elif target_membre.role == "Créateur":
        raise HTTPException(status_code=403, detail="La demande du Créateur ne peut être rejetée que par la hiérarchie supérieure.")

    user = db.query(Utilisateur).filter(Utilisateur.id == current_user_id).first()
    user_name = f"{user.nom or ''} {user.prenoms or ''}".strip() or user.username or user.email
    decision_text = f"Rejeté par {user_name} (id: {current_user_id}) le {datetime.utcnow().strftime('%d/%m/%Y à %H:%M')}"
    if motif_rejet:
        decision_text += f" - Motif : {motif_rejet}"

    absence.statut = "rejetee"
    absence.statut_date = datetime.utcnow()
    absence.decision_commentaire = decision_text
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


def cancel_leave(db: Session, *, absence_id: str, current_user_id: str) -> dict:
    absence, _membre, actor_kind = _require_absence_self_or_management_access(db, absence_id, current_user_id)
    
    if actor_kind == "owner":
        if absence.statut == "approuvee":
            if datetime.utcnow().date() >= absence.date_debut.date():
                raise HTTPException(
                    status_code=403,
                    detail="Une demande approuvée ne peut plus être annulée une fois que la date de début est arrivée.",
                )
        if absence.statut not in {"en_attente", "approuvee"}:
            raise HTTPException(
                status_code=403,
                detail=f"Vous ne pouvez pas annuler une demande avec le statut '{absence.statut}'.",
            )
    elif actor_kind == "manager":
        if absence.statut == "terminee":
            raise HTTPException(
                status_code=403,
                detail="Un manager ne peut pas annuler une demande déjà terminée.",
            )

    absence.statut = "annulee"
    absence.statut_date = datetime.utcnow()
    commit_or_raise(db, detail="Impossible d'annuler cette demande.", refresh_instance=absence)
    return _serialize_absence(db, absence)


def get_user_availability(
    db: Session, 
    *, 
    resource_id: str, 
    user_ids: list[str],
    reference_date: Optional[datetime] = None
) -> list[dict]:
    if not reference_date:
        reference_date = datetime.utcnow()
        
    active_members = db.query(Membre).filter(
        ((Membre.id_liste == resource_id) | (Membre.id_espace == resource_id) | (Membre.id_workspace == resource_id)),
        Membre.id_utilisateur.in_(user_ids),
        Membre.statut == "Actif"
    ).all()
    
    member_map = {m.id: m.id_utilisateur for m in active_members}
    member_ids = list(member_map.keys())
    
    ref_date = reference_date.date() if isinstance(reference_date, datetime) else reference_date
    
    absences = db.query(AbsenceEtConge).filter(
        AbsenceEtConge.id_membre.in_(member_ids),
        AbsenceEtConge.statut == "approuvee"
    ).all()
    
    absent_map = {}
    for a in absences:
        a_start = a.date_debut.date() if a.date_debut else None
        a_end = a.date_fin.date() if a.date_fin else a_start
        
        if a_start and ref_date >= a_start and (not a_end or ref_date <= a_end):
            absent_map[member_map[a.id_membre]] = a
    
    results = []
    for uid in user_ids:
        absence = absent_map.get(uid)
        results.append({
            "id_utilisateur": uid,
            "is_available": absence is None,
            "current_absence": _serialize_absence(db, absence) if absence else None
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