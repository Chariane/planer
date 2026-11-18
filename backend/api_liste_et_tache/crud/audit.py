import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from models.AuditLog import AuditLog
from core.logging import security_logger

logger = logging.getLogger(__name__)

def log_action(
    db: Session,
    user_id: Optional[str],
    user_name: Optional[str],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    resource_name: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    user_email: Optional[str] = None,
    status: str = "SUCCESS",
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Enregistre un événement d'audit en base de données et dans la console."""
    details_str = json.dumps(details, ensure_ascii=False) if details else None
    
    audit_entry = AuditLog(
        user_id=user_id,
        user_name=user_name,
        user_email=user_email,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_name=resource_name,
        workspace_id=workspace_id,
        espace_id=espace_id,
        ip_address=ip_address,
        status=status,
        details=details_str,
    )
    
    try:
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Échec lors de la sauvegarde du log d'audit: {e}")

    # Écriture console
    try:
        security_logger.log_access(
            user_id=user_id or "system",
            resource_type=resource_type,
            resource_id=resource_id or "",
            action=action,
            allowed=(status == "SUCCESS")
        )
    except Exception:
        pass

    return audit_entry


def get_audit_logs(
    db: Session,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[AuditLog]:
    """Récupère la liste des logs d'audit avec filtres et pagination."""
    query = db.query(AuditLog)
    
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if resource_id:
        query = query.filter(AuditLog.resource_id == resource_id)
    if workspace_id:
        query = query.filter(AuditLog.workspace_id == workspace_id)
    if espace_id:
        query = query.filter(AuditLog.espace_id == espace_id)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
        
    return query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit).all()
