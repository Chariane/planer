# backend/api_liste_et_tache/crud/tache.py
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import asc, desc, func
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime
from ..models import Tache, Membre, Checklist, Liste
from .notification_events import commit_notification_events, notify_task_assigned

def get_tache_by_id(db: Session, tache_id: str) -> Optional[Tache]:
    return db.query(Tache).filter(Tache.id == tache_id).first()


def get_taches_for_liste(
    db: Session, 
    liste_id: str,
    statut: Optional[str] = None,
    priorite: Optional[str] = None,
    membre_id: Optional[str] = None,
    sort_by: str = "ordre_affichage",
    order: str = "asc"
) -> List[Tache]:
    query = db.query(Tache).filter(Tache.id_liste == liste_id)
    
    # Eager loading des membres, profils et checklists
    query = query.options(
        selectinload(Tache.membres).joinedload(Membre.utilisateur),
        selectinload(Tache.checklists)
    )
    
    # Filtres
    if statut:
        query = query.filter(Tache.statut == statut)
    if priorite:
        query = query.filter(Tache.priorite == priorite)
    if membre_id:
        # On fait une jointure pour filtrer par utilisateur assigné
        query = query.join(Tache.membres).filter(Membre.id_utilisateur == membre_id)
        
    # Tri dynamique
    order_func = asc if order == "asc" else desc
    if hasattr(Tache, sort_by):
        query = query.order_by(order_func(getattr(Tache, sort_by)))
    else:
        query = query.order_by(Tache.ordre_affichage.asc())
        
    taches = query.all()
    
    # Calcul de la progression pour chaque tâche
    statuses_changed = False
    for t in taches:
        total = len(t.checklists)
        if total > 0:
            checked = len([c for c in t.checklists if c.is_checked])
            t.progression = round((checked / total) * 100, 2)
            
            # Transition automatique basée sur les checklists (moins agressive)
            next_status = t.statut
            if checked >= total:
                next_status = "terminé"
            elif checked > 0 and t.statut == "en attente":
                next_status = "en cours"
                
            if t.statut != next_status:
                t.statut = next_status
                t.statut_date = datetime.now()
                statuses_changed = True
        else:
            t.progression = 0.0

    if statuses_changed:
        db.commit()

    return taches


def _ensure_unique_tache_sibling_name(
    db: Session,
    *,
    titre: str,
    id_liste: str,
    exclude_id: Optional[str] = None,
) -> None:
    query = db.query(Tache).filter(
        Tache.id_liste == id_liste,
        func.lower(func.trim(Tache.titre)) == titre.strip().lower(),
    )
    if exclude_id:
        query = query.filter(Tache.id != exclude_id)
    if query.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une tache portant ce nom existe deja dans cette liste.",
        )


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
    if id_liste:
        _ensure_unique_tache_sibling_name(db, titre=titre, id_liste=id_liste)
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

    target_titre = kwargs.get("titre", tache.titre)
    target_liste_id = kwargs.get("id_liste", tache.id_liste)
    if any(key in kwargs for key in ("titre", "id_liste")):
        _ensure_unique_tache_sibling_name(
            db,
            titre=target_titre,
            id_liste=target_liste_id,
            exclude_id=tache.id,
        )
    
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
    from ..models import Checklist
    
    tache = get_tache_by_id(db, tache_id)
    if not tache:
        return False
    
    # Supprimer les checklists de la tâche
    db.query(Checklist).filter(Checklist.id_tache == tache_id).delete(synchronize_session=False)
    
    # Supprimer les membres assignés à la tâche
    db.query(Membre).filter(Membre.id_tache == tache_id).delete(synchronize_session=False)
    
    # Supprimer la tâche
    db.delete(tache)
    
    try:
        db.commit()
    except Exception:
        db.rollback()
        return False
    return True


# --- Assignation de membres ---

def _get_tache_with_scope(db: Session, tache_id: str) -> Optional[Tache]:
    return (
        db.query(Tache)
        .options(
            joinedload(Tache.liste).joinedload(Liste.espace),
            joinedload(Tache.liste).joinedload(Liste.workspace),
        )
        .filter(Tache.id == tache_id)
        .first()
    )

def assign_member_to_tache(db: Session, tache_id: str, utilisateur_id: str) -> Membre:
    """Assigne un utilisateur à une tâche en créant une entrée spécifique dans Membre."""
    tache = _get_tache_with_scope(db, tache_id)
    if not tache:
        raise HTTPException(status_code=404, detail="Tache introuvable.")

    liste_member = db.query(Membre).filter(
        Membre.id_liste == tache.id_liste,
        Membre.id_utilisateur == utilisateur_id,
        Membre.statut == "Actif",
    ).first()
    if not liste_member:
        raise HTTPException(
            status_code=403,
            detail="Seuls les utilisateurs avec le role Membre dans la liste peuvent etre assignes a une tache.",
        )
    if liste_member.role != "Membre":
        raise HTTPException(
            status_code=403,
            detail="Seuls les utilisateurs avec le role Membre dans la liste peuvent etre assignes a une tache.",
        )

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
        notify_task_assigned(db, tache=tache, assigned_user_id=utilisateur_id)
        commit_notification_events(db)
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
    return (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(Membre.id_tache == tache_id)
        .all()
    )


def get_taches_kanban(db: Session, liste_id: str) -> dict:
    """Récupère les tâches d'une liste et les regroupe par colonnes de statut."""
    taches = db.query(Tache).filter(Tache.id_liste == liste_id)\
        .options(
            selectinload(Tache.membres).joinedload(Membre.utilisateur),
            selectinload(Tache.checklists)
        )\
        .order_by(Tache.ordre_affichage).all()
    
    # On initialise les colonnes avec les statuts officiels
    kanban = {
        "en attente": [],
        "en cours": [],
        "terminé": [],
        "bloqué": []
    }
    
    for t in taches:
        # Calcul progression
        total = len(t.checklists)
        if total > 0:
            checked = len([c for c in t.checklists if c.is_checked])
            t.progression = round((checked / total) * 100, 2)
        else:
            t.progression = 0.0
            
        status = t.statut if t.statut in kanban else "en attente" # Sécurité
        kanban[status].append(t)
        
    return kanban

# backend/api_liste_et_tache/crud/tache.py
def _status_from_checklist_counts(checked_count: int, total: int) -> str:
    if total <= 0:
        return "en attente" # Comportement par défaut pour création
    if checked_count >= total:
        return "terminé"
    if checked_count > 0:
        return "en cours"
    return "en attente"


def update_tache_status_based_on_checklists(db: Session, tache_id: str):
    """Met à jour le statut d'une tâche en fonction de ses checklists"""
    from ..models import Checklist
    
    # Récupérer toutes les checklists de la tâche
    checklists = db.query(Checklist).filter(Checklist.id_tache == tache_id).all()
    
    if not checklists:
        return
    
    checked_count = sum(1 for c in checklists if c.is_checked)
    total = len(checklists)
    
    # Récupérer la tâche
    tache = get_tache_by_id(db, tache_id)
    if not tache:
        return
    
    next_status = tache.statut
    if checked_count >= total and total > 0:
        next_status = "terminé"
    elif checked_count > 0:
        next_status = "en cours"
    # Note: On ne force pas "en attente" si checked_count == 0 pour laisser le choix manuel

    if tache.statut != next_status:
        tache.statut = next_status
        tache.statut_date = datetime.now()
        db.commit()
        print(f"🔄 Tâche {tache_id} automatiquement passée au statut {next_status}")
        

def update_taches_bulk(db: Session, items: List[dict]) -> bool:
    """Met à jour plusieurs tâches (statut, ordre) dans une seule transaction."""
    try:
        for item in items:
            tache_id = item.get("id")
            if not tache_id:
                continue
                
            tache = db.query(Tache).filter(Tache.id == tache_id).first()
            if not tache:
                continue
            
            # Mise à jour des champs si fournis
            if "statut" in item and item["statut"] != tache.statut:
                tache.statut = item["statut"]
                tache.statut_date = datetime.now()
            
            if "ordre_affichage" in item:
                tache.ordre_affichage = item["ordre_affichage"]
                
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False
