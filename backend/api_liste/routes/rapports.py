from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..models import Membre, Liste
from ..database import get_db
from ..schemas import RapportCreate, RapportOut, RapportUpdate
from ..security import get_current_user
from ..crud.rapport_crud import (
    get_rapport_by_id,
    get_rapports_by_membre,
    get_rapports_by_liste_via_membre,
    create_rapport,
    update_rapport,
    delete_rapport
)

router = APIRouter(prefix="/rapports", tags=["Rapports"])

def check_membre_liste(db: Session, membre_id: str, liste_id: str, user_id: str) -> Membre:
    """Vérifie que le membre appartient bien à la liste et que l'utilisateur a le droit de voir/agir."""
    membre = db.query(Membre).filter(
        Membre.id == membre_id,
        Membre.id_liste == liste_id,
        Membre.id_utilisateur == user_id
    ).first()
    if not membre:
        raise HTTPException(status_code=403, detail="Accès refusé")
    return membre

@router.post("/listes/{liste_id}/membres/{membre_id}", response_model=RapportOut, status_code=status.HTTP_201_CREATED)
def create_rapport_for_membre(
    liste_id: str,
    membre_id: str,
    data: RapportCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Vérifier que le membre est bien l'utilisateur courant (ou admin, mais on simplifie)
    membre = db.query(Membre).filter(
        Membre.id == membre_id,
        Membre.id_liste == liste_id,
        Membre.id_utilisateur == current_user.id
    ).first()
    if not membre:
        raise HTTPException(status_code=403, detail="Vous ne pouvez créer un rapport que pour vous-même")

    new_rapport = create_rapport(
        db,
        membre_id=membre_id,
        titre=data.titre,
        realisations=data.realisations,
        difficultes_et_solutions=data.difficultes_et_solutions,
        commentaire=data.commentaire,
        periode_debut=data.periode_debut,
        periode_fin=data.periode_fin,
        fichier_joint=data.fichier_joint
    )
    return new_rapport

@router.get("/listes/{liste_id}", response_model=List[RapportOut])
def get_rapports_for_liste(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Vérifier que l'utilisateur est membre de la liste (ou du workspace parent)
    from ..crud.liste_crud import get_liste_by_id
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        raise HTTPException(status_code=404, detail="Liste non trouvée")
    # Vérification d'accès via la fonction check_workspace_or_espace_access (déjà écrite dans listes.py)
    from .listes import check_workspace_or_espace_access
    check_workspace_or_espace_access(db, liste.id_workspace, liste.id_espace, current_user.id)

    rapports = get_rapports_by_liste_via_membre(db, liste_id)
    return rapports

@router.get("/{rapport_id}", response_model=RapportOut)
def get_rapport(
    rapport_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    rapport = get_rapport_by_id(db, rapport_id)
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    # Vérifier que l'utilisateur a le droit de voir ce rapport
    # (il est soit l'auteur, soit membre de la liste)
    membre = db.query(Membre).filter(
        Membre.id == rapport.id_membre,
        Membre.id_utilisateur == current_user.id
    ).first()
    if not membre:
        # Vérifier si l'utilisateur est admin du workspace parent
        from ..crud.liste_crud import get_liste_by_id
        liste = db.query(Liste).join(Membre, Liste.id == Membre.id_liste).filter(Membre.id == rapport.id_membre).first()
        if liste:
            from .listes import check_workspace_or_espace_access
            try:
                check_workspace_or_espace_access(db, liste.id_workspace, liste.id_espace, current_user.id)
            except HTTPException:
                raise HTTPException(status_code=403, detail="Accès refusé")
        else:
            raise HTTPException(status_code=403, detail="Accès refusé")
    return rapport

@router.put("/{rapport_id}", response_model=RapportOut)
def update_rapport(
    rapport_id: str,
    data: RapportUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    rapport = get_rapport_by_id(db, rapport_id)
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    # Seul l'auteur peut modifier son rapport
    membre = db.query(Membre).filter(
        Membre.id == rapport.id_membre,
        Membre.id_utilisateur == current_user.id
    ).first()
    if not membre:
        raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que vos propres rapports")
    update_data = data.model_dump(exclude_unset=True)
    updated = update_rapport(db, rapport_id, **update_data)
    return updated

@router.delete("/{rapport_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rapport(
    rapport_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    rapport = get_rapport_by_id(db, rapport_id)
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    # Seul l'auteur ou admin peut supprimer
    membre = db.query(Membre).filter(
        Membre.id == rapport.id_membre,
        Membre.id_utilisateur == current_user.id
    ).first()
    if not membre:
        # Si pas l'auteur, vérifier si admin du workspace
        from ..crud.liste_crud import get_liste_by_id
        liste = db.query(Liste).join(Membre, Liste.id == Membre.id_liste).filter(Membre.id == rapport.id_membre).first()
        if liste:
            from .listes import check_workspace_or_espace_access
            try:
                check_workspace_or_espace_access(db, liste.id_workspace, liste.id_espace, current_user.id)
                # Ici, si l'utilisateur a accès à la liste, on autorise la suppression (à affiner selon rôles)
            except HTTPException:
                raise HTTPException(status_code=403, detail="Vous ne pouvez pas supprimer ce rapport")
        else:
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas supprimer ce rapport")
    if not delete_rapport(db, rapport_id):
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")
    return None