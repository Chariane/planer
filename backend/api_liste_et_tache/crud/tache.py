# backend/api_liste_et_tache/crud/tache.py
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import asc, desc, func
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from typing import Dict, List, Optional
from datetime import datetime
from ..models import Tache, Membre, Checklist, Liste, Espace
from .notification_events import commit_notification_events, notify_task_assigned

def get_tache_by_id(db: Session, tache_id: str) -> Optional[Tache]:
    return db.query(Tache).filter(Tache.id == tache_id).first()


def _next_status_from_progress(progress: float) -> str:
    if progress >= 100:
        return "terminé"
    if progress > 0:
        return "en cours"
    return "en attente"


def _progress_from_manual_status(tache: Tache) -> float:
    return 100.0 if tache.statut == "terminé" else 0.0


def _apply_computed_status(tache: Tache, progress: float) -> bool:
    next_status = _next_status_from_progress(progress)
    if tache.statut != next_status:
        tache.statut = next_status
        tache.statut_date = datetime.now()
        return True
    return False


def _recompute_liste_task_progressions(db: Session, liste_id: str) -> Dict[str, float]:
    """Calcule la progression en séparant bien tâches, sous-tâches et checklists.

    - Une tâche parent suit la progression moyenne de ses sous-tâches directes.
    - Une tâche sans sous-tâche suit ses checklists.
    - Une tâche sans sous-tâche ni checklist garde une progression liée à son statut manuel.
    """
    all_taches = (
        db.query(Tache)
        .options(selectinload(Tache.checklists))
        .filter(Tache.id_liste == liste_id)
        .all()
    )
    by_parent: Dict[Optional[str], List[Tache]] = {}
    by_id = {tache.id: tache for tache in all_taches}
    for tache in all_taches:
        by_parent.setdefault(tache.id_tache_parent, []).append(tache)

    progressions: Dict[str, float] = {}
    statuses_changed = False

    def compute(tache: Tache, stack: Optional[set[str]] = None) -> float:
        nonlocal statuses_changed
        if tache.id in progressions:
            return progressions[tache.id]

        stack = stack or set()
        if tache.id in stack:
            progressions[tache.id] = 0.0
            return 0.0
        stack.add(tache.id)

        children = by_parent.get(tache.id, [])
        if children:
            child_progressions = [compute(child, stack.copy()) for child in children]
            progress = round(sum(child_progressions) / len(child_progressions), 2)
            statuses_changed = _apply_computed_status(tache, progress) or statuses_changed
        elif tache.checklists:
            checked = sum(1 for checklist in tache.checklists if checklist.is_checked)
            progress = round((checked / len(tache.checklists)) * 100, 2)
            statuses_changed = _apply_computed_status(tache, progress) or statuses_changed
        else:
            progress = _progress_from_manual_status(tache)

        tache.progression = progress
        progressions[tache.id] = progress
        return progress

    for tache in all_taches:
        compute(tache)

    if statuses_changed:
        db.commit()
        refreshed = (
            db.query(Tache)
            .options(selectinload(Tache.checklists))
            .filter(Tache.id.in_(by_id.keys()))
            .all()
        )
        for tache in refreshed:
            tache.progression = progressions.get(tache.id, 0.0)

    return progressions


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
        
    progressions = _recompute_liste_task_progressions(db, liste_id)
    taches = query.all()
    for tache in taches:
        tache.progression = progressions.get(tache.id, 0.0)
    return taches


def _ensure_unique_tache_sibling_name(
    db: Session,
    *,
    titre: str,
    id_liste: str,
    id_tache_parent: Optional[str] = None,
    exclude_id: Optional[str] = None,
) -> None:
    query = db.query(Tache).filter(
        Tache.id_liste == id_liste,
        func.lower(func.trim(Tache.titre)) == titre.strip().lower(),
    )
    if id_tache_parent:
        query = query.filter(Tache.id_tache_parent == id_tache_parent)
    else:
        query = query.filter(Tache.id_tache_parent.is_(None))
    if exclude_id:
        query = query.filter(Tache.id != exclude_id)
    if query.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une tache portant ce nom existe deja au meme niveau.",
        )


def _resolve_parent_scope(
    db: Session,
    *,
    id_tache_parent: Optional[str],
    id_liste: Optional[str],
) -> tuple[Optional[str], Optional[Tache]]:
    if not id_tache_parent:
        return id_liste, None

    parent = get_tache_by_id(db, id_tache_parent)
    if not parent:
        raise HTTPException(status_code=404, detail="Tache parent introuvable.")
    if id_liste and parent.id_liste != id_liste:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une sous-tache doit appartenir a la meme liste que sa tache parent.",
        )
    return parent.id_liste, parent


def _ensure_no_parent_cycle(db: Session, *, tache_id: str, id_tache_parent: Optional[str]) -> None:
    current_parent_id = id_tache_parent
    visited: set[str] = set()
    while current_parent_id:
        if current_parent_id == tache_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Une tache ne peut pas devenir sa propre sous-tache.",
            )
        if current_parent_id in visited:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La hierarchie des sous-taches contient une boucle.",
            )
        visited.add(current_parent_id)
        parent = get_tache_by_id(db, current_parent_id)
        current_parent_id = parent.id_tache_parent if parent else None


def _ensure_subtask_due_date_within_parent(
    *,
    date_fin_prevue: Optional[datetime],
    parent: Optional[Tache],
) -> None:
    if not date_fin_prevue or not parent or not parent.date_fin_prevue:
        return
    if date_fin_prevue > parent.date_fin_prevue:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La date de fin d'une sous-tache ne peut pas depasser la date de fin de sa tache parent.",
        )


def _ensure_parent_due_date_after_children(
    db: Session,
    *,
    tache_id: str,
    date_fin_prevue: Optional[datetime],
) -> None:
    if not date_fin_prevue:
        return
    latest_child = (
        db.query(Tache)
        .filter(
            Tache.id_tache_parent == tache_id,
            Tache.date_fin_prevue.isnot(None),
        )
        .order_by(Tache.date_fin_prevue.desc())
        .first()
    )
    if latest_child and latest_child.date_fin_prevue > date_fin_prevue:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "La date de fin de cette tache ne peut pas etre avant celle "
                "d'une sous-tache existante."
            ),
        )


def _get_tache_descendant_ids(db: Session, tache_id: str) -> list[str]:
    descendants: list[str] = []
    children = db.query(Tache.id).filter(Tache.id_tache_parent == tache_id).all()
    for (child_id,) in children:
        descendants.append(child_id)
        descendants.extend(_get_tache_descendant_ids(db, child_id))
    return descendants


def _mark_task_branch_completed(db: Session, tache_id: str) -> None:
    """Termine une tâche et tout ce qu'elle contient."""
    branch_ids = [tache_id] + _get_tache_descendant_ids(db, tache_id)
    now = datetime.now()

    db.query(Checklist).filter(Checklist.id_tache.in_(branch_ids)).update(
        {Checklist.is_checked: True, Checklist.updated_at: now},
        synchronize_session=False,
    )
    db.query(Tache).filter(Tache.id.in_(branch_ids)).update(
        {Tache.statut: "terminé", Tache.statut_date: now},
        synchronize_session=False,
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
    id_tache_parent: Optional[str] = None,
) -> Tache:
    id_liste, parent = _resolve_parent_scope(db, id_tache_parent=id_tache_parent, id_liste=id_liste)
    _ensure_subtask_due_date_within_parent(
        date_fin_prevue=date_fin_prevue,
        parent=parent,
    )
    if id_liste:
        _ensure_unique_tache_sibling_name(
            db,
            titre=titre,
            id_liste=id_liste,
            id_tache_parent=id_tache_parent,
        )
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
        id_tache_parent=id_tache_parent,
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
    target_parent_id = kwargs.get("id_tache_parent", tache.id_tache_parent)
    target_date_fin_prevue = kwargs.get("date_fin_prevue", tache.date_fin_prevue)
    target_parent = get_tache_by_id(db, target_parent_id) if target_parent_id else None
    if "id_tache_parent" in kwargs:
        _ensure_no_parent_cycle(db, tache_id=tache.id, id_tache_parent=target_parent_id)
        target_liste_id, target_parent = _resolve_parent_scope(
            db,
            id_tache_parent=target_parent_id,
            id_liste=target_liste_id,
        )
        kwargs["id_liste"] = target_liste_id

    _ensure_subtask_due_date_within_parent(
        date_fin_prevue=target_date_fin_prevue,
        parent=target_parent,
    )
    _ensure_parent_due_date_after_children(
        db,
        tache_id=tache.id,
        date_fin_prevue=target_date_fin_prevue,
    )

    if any(key in kwargs for key in ("titre", "id_liste", "id_tache_parent")):
        _ensure_unique_tache_sibling_name(
            db,
            titre=target_titre,
            id_liste=target_liste_id,
            id_tache_parent=target_parent_id,
            exclude_id=tache.id,
        )
    
    if "statut" in kwargs and kwargs["statut"] != tache.statut:
        tache.statut_date = datetime.now()

    if kwargs.get("statut") == "terminé":
        _mark_task_branch_completed(db, tache.id)
        kwargs.pop("statut", None)

    for key, value in kwargs.items():
        if hasattr(tache, key) and (value is not None or key == "id_tache_parent"):
            setattr(tache, key, value)
            
    try:
        db.commit()
        db.refresh(tache)
        if tache.id_liste:
            progressions = _recompute_liste_task_progressions(db, tache.id_liste)
            tache.progression = progressions.get(tache.id, 0.0)
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
    
    def delete_tree(current_id: str) -> None:
        children = db.query(Tache).filter(Tache.id_tache_parent == current_id).all()
        for child in children:
            delete_tree(child.id)

        db.query(Checklist).filter(Checklist.id_tache == current_id).delete(synchronize_session=False)
        db.query(Membre).filter(Membre.id_tache == current_id).delete(synchronize_session=False)
        current = get_tache_by_id(db, current_id)
        if current:
            db.delete(current)

    delete_tree(tache.id)
    
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


def _get_liste_parent_workspace_id(liste: Liste) -> Optional[str]:
    if liste.id_workspace:
        return liste.id_workspace
    if liste.espace:
        return liste.espace.id_workspace
    return None


def _get_espace_ancestor_ids(db: Session, espace_id: Optional[str]) -> list[str]:
    ancestor_ids: list[str] = []
    current_id = espace_id
    visited: set[str] = set()

    while current_id and current_id not in visited:
        visited.add(current_id)
        ancestor_ids.append(current_id)
        current = db.query(Espace).filter(Espace.id == current_id).first()
        current_id = current.id_espace_parent if current else None

    return ancestor_ids


def _user_is_task_assignable_from_list_scope(db: Session, *, tache: Tache, utilisateur_id: str) -> bool:
    """Un exécutant de tâche doit être Membre de la liste ou d'un parent espace/workspace."""
    if not tache.liste:
        return False

    list_member = db.query(Membre).filter(
        Membre.id_liste == tache.id_liste,
        Membre.id_utilisateur == utilisateur_id,
        Membre.statut == "Actif",
        Membre.role == "Membre",
    ).first()
    if list_member:
        return True

    espace_ids = _get_espace_ancestor_ids(db, tache.liste.id_espace)
    if espace_ids:
        espace_member = db.query(Membre).filter(
            Membre.id_espace.in_(espace_ids),
            Membre.id_utilisateur == utilisateur_id,
            Membre.statut == "Actif",
            Membre.role == "Membre",
        ).first()
        if espace_member:
            return True

    workspace_id = _get_liste_parent_workspace_id(tache.liste)
    if workspace_id:
        workspace_member = db.query(Membre).filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == utilisateur_id,
            Membre.statut == "Actif",
            Membre.role == "Membre",
        ).first()
        if workspace_member:
            return True

    return False


def assign_member_to_tache(db: Session, tache_id: str, utilisateur_id: str) -> Membre:
    """Assigne un utilisateur à une tâche en créant une entrée spécifique dans Membre."""
    tache = _get_tache_with_scope(db, tache_id)
    if not tache:
        raise HTTPException(status_code=404, detail="Tache introuvable.")

    if not _user_is_task_assignable_from_list_scope(db, tache=tache, utilisateur_id=utilisateur_id):
        raise HTTPException(
            status_code=403,
            detail=(
                "Seuls les utilisateurs avec le role Membre dans la liste, "
                "un espace parent ou le workspace parent peuvent etre assignes a une tache."
            ),
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
        .filter(
            Membre.id_tache == tache_id,
            Membre.statut == "Actif",
        )
        .all()
    )


def get_taches_kanban(db: Session, liste_id: str) -> dict:
    """Récupère les tâches d'une liste et les regroupe par colonnes de statut."""
    progressions = _recompute_liste_task_progressions(db, liste_id)
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
    
    for tache in taches:
        tache.progression = progressions.get(tache.id, 0.0)
        current_status = tache.statut if tache.statut in kanban else "en attente"
        kanban[current_status].append(tache)
        
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
    """Met à jour la tâche et ses parents selon checklists/sous-tâches."""
    tache = get_tache_by_id(db, tache_id)
    if not tache:
        return
    if tache.id_liste:
        _recompute_liste_task_progressions(db, tache.id_liste)
        

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
