from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload
from ..core.function import commit_or_raise, Role, Status
from ..models import (
    AbsenceEtConge, Canevas, Checklist, Espace, Fichier, Liste, 
    Membre, Rapport, Section, Tache, Utilisateur, Workspace,
)
from ..core.security import create_access_token, decode_invitation_token
from ..schemas import WorkspaceCreate, WorkspaceMemberUpdate, WorkspaceUpdate, WorkspaceMemberInvite


# ============================================================================
# WORKSPACE - CRUD DE BASE
# ============================================================================

def get_workspace_by_id(db: Session, workspace_id: str) -> Optional[Workspace]:
    """Récupère un workspace par son ID avec ses membres."""
    return (
        db.query(Workspace)
        .options(joinedload(Workspace.membres))
        .filter(Workspace.id == workspace_id)
        .first()
    )


def get_all_workspaces(db: Session, skip: int = 0, limit: int = 100) -> List[Workspace]:
    """Liste tous les workspaces (admin)."""
    return db.query(Workspace).offset(skip).limit(limit).all()


def create_workspace(db: Session, workspace_in: WorkspaceCreate, user_id: str) -> Workspace:
    """Crée un nouveau workspace et ajoute le créateur comme membre actif."""
    workspace_data = workspace_in.model_dump(exclude={"id_utilisateur"}, exclude_none=True)
    workspace = Workspace(
        **workspace_data,
        id_utilisateur=user_id,
    )
    db.add(workspace)

    try:
        db.flush()

        # Créer le membership du propriétaire
        owner_member = Membre(
            id_utilisateur=user_id,
            id_workspace=workspace.id,
            role=Role.CREATOR,
            statut=Status.ACTIVE,
        )
        db.add(owner_member)

        commit_or_raise(
            db,
            detail="Impossible de créer le workspace à cause d'une contrainte d'intégrité.",
            refresh_instance=workspace,
        )
    except Exception:
        db.rollback()
        raise

    return workspace


def update_workspace(db: Session, workspace_id: str, workspace_in: WorkspaceUpdate) -> Optional[Workspace]:
    """Met à jour un workspace existant."""
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        return None

    update_data = workspace_in.model_dump(exclude_unset=True, exclude_none=True)
    for key, value in update_data.items():
        setattr(workspace, key, value)
    workspace.updated_at = datetime.utcnow()

    commit_or_raise(
        db,
        detail="Impossible de mettre à jour le workspace à cause d'une contrainte d'intégrité.",
        refresh_instance=workspace,
    )
    return workspace


def delete_workspace(db: Session, workspace_id: str) -> bool:
    """Supprime un workspace et toutes ses dépendances en cascade."""
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        return False

    dependency_ids = _collect_workspace_dependency_ids(db, workspace_id)

    # Suppression en cascade (ordre important)
    if dependency_ids["checklist_ids"]:
        db.query(Checklist).filter(Checklist.id.in_(dependency_ids["checklist_ids"])).delete(
            synchronize_session=False
        )

    if dependency_ids["section_ids"]:
        db.query(Section).filter(Section.id.in_(dependency_ids["section_ids"])).delete(
            synchronize_session=False
        )

    if dependency_ids["canevas_ids"]:
        db.query(Canevas).filter(Canevas.id.in_(dependency_ids["canevas_ids"])).delete(
            synchronize_session=False
        )

    if dependency_ids["membre_ids"]:
        db.query(Fichier).filter(Fichier.id_membre.in_(dependency_ids["membre_ids"])).delete(
            synchronize_session=False
        )
        db.query(Rapport).filter(Rapport.id_membre.in_(dependency_ids["membre_ids"])).delete(
            synchronize_session=False
        )
        db.query(AbsenceEtConge).filter(
            AbsenceEtConge.id_membre.in_(dependency_ids["membre_ids"])
        ).delete(synchronize_session=False)
        db.query(Membre).filter(Membre.id.in_(dependency_ids["membre_ids"])).delete(
            synchronize_session=False
        )

    if dependency_ids["tache_ids"]:
        db.query(Tache).filter(Tache.id.in_(dependency_ids["tache_ids"])).delete(
            synchronize_session=False
        )

    if dependency_ids["liste_ids"]:
        db.query(Liste).filter(Liste.id.in_(dependency_ids["liste_ids"])).delete(
            synchronize_session=False
        )

    if dependency_ids["espace_ids"]:
        db.query(Espace).filter(Espace.id.in_(dependency_ids["espace_ids"])).delete(
            synchronize_session=False
        )

    db.delete(workspace)
    commit_or_raise(
        db,
        detail="Impossible de supprimer le workspace et ses dépendances.",
    )
    return True


def _collect_workspace_dependency_ids(db: Session, workspace_id: str) -> dict:
    """Collecte tous les IDs des ressources dépendantes d'un workspace."""
    espace_ids = [
        espace_id
        for (espace_id,) in db.query(Espace.id).filter(Espace.id_workspace == workspace_id).all()
    ]

    liste_ids = [
        liste_id
        for (liste_id,) in (
            db.query(Liste.id)
            .filter(
                or_(
                    Liste.id_workspace == workspace_id,
                    Liste.id_espace.in_(espace_ids),
                )
            )
            .all()
        )
    ]

    tache_ids = [
        tache_id
        for (tache_id,) in db.query(Tache.id).filter(Tache.id_liste.in_(liste_ids)).all()
    ]

    canevas_ids = [
        canevas_id
        for (canevas_id,) in db.query(Canevas.id).filter(Canevas.id_liste.in_(liste_ids)).all()
    ]

    section_ids = [
        section_id
        for (section_id,) in db.query(Section.id).filter(Section.id_canevas.in_(canevas_ids)).all()
    ]

    checklist_ids = [
        checklist_id
        for (checklist_id,) in (
            db.query(Checklist.id)
            .filter(
                or_(
                    Checklist.id_tache.in_(tache_ids),
                    Checklist.id_section.in_(section_ids),
                )
            )
            .all()
        )
    ]

    membre_ids = [
        membre_id
        for (membre_id,) in (
            db.query(Membre.id)
            .filter(
                or_(
                    Membre.id_workspace == workspace_id,
                    Membre.id_espace.in_(espace_ids),
                    Membre.id_liste.in_(liste_ids),
                    Membre.id_tache.in_(tache_ids),
                )
            )
            .all()
        )
    ]

    return {
        "espace_ids": espace_ids,
        "liste_ids": liste_ids,
        "tache_ids": tache_ids,
        "canevas_ids": canevas_ids,
        "section_ids": section_ids,
        "checklist_ids": checklist_ids,
        "membre_ids": membre_ids,
    }


# ============================================================================
# MEMBRES - GESTION
# ============================================================================
def get_workspace_member(db: Session, workspace_id: str, user_id: str) -> Optional[Membre]:
    return (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(Membre.id_workspace == workspace_id, Membre.id_utilisateur == user_id)
        .first()
    )
    
def get_member(
    db: Session,
    workspace_id: str,
    user_id: str,
    *,
    active_only: bool = False,
) -> Optional[Membre]:
    """Récupère un membre spécifique d'un workspace."""
    query = (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == user_id,
        )
    )
    if active_only:
        query = query.filter(Membre.statut == Status.ACTIVE)
    return query.first()


def get_members_of_workspace(db: Session, workspace_id: str) -> List[Membre]:
    """Liste tous les membres d'un workspace."""
    return (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(Membre.id_workspace == workspace_id)
        .order_by(Membre.created_at.asc())
        .all()
    )


def update_member_role(
    db: Session,
    workspace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
) -> Optional[Membre]:
    """Met à jour le rôle ou le statut d'un membre."""
    membre = get_member(db, workspace_id, user_id)
    if not membre:
        return None

    update_data = membre_in.model_dump(exclude_unset=True, exclude_none=True)
    for key, value in update_data.items():
        setattr(membre, key, value)

    commit_or_raise(
        db,
        detail="Impossible de mettre à jour ce membre à cause d'une contrainte d'intégrité.",
        refresh_instance=membre,
    )
    return membre


def remove_member_from_workspace(db: Session, workspace_id: str, user_id: str) -> bool:
    """Supprime un membre d'un workspace et ses dépendances."""
    membre = get_member(db, workspace_id, user_id)
    if not membre:
        return False

    # Supprimer les dépendances liées au membre
    db.query(Fichier).filter(Fichier.id_membre == membre.id).delete(synchronize_session=False)
    db.query(Rapport).filter(Rapport.id_membre == membre.id).delete(synchronize_session=False)
    db.query(AbsenceEtConge).filter(AbsenceEtConge.id_membre == membre.id).delete(
        synchronize_session=False
    )
    db.delete(membre)
    commit_or_raise(
        db,
        detail="Impossible de supprimer ce membre du workspace.",
    )
    return True


# ============================================================================
# INVITATIONS
# ============================================================================

def invite_member_to_workspace(db: Session, workspace_id: str, membre_in: WorkspaceMemberInvite) -> dict:
    """
    Invite un utilisateur a un workspace.
    Supporte les utilisateurs existants (statut 'En attente') et les nouveaux (Token JWT).
    """
    # 1. Verification de l'existence de l'espace (Contrainte 1)
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve.")

    # 2. Recherche de l'utilisateur par email ou username
    query = db.query(Utilisateur)
    if membre_in.email:
        query = query.filter(Utilisateur.email == membre_in.email)
    else:
        query = query.filter(Utilisateur.username == membre_in.username)
    
    target_user = query.first()

    # Uniformisation du type de token (Contrainte 2)
    TOKEN_TYPE = "workspace_invitation"

    if target_user:
        # CAS 1 : Utilisateur existant -> Creation/Mise a jour du membre en base
        membre = get_workspace_member(db, workspace_id, target_user.id)
        if membre:
            if membre.statut == "Actif":
                raise HTTPException(
                    status_code=409,
                    detail="Cet utilisateur est deja membre actif de ce workspace."
                )
            # Si l'invitation existe deja, on met a jour son role et on la repasse en attente
            membre.role = membre_in.role
            membre.statut = "En attente"
        else:
            membre = Membre(
                id_utilisateur=target_user.id,
                id_workspace=workspace_id,
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
                "workspace_id": workspace_id,
                "role": membre_in.role,
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
                "workspace_id": workspace_id,
                "role": membre_in.role,
                "type": TOKEN_TYPE, # Uniformisation (Contrainte 2)
            },
            expires_delta=timedelta(days=4),
        )
        return {"token": token}


def accept_workspace_invitation(
    db: Session, 
    workspace_id: Optional[str], 
    user_id: str,
    invitation_token: str
) -> Membre:
    """
    Accepte une invitation a un workspace via token JWT.
    Supporte deux familles de token :
    - token d'invitation "guest" / standard avec type="workspace_invitation"
    - ancien token d'utilisateur existant avec scope="workspace_invitation_accept"
    """
    # 1. Decodage et validation du token
    payload = decode_invitation_token(invitation_token)
    if not payload:
        raise HTTPException(status_code=400, detail="Token d'invitation invalide ou expire.")

    # 2. Support des deux formats de token
    token_type = payload.get("type")
    token_scope = payload.get("scope")
    is_standard_invitation = token_type == "workspace_invitation"
    is_existing_user_legacy_invitation = token_scope == "workspace_invitation_accept"

    if not is_standard_invitation and not is_existing_user_legacy_invitation:
        raise HTTPException(status_code=403, detail="Type de token invalide pour cette action.")

    # 3. Extraction et verification des donnees du payload
    # Si espace_id n'est pas fourni par l'URL, on le prend du token
    target_workspace_id = workspace_id or payload.get("workspace_id")
    if not target_workspace_id:
        raise HTTPException(status_code=400, detail="ID du workspace absent du token.")

    # Verification de l'existence de l'espace parent
    workspace = get_workspace_by_id(db, target_workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Le workspace cible n'existe plus.")

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

    # 5. Prevention des doublons sur le Workspace (Contrainte 5)
    existing_member = get_workspace_member(db, target_workspace_id, user_id)
    if existing_member:
        if existing_member.statut == "Actif":
            raise HTTPException(status_code=409, detail="Invitation deja acceptee.")
        # Les anciens tokens "scope" ne transportent pas toujours le role.
        existing_member.role = payload.get("role") or existing_member.role
        existing_member.statut = "Actif"
        commit_or_raise(
            db,
            detail="Impossible d'activer votre statut de membre.",
            refresh_instance=existing_member,
        )
        return existing_member

    # 6. Creation du nouveau membre de l'Espace
    new_member = Membre(
        id_utilisateur=user_id,
        id_workspace=target_workspace_id,
        role=payload.get("role") or "Membre",
        statut="Actif"
    )
    db.add(new_member)
    commit_or_raise(db, detail="Impossible de finaliser votre adhesion au workspace.", refresh_instance=new_member)
    
    return new_member


def get_pending_invitations(db: Session, user_id: str) -> List[Membre]:
    """Retourne toutes les invitations en attente reçues par l'utilisateur."""
    return (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(
            Membre.id_utilisateur == user_id,
            Membre.statut == Status.PENDING,
            Membre.id_workspace.isnot(None),
        )
        .order_by(Membre.created_at.desc())
        .all()
    )


def cancel_workspace_invitation(db: Session, workspace_id: str, user_id: str) -> Optional[bool]:
    """L'administrateur annule une invitation en attente."""
    membre = get_member(db, workspace_id, user_id)
    if not membre:
        return None
    if membre.statut != Status.PENDING:
        return False

    db.delete(membre)
    commit_or_raise(db, detail="Impossible d'annuler cette invitation.")
    return True


# ============================================================================
# ACTIONS UTILISATEUR
# ============================================================================

def leave_workspace(db: Session, workspace_id: str, user_id: str) -> bool:
    """Un membre actif quitte le workspace (interdit au propriétaire)."""
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        return False
    if workspace.id_utilisateur == user_id:
        return False  # Le créateur ne peut pas quitter

    membre = get_member(db, workspace_id, user_id, active_only=True)
    if not membre:
        return False

    db.query(Fichier).filter(Fichier.id_membre == membre.id).delete(synchronize_session=False)
    db.query(Rapport).filter(Rapport.id_membre == membre.id).delete(synchronize_session=False)
    db.query(AbsenceEtConge).filter(AbsenceEtConge.id_membre == membre.id).delete(
        synchronize_session=False
    )
    db.delete(membre)
    commit_or_raise(db, detail="Impossible de quitter le workspace.")
    return True
