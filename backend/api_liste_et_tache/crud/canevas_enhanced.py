# backend/api_liste_et_tache/crud/canevas_enhanced.py
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from ..models import Canevas, Section, Tache, Liste
from ..crud.checklist_canevas import get_checklists_for_section, get_checklists_for_tache


def get_task_path(db: Session, task: Tache, cache: Optional[Dict[str, str]] = None) -> str:
    if cache is None:
        cache = {}
    if task.id in cache:
        return cache[task.id]

    path = [task.titre]
    parent_id = task.id_tache_parent
    visited = {task.id}
    while parent_id and parent_id not in visited:
        visited.add(parent_id)
        parent = db.query(Tache).filter(Tache.id == parent_id).first()
        if not parent:
            break
        path.insert(0, parent.titre)
        parent_id = parent.id_tache_parent

    task_path = " / ".join(part for part in path if part)
    cache[task.id] = task_path
    return task_path


def get_task_depth(db: Session, task: Tache) -> int:
    depth = 0
    parent_id = task.id_tache_parent
    visited = {task.id}
    while parent_id and parent_id not in visited:
        visited.add(parent_id)
        parent = db.query(Tache.id, Tache.id_tache_parent).filter(Tache.id == parent_id).first()
        if not parent:
            break
        depth += 1
        parent_id = parent.id_tache_parent
    return depth


def get_week_range(date: datetime) -> tuple:
    start = date - timedelta(days=date.weekday())
    end = start + timedelta(days=6)
    return start.date(), end.date()


def get_month_range(date: datetime) -> tuple:
    start = date.replace(day=1)
    if start.month == 12:
        next_month = start.replace(year=start.year + 1, month=1)
    else:
        next_month = start.replace(month=start.month + 1)
    end = next_month - timedelta(days=1)
    return start.date(), end.date()


def get_section_period_type(titre: str) -> str:
    titre_lower = titre.lower()
    if 'mois' in titre_lower or 'month' in titre_lower:
        return 'month'
    elif 'semaine' in titre_lower or 'week' in titre_lower:
        return 'week'
    return 'day'


def parse_section_date(titre: str) -> datetime:
    import re

    def safe_datetime(year: int, month: int, day: int) -> Optional[datetime]:
        try:
            return datetime(year, month, day)
        except ValueError:
            return None

    titre_normalized = (titre or '').lower()
    months = {
        'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6,
        'juillet': 7, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12,
        'jan': 1, 'fév': 2, 'feb': 2, 'mar': 3, 'avr': 4, 'apr': 4, 'mai': 5, 'may': 5,
        'jun': 6, 'juin': 6, 'jul': 7, 'juil': 7, 'aoû': 8, 'aug': 8, 'sep': 9,
        'oct': 10, 'nov': 11, 'déc': 12, 'dec': 12
    }
    
    for month_name, month_num in months.items():
        if month_name in titre_normalized:
            year_match = re.search(r'20\d{2}', titre)
            year = int(year_match.group()) if year_match else datetime.now().year
            return datetime(year, month_num, 1)
    
    iso_date_match = re.search(r'\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b', titre)
    if iso_date_match:
        year = int(iso_date_match.group(1))
        month = int(iso_date_match.group(2))
        day = int(iso_date_match.group(3))
        parsed = safe_datetime(year, month, day)
        if parsed:
            return parsed

    date_match = re.search(r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b', titre)
    if date_match:
        day, month, year = int(date_match.group(1)), int(date_match.group(2)), int(date_match.group(3))
        if year < 100:
            year += 2000
        parsed = safe_datetime(year, month, day)
        if parsed:
            return parsed
    
    return datetime.now()


def get_task_checklists_for_period(
    db: Session, 
    liste_id: str, 
    period_start: Any, 
    period_end: Any
) -> List[Dict[str, Any]]:
    if hasattr(period_start, 'date'):
        start_date = period_start.date()
        end_date = period_end.date()
    else:
        start_date = period_start
        end_date = period_end
    
    tasks = db.query(Tache).filter(
        Tache.id_liste == liste_id,
        Tache.date_fin_prevue >= start_date,
        Tache.date_fin_prevue <= end_date
    ).all()
    
    task_checklists = []
    path_cache: Dict[str, str] = {}
    for task in tasks:
        checklists = get_checklists_for_tache(db, task.id)
        task_path = get_task_path(db, task, path_cache)
        task_depth = get_task_depth(db, task)
        for checklist in checklists:
            if checklist.id_section:
                continue
            task_checklists.append({
                "id": checklist.id,
                "texte": checklist.texte,
                "is_checked": checklist.is_checked,
                "source": "task",
                "task_id": task.id,
                "task_title": task.titre,
                "task_path": task_path,
                "task_depth": task_depth,
                "due_date": task.date_fin_prevue.isoformat() if task.date_fin_prevue else None,
                "section_id": checklist.id_section
            })
    
    return task_checklists


def get_enhanced_canevas(db: Session, liste_id: str) -> Dict[str, Any]:
    canevas = db.query(Canevas).filter(Canevas.id_liste == liste_id).first()
    liste = db.query(Liste).filter(Liste.id == liste_id).first()
    
    if not canevas:
        canevas = Canevas(is_verrouille=False, id_liste=liste_id)
        db.add(canevas)
        db.commit()
        db.refresh(canevas)
    
    sections = db.query(Section).filter(Section.id_canevas == canevas.id).all()
    
    result_sections = []
    path_cache: Dict[str, str] = {}
    for section in sections:
        manual_checklists = get_checklists_for_section(db, section.id)
        
        period_type = get_section_period_type(section.titre)
        section_date = parse_section_date(section.titre)
        
        if period_type == 'month':
            start_date, end_date = get_month_range(section_date)
        elif period_type == 'week':
            start_date, end_date = get_week_range(section_date)
        else:
            start_date = section_date.date()
            end_date = section_date.date()
        
        task_checklists = get_task_checklists_for_period(db, liste_id, start_date, end_date)
        
        all_checklists = []
        for cl in manual_checklists:
            if cl.id_tache:
                task = db.query(Tache).filter(Tache.id == cl.id_tache).first()
                all_checklists.append({
                    "id": cl.id,
                    "texte": cl.texte,
                    "is_checked": cl.is_checked,
                    "source": "task",
                    "task_id": cl.id_tache,
                    "task_title": task.titre if task else None,
                    "task_path": get_task_path(db, task, path_cache) if task else None,
                    "task_depth": get_task_depth(db, task) if task else 0,
                    "due_date": task.date_fin_prevue.isoformat() if task and task.date_fin_prevue else None,
                    "section_id": section.id
                })
            else:
                all_checklists.append({
                    "id": cl.id,
                    "texte": cl.texte,
                    "is_checked": cl.is_checked,
                    "source": "manual",
                    "section_id": section.id
                })
        for cl in task_checklists:
            all_checklists.append(cl)
        
        total = len(all_checklists)
        checked = sum(1 for c in all_checklists if c["is_checked"])
        progress = round((checked / total) * 100) if total > 0 else 0
        
        result_sections.append({
            "id": section.id,
            "titre": section.titre,
            "created_at": section.created_at.isoformat() if section.created_at else None,
            "updated_at": section.updated_at.isoformat() if section.updated_at else None,
            "id_canevas": section.id_canevas,
            "checklists": all_checklists,
            "progress": progress,
            "period_type": period_type
        })
    
    return {
        "id": canevas.id,
        "is_verrouille": canevas.is_verrouille,
        "created_at": canevas.created_at.isoformat() if canevas.created_at else None,
        "updated_at": canevas.updated_at.isoformat() if canevas.updated_at else None,
        "id_liste": canevas.id_liste,
        "liste_nom": liste.nom if liste else None,
        "sections": result_sections
    }
