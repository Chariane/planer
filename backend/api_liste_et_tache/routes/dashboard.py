from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List
from ..core.database import get_db
from ..core.security import get_current_user
from ..models import Tache, Liste, Membre, Utilisateur, Notification, Espace, Workspace
from ..schemas import DashboardStatsOut, NotificationOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    # 1. Get all accessible scopes
    # Direct list memberships
    direct_list_ids = [r[0] for r in db.query(Membre.id_liste).filter(
        Membre.id_utilisateur == current_user.id,
        Membre.id_liste.isnot(None),
        Membre.statut == "Actif"
    ).all()]

    # Workspace memberships
    workspace_ids = [r[0] for r in db.query(Membre.id_workspace).filter(
        Membre.id_utilisateur == current_user.id,
        Membre.id_workspace.isnot(None),
        Membre.statut == "Actif"
    ).all()]

    # Espace memberships
    espace_ids = [r[0] for r in db.query(Membre.id_espace).filter(
        Membre.id_utilisateur == current_user.id,
        Membre.id_espace.isnot(None),
        Membre.statut == "Actif"
    ).all()]

    # 2. Count Total Projects (Lists)
    # Accessible via direct member, workspace member, or espace member
    total_projects = db.query(func.count(func.distinct(Liste.id))).filter(
        or_(
            Liste.id.in_(direct_list_ids),
            Liste.id_workspace.in_(workspace_ids),
            Liste.id_espace.in_(espace_ids)
        )
    ).scalar() or 0

    # 3. Count Total Spaces (Recursive)
    # Spaces in accessible workspaces + specifically joined spaces + their descendants
    # But since we confirmed sub-spaces inherit id_workspace, if we have the workspace_id, we have all its spaces.
    # What about spaces that the user joined directly but are not in those workspaces? We should include them too.
    
    total_spaces = db.query(func.count(func.distinct(Espace.id))).filter(
        or_(
            Espace.id_workspace.in_(workspace_ids),
            Espace.id.in_(espace_ids)
        )
    ).scalar() or 0

    # 4. Active Members (Exhaustive)
    # Users sharing ANY accessible list, workspace or espace
    # First, get all accessible list IDs, workspace IDs, and espace IDs
    accessible_list_ids = [r[0] for r in db.query(Liste.id).filter(
        or_(
            Liste.id.in_(direct_list_ids),
            Liste.id_workspace.in_(workspace_ids),
            Liste.id_espace.in_(espace_ids)
        )
    ).all()]

    active_members = db.query(func.count(func.distinct(Membre.id_utilisateur))).filter(
        or_(
            Membre.id_workspace.in_(workspace_ids),
            Membre.id_espace.in_(espace_ids),
            Membre.id_liste.in_(accessible_list_ids)
        ),
        Membre.statut == "Actif"
    ).scalar() or 0

    # 5. Recent Activities
    recent_activities = db.query(Notification).filter(
        Notification.id_utilisateur == current_user.id
    ).order_by(Notification.date_creation.desc()).limit(10).all()

    return {
        "total_projects": total_projects,
        "total_spaces": total_spaces,
        "active_members": active_members,
        "recent_activities": recent_activities
    }
