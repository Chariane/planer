from fastapi import HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from ..models import Workspace, Espace, Membre, Liste, Tache

# Constantes de rôles (selon les schémas existants)
WORKSPACE_OWNER_ROLE = "Créateur"
WORKSPACE_ADMIN_ROLE = "Administrateur"
WORKSPACE_MEMBER_ROLE = "Membre"
WORKSPACE_GUEST_ROLE = "Invité"

WORKSPACE_READ_ROLES = {
    WORKSPACE_OWNER_ROLE,
    WORKSPACE_ADMIN_ROLE,
    WORKSPACE_MEMBER_ROLE,
    WORKSPACE_GUEST_ROLE,
}
WORKSPACE_MANAGEMENT_ROLES = {WORKSPACE_OWNER_ROLE, WORKSPACE_ADMIN_ROLE}
WORKSPACE_DESCENDANT_READ_ROLES = {
    WORKSPACE_OWNER_ROLE,
    WORKSPACE_ADMIN_ROLE,
    WORKSPACE_GUEST_ROLE,
}

# Rôles Espace
ESPACE_OWNER_ROLE = "Créateur"
ESPACE_ADMIN_ROLE = "Administrateur"
ESPACE_MEMBER_ROLE = "Membre"
ESPACE_GUEST_ROLE = "Invité"

ESPACE_READ_ROLES = {
    ESPACE_OWNER_ROLE,
    ESPACE_ADMIN_ROLE,
    ESPACE_MEMBER_ROLE,
    ESPACE_GUEST_ROLE,
}
ESPACE_MANAGEMENT_ROLES = {ESPACE_OWNER_ROLE, ESPACE_ADMIN_ROLE}
ESPACE_DESCENDANT_READ_ROLES = {
    ESPACE_OWNER_ROLE,
    ESPACE_ADMIN_ROLE,
    ESPACE_GUEST_ROLE,
}


class Role:
    CREATOR = WORKSPACE_OWNER_ROLE
    ADMIN = WORKSPACE_ADMIN_ROLE
    MEMBER = WORKSPACE_MEMBER_ROLE
    GUEST = WORKSPACE_GUEST_ROLE


class ResourceType:
    WORKSPACE = "workspace"
    ESPACE = "espace"
    LISTE = "liste"
    TACHE = "tache"


ROLE_HIERARCHY = {
    WORKSPACE_GUEST_ROLE: 1,
    WORKSPACE_MEMBER_ROLE: 2,
    WORKSPACE_ADMIN_ROLE: 3,
    WORKSPACE_OWNER_ROLE: 4,
}

# -----------------------------------------------
# Helpers d'accès — Workspace
# -----------------------------------------------

def _get_workspace_or_404(db: Session, workspace_id: str) -> Workspace:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return workspace


def _get_role_rank(role: str | None) -> int:
    if role is None:
        return 0
    return ROLE_HIERARCHY.get(role, 0)


def _get_workspace_member_or_403(db: Session, workspace_id: str, current_user_id: str):
    membre = (
        db.query(Membre)
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == current_user_id,
            Membre.statut == "Actif",
        )
        .first()
    )
    if membre:
        return membre

    # Fallback : le créateur du workspace a toujours accès
    ws = db.query(Workspace).filter(
        Workspace.id == workspace_id,
        Workspace.id_utilisateur == current_user_id
    ).first()
    if ws:
        return Membre(
            id_utilisateur=current_user_id,
            id_workspace=workspace_id,
            role=WORKSPACE_OWNER_ROLE,
            statut="Actif",
        )

    raise HTTPException(status_code=403, detail="Acces refuse au workspace")


_require_workspace_member = _get_workspace_member_or_403


def _get_active_workspace_membership(
    db: Session,
    workspace_id: str,
    user_id: str,
) -> Membre | None:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace and workspace.id_utilisateur == user_id:
        return Membre(
            id_utilisateur=user_id,
            id_workspace=workspace_id,
            role=WORKSPACE_OWNER_ROLE,
            statut="Actif",
        )

    return (
        db.query(Membre)
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif",
        )
        .first()
    )


def _append_inherited_candidate(
    candidates: list[tuple[str, str, str]],
    *,
    role: str | None,
    resource_type: str,
    resource_id: str | None,
) -> None:
    if role in WORKSPACE_DESCENDANT_READ_ROLES and resource_id:
        candidates.append((role, resource_type, resource_id))


def _require_workspace_management_access(db: Session, workspace_id: str, current_user_id: str):
    membre = _get_workspace_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Privileges insuffisants sur le workspace")
    return membre


def _require_workspace_descendant_read_access(db: Session, workspace_id: str, current_user_id: str):
    """Donne un accès de lecture descendante sur le contenu du workspace."""
    membre = _get_workspace_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_DESCENDANT_READ_ROLES:
        raise HTTPException(status_code=403, detail="Acces refuse au contenu du workspace")
    return membre


def _get_espace_member_record(db: Session, espace_id: str, user_id: str) -> Membre | None:
    return (
        db.query(Membre)
        .filter(
            Membre.id_espace == espace_id,
            Membre.id_utilisateur == user_id,
        )
        .first()
    )


def _get_active_ancestor_espace_member(
    db: Session,
    espace: Espace,
    user_id: str,
) -> Membre | None:
    parent_id = espace.id_espace_parent

    while parent_id:
        parent_espace = db.query(Espace).filter(Espace.id == parent_id).first()
        if not parent_espace:
            return None

        parent_member = _get_espace_member_record(db, parent_espace.id, user_id)
        if parent_member and parent_member.statut == "Actif":
            return parent_member

        parent_id = parent_espace.id_espace_parent

    return None


def _get_active_ancestor_espace_manager(
    db: Session,
    espace: Espace,
    user_id: str,
) -> Membre | None:
    ancestor_member = _get_active_ancestor_espace_member(db, espace, user_id)
    if ancestor_member and ancestor_member.role in ESPACE_MANAGEMENT_ROLES:
        return ancestor_member
    return None


def _get_active_ancestor_espace_descendant_reader(
    db: Session,
    espace: Espace,
    user_id: str,
) -> Membre | None:
    ancestor_member = _get_active_ancestor_espace_member(db, espace, user_id)
    if ancestor_member and ancestor_member.role in ESPACE_DESCENDANT_READ_ROLES:
        return ancestor_member
    return None


def get_parent_inherited_role(
    db: Session,
    user_id: str,
    target_type: str,
    target_id: str,
) -> tuple[str, str, str] | None:
    candidates: list[tuple[str, str, str]] = []

    if target_type == ResourceType.LISTE:
        liste = (
            db.query(Liste)
            .filter(Liste.id == target_id)
            .first()
        )
        if not liste:
            raise HTTPException(status_code=404, detail="Liste non trouvee.")

        if liste.id_workspace:
            workspace_member = _get_active_workspace_membership(db, liste.id_workspace, user_id)
            if workspace_member:
                _append_inherited_candidate(
                    candidates,
                    role=workspace_member.role,
                    resource_type=ResourceType.WORKSPACE,
                    resource_id=liste.id_workspace,
                )

        parent_espace_id = liste.id_espace
        while parent_espace_id:
            parent_member = _get_espace_member_record(db, parent_espace_id, user_id)
            if parent_member and parent_member.statut == "Actif":
                _append_inherited_candidate(
                    candidates,
                    role=parent_member.role,
                    resource_type=ResourceType.ESPACE,
                    resource_id=parent_espace_id,
                )

            parent_espace = db.query(Espace).filter(Espace.id == parent_espace_id).first()
            if not parent_espace:
                break

            if parent_espace.id_workspace and not liste.id_workspace:
                workspace_member = _get_active_workspace_membership(
                    db,
                    parent_espace.id_workspace,
                    user_id,
                )
                if workspace_member:
                    _append_inherited_candidate(
                        candidates,
                        role=workspace_member.role,
                        resource_type=ResourceType.WORKSPACE,
                        resource_id=parent_espace.id_workspace,
                    )
            parent_espace_id = parent_espace.id_espace_parent

    elif target_type == ResourceType.TACHE:
        tache = db.query(Tache).filter(Tache.id == target_id).first()
        if not tache:
            raise HTTPException(status_code=404, detail="Tache non trouvee.")

        liste_member = _get_liste_member_record(db, tache.id_liste, user_id)
        if liste_member and liste_member.statut == "Actif":
            _append_inherited_candidate(
                candidates,
                role=liste_member.role,
                resource_type=ResourceType.LISTE,
                resource_id=tache.id_liste,
            )

        liste = _get_liste_or_404(db, tache.id_liste)
        if liste.id_workspace:
            workspace_member = _get_active_workspace_membership(db, liste.id_workspace, user_id)
            if workspace_member:
                _append_inherited_candidate(
                    candidates,
                    role=workspace_member.role,
                    resource_type=ResourceType.WORKSPACE,
                    resource_id=liste.id_workspace,
                )

        parent_espace_id = liste.id_espace
        while parent_espace_id:
            parent_member = _get_espace_member_record(db, parent_espace_id, user_id)
            if parent_member and parent_member.statut == "Actif":
                _append_inherited_candidate(
                    candidates,
                    role=parent_member.role,
                    resource_type=ResourceType.ESPACE,
                    resource_id=parent_espace_id,
                )

            parent_espace = db.query(Espace).filter(Espace.id == parent_espace_id).first()
            if not parent_espace:
                break

            if parent_espace.id_workspace and not liste.id_workspace:
                workspace_member = _get_active_workspace_membership(
                    db,
                    parent_espace.id_workspace,
                    user_id,
                )
                if workspace_member:
                    _append_inherited_candidate(
                        candidates,
                        role=workspace_member.role,
                        resource_type=ResourceType.WORKSPACE,
                        resource_id=parent_espace.id_workspace,
                    )
            parent_espace_id = parent_espace.id_espace_parent

    else:
        raise HTTPException(status_code=400, detail="Type de ressource invalide pour cet API.")

    if not candidates:
        return None

    return max(candidates, key=lambda item: _get_role_rank(item[0]))


def validate_role_hierarchy(
    db: Session,
    user_id: str,
    target_type: str,
    target_id: str,
    new_role: str,
) -> tuple[str, str, str] | None:
    inherited = get_parent_inherited_role(db, user_id, target_type, target_id)
    if not inherited:
        return None

    inherited_role, source_type, source_id = inherited
    if _get_role_rank(inherited_role) >= _get_role_rank(new_role):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Role redondant ou inferieur refuse : l'utilisateur dispose deja du role "
                f"'{inherited_role}' herite depuis ce {source_type} ({source_id})."
            ),
        )

    return inherited


# -----------------------------------------------
# Helpers d'accès — Espace
# -----------------------------------------------

def _get_espace_or_404(db: Session, espace_id: str) -> Espace:
    espace = db.query(Espace).filter(Espace.id == espace_id).first()
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    return espace


def _require_espace_access(db: Session, espace_id: str, current_user_id: str):
    """
    Vérifie l'accès au contenu d'un espace.

    Autorise l'accès si l'utilisateur est :
    - membre actif direct de l'espace
    - membre actif du workspace parent
    - membre actif d'un espace ancêtre
    """
    espace = _get_espace_or_404(db, espace_id)

    membre_espace = _get_espace_member_record(db, espace_id, current_user_id)
    if membre_espace and membre_espace.statut == "Actif":
        return membre_espace

    try:
        workspace_member = _require_workspace_descendant_read_access(
            db, espace.id_workspace, current_user_id
        )
        if workspace_member:
            return workspace_member
    except HTTPException:
        pass

    ancestor_member = _get_active_ancestor_espace_descendant_reader(
        db, espace, current_user_id
    )
    if ancestor_member:
        return ancestor_member

    raise HTTPException(status_code=403, detail="Acces refuse a l'espace")


def _require_espace_read_access(db: Session, espace_id: str, current_user_id: str):
    """Vérifie l'accès en lecture à un espace."""
    return _require_espace_access(db, espace_id, current_user_id)


def _require_espace_descendant_read_access(db: Session, espace_id: str, current_user_id: str):
    """Vérifie l'accès de lecture descendante sur les enfants d'un espace."""
    espace = _get_espace_or_404(db, espace_id)

    espace_member = _get_espace_member_record(db, espace_id, current_user_id)
    if (
        espace_member
        and espace_member.statut == "Actif"
        and espace_member.role in ESPACE_DESCENDANT_READ_ROLES
    ):
        return espace_member

    try:
        workspace_member = _require_workspace_descendant_read_access(
            db, espace.id_workspace, current_user_id
        )
        if workspace_member:
            return workspace_member
    except HTTPException:
        pass

    ancestor_member = _get_active_ancestor_espace_descendant_reader(
        db, espace, current_user_id
    )
    if ancestor_member:
        return ancestor_member

    raise HTTPException(status_code=403, detail="Acces refuse au contenu descendant de l'espace")


def _require_espace_management_access(db: Session, espace_id: str, current_user_id: str):
    """
    Vérifie l'accès de gestion à un espace.

    Autorise uniquement :
    - le créateur du workspace parent
    - un administrateur du workspace parent
    - le créateur de l'espace
    - un administrateur de l'espace
    """
    espace = _get_espace_or_404(db, espace_id)

    ws = db.query(Workspace).filter(
        Workspace.id == espace.id_workspace,
        Workspace.id_utilisateur == current_user_id
    ).first()
    if ws:
        return Membre(
            id_utilisateur=current_user_id,
            id_workspace=espace.id_workspace,
            role=WORKSPACE_OWNER_ROLE,
            statut="Actif",
        )

    espace_member = db.query(Membre).filter(
        Membre.id_espace == espace_id,
        Membre.id_utilisateur == current_user_id,
        Membre.statut == "Actif",
    ).first()
    if espace_member and espace_member.role in ESPACE_MANAGEMENT_ROLES:
        return espace_member

    ancestor_manager = _get_active_ancestor_espace_manager(db, espace, current_user_id)
    if ancestor_manager:
        return ancestor_manager

    ws_member = db.query(Membre).filter(
        Membre.id_workspace == espace.id_workspace,
        Membre.id_utilisateur == current_user_id,
        Membre.role == WORKSPACE_ADMIN_ROLE,
        Membre.statut == "Actif",
    ).first()
    if ws_member:
        return ws_member

    raise HTTPException(status_code=403, detail="Privileges insuffisants sur l'espace")


# -----------------------------------------------
# Helpers d'accès — Liste
# -----------------------------------------------

def _get_liste_or_404(db: Session, liste_id: str) -> Liste:
    liste = db.query(Liste).filter(Liste.id == liste_id).first()
    if not liste:
        raise HTTPException(status_code=404, detail="Liste non trouvee")
    return liste


def _get_liste_member_record(db: Session, liste_id: str, user_id: str) -> Membre | None:
    return (
        db.query(Membre)
        .filter(
            Membre.id_liste == liste_id,
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif",
        )
        .first()
    )


def _require_list_access(db: Session, liste_id: str, current_user_id: str):
    """Vérifie l'accès opérationnel à une liste."""
    liste = _get_liste_or_404(db, liste_id)

    liste_member = _get_liste_member_record(db, liste_id, current_user_id)
    if liste_member and liste_member.role != WORKSPACE_GUEST_ROLE:
        return liste_member

    if liste.id_espace:
        return _require_espace_management_access(db, liste.id_espace, current_user_id)
    if liste.id_workspace:
        workspace_member = _get_workspace_member_or_403(db, liste.id_workspace, current_user_id)
        if workspace_member.role in WORKSPACE_MANAGEMENT_ROLES:
            return workspace_member

    raise HTTPException(status_code=403, detail="Liste orpheline ou acces refuse")


def _require_list_read_access(db: Session, liste_id: str, current_user_id: str):
    """Vérifie l'accès en lecture à une liste (via son espace ou son workspace)."""
    liste = _get_liste_or_404(db, liste_id)

    liste_member = _get_liste_member_record(db, liste_id, current_user_id)
    if liste_member:
        return liste_member

    if liste.id_espace:
        return _require_espace_descendant_read_access(db, liste.id_espace, current_user_id)
    if liste.id_workspace:
        return _require_workspace_descendant_read_access(db, liste.id_workspace, current_user_id)

    raise HTTPException(status_code=403, detail="Liste orpheline ou acces refuse")


def _get_tache_member_record(db: Session, tache_id: str, user_id: str) -> Membre | None:
    return (
        db.query(Membre)
        .filter(
            Membre.id_tache == tache_id,
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif",
        )
        .first()
    )

# -----------------------------------------------
# Helpers d'accès — Tache
# -----------------------------------------------

def _get_tache_or_404(db: Session, tache_id: str) -> Tache:
    tache = db.query(Tache).filter(Tache.id == tache_id).first()
    if not tache:
        raise HTTPException(status_code=404, detail="Tache non trouvee")
    return tache


def _require_task_access(db: Session, tache_id: str, current_user_id: str):
    """Vérifie l'accès opérationnel à une tâche."""
    task_member = _get_tache_member_record(db, tache_id, current_user_id)
    if task_member and task_member.role != WORKSPACE_GUEST_ROLE:
        return task_member

    tache = _get_tache_or_404(db, tache_id)
    return _require_list_access(db, tache.id_liste, current_user_id)


def _require_task_read_access(db: Session, tache_id: str, current_user_id: str):
    """Vérifie l'accès en lecture à une tâche."""
    task_member = _get_tache_member_record(db, tache_id, current_user_id)
    if task_member:
        return task_member

    tache = _get_tache_or_404(db, tache_id)
    return _require_list_read_access(db, tache.id_liste, current_user_id)
