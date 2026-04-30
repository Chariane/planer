# backend/api_workspace/crud/utilisateur.py

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session, joinedload
from ..core.function import commit_or_raise, Role, Status
from ..models import (
    AbsenceEtConge, Canevas, Checklist, Espace, Fichier, Liste, 
    Membre, Rapport, Section, Tache, Utilisateur, Workspace,
)
from ..core.security import create_access_token, decode_invitation_token
from ..schemas import MembreCreate, WorkspaceCreate, WorkspaceMemberUpdate, WorkspaceUpdate


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

def invite_member_to_workspace(
    db: Session,
    workspace_id: str,
    user_identifier: str,
    role: str,
    id_liste: Optional[str] = None,
    id_tache: Optional[str] = None,
) -> dict:
    """
    Invite un membre : s'il existe on l'ajoute/met à jour, sinon on génère un token JWT.
    """
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé.")

    assignment = _validate_workspace_member_assignment(
        db,
        workspace_id,
        role,
        id_liste=id_liste,
        id_tache=id_tache,
    )

    # Recherche de l'utilisateur
    normalized_identifier = user_identifier.strip()
    if "@" in normalized_identifier:
        user = db.query(Utilisateur).filter(Utilisateur.email == normalized_identifier.lower()).first()
    else:
        user = db.query(Utilisateur).filter(Utilisateur.id == normalized_identifier).first()
    
    TOKEN_TYPE = "workspace_invitation"

    if user:
        # CAS 1 : Utilisateur existant
        membre = get_member(db, workspace_id, user.id)
        if membre:
            membre.role = role
            if membre.statut != Status.ACTIVE:
                membre.statut = Status.PENDING
        else:
            membre = Membre(
                id_utilisateur=user.id,
                id_workspace=workspace_id,
                role=role,
                statut=Status.PENDING,
            )
            db.add(membre)

        _sync_assignment_membership(db, user.id, assignment, Status.PENDING)
        
        commit_or_raise(db, detail="Impossible d'inviter cet utilisateur existant.")
        
        token = create_access_token(
            data={
                "sub": user.id,
                "email": user.email,
                "workspace_id": workspace_id,
                "role": role,
                "id_liste": assignment.get("id_liste"),
                "id_tache": assignment.get("id_tache"),
                "type": TOKEN_TYPE
            },
            expires_delta=timedelta(days=7),
        )
        return {"status": "existing_user", "membre": membre, "token": token}

    # CAS 2 : Invité externe (Guest)
    token = create_access_token(
        data={
            "email": normalized_identifier.lower(),
            "workspace_id": workspace_id,
            "role": role,
            "id_liste": assignment.get("id_liste"),
            "id_tache": assignment.get("id_tache"),
            "type": TOKEN_TYPE,
        },
        expires_delta=timedelta(days=4),
    )
    
    return {
        "status": "guest_invitation",
        "email": normalized_identifier.lower(),
        "token": token
    }


def accept_workspace_invitation(
    db: Session, 
    workspace_id: Optional[str], 
    user_id: str,
    invitation_token: str
) -> Membre:
    """Accepte une invitation à un workspace via token JWT."""
    payload = decode_invitation_token(invitation_token)
    if not payload:
        raise HTTPException(status_code=400, detail="Token d'invitation invalide ou expiré.")

    if payload.get("type") != "workspace_invitation":
        raise HTTPException(status_code=403, detail="Type de token invalide pour cette action.")

    target_workspace_id = workspace_id or payload.get("workspace_id")
    if not target_workspace_id:
        raise HTTPException(status_code=400, detail="ID du workspace absent du token.")

    ws = get_workspace_by_id(db, target_workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Le workspace cible n'existe plus.")

    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")

    token_sub = payload.get("sub")
    token_email = payload.get("email")

    if token_sub and token_sub != user_id:
        raise HTTPException(status_code=403, detail="Cette invitation appartient à un autre utilisateur.")
    
    if token_email and token_email.lower() != user.email.lower():
        raise HTTPException(status_code=403, detail="Cet email d'invitation ne correspond pas au vôtre.")

    invited_role = payload.get("role") or Role.MEMBER
    assignment = _validate_workspace_member_assignment(
        db,
        target_workspace_id,
        invited_role,
        id_liste=payload.get("id_liste"),
        id_tache=payload.get("id_tache"),
    )

    membre = get_member(db, target_workspace_id, user_id)
    if membre:
        membre.role = invited_role or membre.role
        if membre.statut != Status.ACTIVE:
            membre.statut = Status.ACTIVE
    else:
        membre = Membre(
            id_utilisateur=user_id,
            id_workspace=target_workspace_id,
            role=invited_role,
            statut=Status.ACTIVE,
        )
        db.add(membre)

    _sync_assignment_membership(db, user_id, assignment, Status.ACTIVE)
    commit_or_raise(db, detail="Impossible d'activer votre statut de membre.", refresh_instance=membre)
    return membre


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


# ============================================================================
# UTILITAIRES PRIVÉS
# ============================================================================

def _get_member_by_liste(db: Session, liste_id: str, user_id: str) -> Optional[Membre]:
    """Récupère un membre assigné à une liste."""
    return (
        db.query(Membre)
        .filter(
            Membre.id_liste == liste_id,
            Membre.id_utilisateur == user_id,
        )
        .first()
    )


def _get_member_by_tache(db: Session, tache_id: str, user_id: str) -> Optional[Membre]:
    """Récupère un membre assigné à une tâche."""
    return (
        db.query(Membre)
        .filter(
            Membre.id_tache == tache_id,
            Membre.id_utilisateur == user_id,
        )
        .first()
    )


def _validate_workspace_member_assignment(
    db: Session,
    workspace_id: str,
    role: str,
    id_liste: Optional[str] = None,
    id_tache: Optional[str] = None,
) -> dict:
    """Valide qu'une assignation (liste/tâche) est cohérente avec le rôle."""
    assignment_count = int(id_liste is not None) + int(id_tache is not None)

    if role == Role.MEMBER:
        if assignment_count != 1:
            raise HTTPException(
                status_code=400,
                detail="Une invitation avec le rôle 'Membre' doit cibler exactement une liste ou une tâche du workspace.",
            )
    elif assignment_count != 0:
        raise HTTPException(
            status_code=400,
            detail="Seul le rôle 'Membre' peut recevoir une affectation directe à une liste ou une tâche.",
        )

    if id_liste:
        liste = (
            db.query(Liste)
            .options(joinedload(Liste.espace), joinedload(Liste.workspace))
            .filter(Liste.id == id_liste)
            .first()
        )
        if not liste:
            raise HTTPException(status_code=404, detail="Liste introuvable.")

        liste_workspace_id = liste.id_workspace or (liste.espace.id_workspace if liste.espace else None)
        if liste_workspace_id != workspace_id:
            raise HTTPException(
                status_code=400,
                detail="La liste sélectionnée n'appartient pas à ce workspace.",
            )
        return {"id_liste": liste.id, "id_tache": None}

    if id_tache:
        tache = (
            db.query(Tache)
            .options(
                joinedload(Tache.liste).joinedload(Liste.espace),
                joinedload(Tache.liste).joinedload(Liste.workspace),
            )
            .filter(Tache.id == id_tache)
            .first()
        )
        if not tache:
            raise HTTPException(status_code=404, detail="Tâche introuvable.")
        if not tache.liste:
            raise HTTPException(
                status_code=400,
                detail="La tâche sélectionnée n'est rattachée à aucune liste exploitable.",
            )

        tache_workspace_id = tache.liste.id_workspace or (
            tache.liste.espace.id_workspace if tache.liste.espace else None
        )
        if tache_workspace_id != workspace_id:
            raise HTTPException(
                status_code=400,
                detail="La tâche sélectionnée n'appartient pas à ce workspace.",
            )
        return {"id_liste": None, "id_tache": tache.id}

    return {"id_liste": None, "id_tache": None}


def _sync_assignment_membership(
    db: Session,
    user_id: str,
    assignment: dict,
    statut: str,
) -> Optional[Membre]:
    """Synchronise un membership d'assignation (liste ou tâche)."""
    id_liste = assignment.get("id_liste")
    id_tache = assignment.get("id_tache")

    if not id_liste and not id_tache:
        return None

    membre = None
    if id_liste:
        membre = _get_member_by_liste(db, id_liste, user_id)
        if not membre:
            membre = Membre(
                id_utilisateur=user_id,
                id_liste=id_liste,
                role=Role.MEMBER,
                statut=statut,
            )
            db.add(membre)
            return membre

    if id_tache:
        membre = _get_member_by_tache(db, id_tache, user_id)
        if not membre:
            membre = Membre(
                id_utilisateur=user_id,
                id_tache=id_tache,
                role=Role.MEMBER,
                statut=statut,
            )
            db.add(membre)
            return membre

    if membre:
        membre.role = Role.MEMBER
        if statut == Status.ACTIVE or membre.statut != Status.ACTIVE:
            membre.statut = statut
    return membre