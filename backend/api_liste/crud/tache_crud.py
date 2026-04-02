from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from ..models import Tache, Membre, Checklist
from .liste_crud import get_listes_accessibles_par_utilisateur

def get_tache_by_id(db: Session, tache_id: str) -> Optional[Tache]:
    return db.query(Tache).filter(Tache.id == tache_id).first()

def get_taches_by_liste(db: Session, liste_id: str) -> List[Tache]:
    return db.query(Tache).filter(Tache.id_liste == liste_id).all()

def create_tache(db: Session, titre: str, description: str, statut: str, priorite: str,
                 date_fin_prevue: Optional[datetime], id_liste: str, id_membre_assignee: Optional[str] = None) -> Tache:
    tache = Tache(
        titre=titre,
        description=description,
        statut=statut,
        priorite=priorite,
        date_fin_prevue=date_fin_prevue,
        id_liste=id_liste
    )
    if id_membre_assignee:
        tache.id_membre_assignee = id_membre_assignee
    db.add(tache)
    db.commit()
    db.refresh(tache)
    return tache

def update_tache(db: Session, tache_id: str, **kwargs) -> Tache:
    tache = get_tache_by_id(db, tache_id)
    if tache:
        for key, value in kwargs.items():
            if value is not None:
                setattr(tache, key, value)
        db.commit()
        db.refresh(tache)
    return tache

def delete_tache(db: Session, tache_id: str) -> bool:
    tache = get_tache_by_id(db, tache_id)
    if tache:
        db.delete(tache)
        db.commit()
        return True
    return False

def search_taches(
    db: Session,
    user_id: str,
    liste_id: Optional[str] = None,
    statut: Optional[str] = None,
    priorite: Optional[str] = None,
    assigne_a: Optional[str] = None,
    date_debut_min: Optional[datetime] = None,
    date_fin_max: Optional[datetime] = None,
    recherche_texte: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Tache]:
    # Récupérer les listes accessibles par l'utilisateur
    listes_accessibles = get_listes_accessibles_par_utilisateur(db, user_id)
    listes_ids = [l.id for l in listes_accessibles]

    query = db.query(Tache).filter(Tache.id_liste.in_(listes_ids))

    if liste_id:
        if liste_id not in listes_ids:
            return []
        query = query.filter(Tache.id_liste == liste_id)
    if statut:
        query = query.filter(Tache.statut == statut)
    if priorite:
        query = query.filter(Tache.priorite == priorite)
    if assigne_a:
        query = query.filter(Tache.id_membre_assignee == assigne_a)
    if date_debut_min:
        query = query.filter(Tache.date_fin_prevue >= date_debut_min)
    if date_fin_max:
        query = query.filter(Tache.date_fin_prevue <= date_fin_max)
    if recherche_texte:
        query = query.filter(
            (Tache.titre.ilike(f"%{recherche_texte}%")) |
            (Tache.description.ilike(f"%{recherche_texte}%"))
        )

    query = query.options(joinedload(Tache.checklists))
    taches = query.offset(skip).limit(limit).all()
    return taches