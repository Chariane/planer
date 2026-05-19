from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from ..core.function import (
    ResourceType,
    _extract_file_target,
    _get_canevas_or_404,
    _get_checklist_or_404,
    _get_liste_or_404,
    _get_section_or_404,
    _get_tache_or_404,
    _is_resource_within_scope,
    _require_checklist_read_access,
    _require_espace_read_access,
    _require_file_read_access,
    _require_list_read_access,
    _require_section_read_access,
    _require_task_read_access,
    _require_workspace_descendant_read_access,
    _serialize_member,
)
from ..crud.checklist_canevas import calculate_task_progression
from ..crud.fichier import list_accessible_files
from ..models import Checklist, Espace, Fichier, Liste, Membre, Section, Tache, Utilisateur


def _matches_scope(
    db: Session,
    *,
    resource_type: str,
    resource_id: str,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    tache_id: Optional[str] = None,
) -> bool:
    if workspace_id and not _is_resource_within_scope(
        db,
        target_type=resource_type,
        target_id=resource_id,
        scope_type=ResourceType.WORKSPACE,
        scope_id=workspace_id,
    ):
        return False
    if espace_id and not _is_resource_within_scope(
        db,
        target_type=resource_type,
        target_id=resource_id,
        scope_type=ResourceType.ESPACE,
        scope_id=espace_id,
    ):
        return False
    if liste_id and not _is_resource_within_scope(
        db,
        target_type=resource_type,
        target_id=resource_id,
        scope_type=ResourceType.LISTE,
        scope_id=liste_id,
    ):
        return False
    if tache_id and not _is_resource_within_scope(
        db,
        target_type=resource_type,
        target_id=resource_id,
        scope_type=ResourceType.TACHE,
        scope_id=tache_id,
    ):
        return False
    return True


def _has_task_files(db: Session, task_id: str) -> bool:
    for fichier in db.query(Fichier).all():
        target_type, target_target_id = _extract_file_target(fichier)
        if target_type == ResourceType.TACHE and target_target_id == task_id:
            return True
        if target_type == ResourceType.CHECKLIST:
            checklist = _get_checklist_or_404(db, target_target_id)
            if checklist.id_tache == task_id:
                return True
    return False


def _has_list_files(db: Session, liste_id: str) -> bool:
    for fichier in db.query(Fichier).all():
        target_type, target_target_id = _extract_file_target(fichier)
        if target_type == ResourceType.LISTE and target_target_id == liste_id:
            return True
        if target_type == ResourceType.CANEVAS:
            canevas = _get_canevas_or_404(db, target_target_id)
            if canevas.id_liste == liste_id:
                return True
        if target_type == ResourceType.SECTION:
            section = _get_section_or_404(db, target_target_id)
            if section:
                section_liste = _get_liste_or_404(db, section.canevas.id_liste) if section.canevas else None
                if section_liste and section_liste.id == liste_id:
                    return True
        if target_type == ResourceType.CHECKLIST:
            checklist = _get_checklist_or_404(db, target_target_id)
            if checklist.id_section:
                section = _get_section_or_404(db, checklist.id_section)
                if section.canevas and section.canevas.id_liste == liste_id:
                    return True
            elif checklist.id_tache:
                task = _get_tache_or_404(db, checklist.id_tache)
                if task.id_liste == liste_id:
                    return True
    return False


def search_tasks(
    db: Session,
    *,
    current_user_id: str,
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    statut: Optional[str] = None,
    priorite: Optional[str] = None,
    membre_id: Optional[str] = None,
    has_files: Optional[bool] = None,
    has_checklists: Optional[bool] = None,
    overdue: Optional[bool] = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    query = db.query(Tache).options(joinedload(Tache.membres), joinedload(Tache.checklists))
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Tache.titre.ilike(pattern), Tache.description.ilike(pattern)))
    if statut:
        query = query.filter(Tache.statut == statut)
    if priorite:
        query = query.filter(Tache.priorite == priorite)

    candidates = query.order_by(Tache.created_at.desc()).limit(max(limit, 1) * 8).all()
    results: list[dict[str, Any]] = []
    for task in candidates:
        if not _matches_scope(
            db,
            resource_type=ResourceType.TACHE,
            resource_id=task.id,
            workspace_id=workspace_id,
            espace_id=espace_id,
            liste_id=liste_id,
        ):
            continue
        try:
            _require_task_read_access(db, task.id, current_user_id)
        except HTTPException:
            continue
        if membre_id and not any(member.id_utilisateur == membre_id for member in task.membres):
            continue
        if has_checklists is not None and bool(task.checklists) != has_checklists:
            continue
        if has_files is not None and _has_task_files(db, task.id) != has_files:
            continue
        if overdue is not None:
            now_date = datetime.now(timezone.utc).date()
            is_overdue = bool(
                task.date_fin_prevue
                and task.statut not in {"terminée", "terminee", "done"}
                and task.date_fin_prevue.date() < now_date
            )
            if is_overdue != overdue:
                continue

        results.append(
            {
                "id": task.id,
                "titre": task.titre,
                "description": task.description,
                "statut": task.statut,
                "priorite": task.priorite,
                "date_fin_prevue": task.date_fin_prevue,
                "created_at": task.created_at,
                "id_liste": task.id_liste,
                "progression": calculate_task_progression(db, task.id),
            }
        )
        if len(results) >= limit:
            break
    return results


def search_lists(
    db: Session,
    *,
    current_user_id: str,
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    creator_id: Optional[str] = None,
    has_files: Optional[bool] = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    query = db.query(Liste)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Liste.nom.ilike(pattern), Liste.description.ilike(pattern)))

    candidates = query.order_by(Liste.created_at.desc()).limit(max(limit, 1) * 8).all()
    results: list[dict[str, Any]] = []
    for liste in candidates:
        if not _matches_scope(
            db,
            resource_type=ResourceType.LISTE,
            resource_id=liste.id,
            workspace_id=workspace_id,
            espace_id=espace_id,
        ):
            continue
        try:
            _require_list_read_access(db, liste.id, current_user_id)
        except HTTPException:
            continue

        if creator_id:
            owner = (
                db.query(Membre)
                .filter(
                    Membre.id_liste == liste.id,
                    Membre.id_utilisateur == creator_id,
                    Membre.role == "Créateur",
                    Membre.statut == "Actif",
                )
                .first()
            )
            if not owner:
                continue

        if has_files is not None and _has_list_files(db, liste.id) != has_files:
            continue

        results.append(
            {
                "id": liste.id,
                "nom": liste.nom,
                "description": liste.description,
                "created_at": liste.created_at,
                "id_workspace": liste.id_workspace,
                "id_espace": liste.id_espace,
            }
        )
        if len(results) >= limit:
            break
    return results


def search_espaces(
    db: Session,
    *,
    current_user_id: str,
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    parent_espace_id: Optional[str] = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    query = db.query(Espace)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Espace.nom.ilike(pattern), Espace.description.ilike(pattern)))
    if parent_espace_id:
        query = query.filter(Espace.id_espace_parent == parent_espace_id)

    candidates = query.order_by(Espace.created_at.desc()).limit(max(limit, 1) * 8).all()
    results: list[dict[str, Any]] = []
    for espace in candidates:
        if workspace_id and espace.id_workspace != workspace_id:
            continue
        try:
            _require_espace_read_access(db, espace.id, current_user_id)
        except HTTPException:
            continue
        results.append(
            {
                "id": espace.id,
                "nom": espace.nom,
                "description": espace.description,
                "created_at": espace.created_at,
                "id_workspace": espace.id_workspace,
                "id_espace_parent": espace.id_espace_parent,
            }
        )
        if len(results) >= limit:
            break
    return results


def search_sections(
    db: Session,
    *,
    current_user_id: str,
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    query = db.query(Section).options(joinedload(Section.canevas))
    if q:
        query = query.filter(Section.titre.ilike(f"%{q.strip()}%"))

    candidates = query.order_by(Section.created_at.desc()).limit(max(limit, 1) * 8).all()
    results: list[dict[str, Any]] = []
    for section in candidates:
        if not _matches_scope(
            db,
            resource_type=ResourceType.SECTION,
            resource_id=section.id,
            workspace_id=workspace_id,
            espace_id=espace_id,
            liste_id=liste_id,
        ):
            continue
        try:
            _require_section_read_access(db, section.id, current_user_id)
        except HTTPException:
            continue
        results.append(
            {
                "id": section.id,
                "titre": section.titre,
                "created_at": section.created_at,
                "id_canevas": section.id_canevas,
            }
        )
        if len(results) >= limit:
            break
    return results


def search_checklists(
    db: Session,
    *,
    current_user_id: str,
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    tache_id: Optional[str] = None,
    is_checked: Optional[bool] = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    query = db.query(Checklist)
    if q:
        query = query.filter(Checklist.texte.ilike(f"%{q.strip()}%"))
    if is_checked is not None:
        query = query.filter(Checklist.is_checked == is_checked)

    candidates = query.order_by(Checklist.created_at.desc()).limit(max(limit, 1) * 8).all()
    results: list[dict[str, Any]] = []
    for checklist in candidates:
        if not _matches_scope(
            db,
            resource_type=ResourceType.CHECKLIST,
            resource_id=checklist.id,
            workspace_id=workspace_id,
            espace_id=espace_id,
            liste_id=liste_id,
            tache_id=tache_id,
        ):
            continue
        try:
            _require_checklist_read_access(db, checklist.id, current_user_id)
        except HTTPException:
            continue
        results.append(
            {
                "id": checklist.id,
                "texte": checklist.texte,
                "is_checked": checklist.is_checked,
                "created_at": checklist.created_at,
                "id_section": checklist.id_section,
                "id_tache": checklist.id_tache,
            }
        )
        if len(results) >= limit:
            break
    return results


def search_members(
    db: Session,
    *,
    current_user_id: str,
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    tache_id: Optional[str] = None,
    role: Optional[str] = None,
    statut: Optional[str] = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    query = db.query(Membre).options(joinedload(Membre.utilisateur))
    if role:
        query = query.filter(Membre.role == role)
    if statut:
        query = query.filter(Membre.statut == statut)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.join(Utilisateur, Membre.id_utilisateur == Utilisateur.id).filter(
            or_(
                Utilisateur.username.ilike(pattern),
                Utilisateur.email.ilike(pattern),
                Utilisateur.nom.ilike(pattern),
                Utilisateur.prenoms.ilike(pattern),
            )
        )

    candidates = query.order_by(Membre.created_at.desc()).limit(max(limit, 1) * 8).all()
    results: list[dict[str, Any]] = []
    for membre in candidates:
        resource_type = None
        resource_id = None
        if membre.id_tache:
            resource_type, resource_id = ResourceType.TACHE, membre.id_tache
        elif membre.id_liste:
            resource_type, resource_id = ResourceType.LISTE, membre.id_liste
        elif membre.id_espace:
            resource_type, resource_id = ResourceType.ESPACE, membre.id_espace
        elif membre.id_workspace:
            resource_type, resource_id = ResourceType.WORKSPACE, membre.id_workspace
        if not resource_type or not resource_id:
            continue
        if not _matches_scope(
            db,
            resource_type=resource_type,
            resource_id=resource_id,
            workspace_id=workspace_id,
            espace_id=espace_id,
            liste_id=liste_id,
            tache_id=tache_id,
        ):
            continue
        try:
            if resource_type == ResourceType.WORKSPACE:
                _require_workspace_descendant_read_access(db, resource_id, current_user_id)
            elif resource_type == ResourceType.ESPACE:
                _require_espace_read_access(db, resource_id, current_user_id)
            elif resource_type == ResourceType.LISTE:
                _require_list_read_access(db, resource_id, current_user_id)
            else:
                _require_task_read_access(db, resource_id, current_user_id)
        except HTTPException:
            continue
        payload = _serialize_member(membre)
        payload["resource_type"] = resource_type
        payload["resource_id"] = resource_id
        results.append(payload)
        if len(results) >= limit:
            break
    return results


def search_files(
    db: Session,
    *,
    current_user_id: str,
    q: Optional[str] = None,
    type_fichier: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    tache_id: Optional[str] = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    if tache_id:
        scope_type, scope_id = ResourceType.TACHE, tache_id
    elif liste_id:
        scope_type, scope_id = ResourceType.LISTE, liste_id
    elif espace_id:
        scope_type, scope_id = ResourceType.ESPACE, espace_id
    elif workspace_id:
        scope_type, scope_id = ResourceType.WORKSPACE, workspace_id
    else:
        scope_type = scope_id = None

    files = list_accessible_files(
        db,
        current_user_id=current_user_id,
        q=q,
        type_fichier=type_fichier,
        scope_type=scope_type,
        scope_id=scope_id,
        limit=limit,
    )
    return [
        {
            "id": fichier.id,
            "nom": fichier.nom,
            "url_fichier": fichier.url_fichier,
            "type_fichier": fichier.type_fichier,
            "created_at": fichier.created_at,
            "id_membre": fichier.id_membre,
            "meta_donnees": fichier.meta_donnees,
        }
        for fichier in files
    ]


def global_search(
    db: Session,
    *,
    current_user_id: str,
    q: str,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    limit_per_type: int = 10,
) -> dict[str, Any]:
    return {
        "tasks": search_tasks(
            db,
            current_user_id=current_user_id,
            q=q,
            workspace_id=workspace_id,
            espace_id=espace_id,
            liste_id=liste_id,
            limit=limit_per_type,
        ),
        "lists": search_lists(
            db,
            current_user_id=current_user_id,
            q=q,
            workspace_id=workspace_id,
            espace_id=espace_id,
            limit=limit_per_type,
        ),
        "espaces": search_espaces(
            db,
            current_user_id=current_user_id,
            q=q,
            workspace_id=workspace_id,
            limit=limit_per_type,
        ),
        "sections": search_sections(
            db,
            current_user_id=current_user_id,
            q=q,
            workspace_id=workspace_id,
            espace_id=espace_id,
            liste_id=liste_id,
            limit=limit_per_type,
        ),
        "checklists": search_checklists(
            db,
            current_user_id=current_user_id,
            q=q,
            workspace_id=workspace_id,
            espace_id=espace_id,
            liste_id=liste_id,
            limit=limit_per_type,
        ),
        "members": search_members(
            db,
            current_user_id=current_user_id,
            q=q,
            workspace_id=workspace_id,
            espace_id=espace_id,
            liste_id=liste_id,
            limit=limit_per_type,
        ),
        "files": search_files(
            db,
            current_user_id=current_user_id,
            q=q,
            workspace_id=workspace_id,
            espace_id=espace_id,
            liste_id=liste_id,
            limit=limit_per_type,
        ),
    }
