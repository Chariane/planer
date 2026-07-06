from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List
import re
from ..core.database import get_db
from ..core.security import get_current_user
from ..models import Tache, Liste, Membre, Utilisateur, Notification, Espace, Workspace
from ..schemas import DashboardStatsOut, NotificationOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

def _format_notification_message(notification: Notification) -> str:
    """
    Retourne un message lisible pour une notification.
    Supprime les balises [[type:id]] et les espaces superflus.
    """
    message = notification.message or ""
    # Supprimer les motifs du type [[tache:123abc]] ou [[liste:456def]]
    cleaned = re.sub(r'\[\[[a-zA-Z]+:[a-zA-Z0-9]+\]\]\s*', '', message)
    cleaned = cleaned.strip()
    if not cleaned:
        return "Nouvelle activité"
    return cleaned

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

    # 5. Activités récentes avec messages formatés
    recent_activities = db.query(Notification).filter(
        Notification.id_utilisateur == current_user.id
    ).order_by(Notification.date_creation.desc()).limit(10).all()

    formatted_activities = []
    for act in recent_activities:
        act_dict = {c.key: getattr(act, c.key) for c in act.__table__.columns}
        act_dict["message"] = _format_notification_message(act)
        formatted_activities.append(act_dict)

    return {
        "total_projects": total_projects,
        "total_spaces": total_spaces,
        "active_members": active_members,
        "recent_activities": formatted_activities
    }