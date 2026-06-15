from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy import func, text
from sqlalchemy.orm import Session, joinedload
from ..core.function import ResourceType, commit_or_raise, validate_role_hierarchy
from ..core.security import create_access_token, decode_invitation_token
from ..models import Espace, Membre, Utilisateur
from ..schemas import (
    EspaceCreate,
    EspaceUpdate,
    MembreCreate,
    WorkspaceMemberUpdate,
    WorkspaceMemberInvite,
)
from datetime import timedelta
from backend.api_messagerie.sync import (
    ensure_resource_group,
    remove_resource_member,
    sync_resource_member,
)
from ..core.plan_limits import require_plan_capacity, resolve_workspace_owner_id


def get_espace_by_id(db: Session, espace_id: str) -> Optional[Espace]:
    return db.query(Espace).filter(Espace.id == espace_id).first()


def get_espace_hierarchy(db: Session, espace_id: str) -> List[Espace]:
    """Retourne la chaîne d'ancêtres de la racine jusqu'à l'espace ciblé."""
    hierarchy: List[Espace] = []
    visited_ids: set[str] = set()
    current = get_espace_by_id(db, espace_id)

    while current and current.id not in visited_ids:
        visited_ids.add(current.id)
        hierarchy.insert(0, current)
        if not current.id_espace_parent:
            break
        current = get_espace_by_id(db, current.id_espace_parent)

    return hierarchy


def get_espaces_for_workspace(db: Session, workspace_id: str) -> List[Espace]:
    return db.query(Espace).filter(Espace.id_workspace == workspace_id).all()


def get_root_espaces_for_workspace(db: Session, workspace_id: str) -> List[Espace]:
    """Récupère les espaces de premier niveau d'un workspace (sans parent)."""
    return (
        db.query(Espace)
        .filter(Espace.id_workspace == workspace_id, Espace.id_espace_parent == None)
        .all()
    )


def _get_visible_espace_ids_for_workspace(
    db: Session,
    workspace_id: str,
    user_id: Optional[str] = None,
) -> set[str]:
    """Calcule les IDs d'espaces visibles pour un utilisateur dans un workspace."""
    all_espaces = db.query(Espace).filter(Espace.id_workspace == workspace_id).all()
    all_ids = {esp.id for esp in all_espaces}

    if not user_id:
        return all_ids

    ws_member = db.query(Membre).filter(
        Membre.id_workspace == workspace_id,
        Membre.id_utilisateur == user_id,
        Membre.statut == "Actif"
    ).first()

    if ws_member:
        return all_ids

    from collections import defaultdict

    children_by_parent: dict[Optional[str], List[Espace]] = defaultdict(list)
    for esp in all_espaces:
        children_by_parent[esp.id_espace_parent].append(esp)

    def collect_descendant_ids(parent_id: str) -> set[str]:
        descendant_ids: set[str] = set()
        stack = [parent_id]

        while stack:
            current_parent_id = stack.pop()
            for child in children_by_parent.get(current_parent_id, []):
                if child.id in descendant_ids:
                    continue
                descendant_ids.add(child.id)
                stack.append(child.id)

        return descendant_ids

    esp_memberships = db.query(Membre.id_espace).join(
        Espace, Membre.id_espace == Espace.id
    ).filter(
        Membre.id_utilisateur == user_id,
        Membre.id_espace.isnot(None),
        Membre.statut == "Actif",
        Espace.id_workspace == workspace_id,
    ).all()

    direct_visible_ids = {espace_id for (espace_id,) in esp_memberships}
    visible_ids = set(direct_visible_ids)
    for espace_id in direct_visible_ids:
        visible_ids.update(collect_descendant_ids(espace_id))

    return visible_ids


def get_visible_espaces_for_workspace(
    db: Session,
    workspace_id: str,
    user_id: Optional[str] = None,
) -> List[Espace]:
    """Liste à plat des espaces visibles dans un workspace pour un utilisateur."""
    visible_ids = _get_visible_espace_ids_for_workspace(db, workspace_id, user_id)
    if not visible_ids:
        return []
    return (
        db.query(Espace)
        .filter(Espace.id_workspace == workspace_id, Espace.id.in_(visible_ids))
        .all()
    )


def get_visible_root_espaces_for_workspace(
    db: Session,
    workspace_id: str,
    user_id: Optional[str] = None,
) -> List[Espace]:
    """Liste des espaces racines visibles dans un workspace pour un utilisateur."""
    visible_ids = _get_visible_espace_ids_for_workspace(db, workspace_id, user_id)
    if not visible_ids:
        return []
    return (
        db.query(Espace)
        .filter(
            Espace.id_workspace == workspace_id,
            Espace.id_espace_parent == None,
            Espace.id.in_(visible_ids),
        )
        .all()
    )


def get_sub_espaces_for_parent(db: Session, parent_id: str) -> List[Espace]:
    """Récupère les sous-espaces directs d'un espace parent."""
    return db.query(Espace).filter(Espace.id_espace_parent == parent_id).all()


def _ensure_unique_espace_sibling_name(
    db: Session,
    *,
    nom: str,
    id_workspace: str,
    id_espace_parent: Optional[str],
    exclude_id: Optional[str] = None,
) -> None:
    normalized_name = nom.strip().lower()
    query = db.query(Espace).filter(
        Espace.id_workspace == id_workspace,
        func.lower(func.trim(Espace.nom)) == normalized_name,
    )
    if id_espace_parent:
        query = query.filter(Espace.id_espace_parent == id_espace_parent)
    else:
        query = query.filter(Espace.id_espace_parent.is_(None))
    if exclude_id:
        query = query.filter(Espace.id != exclude_id)
    if query.first():
        scope = "cet espace" if id_espace_parent else "ce workspace"
        raise HTTPException(
            status_code=409,
            detail=f"Un espace portant ce nom existe déjà directement dans {scope}. Choisissez un autre nom.",
        )


def _delete_resource_group_safely(db: Session, *, resource_type: str, resource_id: str) -> None:
    prefix = f"{resource_type}:{resource_id}:%"
    row = db.execute(
        text(
            """
            SELECT id
            FROM messagerie.groupe
            WHERE name LIKE :prefix
            ORDER BY created_at ASC
            LIMIT 1
            """
        ),
        {"prefix": prefix},
    ).first()
    if not row:
        return

    group_id = row[0]
    db.execute(text("DELETE FROM messagerie.message WHERE id_groupe = :group_id"), {"group_id": group_id})
    db.execute(text("DELETE FROM messagerie.groupe_members WHERE id_groupe = :group_id"), {"group_id": group_id})
    db.execute(text("DELETE FROM messagerie.groupe WHERE id = :group_id"), {"group_id": group_id})


def get_workspace_espaces_tree(db: Session, workspace_id: str, user_id: Optional[str] = None) -> List[dict]:
    """
    Récupère tout le contenu d'un workspace sous forme d'arborescence.
    Si user_id est fourni et que l'utilisateur n'est pas membre du workspace,
    on ne retourne que les espaces auxquels il a accès directement.
    """
    # 1. Récupérer tous les espaces du workspace
    query = db.query(Espace).filter(Espace.id_workspace == workspace_id)
    all_espaces = query.all()

    # 2. Index par parent pour pouvoir etendre la visibilite aux descendants
    from collections import defaultdict

    children_by_parent: dict[Optional[str], List[Espace]] = defaultdict(list)
    for esp in all_espaces:
        children_by_parent[esp.id_espace_parent].append(esp)

    def collect_descendant_ids(parent_id: str) -> set[str]:
        descendant_ids: set[str] = set()
        stack = [parent_id]

        while stack:
            current_parent_id = stack.pop()
            for child in children_by_parent.get(current_parent_id, []):
                if child.id in descendant_ids:
                    continue
                descendant_ids.add(child.id)
                stack.append(child.id)

        return descendant_ids

    # 3. Filtrage par permissions si user_id est fourni
    is_workspace_member = True
    visible_ids = {esp.id for esp in all_espaces}

    if user_id:
        ws_member = db.query(Membre).filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif"
        ).first()

        visible_ids = _get_visible_espace_ids_for_workspace(db, workspace_id, user_id)
        if not ws_member:
            is_workspace_member = False

    # 4. Organiser par parent_id
    nodes_by_parent = defaultdict(list)
    roots = []

    for esp in all_espaces:
        if esp.id not in visible_ids:
            continue
        
        # Si membre du workspace, l'arborescence est naturelle
        if is_workspace_member:
            nodes_by_parent[esp.id_espace_parent].append(esp)
        else:
            # Si non-membre workspace (accès isolé), on vérifie si le parent est visible
            # Si le parent n'est pas visible, alors cet espace devient une racine pour cet utilisateur
            if esp.id_espace_parent in visible_ids:
                nodes_by_parent[esp.id_espace_parent].append(esp)
            else:
                roots.append(esp)

    # 5. Fonction récursive pour construire l'arbre
    def build_tree(parent_list: List[Espace]) -> List[dict]:
        tree = []
        for esp in parent_list:
            node = {
                "id": esp.id,
                "nom": esp.nom,
                "description": esp.description,
                "created_at": esp.created_at,
                "id_workspace": esp.id_workspace,
                "id_espace_parent": esp.id_espace_parent,
                "sous_espaces": build_tree(nodes_by_parent[esp.id])
            }
            tree.append(node)
        return tree

    if is_workspace_member:
        return build_tree(nodes_by_parent[None])
    else:
        return build_tree(roots)


def get_espaces_where_admin(db: Session, user_id: str) -> List[Espace]:
    """Retourne les espaces où l'utilisateur est Créateur ou Administrateur actif."""
    return (
        db.query(Espace)
        .join(Membre, Espace.id == Membre.id_espace)
        .filter(
            Membre.id_utilisateur == user_id,
            Membre.role.in_(["Créateur", "Administrateur"]),
            Membre.statut == "Actif",
        )
        .distinct()
        .order_by(Espace.created_at.desc())
        .all()
    )


def create_espace(db: Session, espace_in: EspaceCreate, creator_user_id: str) -> Espace:
    owner_id = resolve_workspace_owner_id(db, workspace_id=espace_in.id_workspace)
    if owner_id:
        require_plan_capacity(db, owner_id, "espaces")
    _ensure_unique_espace_sibling_name(
        db,
        nom=espace_in.nom,
        id_workspace=espace_in.id_workspace,
        id_espace_parent=espace_in.id_espace_parent,
    )
    espace = Espace(
        **espace_in.model_dump(exclude_none=True),
    )
    db.add(espace)
    try:
        db.flush()

        createur = Membre(
            **MembreCreate(
                id_utilisateur=creator_user_id,
                id_espace=espace.id,
                role="Créateur",
                statut="Actif",
            ).model_dump(exclude={"id_workspace", "id_liste", "id_tache"}, exclude_none=True),
        )
        db.add(createur)
        ensure_resource_group(
            db,
            resource_type="espace",
            resource_id=espace.id,
            name=espace.nom,
            creator_id=creator_user_id,
            members=[creator_user_id],
        )
        commit_or_raise(
            db,
            detail="Impossible de creer l'espace a cause d'une contrainte d'integrite.",
            refresh_instance=espace,
        )
    except Exception:
        db.rollback()
        raise
    return espace


def update_espace(db: Session, espace_id: str, espace_in: EspaceUpdate) -> Optional[Espace]:
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        return None
    update_data = espace_in.model_dump(exclude_unset=True)
    target_nom = update_data.get("nom", espace.nom)
    target_workspace_id = update_data.get("id_workspace", espace.id_workspace)
    target_parent_id = update_data.get("id_espace_parent", espace.id_espace_parent)
    if any(key in update_data for key in ("nom", "id_workspace", "id_espace_parent")):
        _ensure_unique_espace_sibling_name(
            db,
            nom=target_nom,
            id_workspace=target_workspace_id,
            id_espace_parent=target_parent_id,
            exclude_id=espace.id,
        )
    for key, value in update_data.items():
        setattr(espace, key, value)
    if "nom" in update_data:
        createur_id = (
            db.query(Membre.id_utilisateur)
            .filter(
                Membre.id_espace == espace.id,
                Membre.role == "Créateur",
                Membre.statut == "Actif",
            )
            .scalar()
        )
        ensure_resource_group(
            db,
            resource_type="espace",
            resource_id=espace.id,
            name=espace.nom,
            creator_id=createur_id,
        )
    commit_or_raise(
        db,
        detail="Impossible de mettre a jour l'espace a cause d'une contrainte d'integrite.",
        refresh_instance=espace,
    )
    return espace


def _collect_descendant_espace_ids(db: Session, parent_id: str) -> List[str]:
    """Collecte récursivement tous les IDs des sous-espaces descendants."""
    child_ids = [
        eid
        for (eid,) in db.query(Espace.id).filter(Espace.id_espace_parent == parent_id).all()
    ]
    all_ids = list(child_ids)
    for child_id in child_ids:
        all_ids.extend(_collect_descendant_espace_ids(db, child_id))
    return all_ids


def delete_espace(db: Session, espace_id: str) -> bool:
    """Supprime un espace et tous ses sous-espaces descendants (cascade)."""
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        return False

    # Collecter tous les IDs descendants (enfants, petits-enfants, etc.)
    descendant_ids = _collect_descendant_espace_ids(db, espace_id)
    all_espace_ids = [espace_id] + descendant_ids

    # Supprimer les membres de tous les espaces concernés
    if all_espace_ids:
        for target_id in all_espace_ids:
            _delete_resource_group_safely(db, resource_type="espace", resource_id=target_id)
        db.query(Membre).filter(Membre.id_espace.in_(all_espace_ids)).delete(synchronize_session=False)

    # Supprimer les sous-espaces descendants (du plus profond au plus haut)
    for desc_id in reversed(descendant_ids):
        db.query(Espace).filter(Espace.id == desc_id).delete(synchronize_session=False)

    # Supprimer l'espace parent
    db.delete(espace)
    commit_or_raise(
        db,
        detail="Impossible de supprimer l'espace et ses dependances.",
    )
    return True


def get_espace_member(db: Session, espace_id: str, user_id: str) -> Optional[Membre]:
    return (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(Membre.id_espace == espace_id, Membre.id_utilisateur == user_id)
        .first()
    )


def get_espace_members(db: Session, espace_id: str) -> List[Membre]:
    return (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(
            Membre.id_espace == espace_id,
            Membre.statut == "Actif",
        )
        .order_by(Membre.created_at.asc())
        .all()
    )


def add_member_to_espace(db: Session, espace_id: str, membre_in: MembreCreate) -> Membre:
    validate_role_hierarchy(
        db,
        membre_in.id_utilisateur,
        ResourceType.ESPACE,
        espace_id,
        membre_in.role,
    )
    membre = Membre(
        **membre_in.model_dump(exclude={"id_workspace", "id_liste", "id_tache"}, exclude_none=True),
        id_espace=espace_id,
    )
    db.add(membre)
    if membre.statut == "Actif":
        espace = get_espace_by_id(db, espace_id)
        createur_id = (
            db.query(Membre.id_utilisateur)
            .filter(
                Membre.id_espace == espace_id,
                Membre.role == "Créateur",
                Membre.statut == "Actif",
            )
            .scalar()
        )
        sync_resource_member(
            db,
            resource_type="espace",
            resource_id=espace_id,
            user_id=membre.id_utilisateur,
            name=espace.nom if espace else None,
            creator_id=createur_id,
        )
    commit_or_raise(
        db,
        detail="Impossible d'ajouter ce membre a l'espace a cause d'une contrainte d'integrite.",
        refresh_instance=membre,
    )
    return membre


def update_espace_member(
    db: Session,
    espace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
) -> Optional[Membre]:
    membre = get_espace_member(db, espace_id, user_id)
    if not membre:
        return None
    update_data = membre_in.model_dump(exclude_unset=True)
    new_role = update_data.get("role")
    if new_role:
        validate_role_hierarchy(
            db,
            user_id,
            ResourceType.ESPACE,
            espace_id,
            new_role,
        )
    for key, value in update_data.items():
        setattr(membre, key, value)
    target_status = update_data.get("statut", membre.statut)
    if target_status == "Actif":
        espace = get_espace_by_id(db, espace_id)
        createur_id = (
            db.query(Membre.id_utilisateur)
            .filter(
                Membre.id_espace == espace_id,
                Membre.role == "Créateur",
                Membre.statut == "Actif",
            )
            .scalar()
        )
        sync_resource_member(
            db,
            resource_type="espace",
            resource_id=espace_id,
            user_id=user_id,
            name=espace.nom if espace else None,
            creator_id=createur_id,
        )
    elif "statut" in update_data:
        remove_resource_member(
            db,
            resource_type="espace",
            resource_id=espace_id,
            user_id=user_id,
        )
    commit_or_raise(
        db,
        detail="Impossible de mettre a jour ce membre a cause d'une contrainte d'integrite.",
        refresh_instance=membre,
    )
    return membre


def remove_espace_member(db: Session, espace_id: str, user_id: str) -> bool:
    membre = get_espace_member(db, espace_id, user_id)
    if not membre:
        return False
    remove_resource_member(
        db,
        resource_type="espace",
        resource_id=espace_id,
        user_id=user_id,
    )
    db.delete(membre)
    commit_or_raise(
        db,
        detail="Impossible de supprimer ce membre de l'espace.",
    )
    return True

def _user_has_active_membership_in_hierarchical_parents(db: Session, user_id: str, espace: Espace) -> bool:
    """Verifie si l'utilisateur est deja membre actif d'un parent hierarchique (Workspace ou Espace parent)."""
    # Parent Espace direct
    if espace.id_espace_parent:
        parent_membre = db.query(Membre).filter(
            Membre.id_espace == espace.id_espace_parent,
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif"
        ).first()
        if parent_membre:
            return True
    
    # Workspace
    if espace.id_workspace:
        ws_membre = db.query(Membre).filter(
            Membre.id_workspace == espace.id_workspace,
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif"
        ).first()
        if ws_membre:
            return True
            
    return False

def invite_member_to_espace(db: Session, espace_id: str, membre_in: WorkspaceMemberInvite) -> dict:
    """
    Invite un utilisateur a un espace.
    Supporte les utilisateurs existants (statut 'En attente') et les nouveaux (Token JWT).
    """
    # 1. Verification de l'existence de l'espace (Contrainte 1)
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve.")

    # 2. Recherche de l'utilisateur par email ou username
    query = db.query(Utilisateur)
    if membre_in.email:
        query = query.filter(func.lower(Utilisateur.email) == membre_in.email.lower())
    else:
        query = query.filter(func.lower(Utilisateur.username) == membre_in.username.lower())
    
    target_user = query.first()

    # Uniformisation du type de token (Contrainte 2)
    TOKEN_TYPE = "espace_invitation"

    if target_user:
        validate_role_hierarchy(
            db,
            target_user.id,
            ResourceType.ESPACE,
            espace_id,
            membre_in.role,
        )
        # CAS 1 : Utilisateur existant -> Creation/Mise a jour du membre en base
        membre = get_espace_member(db, espace_id, target_user.id)
        if membre:
            if membre.statut == "Actif":
                raise HTTPException(
                    status_code=409,
                    detail="Cet utilisateur est deja membre actif de cet espace."
                )
            # Si l'invitation existe deja, on met a jour son role et on la repasse en attente
            membre.role = membre_in.role
            membre.statut = "En attente"
        else:
            membre = Membre(
                id_utilisateur=target_user.id,
                id_espace=espace_id,
                role=membre_in.role,
                statut="En attente",
            )
            db.add(membre)
        
        # LOGIQUE AUTO-PROMOTION : Si Admin + Membre d'un parent -> Direct Actif
        if membre_in.role == "Administrateur" and _user_has_active_membership_in_hierarchical_parents(db, target_user.id, espace):
            membre.statut = "Actif"

        commit_or_raise(db, detail="Impossible de creer ou mettre a jour le membre.")

        # Si auto-promu actif, on synchronise immediatement
        if membre.statut == "Actif":
            createur_id = (
                db.query(Membre.id_utilisateur)
                .filter(
                    Membre.id_espace == espace_id,
                    Membre.role == "Créateur",
                    Membre.statut == "Actif",
                )
                .scalar()
            )
            sync_resource_member(
                db,
                resource_type="espace",
                resource_id=espace_id,
                user_id=target_user.id,
                name=espace.nom,
                creator_id=createur_id,
            )
        
        # Token pour utilisateur existant (Contrainte 2)
        token = create_access_token(
            data={
                "sub": target_user.id,
                "email": target_user.email,
                "workspace_id": espace.id_workspace, # Ajouté pour cohérence
                "espace_id": espace_id,
                "type": TOKEN_TYPE
            },
            expires_delta=timedelta(days=7),
        )
        return {"membre": membre, "invitation_token": token}
    
    else:
        # CAS 2 : Invité externe -> Generation d'un token JWT complet
        if not membre_in.email:
            raise HTTPException(
                status_code=400, 
                detail="Email obligatoire pour inviter un utilisateur non inscrit."
            )

        token = create_access_token(
            data={
                "email": membre_in.email,
                "workspace_id": espace.id_workspace,
                "espace_id": espace_id,
                "role": membre_in.role,
                "type": TOKEN_TYPE, # Uniformisation (Contrainte 2)
            },
            expires_delta=timedelta(days=4),
        )
        return {"token": token}


def accept_espace_invitation(
    db: Session, 
    espace_id: Optional[str], 
    user_id: str,
    invitation_token: str
) -> Membre:
    """
    Accepte une invitation a un espace via token JWT.
    Supporte deux familles de token :
    - token d'invitation "guest" / standard avec type="espace_invitation"
    - ancien token d'utilisateur existant avec scope="espace_invitation_accept"
    """
    # 1. Decodage et validation du token
    payload = decode_invitation_token(invitation_token)
    if not payload:
        raise HTTPException(status_code=400, detail="Token d'invitation invalide ou expire.")

    # 2. Support des deux formats de token
    token_type = payload.get("type")
    token_scope = payload.get("scope")
    is_standard_invitation = token_type == "espace_invitation"
    is_existing_user_legacy_invitation = token_scope == "espace_invitation_accept"

    if not is_standard_invitation and not is_existing_user_legacy_invitation:
        raise HTTPException(status_code=403, detail="Type de token invalide pour cette action.")

    # 3. Extraction et verification des donnees du payload
    # Si espace_id n'est pas fourni par l'URL, on le prend du token
    target_espace_id = espace_id or payload.get("espace_id")
    if not target_espace_id:
        raise HTTPException(status_code=400, detail="ID de l'espace absent du token.")

    # Verification de l'existence de l'espace parent
    espace = get_espace_by_id(db, target_espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="L'espace cible n'existe plus.")

    # 4. Verification de l'utilisateur (Prevenir les fraudes)
    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve.")

    # Le token est lié soit par SUB (utilisateur existant), soit par EMAIL (invité)
    token_sub = payload.get("sub")
    token_email = payload.get("email")

    if token_sub and token_sub != user_id:
        raise HTTPException(status_code=403, detail="Cette invitation appartient a un autre utilisateur.")
    
    if token_email and token_email.lower() != user.email.lower():
        raise HTTPException(status_code=403, detail="Cet email d'invitation ne correspond pas au votre.")

    # 5. Prevention des doublons sur l'Espace (Contrainte 5)
    existing_member = get_espace_member(db, target_espace_id, user_id)
    invited_role = payload.get("role")

    if not existing_member and not invited_role:
        raise HTTPException(
            status_code=400,
            detail="Role d'invitation absent du token."
        )

    invited_role = invited_role or existing_member.role
    validate_role_hierarchy(
        db,
        user_id,
        ResourceType.ESPACE,
        target_espace_id,
        invited_role,
    )

    if existing_member:
        if existing_member.statut == "Actif":
            raise HTTPException(status_code=409, detail="Invitation deja acceptee.")
        # Les anciens tokens "scope" ne transportent pas toujours le role.
        existing_member.role = invited_role
        existing_member.statut = "Actif"
        createur_id = (
            db.query(Membre.id_utilisateur)
            .filter(
                Membre.id_espace == target_espace_id,
                Membre.role == "Créateur",
                Membre.statut == "Actif",
            )
            .scalar()
        )
        sync_resource_member(
            db,
            resource_type="espace",
            resource_id=target_espace_id,
            user_id=user_id,
            name=espace.nom,
            creator_id=createur_id,
        )
        commit_or_raise(
            db,
            detail="Impossible d'activer votre statut de membre.",
            refresh_instance=existing_member,
        )
        return existing_member

    # 6. Creation du nouveau membre de l'Espace
    new_member = Membre(
        id_utilisateur=user_id,
        id_espace=target_espace_id,
        role=invited_role,
        statut="Actif"
    )
    db.add(new_member)
    createur_id = (
        db.query(Membre.id_utilisateur)
        .filter(
            Membre.id_espace == target_espace_id,
            Membre.role == "Créateur",
            Membre.statut == "Actif",
        )
        .scalar()
    )
    sync_resource_member(
        db,
        resource_type="espace",
        resource_id=target_espace_id,
        user_id=user_id,
        name=espace.nom,
        creator_id=createur_id,
    )
    commit_or_raise(db, detail="Impossible de finaliser votre adhesion a l'espace.", refresh_instance=new_member)
    
    return new_member
