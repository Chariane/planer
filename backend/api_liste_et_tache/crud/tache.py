from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime
from ..models import Tache, Membre

def get_tache_by_id(db: Session, tache_id: str) -> Optional[Tache]:
    return db.query(Tache).filter(Tache.id == tache_id).first()


def get_taches_for_liste(db: Session, liste_id: str) -> List[Tache]:
    return db.query(Tache).filter(Tache.id_liste == liste_id).order_by(Tache.ordre_affichage).all()


def create_tache(
    db: Session,
    titre: str,
    description: Optional[str] = None,
    date_debut: Optional[datetime] = None,
    date_fin_prevue: Optional[datetime] = None,
    statut: str = "en attente",
    priorite: str = "moyenne",
    ordre_affichage: Optional[int] = 0,
    id_liste: Optional[str] = None,
) -> Tache:
    now = datetime.now()
    tache = Tache(
        titre=titre,
        description=description,
        date_debut=date_debut,
        date_fin_prevue=date_fin_prevue,
        statut=statut,
        statut_date=now,
        priorite=priorite,
        ordre_affichage=ordre_affichage,
        id_liste=id_liste,
    )
    db.add(tache)
    try:
        db.commit()
        db.refresh(tache)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de creer la tache (conflit d'integrite).",
        ) from exc
    return tache


def update_tache(db: Session, tache_id: str, **kwargs) -> Optional[Tache]:
    tache = get_tache_by_id(db, tache_id)
    if not tache:
        return None
    
    status_changed = False
    if "statut" in kwargs and kwargs["statut"] != tache.statut:
        status_changed = True
        tache.statut_date = datetime.now()

    for key, value in kwargs.items():
        if hasattr(tache, key) and value is not None:
            setattr(tache, key, value)
            
    try:
        db.commit()
        db.refresh(tache)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de mettre a jour la tache.",
        ) from exc
    return tache


def delete_tache(db: Session, tache_id: str) -> bool:
    tache = get_tache_by_id(db, tache_id)
    if not tache:
        return False
    
    db.delete(tache)
    try:
        db.commit()
    except Exception:
        db.rollback()
        return False
    return True


# --- Assignation de membres ---

def assign_member_to_tache(db: Session, tache_id: str, utilisateur_id: str) -> Membre:
    """Assigne un utilisateur à une tâche en créant une entrée spécifique dans Membre."""
    # On vérifie si l'assignation existe déjà pour éviter les doublons
    existing = db.query(Membre).filter(
        Membre.id_tache == tache_id,
        Membre.id_utilisateur == utilisateur_id
    ).first()
    
    if existing:
        return existing
        
    assignation = Membre(
        id_tache=tache_id,
        id_utilisateur=utilisateur_id,
        role="Membre",
        statut="Actif"
    )
    db.add(assignation)
    try:
        db.commit()
        db.refresh(assignation)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur lors de l'assignation du membre.")
    return assignation


def unassign_member_from_tache(db: Session, tache_id: str, utilisateur_id: str) -> bool:
    """Retire l'assignation d'un membre sur une tâche."""
    assignation = db.query(Membre).filter(
        Membre.id_tache == tache_id,
        Membre.id_utilisateur == utilisateur_id
    ).first()
    
    if assignation:
        db.delete(assignation)
        db.commit()
        return True
    return False

def get_tache_members(db: Session, tache_id: str) -> List[Membre]:
    """Récupère tous les membres assignés à une tâche."""
    return db.query(Membre).filter(Membre.id_tache == tache_id).all()
