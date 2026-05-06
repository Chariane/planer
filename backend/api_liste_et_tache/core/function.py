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

# -----------------------------------------------
# Helpers d'accès — Workspace
# -----------------------------------------------

def _get_workspace_or_404(db: Session, workspace_id: str) -> Workspace:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return workspace


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


def _require_workspace_management_access(db: Session, workspace_id: str, current_user_id: str):
    membre = _get_workspace_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Privileges insuffisants sur le workspace")
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

    - accès direct si membre actif du sous-espace
    - accès si membre actif du workspace parent
    - accès si créateur/admin d'un espace ancêtre
    - refus pour membre/invité d'un espace ancêtre non ajouté au sous-espace
    """
    espace = _get_espace_or_404(db, espace_id)

    membre_espace = _get_espace_member_record(db, espace_id, current_user_id)
    if membre_espace and membre_espace.statut == "Actif":
        return membre_espace

    try:
        workspace_member = _get_workspace_member_or_403(db, espace.id_workspace, current_user_id)
        if workspace_member.role in WORKSPACE_MANAGEMENT_ROLES:
            return workspace_member
        raise HTTPException(
            status_code=403,
            detail="Vous devez etre ajoute a cet espace pour en voir le contenu.",
        )
    except HTTPException:
        pass

    ancestor_member = _get_active_ancestor_espace_member(db, espace, current_user_id)
    if ancestor_member:
        if ancestor_member.role in ESPACE_MANAGEMENT_ROLES:
            return ancestor_member
        raise HTTPException(
            status_code=403,
            detail="Vous devez etre ajoute a ce sous-espace pour en voir le contenu.",
        )

    raise HTTPException(status_code=403, detail="Acces refuse a l'espace")


def _require_espace_read_access(db: Session, espace_id: str, current_user_id: str):
    """
    Vérifie l'accès en lecture à un espace.

    Autorise la lecture si l'utilisateur est :
    - membre actif direct de l'espace
    - membre actif du workspace parent
    - membre actif d'un espace ancêtre
    """
    espace = _get_espace_or_404(db, espace_id)

    membre_espace = _get_espace_member_record(db, espace_id, current_user_id)
    if membre_espace and membre_espace.statut == "Actif":
        return membre_espace

    try:
        return _get_workspace_member_or_403(db, espace.id_workspace, current_user_id)
    except HTTPException:
        pass

    ancestor_member = _get_active_ancestor_espace_member(db, espace, current_user_id)
    if ancestor_member and ancestor_member.statut == "Actif":
        return ancestor_member

    raise HTTPException(status_code=403, detail="Acces refuse a l'espace")


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


def _require_list_access(db: Session, liste_id: str, current_user_id: str):
    """Vérifie l'accès à une liste (via son espace ou son workspace)."""
    liste = _get_liste_or_404(db, liste_id)
    
    if liste.id_espace:
        return _require_espace_access(db, liste.id_espace, current_user_id)
    elif liste.id_workspace:
        return _get_workspace_member_or_403(db, liste.id_workspace, current_user_id)
    
    raise HTTPException(status_code=403, detail="Liste orpheline ou acces refuse")


def _require_list_read_access(db: Session, liste_id: str, current_user_id: str):
    """Vérifie l'accès en lecture à une liste (via son espace ou son workspace)."""
    liste = _get_liste_or_404(db, liste_id)

    if liste.id_espace:
        return _require_espace_read_access(db, liste.id_espace, current_user_id)
    if liste.id_workspace:
        return _get_workspace_member_or_403(db, liste.id_workspace, current_user_id)

    raise HTTPException(status_code=403, detail="Liste orpheline ou acces refuse")

# -----------------------------------------------
# Helpers d'accès — Tache
# -----------------------------------------------

def _get_tache_or_404(db: Session, tache_id: str) -> Tache:
    tache = db.query(Tache).filter(Tache.id == tache_id).first()
    if not tache:
        raise HTTPException(status_code=404, detail="Tache non trouvee")
    return tache
