from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..models import Membre, Utilisateur, Espace, Liste
from ..database import get_db
from ..schemas import ListeCreate, ListeOut, ListeUpdate
from ..security import get_current_user
from ..crud.liste_crud import (
    get_liste_by_id,
    get_listes_by_workspace,
    get_listes_by_espace,
    create_liste,
    update_liste,
    delete_liste,
    get_listes_accessibles_par_utilisateur
)

router = APIRouter(prefix="/listes", tags=["Listes"])

def check_workspace_or_espace_access(db: Session, workspace_id: str, espace_id: str, user_id: str):
    """Vérifie que l'utilisateur a accès au workspace ou à l'espace."""
    if workspace_id:
        membre = db.query(Membre).filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == user_id
        ).first()
        if not membre:
            raise HTTPException(status_code=403, detail="Accès refusé au workspace")
    elif espace_id:
        espace = db.query(Espace).filter(Espace.id == espace_id).first()
        if not espace:
            raise HTTPException(status_code=404, detail="Espace non trouvé")
        membre = db.query(Membre).filter(
            Membre.id_workspace == espace.id_workspace,
            Membre.id_utilisateur == user_id
        ).first()
        if not membre:
            raise HTTPException(status_code=403, detail="Accès refusé à l'espace")
    else:
        raise HTTPException(status_code=400, detail="Une liste doit être liée à un workspace ou un espace")
    return True

@router.post("", response_model=ListeOut, status_code=status.HTTP_201_CREATED)
def create_liste_endpoint(
    data: ListeCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not data.id_workspace and not data.id_espace:
        raise HTTPException(status_code=400, detail="Il faut préciser id_workspace ou id_espace")
    check_workspace_or_espace_access(db, data.id_workspace, data.id_espace, current_user.id)
    new_liste = create_liste(db, data.nom, data.description, data.id_workspace, data.id_espace)
    return new_liste

@router.get("", response_model=List[ListeOut])
def get_listes(
    workspace_id: str = None,
    espace_id: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if workspace_id:
        check_workspace_or_espace_access(db, workspace_id, None, current_user.id)
        listes = get_listes_by_workspace(db, workspace_id)
    elif espace_id:
        check_workspace_or_espace_access(db, None, espace_id, current_user.id)
        listes = get_listes_by_espace(db, espace_id)
    else:
        raise HTTPException(status_code=400, detail="Il faut préciser workspace_id ou espace_id")
    return listes

@router.get("/{liste_id}", response_model=ListeOut)
def get_liste(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        raise HTTPException(status_code=404, detail="Liste non trouvée")
    check_workspace_or_espace_access(db, liste.id_workspace, liste.id_espace, current_user.id)
    return liste

@router.put("/{liste_id}", response_model=ListeOut)
def update_liste_endpoint(
    liste_id: str,
    data: ListeUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        raise HTTPException(status_code=404, detail="Liste non trouvée")
    check_workspace_or_espace_access(db, liste.id_workspace, liste.id_espace, current_user.id)
    updated = update_liste(db, liste_id, data.nom, data.description)
    return updated

@router.delete("/{liste_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_liste_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        raise HTTPException(status_code=404, detail="Liste non trouvée")
    check_workspace_or_espace_access(db, liste.id_workspace, liste.id_espace, current_user.id)
    if not delete_liste(db, liste_id):
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")
    return None

@router.get("/search", response_model=List[ListeOut])
def search_listes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    nom_contient: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    listes_accessibles = get_listes_accessibles_par_utilisateur(db, current_user.id)
    query = db.query(Liste).filter(Liste.id.in_([l.id for l in listes_accessibles]))

    if workspace_id:
        query = query.filter(Liste.id_workspace == workspace_id)
    if espace_id:
        query = query.filter(Liste.id_espace == espace_id)
    if nom_contient:
        query = query.filter(Liste.nom.ilike(f"%{nom_contient}%"))

    listes = query.offset(skip).limit(limit).all()
    return listes

@router.get("/{liste_id}/membres/search", response_model=List[dict])
def search_membres_in_liste(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    nom_contient: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        raise HTTPException(404, "Liste non trouvée")
    check_workspace_or_espace_access(db, liste.id_workspace, liste.id_espace, current_user.id)

    membres = db.query(Membre).filter(Membre.id_liste == liste_id)
    if nom_contient:
        membres = membres.join(Utilisateur, Membre.id_utilisateur == Utilisateur.id).filter(
            (Utilisateur.nom.ilike(f"%{nom_contient}%")) |
            (Utilisateur.prenoms.ilike(f"%{nom_contient}%"))
        )
    membres = membres.offset(skip).limit(limit).all()

    result = []
    for m in membres:
        user = db.query(Utilisateur).filter(Utilisateur.id == m.id_utilisateur).first()
        if user:
            result.append({
                "id": user.id,
                "username": user.username,
                "nom": user.nom,
                "prenoms": user.prenoms,
                "role": m.role,
                "statut": m.statut
            })
    return result