import os
import logging
from typing import Optional
import requests
from sqlalchemy import text

logger = logging.getLogger(__name__)

K_CHAT_URL = os.getenv("K_CHAT_URL", "http://localhost:8000")


def _get_group_id_by_resource(db, resource_type: str, resource_id: str):
    try:
        row = db.execute(
            text("SELECT id FROM messagerie.groupe WHERE resource_type = :type AND resource_id = :id LIMIT 1"),
            {"type": resource_type, "id": str(resource_id)},
        ).first()
        return row[0] if row else None
    except Exception as exc:
        logger.error("Erreur lors de la récupération du groupe de discussion : %s", exc)
        return None


def _get_creator_for_resource(db, resource_type: str, resource_id: str) -> Optional[str]:
    """
    Récupère le créateur d'une ressource via la table membre (rôle 'Créateur').
    Retourne l'ID de l'utilisateur créateur ou None.
    """
    if resource_type == "liste":
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
    existing_group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if existing_group_id:
        return existing_group_id
    
    if not token:
        logger.error("❌ Token manquant pour créer un groupe")
        return None
    
    # Si creator_id n'est pas fourni, on le récupère
    if not creator_id:
        creator_id = _get_creator_for_resource(db, resource_type, resource_id) or "unknown"
    
    cookies = {"access_token": token}
    
    try:
        response = requests.post(
            f"{K_CHAT_URL}/group/create-group",
            json={
                "name": name,
                "creator": creator_id,
                "members": members or [],
                "resource_type": resource_type,
                "resource_id": resource_id
            },
            cookies=cookies,
            timeout=5
        )
        if response.status_code == 200:
            return response.json().get("group_id")
        else:
            logger.warning(f"⚠️ K-Messenger erreur {response.status_code}: {response.text}")
            return None
    except requests.exceptions.ConnectionError:
        logger.error("❌ Impossible de contacter K-Messenger sur le port 8000")
        return None
    except Exception as e:
        logger.error(f"Error creating K-Chat group: {e}")
        return None


def _convert_role_to_messenger(role: str) -> str:
    """Convertit un rôle K-Planner en rôle K-Messenger."""
    if role in ["Créateur", "Administrateur"]:
        return "admin"
    elif role == "Invité":
        return "guest"
    else:
        return "member"


ROLE_RANK = {
    "Invité": 1,
    "Membre": 2,
    "Administrateur": 3,
    "Créateur": 4,
}


def _strongest_role(*roles: str | None) -> str | None:
    valid_roles = [role for role in roles if role]
    if not valid_roles:
        return None
    return max(valid_roles, key=lambda role: ROLE_RANK.get(role, 0))


def _get_direct_resource_role(db, resource_type: str, resource_id: str, user_id: str) -> Optional[str]:
    column_by_type = {
        "liste": "id_liste",
    }
    column_name = column_by_type.get(resource_type)
    if not column_name:
        return None

    row = db.execute(
        text(f"""
            SELECT role
            FROM planer.membre
            WHERE {column_name} = :resource_id
            AND id_utilisateur = :user_id
            AND statut = 'Actif'
            LIMIT 1
        """),
        {"resource_id": resource_id, "user_id": user_id}
    ).first()
    return row[0] if row else None


def _get_effective_resource_role(db, resource_type: str, resource_id: str, user_id: str, fallback_role: str | None = None) -> Optional[str]:
    direct_role = _get_direct_resource_role(db, resource_type, resource_id, user_id)
    inherited_role = None

    if resource_type == "liste":
        try:
            from .core.function import ResourceType, get_parent_inherited_role
            inherited = get_parent_inherited_role(db, user_id, ResourceType.LISTE, resource_id)
            inherited_role = inherited[0] if inherited else None
        except Exception as exc:
            logger.debug(f"Aucun rôle hérité liste trouvé pour {user_id}: {exc}")

    return _strongest_role(direct_role, inherited_role, fallback_role)


def _add_or_update_group_member(db, group_id: str, user_id: str, actor_id: str, messenger_role: str, token: str | None = None):
    """Ajoute un membre au groupe ou met à jour son rôle s'il existe déjà."""
    if not token:
        logger.error("❌ Token manquant pour ajouter ou mettre à jour un membre")
        return False

    if not actor_id:
        row = db.execute(text("SELECT creator FROM messagerie.groupe WHERE id = :group_id"), {"group_id": str(group_id)}).first()
        actor_id = row[0] if row else user_id

    cookies = {"access_token": token}
    
    try:
        response = requests.post(
            f"{K_CHAT_URL}/group/group/{group_id}/add-member",
            json={"user_id": user_id, "actor": actor_id, "role": messenger_role},
            cookies=cookies,
            timeout=5
        )
        if response.status_code == 200:
            logger.info(f"✅ Membre {user_id} synchronisé dans le groupe {group_id} avec rôle {messenger_role}")
            return True
        logger.warning(f"⚠️ Erreur K-Messenger: {response.status_code} - {response.text}")
    except requests.exceptions.ConnectionError:
        logger.error("❌ Impossible de contacter K-Messenger pour synchroniser le membre")
    except Exception as e:
        logger.error(f"Error syncing member to K-Chat group: {e}")
    return False


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
    
    # Si creator_id n'est pas fourni, on le récupère
    if not creator_id:
        creator_id = _get_creator_for_resource(db, resource_type, resource_id) or user_id
    
    group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if not group_id:
        group_id = ensure_resource_group(db, resource_type, resource_id, name, creator_id, members=[creator_id], token=token)
    if not group_id:
        return

    _add_or_update_group_member(db, group_id, user_id, creator_id, messenger_role, token=token)


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
            row = db.execute(text("SELECT creator FROM messagerie.groupe WHERE id = :group_id"), {"group_id": str(group_id)}).first()
            actor_id = row[0] if row else user_id
        requests.delete(
            f"{K_CHAT_URL}/group/group/{group_id}/remove-member",
            json={"user_id": user_id, "actor": actor_id},
            cookies=cookies,
            timeout=5
        )
    except requests.exceptions.ConnectionError:
        logger.error("❌ Impossible de contacter K-Messenger pour retirer le membre")
    except Exception as e:
        logger.error(f"Error removing member from K-Chat group: {e}")


# ✅ NOUVELLE FONCTION : Garantir qu'un utilisateur est membre du groupe d'une ressource
def ensure_chat_group_for_user(db, resource_type: str, resource_id: str, user_id: str, role: str = "Membre", token: str | None = None):
    """
    Garantit qu'un utilisateur est membre du groupe de discussion d'une ressource.
    Si le groupe n'existe pas, il est créé.
    Si l'utilisateur n'est pas membre, il est ajouté.
    
    Args:
        resource_type: Type de la ressource (workspace, espace, liste)
        resource_id: ID de la ressource
        user_id: ID de l'utilisateur
        role: Rôle K-Planner ("Créateur", "Administrateur", "Membre", "Invité")
        token: Token d'accès pour authentifier auprès de K-Messenger
    """
    if not token:
        logger.error("❌ Token manquant pour créer/ajouter un membre au groupe chat")
        return
    
    # Récupérer les informations de la ressource
    resource_name = None
    creator_id = _get_creator_for_resource(db, resource_type, resource_id)
    
    if resource_type == "liste":
        from .crud.liste import get_liste_by_id
        liste = get_liste_by_id(db, resource_id)
        if liste:
            resource_name = liste.nom
    
    if not resource_name:
        resource_name = f"{resource_type}:{resource_id}"
    
    if not creator_id:
        creator_id = user_id
    
    # Créer le groupe si nécessaire
    group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if not group_id:
        group_id = ensure_resource_group(
            db,
            resource_type=resource_type,
            resource_id=resource_id,
            name=resource_name,
            creator_id=creator_id,
            members=[creator_id],
            token=token
        )
    
    effective_role = _get_effective_resource_role(db, resource_type, resource_id, user_id, role)
    messenger_role = _convert_role_to_messenger(effective_role or role)

    # Ajouter l'utilisateur au groupe ou mettre à jour son rôle s'il existe déjà.
    if group_id:
        _add_or_update_group_member(db, group_id, user_id, creator_id, messenger_role, token=token)
    
    return group_id
