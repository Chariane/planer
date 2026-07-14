# backend/api_liste_et_tache/routes/dashboard.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
import re
from ..core.database import get_db
from ..core.security import get_current_user
from ..models import Tache, Liste, Membre, Utilisateur, Notification, Espace, Workspace
from ..schemas import DashboardStatsOut, NotificationOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

def _extract_resource_info(message: str) -> tuple[str, Optional[str], Optional[str]]:
    """
    Extrait le type et l'ID de ressource d'un message contenant [[type:id]].
    Retourne (cleaned_message, resource_type, resource_id)
    """
    cleaned = message
    resource_type = None
    resource_id = None
    pattern = r'\[\[([a-zA-Z]+):([a-zA-Z0-9]+)\]\]'
    match = re.search(pattern, message)
    if match:
        resource_type = match.group(1)
        resource_id = match.group(2)
        cleaned = re.sub(pattern, '', message).strip()
    if not cleaned:
        cleaned = "Nouvelle activité"
    return cleaned, resource_type, resource_id

@router.get("/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    # 1. Récupérer les IDs des ressources où l'utilisateur est membre direct
    workspace_ids = [r[0] for r in db.query(Membre.id_workspace).filter(
        Membre.id_utilisateur == current_user.id,
        Membre.id_workspace.isnot(None),
        Membre.statut == "Actif"
    ).all()]

    espace_ids = [r[0] for r in db.query(Membre.id_espace).filter(
        Membre.id_utilisateur == current_user.id,
        Membre.id_espace.isnot(None),
        Membre.statut == "Actif"
    ).all()]

    direct_list_ids = [r[0] for r in db.query(Membre.id_liste).filter(
        Membre.id_utilisateur == current_user.id,
        Membre.id_liste.isnot(None),
        Membre.statut == "Actif"
    ).all()]

    # 2. Récupérer TOUS les espaces accessibles (incluant héritage)
    accessible_espace_ids = set()
    espaces_from_workspaces = db.query(Espace.id).filter(
        Espace.id_workspace.in_(workspace_ids)
    ).all()
    accessible_espace_ids.update([e[0] for e in espaces_from_workspaces])
    accessible_espace_ids.update(espace_ids)
    
    new_ids = accessible_espace_ids.copy()
    while True:
        children = db.query(Espace.id).filter(
            Espace.id_espace_parent.in_(new_ids)
        ).all()
        child_ids = set([c[0] for c in children])
        if not child_ids.difference(accessible_espace_ids):
            break
        accessible_espace_ids.update(child_ids)
        new_ids = child_ids

    accessible_espace_ids_list = list(accessible_espace_ids)
    total_spaces = len(accessible_espace_ids_list)

    # 3. Compter les listes accessibles
    total_projects = db.query(func.count(func.distinct(Liste.id))).filter(
        or_(
            Liste.id.in_(direct_list_ids),
            Liste.id_workspace.in_(workspace_ids),
            Liste.id_espace.in_(accessible_espace_ids_list)
        )
    ).scalar() or 0

    # 4. Membres actifs
    accessible_list_ids = db.query(Liste.id).filter(
        or_(
            Liste.id.in_(direct_list_ids),
            Liste.id_workspace.in_(workspace_ids),
            Liste.id_espace.in_(accessible_espace_ids_list)
        )
    ).subquery()

    active_members = db.query(func.count(func.distinct(Membre.id_utilisateur))).filter(
        or_(
            Membre.id_workspace.in_(workspace_ids),
            Membre.id_espace.in_(accessible_espace_ids_list),
            Membre.id_liste.in_(accessible_list_ids)
        ),
        Membre.statut == "Actif"
    ).scalar() or 0

    # 5. Activités récentes avec messages formatés et infos de ressource
    recent_activities = db.query(Notification).filter(
        Notification.id_utilisateur == current_user.id
    ).order_by(Notification.date_creation.desc()).limit(10).all()

    formatted_activities = []
    for act in recent_activities:
        act_dict = {c.key: getattr(act, c.key) for c in act.__table__.columns}
        cleaned_msg, resource_type, resource_id = _extract_resource_info(act.message or "")
        act_dict["message"] = cleaned_msg
        act_dict["resource_type"] = resource_type
        act_dict["resource_id"] = resource_id
        formatted_activities.append(act_dict)

    return {
        "total_projects": total_projects,
        "total_spaces": total_spaces,
        "active_members": active_members,
        "recent_activities": formatted_activities
    }