from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..models import Membre
from ..database import get_db
from ..schemas import TacheCreate, TacheOut, TacheUpdate
from ..security import get_current_user
from ..crud.tache_crud import (
    get_tache_by_id,
    get_taches_by_liste,
    create_tache,
    update_tache,
    delete_tache,
    search_taches
)
from ..crud.liste_crud import get_liste_by_id

router = APIRouter(prefix="/taches", tags=["Tâches"])

def check_liste_access(db: Session, liste_id: str, user_id: str):
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        raise HTTPException(status_code=404, detail="Liste non trouvée")
    if liste.id_workspace:
        membre = db.query(Membre).filter(
            Membre.id_workspace == liste.id_workspace,
            Membre.id_utilisateur == user_id
        ).first()
    else:
        from api_gateway.models import Espace
        espace = db.query(Espace).filter(Espace.id == liste.id_espace).first()
        if not espace:
            raise HTTPException(status_code=404, detail="Espace parent non trouvé")
        membre = db.query(Membre).filter(
            Membre.id_workspace == espace.id_workspace,
            Membre.id_utilisateur == user_id
        ).first()
    if not membre:
        raise HTTPException(status_code=403, detail="Accès refusé à la liste")
    return membre

@router.post("", response_model=TacheOut, status_code=status.HTTP_201_CREATED)
def create_tache_endpoint(
    data: TacheCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    check_liste_access(db, data.id_liste, current_user.id)
    new_tache = create_tache(
        db,
        titre=data.titre,
        description=data.description,
        statut=data.statut,
        priorite=data.priorite,
        date_fin_prevue=data.date_fin_prevue,
        id_liste=data.id_liste,
        id_membre_assignee=data.id_membre_assignee
    )
    return new_tache

@router.get("/{tache_id}", response_model=TacheOut)
def get_tache(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    tache = get_tache_by_id(db, tache_id)
    if not tache:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    check_liste_access(db, tache.id_liste, current_user.id)
    return tache

@router.put("/{tache_id}", response_model=TacheOut)
def update_tache_endpoint(
    tache_id: str,
    data: TacheUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    tache = get_tache_by_id(db, tache_id)
    if not tache:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    check_liste_access(db, tache.id_liste, current_user.id)
    update_data = data.model_dump(exclude_unset=True)
    updated = update_tache(db, tache_id, **update_data)
    return updated

@router.delete("/{tache_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tache_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    tache = get_tache_by_id(db, tache_id)
    if not tache:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    check_liste_access(db, tache.id_liste, current_user.id)
    if not delete_tache(db, tache_id):
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")
    return None

@router.get("/search", response_model=List[TacheOut])
def search_taches_endpoint(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    liste_id: Optional[str] = None,
    statut: Optional[str] = None,
    priorite: Optional[str] = None,
    assigne_a: Optional[str] = None,
    date_debut_min: Optional[datetime] = None,
    date_fin_max: Optional[datetime] = None,
    recherche_texte: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    taches = search_taches(
        db,
        user_id=current_user.id,
        liste_id=liste_id,
        statut=statut,
        priorite=priorite,
        assigne_a=assigne_a,
        date_debut_min=date_debut_min,
        date_fin_max=date_fin_max,
        recherche_texte=recherche_texte,
        skip=skip,
        limit=limit
    )
    return taches