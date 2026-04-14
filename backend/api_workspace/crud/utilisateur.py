from datetime import datetime
from typing import List, Optional
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload
from ..core.function import commit_or_raise
from ..models import (
    AbsenceEtConge,
    Canevas,
    Checklist,
    Espace,
    Fichier,
    Liste,
    Membre,
    Rapport,
    Section,
    Tache,
    Workspace,
)
from ..schemas import MembreCreate, WorkspaceCreate, WorkspaceMemberUpdate, WorkspaceUpdate


def get_workspace_by_id(db: Session, workspace_id: str) -> Optional[Workspace]:
    return (
        db.query(Workspace)
        .options(joinedload(Workspace.membres))
        .filter(Workspace.id == workspace_id)
        .first()
    )


def get_all_workspaces(db: Session, skip: int = 0, limit: int = 100) -> List[Workspace]:
    return db.query(Workspace).offset(skip).limit(limit).all()


def get_owned_workspaces(db: Session, owner_user_id: str) -> List[Workspace]:
    return db.query(Workspace).filter(Workspace.id_utilisateur == owner_user_id).all()


def get_workspaces_for_user(db: Session, user_id: str) -> List[Workspace]:
    return (
        db.query(Workspace)
        .options(joinedload(Workspace.membres))
        .outerjoin(Membre, Workspace.id == Membre.id_workspace)
        .filter(
            or_(
                Workspace.id_utilisateur == user_id,
                and_(
                    Membre.id_utilisateur == user_id,
                    Membre.statut == "Actif",
                ),
            )
        )
        .distinct()
        .order_by(Workspace.created_at.desc())
        .all()
    )


def get_workspaces_where_admin(db: Session, user_id: str) -> List[Workspace]:
    """Retourne les workspaces où l'utilisateur est propriétaire ou Administrateur/Créateur actif."""
    return (
        db.query(Workspace)
        .options(joinedload(Workspace.membres))
        .outerjoin(Membre, Workspace.id == Membre.id_workspace)
        .filter(
            or_(
                Workspace.id_utilisateur == user_id,
                and_(
                    Membre.id_utilisateur == user_id,
                    Membre.role.in_(["Créateur", "Administrateur"]),
                    Membre.statut == "Actif",
                ),
            )
        )
        .distinct()
        .order_by(Workspace.created_at.desc())
        .all()
    )


def create_workspace(db: Session, workspace_in: WorkspaceCreate, user_id: str) -> Workspace:
    workspace_data = workspace_in.model_dump(exclude={"id_utilisateur"}, exclude_none=True)
    workspace = Workspace(
        **workspace_data,
        id_utilisateur=user_id,
    )
    db.add(workspace)

    try:
        db.flush()

        owner_member = Membre(
            id_utilisateur=user_id,
            id_workspace=workspace.id,
            role="Administrateur",
            statut="Actif",
        )
        db.add(owner_member)

        commit_or_raise(
            db,
            detail="Impossible de creer le workspace a cause d'une contrainte d'integrite.",
            refresh_instance=workspace,
        )
    except Exception:
        db.rollback()
        raise

    return workspace


def update_workspace(db: Session, workspace_id: str, workspace_in: WorkspaceUpdate) -> Optional[Workspace]:
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        return None

    update_data = workspace_in.model_dump(exclude_unset=True, exclude_none=True)
    for key, value in update_data.items():
        setattr(workspace, key, value)
    workspace.updated_at = datetime.utcnow()

    commit_or_raise(
        db,
        detail="Impossible de mettre a jour le workspace a cause d'une contrainte d'integrite.",
        refresh_instance=workspace,
    )
    return workspace


def _collect_workspace_dependency_ids(db: Session, workspace_id: str) -> dict[str, list[str]]:
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


def delete_workspace(db: Session, workspace_id: str) -> bool:
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        return False

    dependency_ids = _collect_workspace_dependency_ids(db, workspace_id)

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
        detail="Impossible de supprimer le workspace et ses dependances.",
    )
    return True


def get_member(
    db: Session,
    workspace_id: str,
    user_id: str,
    *,
    active_only: bool = False,
) -> Optional[Membre]:
    query = (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == user_id,
        )
    )
    if active_only:
        query = query.filter(Membre.statut == "Actif")
    return query.first()


def get_members_of_workspace(db: Session, workspace_id: str) -> List[Membre]:
    return (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(Membre.id_workspace == workspace_id)
        .order_by(Membre.created_at.asc())
        .all()
    )


def add_member_to_workspace(db: Session, workspace_id: str, membre_in: MembreCreate) -> Membre:
    membre = Membre(
        **membre_in.model_dump(exclude_none=True),
        id_workspace=workspace_id,
    )
    db.add(membre)
    commit_or_raise(
        db,
        detail="Impossible d'ajouter ce membre au workspace a cause d'une contrainte d'integrite.",
        refresh_instance=membre,
    )
    return membre


def invite_member_to_workspace(db: Session, workspace_id: str, user_id: str, role: str) -> Membre:
    membre = get_member(db, workspace_id, user_id)
    if membre:
        membre.role = role
        membre.statut = "En attente"
        commit_or_raise(
            db,
            detail="Impossible de mettre cette invitation a jour.",
            refresh_instance=membre,
        )
        return membre

    return add_member_to_workspace(
        db,
        workspace_id,
        MembreCreate(
            id_utilisateur=user_id,
            id_workspace=workspace_id,
            role=role,
            statut="En attente",
        ),
    )


def accept_workspace_invitation(db: Session, workspace_id: str, user_id: str) -> Optional[Membre]:
    membre = get_member(db, workspace_id, user_id)
    if not membre:
        return None

    if membre.statut != "En attente":
        return None

    membre.statut = "Actif"
    commit_or_raise(
        db,
        detail="Impossible d'accepter cette invitation au workspace.",
        refresh_instance=membre,
    )
    return membre


def update_member_role(
    db: Session,
    workspace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
) -> Optional[Membre]:
    membre = get_member(db, workspace_id, user_id)
    if not membre:
        return None

    update_data = membre_in.model_dump(exclude_unset=True, exclude_none=True)
    for key, value in update_data.items():
        setattr(membre, key, value)

    commit_or_raise(
        db,
        detail="Impossible de mettre a jour ce membre a cause d'une contrainte d'integrite.",
        refresh_instance=membre,
    )
    return membre


def remove_member_from_workspace(db: Session, workspace_id: str, user_id: str) -> bool:
    membre = get_member(db, workspace_id, user_id)
    if not membre:
        return False

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


def get_workspace_detail(db: Session, workspace_id: str, user_id: str) -> Optional[Workspace]:
    """Retourne le workspace si l'utilisateur est membre actif ou propriétaire."""
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        return None
    if workspace.id_utilisateur == user_id:
        return workspace
    membre = get_member(db, workspace_id, user_id, active_only=True)
    if not membre:
        return None
    return workspace

def leave_workspace(db: Session, workspace_id: str, user_id: str) -> bool:
    """Un membre actif quitte le workspace (ne s'applique pas au propriétaire)."""
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


def cancel_workspace_invitation(db: Session, workspace_id: str, user_id: str) -> Optional[bool]:
    """L'administrateur annule une invitation en attente pour un utilisateur."""
    membre = get_member(db, workspace_id, user_id)
    if not membre:
        return None
    if membre.statut != "En attente":
        return False  # Pas en attente, ne peut pas être annulée

    db.delete(membre)
    commit_or_raise(db, detail="Impossible d'annuler cette invitation.")
    return True


def get_pending_invitations(db: Session, user_id: str) -> List[Membre]:
    """Retourne toutes les invitations en attente reçues par l'utilisateur."""
    return (
        db.query(Membre)
        .options(joinedload(Membre.utilisateur))
        .filter(
            Membre.id_utilisateur == user_id,
            Membre.statut == "En attente",
            Membre.id_workspace.isnot(None),
        )
        .order_by(Membre.created_at.desc())
        .all()
    )

