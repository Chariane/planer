from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from ..core.function import commit_or_raise
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


def get_espace_by_id(db: Session, espace_id: str) -> Optional[Espace]:
    return db.query(Espace).filter(Espace.id == espace_id).first()


def get_espaces_for_workspace(db: Session, workspace_id: str) -> List[Espace]:
    return db.query(Espace).filter(Espace.id_workspace == workspace_id).all()


def get_root_espaces_for_workspace(db: Session, workspace_id: str) -> List[Espace]:
    """Récupère les espaces de premier niveau d'un workspace (sans parent)."""
    return (
        db.query(Espace)
        .filter(Espace.id_workspace == workspace_id, Espace.id_espace_parent == None)
        .all()
    )


def get_sub_espaces_for_parent(db: Session, parent_id: str) -> List[Espace]:
    """Récupère les sous-espaces directs d'un espace parent."""
    return db.query(Espace).filter(Espace.id_espace_parent == parent_id).all()


def get_workspace_espaces_tree(db: Session, workspace_id: str) -> List[dict]:
    """
    Récupère tout le contenu d'un workspace sous forme d'arborescence.
    Associe les racines et les sous-espaces de manière récursive.
    """
    # 1. Récupérer tous les espaces du workspace pour éviter N+1 requêtes
    all_espaces = db.query(Espace).filter(Espace.id_workspace == workspace_id).all()
    
    # 2. Organiser par parent_id
    from collections import defaultdict
    nodes_by_parent = defaultdict(list)
    for esp in all_espaces:
        nodes_by_parent[esp.id_espace_parent].append(esp)

    # 3. Fonction récursive pour construire l'arbre
    def build_tree(parent_id: Optional[str]) -> List[dict]:
        tree = []
        for esp in nodes_by_parent[parent_id]:
            node = {
                "id": esp.id,
                "nom": esp.nom,
                "description": esp.description,
                "created_at": esp.created_at,
                "id_workspace": esp.id_workspace,
                "id_espace_parent": esp.id_espace_parent,
                "sous_espaces": build_tree(esp.id)
            }
            tree.append(node)
        return tree

    return build_tree(None)


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
    for key, value in update_data.items():
        setattr(espace, key, value)
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
        .filter(Membre.id_espace == espace_id)
        .order_by(Membre.created_at.asc())
        .all()
    )


def add_member_to_espace(db: Session, espace_id: str, membre_in: MembreCreate) -> Membre:
    membre = Membre(
        **membre_in.model_dump(exclude={"id_workspace", "id_liste", "id_tache"}, exclude_none=True),
        id_espace=espace_id,
    )
    db.add(membre)
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
    for key, value in update_data.items():
        setattr(membre, key, value)
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
    db.delete(membre)
    commit_or_raise(
        db,
        detail="Impossible de supprimer ce membre de l'espace.",
    )
    return True

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
        query = query.filter(Utilisateur.email == membre_in.email)
    else:
        query = query.filter(Utilisateur.username == membre_in.username)
    
    target_user = query.first()

    # Uniformisation du type de token (Contrainte 2)
    TOKEN_TYPE = "espace_invitation"

    if target_user:
        # CAS 1 : Utilisateur existant -> Creation/Mise a jour du membre en base
        membre = get_espace_member(db, espace_id, target_user.id)
        if membre:
            # Si déjà membre, on met à jour son role et on repasse en attente s'il ne l'est pas
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
        
        commit_or_raise(db, detail="Impossible de creer ou mettre a jour le membre.")
        
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

    # 5. Gestion de l'accès au Workspace parent (Indispensable pour le contexte frontend)
    workspace_id = payload.get("workspace_id") or espace.id_workspace
    if workspace_id:
        # On vérifie si l'utilisateur est déjà membre du workspace
        ws_member = db.query(Membre).filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == user_id
        ).first()
        
        if ws_member:
            if ws_member.statut != "Actif":
                ws_member.statut = "Actif"
            if not ws_member.role:
                ws_member.role = "Invité"
        else:
            # On l'ajoute comme "Invité" au workspace pour qu'il puisse voir le nom et l'arborescence
            new_ws_member = Membre(
                id_utilisateur=user_id,
                id_workspace=workspace_id,
                role="Invité",
                statut="Actif"
            )
            db.add(new_ws_member)
            # Pas de commit immédiat, on laisse le commit global à la fin

    # 6. Prevention des doublons sur l'Espace (Contrainte 5)
    existing_member = get_espace_member(db, target_espace_id, user_id)
    if existing_member:
        # Les anciens tokens "scope" ne transportent pas toujours le role.
        existing_member.role = payload.get("role") or existing_member.role
        if existing_member.statut != "Actif":
            existing_member.statut = "Actif"
        commit_or_raise(
            db,
            detail="Impossible d'activer votre statut de membre.",
            refresh_instance=existing_member,
        )
        return existing_member

    # 7. Creation du nouveau membre de l'Espace
    new_member = Membre(
        id_utilisateur=user_id,
        id_espace=target_espace_id,
        role=payload.get("role") or "Membre",
        statut="Actif"
    )
    db.add(new_member)
    commit_or_raise(db, detail="Impossible de finaliser votre adhesion a l'espace.", refresh_instance=new_member)
    
    return new_member
