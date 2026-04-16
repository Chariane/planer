from fastapi import HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from ..models import Workspace, Espace, Membre, Liste, Tache

# Constantes de rôles (selon les schémas existants)
WORKSPACE_MANAGEMENT_ROLES = {"Créateur", "Administrateur"}

# -----------------------------------------------
# Helpers d'accès — Workspace
# -----------------------------------------------

def _get_workspace_or_404(db: Session, workspace_id: str) -> Workspace:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return workspace


def _get_workspace_member_or_403(db: Session, workspace_id: str, current_user_id: str):
    membre = (
        db.query(Membre)
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == current_user_id,
            Membre.statut == "Actif",
        )
        .first()
    )
    if not membre:
        raise HTTPException(status_code=403, detail="Acces refuse au workspace")
    return membre


_require_workspace_member = _get_workspace_member_or_403


def _require_workspace_management_access(db: Session, workspace_id: str, current_user_id: str):
    membre = _get_workspace_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Privileges insuffisants sur le workspace")
    return membre


# -----------------------------------------------
# Helpers d'accès — Espace
# -----------------------------------------------

def _get_espace_or_404(db: Session, espace_id: str) -> Espace:
    espace = db.query(Espace).filter(Espace.id == espace_id).first()
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    return espace


def _require_espace_access(db: Session, espace_id: str, current_user_id: str):
    """Vérifie l'accès à un espace (soit membre de l'espace, soit membre du workspace parent)."""
    espace = _get_espace_or_404(db, espace_id)
    
    # Check espace membership
    membre_espace = db.query(Membre).filter(
        Membre.id_espace == espace_id,
        Membre.id_utilisateur == current_user_id,
        Membre.statut == "Actif"
    ).first()
    
    if membre_espace:
        return membre_espace
    
    # Fallback: check workspace membership
    return _get_workspace_member_or_403(db, espace.id_workspace, current_user_id)


# -----------------------------------------------
# Helpers d'accès — Liste
# -----------------------------------------------

def _get_liste_or_404(db: Session, liste_id: str) -> Liste:
    liste = db.query(Liste).filter(Liste.id == liste_id).first()
    if not liste:
        raise HTTPException(status_code=404, detail="Liste non trouvee")
    return liste


def _require_list_access(db: Session, liste_id: str, current_user_id: str):
    """Vérifie l'accès à une liste (via son espace ou son workspace)."""
    liste = _get_liste_or_404(db, liste_id)
    
    if liste.id_espace:
        return _require_espace_access(db, liste.id_espace, current_user_id)
    elif liste.id_workspace:
        return _get_workspace_member_or_403(db, liste.id_workspace, current_user_id)
    
    raise HTTPException(status_code=403, detail="Liste orpheline ou acces refuse")

# -----------------------------------------------
# Helpers d'accès — Tache
# -----------------------------------------------

def _get_tache_or_404(db: Session, tache_id: str) -> Tache:
    tache = db.query(Tache).filter(Tache.id == tache_id).first()
    if not tache:
        raise HTTPException(status_code=404, detail="Tache non trouvee")
    return tache
