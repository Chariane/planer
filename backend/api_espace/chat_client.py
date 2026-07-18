import os
import logging
import requests
from sqlalchemy import text
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

K_CHAT_URL = os.getenv("K_CHAT_URL", "http://localhost:8000")


def _get_group_id_by_resource(db, resource_type: str, resource_id: str):
    row = db.execute(
        text("SELECT id FROM messagerie.groupe WHERE resource_type = :type AND resource_id = :id LIMIT 1"),
        {"type": resource_type, "id": resource_id},
    ).first()
    return row[0] if row else None


def ensure_resource_group(db, resource_type: str, resource_id: str, name: str, creator_id: str, members: list = None, token: str | None = None):
    existing_group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if existing_group_id:
        return existing_group_id
    if not token:
        logger.error("❌ Token manquant pour créer un groupe")
        return None
    cookies = {"access_token": token}
    try:
        response = requests.post(
            f"{K_CHAT_URL}/group/create-group",
            json={"name": name, "creator": creator_id, "members": members or [], "resource_type": resource_type, "resource_id": resource_id},
            cookies=cookies,
            timeout=5
        )
        if response.status_code == 200:
            return response.json().get("group_id")
    except Exception as e:
        logger.error(f"Error creating K-Chat group: {e}")
    return None


def sync_resource_group_name(db, resource_type: str, resource_id: str, name: str, creator_id: str | None = None, token: str | None = None):
    """Synchronise le nom du groupe K-Messenger associé à une ressource."""
    result = db.execute(
        text("""
            UPDATE messagerie.groupe
            SET name = :name,
                updated_at = CURRENT_TIMESTAMP
            WHERE resource_type = :resource_type
            AND resource_id = :resource_id
        """),
        {"name": name, "resource_type": resource_type, "resource_id": resource_id},
    )
    if result.rowcount:
        return True
    if creator_id and token:
        return bool(ensure_resource_group(db, resource_type, resource_id, name, creator_id, members=[creator_id], token=token))
    return False


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
        "espace": "id_espace",
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

    if resource_type == "espace":
        try:
            from .core.function import ResourceType, get_parent_inherited_role
            inherited = get_parent_inherited_role(db, user_id, ResourceType.ESPACE, resource_id)
            inherited_role = inherited[0] if inherited else None
        except Exception as exc:
            logger.debug(f"Aucun rôle hérité espace trouvé pour {user_id}: {exc}")

    return _strongest_role(direct_role, inherited_role, fallback_role)


def _add_or_update_group_member(db, group_id: str, user_id: str, actor_id: str, messenger_role: str, token: str | None = None):
    """Ajoute un membre au groupe ou met à jour son rôle s'il existe déjà."""
    if not token:
        logger.error("❌ Token manquant pour ajouter ou mettre à jour un membre")
        return False

    if not actor_id:
        row = db.execute(text("SELECT creator FROM messagerie.groupe WHERE id = :group_id"), {"group_id": group_id}).first()
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
    except Exception as e:
        logger.error(f"Error syncing member to K-Chat group: {e}")
    return False


def _sync_single_resource_member(db, resource_type: str, resource_id: str, user_id: str, name: str, creator_id: str, messenger_role: str, token: str | None = None):
    """Synchronise un utilisateur sur un seul groupe de ressource."""
    group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if not group_id:
        group_id = ensure_resource_group(db, resource_type, resource_id, name, creator_id, members=[creator_id], token=token)
    if not group_id:
        return
    _add_or_update_group_member(db, group_id, user_id, creator_id, messenger_role, token=token)


def _get_creator_for_resource(db, resource_type: str, resource_id: str) -> Optional[str]:
    """
    Récupère le créateur d'une ressource via la table membre (rôle 'Créateur').
    Retourne l'ID de l'utilisateur créateur ou None.
    """
    if resource_type == "espace":
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


def _get_child_resources(db, resource_type: str, resource_id: str) -> List[Tuple[str, str, str, str]]:
    """
    Récupère toutes les ressources enfants d'une ressource donnée.
    Retourne une liste de tuples (type, id, nom, creator_id).
    """
    children = []
    
    try:
        if resource_type == "espace":
            # 1. Sous-espaces
            children.extend(_get_sub_espaces(db, resource_id))
            # 2. Listes de l'espace - On récupère le créateur via la table membre
            listes = db.execute(
                text("""
                    SELECT l.id, l.nom 
                    FROM planer.liste l
                    WHERE l.id_espace = :espace_id
                """),
                {"espace_id": resource_id}
            ).all()
            for liste in listes:
                creator_id = _get_creator_for_resource(db, "liste", liste[0])
                children.append(("liste", liste[0], liste[1], creator_id))
    except Exception as e:
        logger.error(f"Critical error in _get_child_resources: {e}")
    
    return children


def _get_sub_espaces(db, parent_id: str) -> List[Tuple[str, str, str, str]]:
    """Récupère récursivement tous les sous-espaces d'un espace parent."""
    results = []
    espaces = db.execute(
        text("""
            SELECT id, nom 
            FROM planer.espace 
            WHERE id_espace_parent = :parent_id
        """),
        {"parent_id": parent_id}
    ).all()
    for espace in espaces:
        creator_id = _get_creator_for_resource(db, "espace", espace[0])
        results.append(("espace", espace[0], espace[1], creator_id))
        results.extend(_get_sub_espaces(db, espace[0]))
    return results


def sync_resource_member(db, resource_type: str, resource_id: str, user_id: str, name: str, creator_id: str, role: str = "member", cascade: bool = False, token: str | None = None):
    """
    Synchronise un membre vers K-Messenger.
    
    Args:
        role: Rôle K-Planner ("Créateur", "Administrateur", "Membre", "Invité")
              → Converti en rôle K-Messenger ("admin", "member", "guest")
        cascade: Si True, synchronise aussi sur toutes les ressources enfants
    """
    try:
        messenger_role = _convert_role_to_messenger(role)
        
        # 1. Synchroniser sur la ressource cible
        _sync_single_resource_member(
            db, resource_type, resource_id, user_id, name, creator_id, messenger_role, token=token
        )
        
        # 2. Si cascade=True, synchroniser sur toutes les ressources enfants
        if cascade:
            children = _get_child_resources(db, resource_type, resource_id)
            for child_type, child_id, child_name, child_creator_id in children:
                try:
                    _sync_single_resource_member(
                        db, 
                        child_type, 
                        child_id, 
                        user_id, 
                        child_name, 
                        child_creator_id, 
                        messenger_role,
                        token=token
                    )
                except Exception as loop_e:
                    logger.error(f"Error in sync cascade loop: {loop_e}")
    except Exception as e:
        logger.error(f"Failed to sync resource member: {e}")


def remove_resource_member(db, resource_type: str, resource_id: str, user_id: str, actor_id: str = None, cascade: bool = False, token: str | None = None):
    """
    Retire un membre d'un groupe de ressource K-Messenger.
    
    Args:
        cascade: Si True, retire aussi de toutes les ressources enfants
    """
    # 1. Retirer de la ressource cible
    _remove_single_resource_member(db, resource_type, resource_id, user_id, actor_id, token=token)
    
    # 2. Si cascade=True, retirer de toutes les ressources enfants
    if cascade:
        children = _get_child_resources(db, resource_type, resource_id)
        for child_type, child_id, _, _ in children:
            _remove_single_resource_member(db, child_type, child_id, user_id, actor_id, token=token)


def _remove_single_resource_member(db, resource_type: str, resource_id: str, user_id: str, actor_id: str = None, token: str | None = None):
    """Retire un utilisateur d'un seul groupe de ressource."""
    group_id = _get_group_id_by_resource(db, resource_type, resource_id)
    if not group_id:
        return
    if not token:
        logger.error("❌ Token manquant pour retirer un membre")
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
        token: Token d'authentification pour les requêtes K-Messenger
    """
    if not token:
        logger.error("❌ Token manquant pour ensure_chat_group_for_user")
        return None
    # Récupérer les informations de la ressource
    resource_name = None
    creator_id = None
    
    if resource_type == "espace":
        from .crud.utilisateur import get_espace_by_id
        espace = get_espace_by_id(db, resource_id)
        if espace:
            resource_name = espace.nom
            creator_id = _get_creator_for_resource(db, "espace", resource_id)
    
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
