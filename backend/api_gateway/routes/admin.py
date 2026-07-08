from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Request
from fastapi_csrf_protect import CsrfProtect
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..core.logging import security_logger
from ..core.emails import send_verification_email
from ..core.function import (
    build_email_verification_metadata,
    email_has_changed,
    ensure_unique_user_identity_fields,
    validate_admin_password_update,
)
from ..core.security import get_password_hash, get_current_admin, get_current_super_admin
from ..schemas import EmailSchema, UtilisateurOut, UtilisateurUpdate, UserRolesUpdate
from ..crud.utilisateur import (
    get_all_utilisateurs,
    get_utilisateur_by_id,
    update_utilisateur,
)



router = APIRouter(prefix="/admin", tags=["Administrateur"])


# ============================================================================
# FONCTION DE VÉRIFICATION DE PROPRIÉTÉ DES RESSOURCES
# ============================================================================

def check_resource_ownership(current_user: UtilisateurOut, target_user_id: str, db: Session = None) -> bool:
    """
    Vérifie que l'admin a le droit d'accéder à cette ressource
    
    Règles:
    - Super-admin a accès à tout
    - Admin a accès aux utilisateurs de son entreprise
    - Utilisateur standard ne peut accéder qu'à lui-même
    """
    # Super-admin a accès à tout
    if hasattr(current_user, 'is_super_admin') and current_user.is_super_admin:
        return True
    
    # Admin peut gérer les utilisateurs (à adapter selon logique métier)
    if hasattr(current_user, 'is_admin') and current_user.is_admin:
        # Pour une sécurité maximale, vérifier que les 2 utilisateurs
        # sont dans la même entreprise/workspace
        # À implémenter selon votre structure de données
        return True
    
    # Un utilisateur peut accéder uniquement à son propre profil
    if current_user.id == target_user_id:
        return True
    
    return False

# ============================================================================
# ROUTES ADMINISTRATEUR AVEC CSRF + RESOURCE OWNERSHIP
# ============================================================================

@router.get("/users", response_model=List[UtilisateurOut])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin)
):
    return get_all_utilisateurs(db, skip=skip, limit=limit)

@router.get("/users/{user_id}", response_model=UtilisateurOut)
def get_user_by_id(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin)
):
    # Vérifier que l'utilisateur existe
    user = get_utilisateur_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier que l'admin a accès à cet utilisateur
    if not check_resource_ownership(current_admin, user_id, db):
        security_logger.log_auth(
            action="unauthorized_user_access_attempt",
            user_id=current_admin.id,
            ip="unknown",
            status="failure",
            details={"target_user_id": user_id}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à cet utilisateur"
        )
    
    return user

@router.put("/users/{user_id}", response_model=UtilisateurOut)
async def update_user_by_admin(
    user_id: str,
    user_update: UtilisateurUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin),
    csrf_protect: CsrfProtect = Depends()  # ✅ CSRF Protection
):
    # Vérifier le token CSRF
    await csrf_protect.validate_csrf(request)
    
    # Vérifier que l'utilisateur existe
    db_user = get_utilisateur_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier que l'admin a accès à cet utilisateur
    if not check_resource_ownership(current_admin, user_id, db):
        security_logger.log_auth(
            action="unauthorized_user_update_attempt",
            user_id=current_admin.id,
            ip=request.client.host if request.client else "unknown",
            status="failure",
            details={"target_user_id": user_id}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à cet utilisateur"
        )

    update_data = user_update.model_dump(exclude_unset=True)
    ensure_unique_user_identity_fields(
        db,
        email=update_data.get("email"),
        username=update_data.get("username"),
        current_user_id=user_id,
    )
    validate_admin_password_update(update_data)

    # Gestion du changement de mot de passe par admin (sans vérifier l'ancien)
    if "new_password" in update_data:
        db_user.mot_de_passe = get_password_hash(update_data["new_password"])
        del update_data["new_password"]
    if "current_password" in update_data:
        del update_data["current_password"]  # Ignorer pour admin

    email_changed = email_has_changed(db_user, update_data)
    if email_changed:
        update_data.update(build_email_verification_metadata())

    # Mise à jour des autres champs
    updated_user = update_utilisateur(db, user_id, update_data)

    if email_changed:
        background_tasks.add_task(
            send_verification_email,
            updated_user.username,
            EmailSchema(email=[updated_user.email]),
            updated_user.code_verification_email,
        )
    
    # Logging d'audit
    security_logger.log_auth(
        action="admin_update_user",
        user_id=current_admin.id,
        ip=request.client.host if request.client else "unknown",
        status="success",
        details={"target_user_id": user_id, "changes": list(update_data.keys())}
    )
    
    return updated_user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin),
    csrf_protect: CsrfProtect = Depends()  # ✅ CSRF Protection
):
    # Vérifier le token CSRF
    await csrf_protect.validate_csrf(request)
    
    # Vérifier que l'utilisateur existe
    db_user = get_utilisateur_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier que l'admin a accès à cet utilisateur
    if not check_resource_ownership(current_admin, user_id, db):
        security_logger.log_auth(
            action="unauthorized_user_delete_attempt",
            user_id=current_admin.id,
            ip=request.client.host if request.client else "unknown",
            status="failure",
            details={"target_user_id": user_id}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à cet utilisateur"
        )
    
    # Empêcher l'admin de supprimer son propre compte
    if user_id == current_admin.id:
        security_logger.log_auth(
            action="self_delete_attempt",
            user_id=current_admin.id,
            ip=request.client.host if request.client else "unknown",
            status="failure",
            details={"reason": "attempt to delete own account"}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez pas supprimer votre propre compte"
        )
    
    # Soft delete : changer le statut à "Supprimé"
    update_utilisateur(db, user_id, {"statut": "Supprimé", "is_active": False})
    
    # Logging d'audit
    security_logger.log_auth(
        action="admin_delete_user",
        user_id=current_admin.id,
        ip=request.client.host if request.client else "unknown",
        status="success",
        details={"target_user_id": user_id}
    )
    
    return None

@router.post("/users/{user_id}/activate", response_model=UtilisateurOut)
async def activate_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin),
    csrf_protect: CsrfProtect = Depends()  
):
    # Vérifier le token CSRF
    await csrf_protect.validate_csrf(request)
    
    db_user = get_utilisateur_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier que l'admin a accès à cet utilisateur
    if not check_resource_ownership(current_admin, user_id, db):
        security_logger.log_auth(
            action="unauthorized_user_activate_attempt",
            user_id=current_admin.id,
            ip=request.client.host if request.client else "unknown",
            status="failure",
            details={"target_user_id": user_id}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à cet utilisateur"
        )
    
    updated_user = update_utilisateur(db, user_id, {"is_active": True, "statut": "Actif"})
    
    # Logging d'audit
    security_logger.log_auth(
        action="admin_activate_user",
        user_id=current_admin.id,
        ip=request.client.host if request.client else "unknown",
        status="success",
        details={"target_user_id": user_id}
    )
    
    return updated_user

@router.post("/users/{user_id}/deactivate", response_model=UtilisateurOut)
async def deactivate_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin),
    csrf_protect: CsrfProtect = Depends()  
):
    #Vérifier le token CSRF
    await csrf_protect.validate_csrf(request)
    
    # Vérifier le self-deactivate
    if user_id == current_admin.id:
        security_logger.log_auth(
            action="user_self_deactivate_attempt",
            user_id=current_admin.id,
            ip=request.client.host if request.client else "unknown",
            status="failure",
            details={"error": "Cannot deactivate own account"}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez pas désactiver votre propre compte"
        )
    
    db_user = get_utilisateur_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier que l'admin a accès à cet utilisateur
    if not check_resource_ownership(current_admin, user_id, db):
        security_logger.log_auth(
            action="unauthorized_user_deactivate_attempt",
            user_id=current_admin.id,
            ip=request.client.host if request.client else "unknown",
            status="failure",
            details={"target_user_id": user_id}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à cet utilisateur"
        )
    
    updated_user = update_utilisateur(db, user_id, {"is_active": False, "statut": "Inactif"})
    
    # Logging d'audit
    security_logger.log_auth(
        action="admin_deactivate_user",
        user_id=current_admin.id,
        ip=request.client.host if request.client else "unknown",
        status="success",
        details={"target_user_id": user_id}
    )
    
    return updated_user
