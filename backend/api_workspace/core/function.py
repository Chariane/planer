# backend/api_workspace/core/function.py
import base64
from datetime import datetime
from typing import Any, List, Optional, Set, Tuple
from fastapi import HTTPException
from fastapi.responses import HTMLResponse
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
    DIRECT_ACCESS_ROLES = ALL
    DESCENDANT_INHERITED_ROLES = {CREATOR, ADMIN, MEMBER, GUEST}
    HIERARCHY = {
        GUEST: 1,
        MEMBER: 2,
        ADMIN: 3,
        CREATOR: 4,
    }


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
    """Autorise la création de workspace sans appliquer de quota d'abonnement."""
    return True


def can_create_espace(db: Session, user_id: str) -> bool:
    """Autorise la création d'espace sans appliquer de quota d'abonnement."""
    return True


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


def _get_role_rank(role: Optional[str]) -> int:
    """Retourne le niveau hiérarchique d'un rôle."""
    if role is None:
        return 0
    return Role.HIERARCHY.get(role, 0)


def _get_active_membership_for_target(
    db: Session,
    user_id: str,
    *,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    tache_id: Optional[str] = None,
) -> Optional[Membre]:
    """Récupère un membership actif direct sur une cible précise."""
    filters = [Membre.id_utilisateur == user_id, Membre.statut == Status.ACTIVE]

    if workspace_id is not None:
        filters.append(Membre.id_workspace == workspace_id)
    if espace_id is not None:
        filters.append(Membre.id_espace == espace_id)
    if liste_id is not None:
        filters.append(Membre.id_liste == liste_id)
    if tache_id is not None:
        filters.append(Membre.id_tache == tache_id)

    return db.query(Membre).filter(*filters).first()


def _append_inherited_candidate(
    candidates: List[tuple[str, str, str]],
    *,
    role: Optional[str],
    resource_type: str,
    resource_id: Optional[str],
) -> None:
    """Ajoute un candidat hérité si son rôle participe à l'héritage descendant."""
    if role in Role.DESCENDANT_INHERITED_ROLES and resource_id:
        candidates.append((role, resource_type, resource_id))


def _append_workspace_inherited_candidate(
    db: Session,
    candidates: List[tuple[str, str, str]],
    workspace_id: Optional[str],
    user_id: str,
) -> None:
    """Ajoute le rôle hérité depuis le workspace si l'utilisateur couvre la cible."""
    if not workspace_id:
        return

    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return

    if workspace.id_utilisateur == user_id:
        candidates.append((Role.CREATOR, ResourceType.WORKSPACE, workspace.id))
        return

    workspace_member = _get_active_membership_for_target(
        db,
        user_id,
        workspace_id=workspace.id,
    )
    if workspace_member:
        _append_inherited_candidate(
            candidates,
            role=workspace_member.role,
            resource_type=ResourceType.WORKSPACE,
            resource_id=workspace.id,
        )


def _append_espace_chain_inherited_candidates(
    db: Session,
    candidates: List[tuple[str, str, str]],
    start_espace_id: Optional[str],
    user_id: str,
) -> None:
    """Ajoute les rôles hérités depuis un espace parent et toute sa chaîne d'ancêtres."""
    current_espace_id = start_espace_id

    while current_espace_id:
        espace_member = _get_active_membership_for_target(
            db,
            user_id,
            espace_id=current_espace_id,
        )
        if espace_member:
            _append_inherited_candidate(
                candidates,
                role=espace_member.role,
                resource_type=ResourceType.ESPACE,
                resource_id=current_espace_id,
            )

        current_espace = db.query(Espace).filter(Espace.id == current_espace_id).first()
        if not current_espace:
            return
        current_espace_id = current_espace.id_espace_parent


def get_parent_inherited_role(
    db: Session,
    user_id: str,
    target_type: str,
    target_id: str,
) -> Optional[tuple[str, str, str]]:
    """
    Retourne le rôle hérité parent le plus fort couvrant la ressource cible.

    Format de retour:
    (role, resource_type_source, resource_id_source)
    """
    candidates: List[tuple[str, str, str]] = []

    if target_type == ResourceType.WORKSPACE:
        return None

    if target_type == ResourceType.ESPACE:
        espace = db.query(Espace).filter(Espace.id == target_id).first()
        if not espace:
            raise HTTPException(status_code=404, detail="Espace non trouve.")

        _append_workspace_inherited_candidate(db, candidates, espace.id_workspace, user_id)
        _append_espace_chain_inherited_candidates(
            db,
            candidates,
            espace.id_espace_parent,
            user_id,
        )

    elif target_type == ResourceType.LISTE:
        liste = (
            db.query(Liste)
            .options(joinedload(Liste.espace), joinedload(Liste.workspace))
            .filter(Liste.id == target_id)
            .first()
        )
        if not liste:
            raise HTTPException(status_code=404, detail="Liste non trouvee.")

        workspace_id = liste.id_workspace or (liste.espace.id_workspace if liste.espace else None)
        _append_workspace_inherited_candidate(db, candidates, workspace_id, user_id)
        _append_espace_chain_inherited_candidates(db, candidates, liste.id_espace, user_id)

    elif target_type == ResourceType.TACHE:
        tache = (
            db.query(Tache)
            .options(
                joinedload(Tache.liste).joinedload(Liste.espace),
                joinedload(Tache.liste).joinedload(Liste.workspace),
            )
            .filter(Tache.id == target_id)
            .first()
        )
        if not tache:
            raise HTTPException(status_code=404, detail="Tache non trouvee.")

        if tache.id_liste:
            liste_member = _get_active_membership_for_target(
                db,
                user_id,
                liste_id=tache.id_liste,
            )
            if liste_member:
                _append_inherited_candidate(
                    candidates,
                    role=liste_member.role,
                    resource_type=ResourceType.LISTE,
                    resource_id=tache.id_liste,
                )

        if tache.liste:
            workspace_id = tache.liste.id_workspace or (
                tache.liste.espace.id_workspace if tache.liste.espace else None
            )
            _append_workspace_inherited_candidate(db, candidates, workspace_id, user_id)
            _append_espace_chain_inherited_candidates(
                db,
                candidates,
                tache.liste.id_espace,
                user_id,
            )

    else:
        raise HTTPException(status_code=400, detail="Type de ressource invalide.")

    if not candidates:
        return None

    return max(candidates, key=lambda item: _get_role_rank(item[0]))


def validate_role_hierarchy(
    db: Session,
    user_id: str,
    target_type: str,
    target_id: str,
    new_role: str,
) -> Optional[tuple[str, str, str]]:
    """
    Refuse un rôle enfant identique ou inférieur lorsqu'un rôle parent actif couvre déjà la ressource.
    """
    inherited = get_parent_inherited_role(db, user_id, target_type, target_id)
    if not inherited:
        return None

    inherited_role, source_type, source_id = inherited
    if _get_role_rank(inherited_role) >= _get_role_rank(new_role):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Invitation non nécessaire : cette personne possède déjà le rôle "
                f"'{inherited_role}' hérité depuis un {source_type} parent. "
                f"Vous ne pouvez pas lui attribuer le rôle '{new_role}' sur cette ressource enfant, "
                "car ce rôle est inférieur ou équivalent à son rôle parent."
            ),
        )

    return inherited


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
    # ✅ Le créateur du workspace ne peut pas être modifié ou retiré
    if workspace.id_utilisateur == target_user_id:
        raise HTTPException(
            status_code=403,
            detail="Le créateur du workspace ne peut pas être modifié ou retiré.",
        )
    
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre introuvable")
    
    # ✅ SEUL le Créateur peut modifier les rôles
    if actor_role != Role.CREATOR:
        raise HTTPException(
            status_code=403,
            detail="Seul le créateur du workspace peut modifier les rôles des membres.",
        )
    
    # ✅ Le Créateur peut modifier n'importe quel membre (Admin, Membre, Invité)
    # sauf le créateur (déjà vérifié ci-dessus)
    return


def _validate_invitation_permissions(actor_role: str, invited_role: str):
    """Valide que l'acteur peut inviter avec le rôle spécifié."""
    # ✅ Le Créateur peut inviter avec n'importe quel rôle
    if actor_role == Role.CREATOR:
        return
    
    # ✅ Un Administrateur ne peut inviter qu'avec les rôles Invité ou Membre
    if actor_role == Role.ADMIN:
        if invited_role not in {Role.GUEST, Role.MEMBER}:
            raise HTTPException(
                status_code=403,
                detail="Un administrateur ne peut inviter que des invités ou membres dans le workspace.",
            )
        return
    
    # ✅ Si l'acteur n'est ni Créateur ni Admin
    raise HTTPException(
        status_code=403,
        detail="Vous n'avez pas les droits pour inviter des membres dans ce workspace.",
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


def get_admin_workspace_ids(db: Session, user_id: str) -> Set[str]:
    """Récupère les IDs des workspaces où l'utilisateur est Administrateur."""
    admin_memberships = db.query(Membre).filter(
        Membre.id_utilisateur == user_id,
        Membre.id_workspace.isnot(None),
        Membre.role == Role.ADMIN,
        Membre.statut == Status.ACTIVE
    ).all()
    return {m.id_workspace for m in admin_memberships}


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
            joinedload(Membre.liste).options(
                joinedload(Liste.workspace),
                joinedload(Liste.espace).joinedload(Espace.workspace)
            )
        )
    elif resource_type == ResourceType.TACHE:
        query = query.filter(
            Membre.id_tache.isnot(None),
            Membre.role.in_(Role.DIRECT_ACCESS_ROLES)
        )
        query = query.options(
            joinedload(Membre.tache).joinedload(Tache.liste).options(
                joinedload(Liste.workspace),
                joinedload(Liste.espace).joinedload(Espace.workspace)
            )
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
        if membre.liste.id_workspace:
            return membre.liste.id_workspace in owned_ids
        if membre.liste.espace:
            return membre.liste.espace.id_workspace in owned_ids
    
    if membre.id_tache and membre.tache and membre.tache.liste:
        if membre.tache.liste.id_workspace:
            return membre.tache.liste.id_workspace in owned_ids
        if membre.tache.liste.espace:
            return membre.tache.liste.espace.id_workspace in owned_ids
    
    return False


def get_excluded_workspace_ids(db: Session, user_id: str) -> Set[str]:
    """Récupère les IDs des workspaces à exclure (Créateur ou Admin)."""
    owned_ids = get_owned_workspace_ids(db, user_id)
    admin_ids = get_admin_workspace_ids(db, user_id)
    return owned_ids.union(admin_ids)


def _is_redundant_with_parent_role(
    db: Session,
    *,
    user_id: str,
    resource_type: str,
    resource_id: str,
    direct_role: str,
) -> bool:
    """
    Indique si une ressource directe est déjà couverte par un rôle parent.

    - Workspace Invité + Espace Invité : redondant, on garde seulement le parent.
    - Workspace Invité + Espace Administrateur : non redondant, on garde l'enfant.
    - Espace Administrateur/Créateur parent + descendant direct : redondant pour la
      sidebar globale, la ressource reste visible dans l'arborescence.
    """
    inherited = get_parent_inherited_role(db, user_id, resource_type, resource_id)
    if not inherited:
        return False

    inherited_role, _, _ = inherited
    if inherited_role in Role.MANAGEMENT_ROLES:
        return True

    return _get_role_rank(inherited_role) >= _get_role_rank(direct_role)


def get_joined_espaces(db: Session, user_id: str) -> List[dict]:
    """Espaces rejoints directement (hors workspaces possédés ou dont on est admin)."""
    excluded_ids = get_excluded_workspace_ids(db, user_id)
    
    memberships = get_user_memberships_by_type(
        db, user_id, ResourceType.ESPACE, exclude_owned_workspaces=False
    )
    
    filtered = []
    for m in memberships:
        espace = m.espace
        if not espace:
            continue
        if espace.id_workspace and espace.id_workspace in excluded_ids:
            continue
        if _is_redundant_with_parent_role(
            db,
            user_id=user_id,
            resource_type=ResourceType.ESPACE,
            resource_id=espace.id,
            direct_role=m.role,
        ):
            continue
        filtered.append(m)
    
    return [_serialize_resource_membership(m, ResourceType.ESPACE) for m in filtered]


def get_joined_listes(db: Session, user_id: str) -> List[dict]:
    """Listes rejointes directement (hors workspaces possédés ou dont on est admin)."""
    excluded_ids = get_excluded_workspace_ids(db, user_id)
    
    memberships = get_user_memberships_by_type(
        db, user_id, ResourceType.LISTE, exclude_owned_workspaces=False
    )
    
    filtered = []
    for m in memberships:
        liste = m.liste
        if not liste:
            continue
        
        liste_workspace_id = None
        if liste.id_workspace:
            liste_workspace_id = liste.id_workspace
        elif liste.espace:
            liste_workspace_id = liste.espace.id_workspace
        
        if liste_workspace_id and liste_workspace_id in excluded_ids:
            continue
        if _is_redundant_with_parent_role(
            db,
            user_id=user_id,
            resource_type=ResourceType.LISTE,
            resource_id=liste.id,
            direct_role=m.role,
        ):
            continue
        
        filtered.append(m)
    
    return [_serialize_resource_membership(m, ResourceType.LISTE) for m in filtered]


def get_joined_taches(db: Session, user_id: str) -> List[dict]:
    """Tâches rejointes directement (hors workspaces possédés ou dont on est admin)."""
    excluded_ids = get_excluded_workspace_ids(db, user_id)
    
    memberships = get_user_memberships_by_type(
        db, user_id, ResourceType.TACHE, exclude_owned_workspaces=False
    )
    
    filtered = []
    for m in memberships:
        tache = m.tache
        if not tache or not tache.liste:
            continue
        
        liste = tache.liste
        liste_workspace_id = None
        if liste.id_workspace:
            liste_workspace_id = liste.id_workspace
        elif liste.espace:
            liste_workspace_id = liste.espace.id_workspace
        
        if liste_workspace_id and liste_workspace_id in excluded_ids:
            continue
        if _is_redundant_with_parent_role(
            db,
            user_id=user_id,
            resource_type=ResourceType.TACHE,
            resource_id=tache.id,
            direct_role=m.role,
        ):
            continue
        
        filtered.append(m)
    
    return [_serialize_resource_membership(m, ResourceType.TACHE) for m in filtered]


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
                "photo": utilisateur.photo if utilisateur and utilisateur.photo else None,  # ✅ ICI
            }
            if utilisateur
            else None
        ),
    }


def _serialize_resource_membership(membre: Membre, resource_type: str) -> dict:
    """Sérialise un membership de ressource (espace, liste, tache)."""
    # Force l'ID de la ressource cible comme ID principal pour le frontend
    target_id = None
    if resource_type == ResourceType.ESPACE:
        target_id = membre.id_espace
    elif resource_type == ResourceType.LISTE:
        target_id = membre.id_liste
    elif resource_type == ResourceType.TACHE:
        target_id = membre.id_tache
        
    data = {
        "id": target_id or membre.id,
        "nom": "Élément sans nom",
        "role": membre.role,
        "workspace_id": None,
        "workspace_nom": "Workspace inconnu",
    }
    
    if resource_type == ResourceType.ESPACE:
        data["id_espace"] = membre.id_espace
        if membre.espace:
            data["nom"] = membre.espace.nom
            workspace = membre.espace.workspace
            if workspace:
                data["workspace_id"] = workspace.id
                data["id_workspace"] = workspace.id
                data["workspace_nom"] = workspace.nom
    
    elif resource_type == ResourceType.LISTE:
        data["id_liste"] = membre.id_liste
        if membre.liste:
            data["nom"] = membre.liste.nom
            data["id_espace"] = membre.liste.id_espace
            # Priorité : Liste -> Workspace, puis Liste -> Espace -> Workspace
            workspace = membre.liste.workspace
            if not workspace and membre.liste.espace:
                workspace = membre.liste.espace.workspace
            
            if workspace:
                data["workspace_id"] = workspace.id
                data["id_workspace"] = workspace.id
                data["workspace_nom"] = workspace.nom
    
    elif resource_type == ResourceType.TACHE:
        data["id_tache"] = membre.id_tache
        if membre.tache:
            data["nom"] = membre.tache.titre
            liste = membre.tache.liste
            if liste:
                data["id_liste"] = liste.id
                workspace = liste.workspace
                if not workspace and liste.espace:
                    workspace = liste.espace.workspace
                
                if workspace:
                    data["workspace_id"] = workspace.id
                    data["id_workspace"] = workspace.id
                    data["workspace_nom"] = workspace.nom
                    
    return data


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
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")

    workspace_member = (
        db.query(Membre)
        .filter(
            Membre.id_utilisateur == user_id,
            Membre.id_workspace == workspace_id,
            Membre.statut == Status.ACTIVE,
        )
        .first()
    )
    actor_role, _ = _resolve_role_and_status(workspace, workspace_member, user_id)
    
    # Récupérer tous les memberships directs de l'utilisateur
    all_memberships = db.query(Membre).filter(
        Membre.id_utilisateur == user_id,
        Membre.statut == Status.ACTIVE,
        Membre.role.in_(Role.DIRECT_ACCESS_ROLES)
    ).options(
        joinedload(Membre.espace),
        joinedload(Membre.liste).joinedload(Liste.espace),
        joinedload(Membre.liste).joinedload(Liste.workspace),
        joinedload(Membre.tache).joinedload(Tache.liste).joinedload(Liste.espace),
        joinedload(Membre.tache).joinedload(Tache.liste).joinedload(Liste.workspace),
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
            if m.liste.id_workspace:
                liste_workspace_id = m.liste.id_workspace
            elif m.liste.espace:
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
            if liste.id_workspace:
                tache_workspace_id = liste.id_workspace
            elif liste.espace:
                tache_workspace_id = liste.espace.id_workspace
            
            if tache_workspace_id == workspace_id:
                taches.append({
                    "id": m.id_tache,
                    "nom": m.tache.titre,
                    "role": m.role,
                    "id_liste": m.tache.id_liste,
                    "id_espace": liste.id_espace
                })

    if not actor_role and not espaces and not listes and not taches:
        raise HTTPException(status_code=403, detail="Accès refusé aux ressources locales de ce workspace")
    
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
    
def render_invitation_html_page(
    title: str,
    icon: str,
    message: str,
    sub_message: str = "",
    color: str = "#264a67",
) -> HTMLResponse:
    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - K-Planer</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }}
        .card {{
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            padding: 48px;
            max-width: 480px;
            width: 100%;
            text-align: center;
        }}
        .icon {{
            font-size: 64px;
            margin-bottom: 20px;
        }}
        h1 {{
            color: {color};
            font-size: 1.5rem;
            margin-bottom: 12px;
        }}
        .message {{
            color: #555;
            font-size: 1rem;
            line-height: 1.6;
            margin-bottom: 16px;
        }}
        .sub-message {{
            color: #999;
            font-size: 0.85rem;
            line-height: 1.5;
        }}
        .brand {{
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #bbb;
            font-size: 0.8rem;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">{icon}</div>
        <h1>{title}</h1>
        <p class="message">{message}</p>
        {"<p class='sub-message'>" + sub_message + "</p>" if sub_message else ""}
        <div class="brand">K-Planer &mdash; Votre workspace de travail collaboratif</div>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html, status_code=200)