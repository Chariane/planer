from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.function import (
    _require_espace_admin_access,
    _require_espace_owner_access,
    _serialize_member,
    _get_espace_actor_context,
    _validate_espace_member_management_permissions,
)
from ..core.security import get_current_user
from ..crud.admin import (
    delete_admin_espace,
    get_admin_espace_members,
    get_my_admin_espaces,
    remove_admin_espace_member,
    update_admin_espace_member,
)
from ..crud.utilisateur import get_espace_member
from ..crud.utilisateur import get_espace_by_id
from ..schemas import EspaceOut, EspaceMemberOut, UtilisateurOut, WorkspaceMemberUpdate

router = APIRouter(prefix="/admin/espaces", tags=["Admin Espaces"])


@router.get("", response_model=List[EspaceOut])
def list_my_admin_espaces(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Liste les espaces dont l'utilisateur courant est administrateur."""
    return get_my_admin_espaces(db, current_user.id)


@router.get("/{espace_id}", response_model=EspaceOut)
def get_admin_espace_detail(
    espace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace, _ = _require_espace_admin_access(db, espace_id, current_user.id)
    return espace


@router.get("/{espace_id}/members", response_model=List[EspaceMemberOut])
def list_admin_espace_members(
    espace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _require_espace_admin_access(db, espace_id, current_user.id)
    members = get_admin_espace_members(db, espace_id)
    if members is None:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    return [_serialize_member(m) for m in members]


@router.put("/{espace_id}/members/{user_id}", response_model=EspaceMemberOut)
def update_admin_member(
    espace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    
    # 1. Récupérer le contexte de l'acteur (incluant le fallback Créateur Workspace)
    espace_obj, actor_member, actor_role = _get_espace_actor_context(db, espace_id, current_user.id)

    # 2. Récupérer le membre cible
    target_member = get_espace_member(db, espace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre non trouve")

    # 3. Validation stricte des rôles et de la promotion
    _validate_espace_member_management_permissions(
        espace_obj, 
        actor_role, 
        user_id, 
        target_member, 
        membre_in.role
    )

    updated_member = update_admin_espace_member(db, espace_id, user_id, membre_in)
    if not updated_member:
        raise HTTPException(status_code=404, detail="Erreur lors de la mise a jour")
    return _serialize_member(updated_member)


@router.delete("/{espace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_admin_member(
    espace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    
    # 1. Contexte acteur
    espace_obj, actor_member, actor_role = _get_espace_actor_context(db, espace_id, current_user.id)

    # 2. Cible
    target_member = get_espace_member(db, espace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre non trouve")

    # 3. Validation (pas de suppression du créateur, de confrères admins, etc.)
    _validate_espace_member_management_permissions(espace_obj, actor_role, user_id, target_member)

    removed = remove_admin_espace_member(db, espace_id, user_id)
    if removed is None:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    if not removed:
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression du membre")
    return None


@router.delete("/{espace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_espace_by_admin(
    espace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _require_espace_owner_access(db, espace_id, current_user.id)
    if not delete_admin_espace(db, espace_id):
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression de l'espace")
    return None
