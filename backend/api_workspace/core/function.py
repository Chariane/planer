# backend/api_workspace/core/function.py

from datetime import datetime
from typing import Any, List, Optional, Set, Tuple
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from ..models import Espace, Liste, Membre, PlanerEntreprise, Tache, Utilisateur, Workspace

# ============================================================================
# CONSTANTES
# ============================================================================

class Role:
    CREATOR = "Créateur"
    ADMIN = "Administrateur"
    MEMBER = "Membre"
    GUEST = "Invité"
    
    ALL = {CREATOR, ADMIN, MEMBER, GUEST}
    READ_ROLES = {CREATOR, ADMIN, MEMBER, GUEST}
    MANAGEMENT_ROLES = {CREATOR, ADMIN}
    ADMIN_MANAGEABLE_ROLES = {MEMBER, GUEST}
    CONTENT_CREATION_ROLES = {CREATOR, ADMIN, MEMBER}
    DIRECT_ACCESS_ROLES = {MEMBER, GUEST}


class Status:
    ACTIVE = "Actif"
    PENDING = "En attente"
    SUSPENDED = "Suspendu"
    LEFT = "Quitté"


class ResourceType:
    WORKSPACE = "workspace"
    ESPACE = "espace"
    LISTE = "liste"
    TACHE = "tache"


# ============================================================================
# UTILITAIRES PREMIUM
# ============================================================================

def is_premium_user(user: Optional[Utilisateur]) -> bool:
    """Vérifie si un utilisateur a un compte premium actif."""
    if not user or user.type_compte != "Premium":
        return False
    return user.premium_expire_at is not None and user.premium_expire_at > datetime.utcnow()


def is_premium_entreprise(entreprise: Optional[PlanerEntreprise]) -> bool:
    """Vérifie si une entreprise a un compte premium actif."""
    if not entreprise or not entreprise.is_premium or entreprise.statut_compte != "Actif":
        return False
    return entreprise.premium_expire_at is not None and entreprise.premium_expire_at > datetime.utcnow()


def user_has_premium_access(db: Session, user_id: str) -> bool:
    """Vérifie si un utilisateur a accès premium (personnel ou entreprise)."""
    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if is_premium_user(user):
        return True
    
    entreprise = db.query(PlanerEntreprise).filter(PlanerEntreprise.id_utilisateur == user_id).first()
    return is_premium_entreprise(entreprise)


# ============================================================================
# LIMITES DE CRÉATION
# ============================================================================

def get_workspace_count_for_owner(db: Session, user_id: str) -> int:
    """Compte le nombre de workspaces créés par l'utilisateur."""
    return db.query(Workspace).filter(Workspace.id_utilisateur == user_id).count()


def get_espace_count_for_owner(db: Session, user_id: str) -> int:
    """Compte le nombre d'espaces créés par l'utilisateur (tous workspaces confondus)."""
    return (
        db.query(Espace)
        .join(Workspace, Espace.id_workspace == Workspace.id)
        .filter(Workspace.id_utilisateur == user_id)
        .count()
    )


def can_create_workspace(db: Session, user_id: str) -> bool:
    """Vérifie si l'utilisateur peut créer un workspace (limite: 1 pour non-premium)."""
    if user_has_premium_access(db, user_id):
        return True
    return get_workspace_count_for_owner(db, user_id) < 1


def can_create_espace(db: Session, user_id: str) -> bool:
    """Vérifie si l'utilisateur peut créer un espace (limite: 1 pour non-premium)."""
    if user_has_premium_access(db, user_id):
        return True
    return get_espace_count_for_owner(db, user_id) < 1


# ============================================================================
# GESTION DES TRANSACTIONS
# ============================================================================

def commit_or_raise(
    db: Session,
    *,
    detail: str,
    status_code: int = 409,
    refresh_instance: Any | None = None,
) -> None:
    """Commit la transaction ou lève une exception en cas d'IntegrityError."""
    try:
        db.commit()
        if refresh_instance is not None:
            db.refresh(refresh_instance)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status_code, detail=detail) from exc


# ============================================================================
# RÉSOLUTION DE RÔLE ET STATUT
# ============================================================================

def _is_workspace_owner(workspace: Workspace, user_id: str) -> bool:
    """Vérifie si l'utilisateur est le propriétaire du workspace."""
    return workspace.id_utilisateur == user_id


def _resolve_role_and_status(
    workspace: Workspace,
    membre: Optional[Membre],
    current_user_id: str,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Résout le rôle et le statut effectif d'un utilisateur dans un workspace.
    Le propriétaire du workspace a toujours le rôle Créateur et statut Actif.
    """
    if _is_workspace_owner(workspace, current_user_id):
        return Role.CREATOR, Status.ACTIVE
    
    if membre:
        return membre.role, membre.statut
    
    return None, None


# ============================================================================
# RÉCUPÉRATION DU CONTEXTE D'ACCÈS
# ============================================================================

def _get_workspace_with_member(
    db: Session, 
    workspace_id: str, 
    current_user_id: str
) -> Tuple[Workspace, Optional[Membre], str, str]:
    """
    Récupère le workspace et les informations d'appartenance de l'utilisateur.
    
    Returns:
        Tuple[Workspace, Optional[Membre], role, statut]
    
    Raises:
        HTTPException(404): Workspace non trouvé
        HTTPException(403): Accès refusé
    """
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    
    # Récupérer le membre (si existe)
    membre = (
        db.query(Membre)
        .filter(
            Membre.id_utilisateur == current_user_id,
            Membre.id_workspace == workspace_id,
            Membre.statut == Status.ACTIVE
        )
        .first()
    )
    
    role, statut = _resolve_role_and_status(workspace, membre, current_user_id)
    
    if role is None or statut != Status.ACTIVE:
        raise HTTPException(status_code=403, detail="Accès refusé à ce workspace")
    
    return workspace, membre, role, statut


# ============================================================================
# VALIDATIONS DE PERMISSIONS
# ============================================================================

def _validate_member_management_permissions(
    workspace: Workspace,
    actor_role: str,
    target_user_id: str,
    target_member: Optional[Membre],
    new_role: Optional[str] = None,
):
    """Valide que l'acteur peut gérer le membre cible."""
    if workspace.id_utilisateur == target_user_id:
        raise HTTPException(
            status_code=403,
            detail="Le créateur du workspace ne peut pas être modifié ou retiré.",
        )
    
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre introuvable")
    
    if actor_role == Role.ADMIN and target_member.role not in Role.ADMIN_MANAGEABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Un administrateur ne peut gérer que les membres et invités du workspace.",
        )
        
    # Validation du nouveau rôle
    if actor_role == Role.ADMIN and new_role and new_role not in Role.ADMIN_MANAGEABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Un administrateur ne peut pas promouvoir un membre à ce rôle.",
        )


def _validate_invitation_permissions(actor_role: str, invited_role: str):
    """Valide que l'acteur peut inviter avec le rôle spécifié."""
    if actor_role == Role.ADMIN and invited_role not in Role.ADMIN_MANAGEABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Un administrateur ne peut inviter que des membres ou invités dans le workspace.",
        )


# ============================================================================
# FONCTIONS DE CONTRÔLE D'ACCÈS (PUBLIQUES)
# ============================================================================

def _require_workspace_read_access(db: Session, workspace_id: str, current_user_id: str):
    """Require au minimum un accès en lecture au workspace."""
    workspace, membre, role, _ = _get_workspace_with_member(db, workspace_id, current_user_id)
    if role not in Role.READ_ROLES:
        raise HTTPException(status_code=403, detail="Accès refusé à ce workspace")
    return workspace, membre, role


def _require_workspace_management_access(db: Session, workspace_id: str, current_user_id: str):
    """Require un accès de gestion (Créateur ou Admin)."""
    workspace, membre, role, _ = _get_workspace_with_member(db, workspace_id, current_user_id)
    if role not in Role.MANAGEMENT_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Seuls le créateur et les administrateurs du workspace peuvent effectuer cette action.",
        )
    return workspace, membre, role


def _require_workspace_owner_access(db: Session, workspace_id: str, current_user_id: str):
    """Require que l'utilisateur soit le créateur du workspace."""
    workspace, membre, role, _ = _get_workspace_with_member(db, workspace_id, current_user_id)
    if role != Role.CREATOR:
        raise HTTPException(
            status_code=403,
            detail="Seul le créateur du workspace peut effectuer cette action.",
        )
    return workspace, membre, role


def _require_workspace_member_management_access(
    db: Session,
    workspace_id: str,
    current_user_id: str,
    target_user_id: str,
    new_role: Optional[str] = None
) -> Tuple[Workspace, Optional[Membre], str, Membre]:
    """
    Vérifie que l'acteur peut gérer le membre cible.
    
    Returns:
        Tuple[workspace, actor_membre, actor_role, target_membre]
    """
    workspace, membre, actor_role = _require_workspace_management_access(
        db, workspace_id, current_user_id
    )
    
    target_member = (
        db.query(Membre)
        .filter(
            Membre.id_utilisateur == target_user_id,
            Membre.id_workspace == workspace_id
        )
        .first()
    )
    
    _validate_member_management_permissions(
        workspace,
        actor_role,
        target_user_id,
        target_member,
        new_role
    )
    
    return workspace, membre, actor_role, target_member


def _require_workspace_invitation_access(
    db: Session,
    workspace_id: str,
    current_user_id: str,
    invited_role: str,
) -> Tuple[Workspace, Optional[Membre], str]:
    """Vérifie que l'acteur peut inviter avec le rôle spécifié."""
    workspace, membre, actor_role = _require_workspace_management_access(
        db, workspace_id, current_user_id
    )
    
    _validate_invitation_permissions(actor_role, invited_role)
    
    return workspace, membre, actor_role


# ============================================================================
# UTILITAIRES DE HIÉRARCHIE
# ============================================================================

def get_owned_workspace_ids(db: Session, user_id: str) -> Set[str]:
    """Récupère les IDs des workspaces possédés par l'utilisateur."""
    owned_ids = db.query(Workspace.id).filter(Workspace.id_utilisateur == user_id).all()
    return {row[0] for row in owned_ids}


def get_user_memberships_by_type(
    db: Session,
    user_id: str,
    resource_type: str,
    exclude_owned_workspaces: bool = True
) -> List[Membre]:
    """
    Récupère les memberships d'un utilisateur pour un type de ressource donné.
    
    Args:
        db: Session
        user_id: ID utilisateur
        resource_type: Type de ressource (workspace, espace, liste, tache)
        exclude_owned_workspaces: Exclure les workspaces possédés
    
    Returns:
        Liste des memberships avec eager loading des relations
    """
    query = db.query(Membre).filter(
        Membre.id_utilisateur == user_id,
        Membre.statut == Status.ACTIVE,
    )
    
    # Filtrer par type de ressource
    if resource_type == ResourceType.WORKSPACE:
        query = query.filter(
            Membre.id_workspace.isnot(None),
            Membre.role.in_(Role.DIRECT_ACCESS_ROLES)
        )
        query = query.options(joinedload(Membre.workspace))
    elif resource_type == ResourceType.ESPACE:
        query = query.filter(
            Membre.id_espace.isnot(None),
            Membre.role.in_(Role.DIRECT_ACCESS_ROLES)
        )
        query = query.options(joinedload(Membre.espace).joinedload(Espace.workspace))
    elif resource_type == ResourceType.LISTE:
        query = query.filter(
            Membre.id_liste.isnot(None),
            Membre.role.in_(Role.DIRECT_ACCESS_ROLES)
        )
        query = query.options(
            joinedload(Membre.liste)
            .joinedload(Liste.espace)
            .joinedload(Espace.workspace)
        )
    elif resource_type == ResourceType.TACHE:
        query = query.filter(
            Membre.id_tache.isnot(None),
            Membre.role.in_(Role.DIRECT_ACCESS_ROLES)
        )
        query = query.options(
            joinedload(Membre.tache)
            .joinedload(Tache.liste)
            .joinedload(Liste.espace)
            .joinedload(Espace.workspace)
        )
    
    memberships = query.all()
    
    # Exclure les workspaces possédés si demandé
    if exclude_owned_workspaces:
        owned_ids = get_owned_workspace_ids(db, user_id)
        memberships = [
            m for m in memberships 
            if not _is_from_owned_workspace(m, owned_ids)
        ]
    
    return memberships


def _is_from_owned_workspace(membre: Membre, owned_ids: Set[str]) -> bool:
    """Vérifie si un membership provient d'un workspace possédé."""
    if membre.id_workspace and membre.id_workspace in owned_ids:
        return True
    
    if membre.id_espace and membre.espace:
        return membre.espace.id_workspace in owned_ids
    
    if membre.id_liste and membre.liste:
        if membre.liste.espace:
            return membre.liste.espace.id_workspace in owned_ids
    
    if membre.id_tache and membre.tache and membre.tache.liste:
        if membre.tache.liste.espace:
            return membre.tache.liste.espace.id_workspace in owned_ids
    
    return False


# ============================================================================
# SÉRIALISATION
# ============================================================================

def _serialize_workspace(workspace: Workspace, membre: Optional[Membre] = None, member_count: Optional[int] = None) -> dict:
    """Sérialise un workspace avec les informations de membership."""
    user_id = membre.id_utilisateur if membre else workspace.id_utilisateur
    role, statut = _resolve_role_and_status(workspace, membre, user_id)
    
    if member_count is None:
        member_count = sum(
            1 for m in (workspace.membres or []) 
            if m.statut == Status.ACTIVE
        )
    
    return {
        "id": workspace.id,
        "nom": workspace.nom,
        "description": workspace.description,
        "created_at": workspace.created_at,
        "updated_at": workspace.updated_at,
        "id_utilisateur": workspace.id_utilisateur,
        "member_count": member_count,
        "current_user_role": role,
        "current_user_statut": statut,
    }


def _serialize_member(membre: Membre) -> dict:
    """Sérialise un membre avec les informations utilisateur."""
    utilisateur = membre.utilisateur
    return {
        "id": membre.id,
        "created_at": membre.created_at,
        "role": membre.role,
        "statut": membre.statut,
        "id_utilisateur": membre.id_utilisateur,
        "id_workspace": membre.id_workspace,
        "id_espace": membre.id_espace,
        "id_liste": membre.id_liste,
        "id_tache": membre.id_tache,
        "utilisateur": (
            {
                "id": utilisateur.id,
                "username": utilisateur.username,
                "email": utilisateur.email,
                "nom": utilisateur.nom,
                "prenoms": utilisateur.prenoms,
            }
            if utilisateur
            else None
        ),
    }


def _serialize_resource_membership(membre: Membre, resource_type: str) -> dict:
    """Sérialise un membership de ressource (espace, liste, tache)."""
    base = {
        "id": None,
        "nom": "Inconnu",
        "role": membre.role,
        "workspace_id": None,
        "workspace_nom": None,
    }
    
    if resource_type == ResourceType.ESPACE and membre.espace:
        workspace = membre.espace.workspace
        return {
            **base,
            "id": membre.id_espace,
            "id_espace": membre.id_espace,
            "nom": membre.espace.nom,
            "workspace_id": workspace.id if workspace else None,
            "id_workspace": workspace.id if workspace else None,
            "workspace_nom": workspace.nom if workspace else None,
        }
    
    elif resource_type == ResourceType.LISTE and membre.liste:
        workspace = membre.liste.espace.workspace if membre.liste.espace else None
        return {
            **base,
            "id": membre.id_liste,
            "id_liste": membre.id_liste,
            "nom": membre.liste.nom,
            "workspace_id": workspace.id if workspace else None,
            "id_workspace": workspace.id if workspace else None,
            "workspace_nom": workspace.nom if workspace else None,
            "id_espace": membre.liste.id_espace,
        }
    
    elif resource_type == ResourceType.TACHE and membre.tache:
        liste = membre.tache.liste
        workspace = liste.espace.workspace if (liste and liste.espace) else None
        return {
            **base,
            "id": membre.id_tache,
            "id_tache": membre.id_tache,
            "nom": membre.tache.titre,
            "workspace_id": workspace.id if workspace else None,
            "id_workspace": workspace.id if workspace else None,
            "workspace_nom": workspace.nom if workspace else None,
            "id_espace": liste.id_espace if liste else None,
            "id_liste": membre.tache.id_liste,
        }
    
    return base


# ============================================================================
# RÉCUPÉRATION DES DONNÉES DE NAVIGATION
# ============================================================================

def get_owned_workspaces(db: Session, user_id: str) -> List[dict]:
    """Liste des workspaces créés par l'utilisateur."""
    workspaces = db.query(Workspace).filter(Workspace.id_utilisateur == user_id).all()
    return [_serialize_workspace(ws) for ws in workspaces]


def get_joined_workspaces(db: Session, user_id: str) -> List[dict]:
    """Liste des workspaces où l'utilisateur est membre (non propriétaire)."""
    memberships = get_user_memberships_by_type(
        db, user_id, ResourceType.WORKSPACE, exclude_owned_workspaces=True
    )
    return [_serialize_workspace(m.workspace, membre=m) for m in memberships]


def get_joined_espaces(db: Session, user_id: str) -> List[dict]:
    """Espaces rejoints directement (hors workspaces possédés)."""
    memberships = get_user_memberships_by_type(
        db, user_id, ResourceType.ESPACE, exclude_owned_workspaces=True
    )
    return [_serialize_resource_membership(m, ResourceType.ESPACE) for m in memberships]


def get_joined_listes(db: Session, user_id: str) -> List[dict]:
    """Listes rejointes directement (hors workspaces possédés)."""
    memberships = get_user_memberships_by_type(
        db, user_id, ResourceType.LISTE, exclude_owned_workspaces=True
    )
    return [_serialize_resource_membership(m, ResourceType.LISTE) for m in memberships]


def get_joined_taches(db: Session, user_id: str) -> List[dict]:
    """Tâches rejointes directement (hors workspaces possédés)."""
    memberships = get_user_memberships_by_type(
        db, user_id, ResourceType.TACHE, exclude_owned_workspaces=True
    )
    return [_serialize_resource_membership(m, ResourceType.TACHE) for m in memberships]


def get_user_navigation_data(db: Session, user_id: str) -> dict:
    """
    Structure agrégée de toutes les données de navigation de l'utilisateur.
    Une seule fonction pour récupérer tout ce dont le frontend a besoin.
    """
    return {
        "owned_workspaces": get_owned_workspaces(db, user_id),
        "joined_workspaces": get_joined_workspaces(db, user_id),
        "joined_espaces": get_joined_espaces(db, user_id),
        "joined_listes": get_joined_listes(db, user_id),
        "joined_taches": get_joined_taches(db, user_id),
    }


def get_user_workspaces_listing(db: Session, user_id: str) -> dict:
    """Récupère les workspaces possédés et rejoints séparément."""
    return {
        "owned": get_owned_workspaces(db, user_id),
        "joined": get_joined_workspaces(db, user_id),
    }


def get_workspace_local_resources(db: Session, workspace_id: str, user_id: str) -> dict:
    """
    Récupère les ressources directes (Espaces, Listes, Tâches) 
    au sein d'un workspace spécifique auxquelles l'utilisateur a un accès direct.
    """
    workspace, _, actor_role = _require_workspace_read_access(db, workspace_id, user_id)
    
    # Récupérer tous les memberships directs de l'utilisateur
    all_memberships = db.query(Membre).filter(
        Membre.id_utilisateur == user_id,
        Membre.statut == Status.ACTIVE,
        Membre.role.in_(Role.DIRECT_ACCESS_ROLES)
    ).options(
        joinedload(Membre.espace),
        joinedload(Membre.liste).joinedload(Liste.espace),
        joinedload(Membre.tache).joinedload(Tache.liste).joinedload(Liste.espace),
    ).all()
    
    espaces = []
    listes = []
    taches = []
    
    for m in all_memberships:
        # Espaces du workspace
        if m.id_espace and m.espace and m.espace.id_workspace == workspace_id:
            espaces.append({
                "id": m.id_espace,
                "nom": m.espace.nom,
                "role": m.role
            })
        
        # Listes du workspace
        elif m.id_liste and m.liste:
            liste_workspace_id = None
            if m.liste.espace:
                liste_workspace_id = m.liste.espace.id_workspace
            
            if liste_workspace_id == workspace_id:
                listes.append({
                    "id": m.id_liste,
                    "nom": m.liste.nom,
                    "role": m.role,
                    "id_espace": m.liste.id_espace
                })
        
        # Tâches du workspace
        elif m.id_tache and m.tache and m.tache.liste:
            liste = m.tache.liste
            tache_workspace_id = None
            if liste.espace:
                tache_workspace_id = liste.espace.id_workspace
            
            if tache_workspace_id == workspace_id:
                taches.append({
                    "id": m.id_tache,
                    "nom": m.tache.titre,
                    "role": m.role,
                    "id_liste": m.tache.id_liste,
                    "id_espace": liste.id_espace
                })
    
    return {
        "workspace_id": workspace_id,
        "workspace_nom": workspace.nom,
        "my_workspace_role": actor_role,
        "direct_access": {
            "espaces": espaces,
            "listes": listes,
            "taches": taches,
        }
    }