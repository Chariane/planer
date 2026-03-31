from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Espace, Membre, Utilisateur
from schemas import (
    EspaceCreate, EspaceOut, EspaceUpdate,
    MembreCreate, MembreOut, UtilisateurOut
)
from security import get_current_user

router = APIRouter(tags=["Espaces"])

@router.post("/workspaces/{workspace_id}/spaces", response_model=EspaceOut, status_code=status.HTTP_201_CREATED)
def create_space_in_workspace(
    workspace_id: str,
    space_in: EspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    # Vérifier l'accès au workspace
    membre = db.query(Membre).filter(Membre.id_workspace == workspace_id, Membre.id_utilisateur == current_user.id).first()
    if not membre or membre.role not in ["Propriétaire", "Admin", "Editeur"]:
        raise HTTPException(status_code=403, detail="Privilèges insuffisants dans ce workspace")
        
    new_space = Espace(**space_in.model_dump(), id_workspace=workspace_id)
    db.add(new_space)
    db.commit()
    db.refresh(new_space)
    return new_space

@router.get("/workspaces/{workspace_id}/spaces", response_model=List[EspaceOut])
def get_spaces_in_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    membre = db.query(Membre).filter(Membre.id_workspace == workspace_id, Membre.id_utilisateur == current_user.id).first()
    if not membre:
        raise HTTPException(status_code=403, detail="Accès refusé")
        
    spaces = db.query(Espace).filter(Espace.id_workspace == workspace_id, Espace.id_espace_parent == None).all()
    return spaces

@router.put("/spaces/{space_id}", response_model=EspaceOut)
def update_space(
    space_id: str,
    space_in: EspaceUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    space = db.query(Espace).filter(Espace.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Espace non trouvé")
        
    membre = db.query(Membre).filter(Membre.id_workspace == space.id_workspace, Membre.id_utilisateur == current_user.id).first()
    if not membre or membre.role not in ["Propriétaire", "Admin", "Editeur"]:
        raise HTTPException(status_code=403, detail="Privilèges insuffisants")
        
    update_data = space_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(space, key, value)
        
    db.commit()
    db.refresh(space)
    return space

@router.delete("/spaces/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_space(
    space_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    space = db.query(Espace).filter(Espace.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Espace non trouvé")
        
    membre = db.query(Membre).filter(Membre.id_workspace == space.id_workspace, Membre.id_utilisateur == current_user.id).first()
    if not membre or membre.role not in ["Propriétaire", "Admin"]:
        raise HTTPException(status_code=403, detail="Seul un Administrateur ou Propriétaire peut supprimer cet espace")
        
    db.delete(space)
    db.commit()
    return None

@router.post("/spaces/{space_id}/subspaces", response_model=EspaceOut, status_code=status.HTTP_201_CREATED)
def create_subspace(
    space_id: str,
    space_in: EspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    parent_space = db.query(Espace).filter(Espace.id == space_id).first()
    if not parent_space:
        raise HTTPException(status_code=404, detail="Espace parent non trouvé")
        
    membre = db.query(Membre).filter(Membre.id_workspace == parent_space.id_workspace, Membre.id_utilisateur == current_user.id).first()
    if not membre or membre.role not in ["Propriétaire", "Admin", "Editeur"]:
        raise HTTPException(status_code=403, detail="Privilèges insuffisants")
        
    new_space = Espace(
        **space_in.model_dump(), 
        id_workspace=parent_space.id_workspace,
        id_espace_parent=space_id
    )
    db.add(new_space)
    db.commit()
    db.refresh(new_space)
    return new_space

@router.post("/spaces/{space_id}/invite", response_model=MembreOut)
def invite_member_to_space(
    space_id: str,
    membre_in: MembreCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    space = db.query(Espace).filter(Espace.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Espace non trouvé")
        
    current_membre = db.query(Membre).filter(Membre.id_workspace == space.id_workspace, Membre.id_utilisateur == current_user.id).first()
    if not current_membre or current_membre.role not in ["Propriétaire", "Admin"]:
        raise HTTPException(status_code=403, detail="Privilèges insuffisants pour inviter dans cet espace")
        
    db_user = db.query(Utilisateur).filter(Utilisateur.id == membre_in.id_utilisateur).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur invité non trouvé")
        
    existing_member = db.query(Membre).filter(
        Membre.id_espace == space_id, 
        Membre.id_utilisateur == membre_in.id_utilisateur
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="L'utilisateur est déjà membre de cet espace")
        
    new_membre = Membre(
        id_utilisateur=membre_in.id_utilisateur,
        id_workspace=space.id_workspace,
        id_espace=space_id,
        role=membre_in.role,
        statut=membre_in.statut
    )
    db.add(new_membre)
    db.commit()
    db.refresh(new_membre)
    return new_membre
