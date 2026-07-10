import os
import logging
from typing import Optional
import requests
from sqlalchemy import text

logger = logging.getLogger(__name__)

K_CHAT_URL = os.getenv("K_CHAT_URL", "http://localhost:8000")


def _get_group_id_by_resource(db, resource_type: str, resource_id: str):
    row = db.execute(
        text("SELECT id FROM messagerie.groupe WHERE resource_type = :type AND resource_id = :id LIMIT 1"),
        {"type": resource_type, "id": resource_id},
    ).first()
    return row[0] if row else None


def _get_creator_for_resource(db, resource_type: str, resource_id: str) -> Optional[str]:
    """
    Récupère le créateur d'une ressource via la table membre (rôle 'Créateur').
    Retourne l'ID de l'utilisateur créateur ou None.
    """
    if resource_type == "workspace":
        row = db.execute(
            text("SELECT id_utilisateur FROM planer.workspace WHERE id = :id"),
            {"id": resource_id}
        ).first()
        return row[0] if row else None
    
    elif resource_type == "espace":
        row = db.execute(
            text("""
                SELECT m.id_utilisateur 
                FROM planer.membre m
                WHERE m.id_espace = :espace_id 
                AND m.role = 'Créateur'
                AND m.statut = 'Actif'
                LIMIT 1
            """),
            {"espace_id": resource_id}
        ).first()
        return row[0] if row else None
    
    elif resource_type == "liste":
        row = db.execute(
            text("""
                SELECT m.id_utilisateur 
                FROM planer.membre m
                WHERE m.id_liste = :liste_id 
                AND m.role = 'Créateur'
                AND m.statut = 'Actif'
                LIMIT 1
            """),
            {"liste_id": resource_id}
        ).first()
        return row[0] if row else None
    
    return None


def ensure_resource_group(db, resource_type: str, resource_id: str, name: str, creator_id: str, members: list = None, token: str | None = None):
    """
    Crée un groupe de discussion dans K-Messenger pour une ressource (workspace, espace, liste).
    
    Args:
        db: Session SQLAlchemy
        resource_type: Type de ressource ('workspace', 'espace', 'liste')
        resource_id: ID de la ressource
        name: Nom du groupe
        creator_id: ID du créateur (doit exister dans public.utilisateur)
        members: Liste des membres à ajouter
        token: Token d'authentification pour K-Messenger
    
    Returns:
        group_id: ID du groupe créé ou existant, None si erreur
    """
    # Vérifier si un groupe existe déjà pour cette ressource
    existing_group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if existing_group_id:
        logger.info(f"🔍 Groupe existant trouvé: {existing_group_id} pour {resource_type}/{resource_id}")
        return existing_group_id
    
    if not token:
        logger.error("❌ Token manquant pour créer un groupe")
        return None
    
    # Préparer les membres
    members_list = members or []
    if creator_id not in members_list:
        members_list = [creator_id] + members_list
    
    cookies = {"access_token": token}
    
    try:
        logger.info(f"📤 Création du groupe pour {resource_type}/{resource_id} avec creator={creator_id}")
        
        response = requests.post(
            f"{K_CHAT_URL}/group/create-group",
            json={
                "name": name,
                "creator": creator_id,
                "members": members_list,
                "resource_type": resource_type,
                "resource_id": resource_id
            },
            cookies=cookies,
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            group_id = data.get("group_id")
            logger.info(f"✅ Groupe créé avec succès: {group_id}")
            return group_id
        else:
            logger.warning(f"⚠️ K-Messenger a retourné une erreur {response.status_code}: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        logger.error("❌ Impossible de contacter K-Messenger. Le service est-il démarré sur le port 8000 ?")
        return None
    except requests.exceptions.Timeout:
        logger.error("❌ Timeout lors de l'appel à K-Messenger")
        return None
    except Exception as e:
        logger.error(f"❌ Erreur lors de la création du groupe: {e}")
        return None


def _convert_role_to_messenger(role: str) -> str:
    """Convertit un rôle K-Planner en rôle K-Messenger."""
    if role in ["Créateur", "Administrateur"]:
        return "admin"
    elif role == "Invité":
        return "guest"
    else:
        return "member"


def sync_resource_member(db, resource_type: str, resource_id: str, user_id: str, name: str, creator_id: str, role: str = "member", token: str | None = None):
    """
    Synchronise un membre vers K-Messenger.
    
    Args:
        role: Rôle K-Planner ("Créateur", "Administrateur", "Membre", "Invité")
              → Converti en rôle K-Messenger ("admin", "member", "guest")
        token: Token d'authentification pour les requêtes K-Messenger
    """
    if not token:
        logger.error("❌ Token manquant pour synchroniser un membre")
        return
    
    messenger_role = _convert_role_to_messenger(role)
    
    group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if not group_id:
        # Si creator_id n'est pas fourni, on le récupère
        if not creator_id:
            creator_id = _get_creator_for_resource(db, resource_type, resource_id) or user_id
        ensure_resource_group(db, resource_type, resource_id, name, creator_id, members=[creator_id, user_id], token=token)
        return
    
    cookies = {"access_token": token}
    
    try:
        response = requests.post(
            f"{K_CHAT_URL}/group/group/{group_id}/add-member",
            json={"user_id": user_id, "actor": creator_id, "role": messenger_role},
            cookies=cookies,
            timeout=5
        )
        if response.status_code == 200:
            logger.info(f"✅ Membre {user_id} ajouté au groupe {group_id} avec rôle {messenger_role} (source: {role})")
        else:
            logger.warning(f"⚠️ Erreur K-Messenger: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Error adding member to K-Chat group: {e}")


def remove_resource_member(db, resource_type: str, resource_id: str, user_id: str, actor_id: str = None, token: str | None = None):
    if not token:
        logger.error("❌ Token manquant pour retirer un membre")
        return
    
    group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if not group_id:
        return
    
    cookies = {"access_token": token}
    
    try:
        if not actor_id:
            row = db.execute(text("SELECT creator FROM messagerie.groupe WHERE id = :group_id"), {"group_id": group_id}).first()
            actor_id = row[0] if row else user_id
        requests.delete(
            f"{K_CHAT_URL}/group/group/{group_id}/remove-member",
            json={"user_id": user_id, "actor": actor_id},
            cookies=cookies,
            timeout=5
        )
    except Exception as e:
        logger.error(f"Error removing member from K-Chat group: {e}")