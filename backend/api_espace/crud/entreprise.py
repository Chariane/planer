from typing import List, Optional
from sqlalchemy.orm import Session
from .utilisateur import (
    add_member_to_espace,
    create_espace,
    delete_espace,
    get_espace_by_id,
    get_espace_member,
    get_espace_members,
    get_espaces_for_workspace,
    remove_espace_member,
    update_espace,
    update_espace_member,
)
from ..models import Espace, Membre
from ..schemas import EspaceCreate, EspaceUpdate, MembreCreate, WorkspaceMemberUpdate


def get_entreprise_espace(db: Session, entreprise_user_id: str, espace_id: str) -> Optional[Espace]:
    """Récupère un espace si l'entreprise y a accès (membre espace ou admin workspace parent)."""
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        return None

    # Vérifie si l'entreprise est membre de l'espace
    membre = get_espace_member(db, espace_id, entreprise_user_id)
    if membre:
        return espace

    # Vérifie si l'entreprise est admin du workspace parent
    if espace.id_workspace:
        from ..models import Workspace

        workspace = db.query(Workspace).filter(Workspace.id == espace.id_workspace).first()
        if workspace and workspace.id_utilisateur == entreprise_user_id:
            return espace

        ws_membre = (
            db.query(Membre)
            .filter(
                Membre.id_workspace == espace.id_workspace,
                Membre.id_utilisateur == entreprise_user_id,
                Membre.statut == "Actif",
                Membre.role.in_(["Créateur", "Administrateur"]),
            )
            .first()
        )
        if ws_membre:
            return espace

    return None


def get_entreprise_espaces(db: Session, entreprise_user_id: str, workspace_id: str) -> List[Espace]:
    return get_espaces_for_workspace(db, workspace_id)


def create_entreprise_espace(
    db: Session,
    espace_in: EspaceCreate,
    creator_user_id: str,
) -> Espace:
    return create_espace(db, espace_in, creator_user_id)


def update_entreprise_espace(
    db: Session,
    espace_id: str,
    espace_in: EspaceUpdate,
) -> Optional[Espace]:
    return update_espace(db, espace_id, espace_in)


def delete_entreprise_espace(db: Session, espace_id: str) -> bool:
    return delete_espace(db, espace_id)


def get_entreprise_espace_members(
    db: Session,
    entreprise_user_id: str,
    espace_id: str,
) -> Optional[List[Membre]]:
    espace = get_entreprise_espace(db, entreprise_user_id, espace_id)
    if not espace:
        return None
    return get_espace_members(db, espace_id)


def add_member_for_entreprise_espace(
    db: Session,
    espace_id: str,
    membre_in: MembreCreate,
) -> Membre:
    return add_member_to_espace(db, espace_id, membre_in)


def update_entreprise_espace_member(
    db: Session,
    entreprise_user_id: str,
    espace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
) -> Optional[Membre]:
    espace = get_entreprise_espace(db, entreprise_user_id, espace_id)
    if not espace:
        return None
    return update_espace_member(db, espace_id, user_id, membre_in)


def remove_entreprise_espace_member(
    db: Session,
    entreprise_user_id: str,
    espace_id: str,
    user_id: str,
) -> Optional[bool]:
    espace = get_entreprise_espace(db, entreprise_user_id, espace_id)
    if not espace:
        return None
    return remove_espace_member(db, espace_id, user_id)
