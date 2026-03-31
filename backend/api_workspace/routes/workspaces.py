from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Workspace, Membre, Utilisateur
from schemas import (
    WorkspaceCreate, WorkspaceOut, WorkspaceUpdate,
    MembreCreate, MembreOut, MembreUpdate, UtilisateurOut
)
from security import get_current_user

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

@router.post("", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
def create_workspace(
    workspace_in: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    new_workspace = Workspace(**workspace_in.model_dump(), id_utilisateur=current_user.id)
    db.add(new_workspace)
    db.commit()
    db.refresh(new_workspace)
    
    # Créer le membre propriétaire
    proprietaire = Membre(
        role="Propriétaire",
        statut="Actif",
        id_utilisateur=current_user.id,
        id_workspace=new_workspace.id
    )
    db.add(proprietaire)
    db.commit()
    return new_workspace

@router.get("", response_model=List[WorkspaceOut])
def get_workspaces(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    # Les workspaces où l'utilisateur est membre
    workspaces = (
        db.query(Workspace)
        .join(Membre, Workspace.id == Membre.id_workspace)
        .filter(Membre.id_utilisateur == current_user.id)
        .all()
    )
    return workspaces

@router.get("/{workspace_id}", response_model=WorkspaceOut)
def get_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    membre = db.query(Membre).filter(Membre.id_workspace == workspace_id, Membre.id_utilisateur == current_user.id).first()
    if not membre:
        raise HTTPException(status_code=403, detail="Accès refusé")
        
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    return workspace

@router.put("/{workspace_id}", response_model=WorkspaceOut)
def update_workspace(
    workspace_id: str,
    workspace_in: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    membre = db.query(Membre).filter(Membre.id_workspace == workspace_id, Membre.id_utilisateur == current_user.id).first()
    if not membre or membre.role not in ["Propriétaire", "Admin"]:
        raise HTTPException(status_code=403, detail="Privilèges insuffisants")
        
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
        
    update_data = workspace_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(workspace, key, value)
        
    db.commit()
    db.refresh(workspace)
    return workspace

@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    membre = db.query(Membre).filter(Membre.id_workspace == workspace_id, Membre.id_utilisateur == current_user.id).first()
    if not membre or membre.role != "Propriétaire":
        raise HTTPException(status_code=403, detail="Seul le propriétaire peut supprimer le workspace")
        
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
        
    db.delete(workspace)
    db.commit()
    return None

@router.post("/{workspace_id}/invite", response_model=MembreOut)
def invite_member(
    workspace_id: str,
    membre_in: MembreCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    current_membre = db.query(Membre).filter(Membre.id_workspace == workspace_id, Membre.id_utilisateur == current_user.id).first()
    if not current_membre or current_membre.role not in ["Propriétaire", "Admin"]:
        raise HTTPException(status_code=403, detail="Privilèges insuffisants pour inviter")
        
    db_user = db.query(Utilisateur).filter(Utilisateur.id == membre_in.id_utilisateur).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur invité non trouvé")
        
    existing_member = db.query(Membre).filter(
        Membre.id_workspace == workspace_id, 
        Membre.id_utilisateur == membre_in.id_utilisateur
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="L'utilisateur est déjà membre de ce workspace")
        
    new_membre = Membre(
        id_utilisateur=membre_in.id_utilisateur,
        id_workspace=workspace_id,
        role=membre_in.role,
        statut=membre_in.statut
    )
    db.add(new_membre)
    db.commit()
    db.refresh(new_membre)
    return new_membre

@router.get("/{workspace_id}/members", response_model=List[MembreOut])
def get_members(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    membre = db.query(Membre).filter(Membre.id_workspace == workspace_id, Membre.id_utilisateur == current_user.id).first()
    if not membre:
        raise HTTPException(status_code=403, detail="Accès refusé")
        
    members = db.query(Membre).filter(Membre.id_workspace == workspace_id).all()
    return members

@router.put("/{workspace_id}/members/{user_id}", response_model=MembreOut)
def update_member(
    workspace_id: str,
    user_id: str,
    membre_in: MembreUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    current_membre = db.query(Membre).filter(Membre.id_workspace == workspace_id, Membre.id_utilisateur == current_user.id).first()
    if not current_membre or current_membre.role not in ["Propriétaire", "Admin"]:
        raise HTTPException(status_code=403, detail="Privilèges insuffisants pour modifier un membre")
        
    target_membre = db.query(Membre).filter(Membre.id_workspace == workspace_id, Membre.id_utilisateur == user_id).first()
    if not target_membre:
        raise HTTPException(status_code=404, detail="Membre ciblé non trouvé")
        
    if "role" in membre_in.model_dump(exclude_unset=True) and target_membre.role == "Propriétaire":
        raise HTTPException(status_code=400, detail="Impossible de modifier le rôle du Propriétaire")
        
    update_data = membre_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(target_membre, key, value)
        
    db.commit()
    db.refresh(target_membre)
    return target_membre
