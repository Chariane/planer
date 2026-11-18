from typing import Optional, List, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from backend.api_liste_et_tache.core.database import get_db
from backend.api_liste_et_tache.core.security import get_current_user
from backend.api_liste_et_tache.crud.audit import get_audit_logs

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("/logs")
def list_audit_logs(
    resource_type: Optional[str] = Query(None, description="Filtrer par type de ressource (absence, tache, workspace, etc.)"),
    resource_id: Optional[str] = Query(None, description="Filtrer par ID de ressource"),
    workspace_id: Optional[str] = Query(None, description="Filtrer par ID de workspace"),
    espace_id: Optional[str] = Query(None, description="Filtrer par ID d'espace"),
    user_id: Optional[str] = Query(None, description="Filtrer par ID d'utilisateur"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    """Récupère les logs d'audit du système."""
    logs = get_audit_logs(
        db,
        resource_type=resource_type,
        resource_id=resource_id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        user_id=user_id,
        limit=limit,
        offset=offset,
    )
    
    formatted_logs = []
    for log in logs:
        formatted_logs.append({
            "id": log.id,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "user_id": log.user_id,
            "user_name": log.user_name or "Utilisateur",
            "user_email": log.user_email,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "resource_name": log.resource_name,
            "workspace_id": log.workspace_id,
            "espace_id": log.espace_id,
            "ip_address": log.ip_address,
            "status": log.status,
            "details": log.details,
        })
        
    return formatted_logs
