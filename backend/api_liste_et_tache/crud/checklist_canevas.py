# backend/api_liste_et_tache/crud/checklist_canevas.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime
from sqlalchemy import func
from ..models import Canevas, Section, Checklist, Tache  # Ajout de Tache

# --- CANEVAS CRUD ---

def get_canevas_by_id(db: Session, canevas_id: str) -> Optional[Canevas]:
    return db.query(Canevas).filter(Canevas.id == canevas_id).first()

def get_canevas_for_liste(db: Session, liste_id: str) -> Optional[Canevas]:
    return db.query(Canevas).filter(Canevas.id_liste == liste_id).first()

def create_canevas(db: Session, is_verrouille: bool = False, id_liste: Optional[str] = None) -> Canevas:
    canevas = Canevas(is_verrouille=is_verrouille, id_liste=id_liste)
    db.add(canevas)
    try:
        db.commit()
        db.refresh(canevas)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de creer le canevas.",
        ) from exc
    return canevas

def update_canevas(db: Session, canevas_id: str, **kwargs) -> Optional[Canevas]:
    canevas = get_canevas_by_id(db, canevas_id)
    if not canevas:
        return None
    for key, value in kwargs.items():
        if hasattr(canevas, key) and value is not None:
            setattr(canevas, key, value)
    canevas.updated_at = datetime.now()
    db.commit()
    db.refresh(canevas)
    return canevas

def delete_canevas(db: Session, canevas_id: str) -> bool:
    canevas = get_canevas_by_id(db, canevas_id)
    if canevas:
        db.delete(canevas)
        db.commit()
        return True
    return False



def _normalize_sibling_name(value: str | None) -> str:
    return (value or "").strip().lower()


def _ensure_unique_section_sibling_name(
    db: Session,
    *,
    titre: str,
    id_canevas: Optional[str],
    exclude_id: Optional[str] = None,
) -> None:
    if not id_canevas:
        return
    normalized_title = _normalize_sibling_name(titre)
    if not normalized_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le nom de la section est obligatoire.",
        )

    query = db.query(Section).filter(
        Section.id_canevas == id_canevas,
        func.lower(func.trim(Section.titre)) == normalized_title,
    )
    if exclude_id:
        query = query.filter(Section.id != exclude_id)

    if query.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une section portant ce nom existe déjà dans ce canevas. Choisissez un autre nom.",
        )


# --- SECTION CRUD ---

def get_section_by_id(db: Session, section_id: str) -> Optional[Section]:
    return db.query(Section).filter(Section.id == section_id).first()

def get_sections_for_canevas(db: Session, canevas_id: str) -> List[Section]:
    return db.query(Section).filter(Section.id_canevas == canevas_id).all()

def create_section(db: Session, titre: str, id_canevas: Optional[str] = None) -> Section:
    _ensure_unique_section_sibling_name(db, titre=titre, id_canevas=id_canevas)
    section = Section(titre=titre.strip(), id_canevas=id_canevas)
    db.add(section)
    try:
        db.commit()
        db.refresh(section)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de creer la section.",
        ) from exc
    return section

def update_section(db: Session, section_id: str, **kwargs) -> Optional[Section]:
    section = get_section_by_id(db, section_id)
    if not section:
        return None
    target_titre = kwargs.get("titre", section.titre)
    target_canevas_id = kwargs.get("id_canevas", section.id_canevas)
    if "titre" in kwargs or "id_canevas" in kwargs:
        _ensure_unique_section_sibling_name(
            db,
            titre=target_titre,
            id_canevas=target_canevas_id,
            exclude_id=section.id,
        )

    for key, value in kwargs.items():
        if hasattr(section, key) and value is not None:
            setattr(section, key, value.strip() if key == "titre" and isinstance(value, str) else value)
    section.updated_at = datetime.now()
    db.commit()
    db.refresh(section)
    return section

def delete_section(db: Session, section_id: str) -> bool:
    section = get_section_by_id(db, section_id)
    if section:
        db.delete(section)
        db.commit()
        return True
    return False

# --- CHECKLIST CRUD ---

def get_checklist_by_id(db: Session, checklist_id: str) -> Optional[Checklist]:
    return db.query(Checklist).filter(Checklist.id == checklist_id).first()

def get_checklists_for_section(db: Session, section_id: str) -> List[Checklist]:
    return db.query(Checklist).filter(Checklist.id_section == section_id).all()

def get_checklists_for_tache(db: Session, tache_id: str) -> List[Checklist]:
    return db.query(Checklist).filter(Checklist.id_tache == tache_id).all()

def _ensure_unique_checklist_sibling_name(
    db: Session,
    *,
    texte: str,
    id_section: Optional[str],
    id_tache: Optional[str],
    exclude_id: Optional[str] = None,
) -> None:
    base_query = db.query(Checklist).filter(func.lower(func.trim(Checklist.texte)) == texte.strip().lower())
    found_parent = None
    if id_tache:
        query = base_query.filter(Checklist.id_tache == id_tache)
        if exclude_id:
            query = query.filter(Checklist.id != exclude_id)
        if query.first():
            found_parent = "cette tache"
    if id_section and not id_tache and not found_parent:
        query = base_query.filter(
            Checklist.id_section == id_section,
            Checklist.id_tache.is_(None),
        )
        if exclude_id:
            query = query.filter(Checklist.id != exclude_id)
        if query.first():
            found_parent = "cette section"
    if not id_tache and not id_section:
        return
    if found_parent:
        detail = (
            "Cette tâche contient déjà une checklist portant exactement ce nom. "
            "Utilisez un autre nom pour éviter les doublons."
            if id_tache
            else "Cette section contient déjà une checklist portant exactement ce nom. Utilisez un autre nom pour éviter les doublons."
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        )

def create_checklist(
    db: Session,
    texte: str,
    is_checked: bool = False,
    id_section: Optional[str] = None,
    id_tache: Optional[str] = None,
) -> Checklist:
    if id_tache:
        from ..crud.tache import ensure_task_can_receive_checklist
        ensure_task_can_receive_checklist(db, id_tache)

    _ensure_unique_checklist_sibling_name(
        db,
        texte=texte,
        id_section=id_section,
        id_tache=id_tache,
    )
    now = datetime.now()
    checklist = Checklist(
        texte=texte, 
        is_checked=is_checked, 
        id_section=id_section, 
        id_tache=id_tache,
        created_at=now,
        updated_at=now
    )
    db.add(checklist)
    try:
        db.commit()
        db.refresh(checklist)
        
        # Mettre à jour le statut de la tâche si nécessaire
        if id_tache:
            from ..crud.tache import update_tache_status_based_on_checklists
            update_tache_status_based_on_checklists(db, id_tache)
            
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de creer la checklist.",
        ) from exc
    return checklist


def update_checklist(db: Session, checklist_id: str, **kwargs) -> Optional[Checklist]:
    checklist = get_checklist_by_id(db, checklist_id)
    if not checklist:
        return None

    target_texte = kwargs.get("texte", checklist.texte)
    target_section_id = kwargs.get("id_section", checklist.id_section)
    target_tache_id = kwargs.get("id_tache", checklist.id_tache)
    if target_tache_id and target_tache_id != checklist.id_tache:
        from ..crud.tache import ensure_task_can_receive_checklist
        ensure_task_can_receive_checklist(db, target_tache_id)

    if any(key in kwargs for key in ("texte", "id_section", "id_tache")):
        _ensure_unique_checklist_sibling_name(
            db,
            texte=target_texte,
            id_section=target_section_id,
            id_tache=target_tache_id,
            exclude_id=checklist.id,
        )
    
    nullable_relation_fields = {"id_section", "id_tache"}
    for key, value in kwargs.items():
        if hasattr(checklist, key) and (value is not None or key in nullable_relation_fields):
            setattr(checklist, key, value)
    checklist.updated_at = datetime.now()

    db.commit()
    db.refresh(checklist)

    if checklist.id_tache:
        from ..crud.tache import update_tache_status_based_on_checklists
        update_tache_status_based_on_checklists(db, checklist.id_tache)
        db.refresh(checklist)

    return checklist

def delete_checklist(db: Session, checklist_id: str) -> bool:
    checklist = get_checklist_by_id(db, checklist_id)
    if checklist:
        tache_id = checklist.id_tache
        db.delete(checklist)
        db.commit()
        
        # Mettre à jour le statut de la tâche si nécessaire
        if tache_id:
            from ..crud.tache import update_tache_status_based_on_checklists
            update_tache_status_based_on_checklists(db, tache_id)
            
        return True
    return False

# --- LOGIQUE D'AVANCEMENT ---

def calculate_task_progression(db: Session, tache_id: str) -> float:
    """Calcule le pourcentage de progression d'une tache base sur ses checklists."""
    total = db.query(func.count(Checklist.id)).filter(Checklist.id_tache == tache_id).scalar()
    if not total:
        return 0.0
    
    checked = db.query(func.count(Checklist.id)).filter(
        Checklist.id_tache == tache_id,
        Checklist.is_checked == True
    ).scalar()
    
    return round((checked / total) * 100, 2)
