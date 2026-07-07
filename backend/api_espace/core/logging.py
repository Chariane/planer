# backend/api_espace/core/logging.py
import json
import logging
import sys
from datetime import datetime
from typing import Dict, Any, Optional

class SecurityLogger:
    """Logger structuré pour les événements de sécurité"""
    
    def __init__(self):
        self.logger = logging.getLogger("k_planer_security")
        self.logger.setLevel(logging.INFO)
        
        # Handler pour stdout (logs Docker)
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter('%(message)s'))
        self.logger.addHandler(handler)
    
    def log_auth(self, action: str, user_id: str, ip: str, status: str, details: Dict = None):
        """Log des événements d'authentification"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "AUTH",
            "service": "api_espace",
            "action": action,
            "user_id": user_id,
            "ip_address": ip,
            "status": status,
            **(details or {})
        }
        self.logger.info(json.dumps(log_entry))
    
    def log_access(self, user_id: str, resource_type: str, resource_id: str, action: str, allowed: bool):
        """Log des accès aux ressources"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "ACCESS",
            "service": "api_espace",
            "user_id": user_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "action": action,
            "allowed": allowed
        }
        self.logger.info(json.dumps(log_entry))
    
    def log_error(self, error_type: str, message: str, user_id: Optional[str] = None, details: Dict = None):
        """Log des erreurs de sécurité"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "ERROR",
            "service": "api_espace",
            "error_type": error_type,
            "message": message,
            "user_id": user_id,
            **(details or {})
        }
        self.logger.info(json.dumps(log_entry))

# Instance globale
security_logger = SecurityLogger()
import json
import logging
import sys
from datetime import datetime
from typing import Dict, Any, Optional

class SecurityLogger:
    """Logger structuré pour les événements de sécurité"""
    
    def __init__(self):
        self.logger = logging.getLogger("k_planer_security_espace")
        self.logger.setLevel(logging.INFO)
        
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter('%(message)s'))
        self.logger.addHandler(handler)
    
    def log_auth(self, action: str, user_id: str, ip: str, status: str, details: Dict = None):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "AUTH",
            "service": "api_espace",
            "action": action,
            "user_id": user_id,
            "ip_address": ip,
            "status": status,
            **(details or {})
        }
        self.logger.info(json.dumps(log_entry))
    
    def log_access(self, user_id: str, resource_type: str, resource_id: str, action: str, allowed: bool):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "ACCESS",
            "service": "api_espace",
            "user_id": user_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "action": action,
            "allowed": allowed
        }
        self.logger.info(json.dumps(log_entry))
    
    def log_error(self, error_type: str, message: str, user_id: Optional[str] = None, details: Dict = None):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "ERROR",
            "service": "api_espace",
            "error_type": error_type,
            "message": message,
            "user_id": user_id,
            **(details or {})
        }
        self.logger.info(json.dumps(log_entry))

security_logger = SecurityLogger()