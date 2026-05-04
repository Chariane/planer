from datetime import datetime
from typing import Any, Optional, Tuple
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from ..models import Espace, PlanerEntreprise, Utilisateur, Workspace, Membre
from .utils import commit_or_raise


# Rôles Workspace
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
ESPACE_ADMIN_MANAGEABLE_ROLES = {ESPACE_MEMBER_ROLE, ESPACE_GUEST_ROLE}


def is_premium_user(user: Optional[Utilisateur]) -> bool:
    if not user or user.type_compte != "Premium":
        return False
    return user.premium_expire_at is not None and user.premium_expire_at > datetime.utcnow()


def is_premium_entreprise(entreprise: Optional[PlanerEntreprise]) -> bool:
    if not entreprise or not entreprise.is_premium or entreprise.statut_compte != "Actif":
        return False
    return entreprise.premium_expire_at is not None and entreprise.premium_expire_at > datetime.utcnow()


def user_has_premium_workspace_access(db: Session, user_id: str) -> bool:
    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if is_premium_user(user):
        return True

    entreprise = db.query(PlanerEntreprise).filter(PlanerEntreprise.id_utilisateur == user_id).first()
    return is_premium_entreprise(entreprise)


def get_espace_count_for_owner(db: Session, user_id: str) -> int:
    return (
        db.query(Espace)
        .join(Workspace, Espace.id_workspace == Workspace.id)
        .filter(Workspace.id_utilisateur == user_id)
        .count()
    )


def can_create_espace(db: Session, user_id: str) -> bool:
    if user_has_premium_workspace_access(db, user_id):
        return True
    return get_espace_count_for_owner(db, user_id) < 1


# -----------------------------------------------
# Sérialiseurs
# -----------------------------------------------

def _serialize_member(membre):
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

    # Fallback : le créateur du workspace a toujours accès (rôle Créateur)
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


def _require_workspace_management_access(db: Session, workspace_id: str, current_user_id: str):
    membre = _get_workspace_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Privileges insuffisants sur le workspace")
    return membre


def _require_workspace_read_access(db: Session, workspace_id: str, current_user_id: str):
    """
    Donne l'accès si l'utilisateur :
    1. Est membre (ou créateur) du workspace
    2. OU est membre d'au moins un espace dans ce workspace
    """

    # 1. Vérifier membre workspace
    try:
        return _get_workspace_member_or_403(db, workspace_id, current_user_id)
    except HTTPException:
        pass

    # 2. Vérifier si membre d'un espace du workspace
    has_espace_access = db.query(Membre).join(Espace, Membre.id_espace == Espace.id).filter(
        Espace.id_workspace == workspace_id,
        Membre.id_utilisateur == current_user_id,
        Membre.statut == "Actif"
    ).first()

    if has_espace_access:
        # Retourne un membre fictif avec accès limité (Invité)
        return Membre(role=WORKSPACE_GUEST_ROLE, statut="Actif")

    raise HTTPException(status_code=403, detail="Acces refuse au workspace (aucun acces detecte)")


def _resolve_espace_role(
    espace: Espace,
    membre: Optional[Membre],
    current_user_id: str,
) -> Optional[str]:
    if membre:
        return membre.role
    return None


def _resolve_espace_status(
    espace: Espace,
    membre: Optional[Membre],
    current_user_id: str,
) -> Optional[str]:
    if membre:
        return membre.statut
    return None


def _get_espace_actor_context(db: Session, espace_id: str, current_user_id: str):

    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")

    membre = get_espace_member(db, espace_id, current_user_id)
    role = _resolve_espace_role(espace, membre, current_user_id)
    statut = _resolve_espace_status(espace, membre, current_user_id)

    if role is None or statut != "Actif":
        raise HTTPException(status_code=403, detail="Acces refuse a cet espace")

    return espace, membre, role


def _validate_espace_member_management_permissions(
    espace: Espace,
    actor_role: str,
    target_user_id: str,
    target_member: Optional[Membre],
    new_role: Optional[str] = None,
):
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre introuvable")

    # REGLE 1 : Un Admin ne peut pas modifier un autre Admin ou le Créateur
    if actor_role == ESPACE_ADMIN_ROLE and target_member.role not in ESPACE_ADMIN_MANAGEABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Seul le créateur peut modifier ce membre.",
        )

    # REGLE 2 : Un Admin ne peut pas promouvoir quelqu'un à un rôle supérieur (Admin ou Créateur)
    if actor_role == ESPACE_ADMIN_ROLE and new_role and new_role not in ESPACE_ADMIN_MANAGEABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="En tant qu'administrateur, vous ne pouvez pas promouvoir un membre à ce rôle.",
        )

    # REGLE 3 : Seul un manager (Admin/Créateur) peut accéder à cette fonction
    if actor_role not in ESPACE_MANAGEMENT_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Permissions insuffisantes pour gerer les membres de cet espace.",
        )


# -----------------------------------------------
# Helpers d'accès — Espace
# -----------------------------------------------

def _get_espace_or_404(db: Session, espace_id: str) -> Espace:
    from ..crud.utilisateur import get_espace_by_id

    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    return espace


def _require_espace_access(db: Session, espace_id: str, workspace_id: str, current_user_id: str):
    """Vérifie l'accès à un espace (membre espace OU membre workspace)."""
    from ..crud.utilisateur import get_espace_member

    espace_member = get_espace_member(db, espace_id, current_user_id)
    if espace_member:
        return espace_member
    return _get_workspace_member_or_403(db, workspace_id, current_user_id)


def _require_espace_management_access(db: Session, espace_id: str, workspace_id: Optional[str], current_user_id: str):
    """Vérifie l'accès de gestion à un espace.
    
    Donne l'accès si l'utilisateur est :
    1. Le propriétaire du Workspace parent (maître)
    2. Un membre de l'espace avec rôle 'Créateur' ou 'Administrateur'
    3. Un administrateur du Workspace parent
    """
    from ..crud.utilisateur import get_espace_member
    from ..models import Workspace, Espace

    # 1. Résolution du workspace_id si manquant
    if not workspace_id:
        espace = db.query(Espace).filter(Espace.id == espace_id).first()
        if espace:
            workspace_id = espace.id_workspace

    # 2. Vérification PROPRIÉTAIRE DU WORKSPACE (Le Maître)
    if workspace_id:
        ws = db.query(Workspace).filter(
            Workspace.id == workspace_id,
            Workspace.id_utilisateur == current_user_id
        ).first()
        if ws:
            # Le créateur du workspace a tous les droits
            return Membre(role=WORKSPACE_OWNER_ROLE, statut="Actif")

    # 3. Vérification MEMBRE DIRECT DE L'ESPACE
    espace_member = get_espace_member(db, espace_id, current_user_id)
    if espace_member and espace_member.role in ESPACE_MANAGEMENT_ROLES:
        return espace_member

    # 4. Vérification ADMINISTRATEUR DU WORKSPACE
    if workspace_id:
        ws_admin = db.query(Membre).filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == current_user_id,
            Membre.role == WORKSPACE_ADMIN_ROLE,
            Membre.statut == "Actif"
        ).first()
        if ws_admin:
            return ws_admin

    raise HTTPException(status_code=403, detail="Acces refuse a l'espace")


def _require_espace_admin_access(db: Session, espace_id: str, current_user_id: str):
    """Vérifie que l'utilisateur est administrateur (Créateur ou Administrateur) de l'espace.

    Retourne un tuple (espace, membre).
    Lève une 404 si l'espace n'existe pas,
    une 403 si l'utilisateur n'a pas les droits d'administration.
    """
    from ..crud.utilisateur import get_espace_member

    espace = _get_espace_or_404(db, espace_id)

    # Vérifier d'abord si membre admin/créateur de l'espace
    espace_member = get_espace_member(db, espace_id, current_user_id)
    if espace_member and espace_member.role in ESPACE_MANAGEMENT_ROLES:
        return espace, espace_member

    # Sinon, vérifier si admin/créateur du workspace parent
    if espace.id_workspace:
        try:
            ws_member = _require_workspace_management_access(db, espace.id_workspace, current_user_id)
            return espace, ws_member
        except HTTPException:
            pass

    raise HTTPException(
        status_code=403,
        detail="Acces reserve aux administrateurs de l'espace",
    )


def _require_espace_owner_access(db: Session, espace_id: str, current_user_id: str):
    """Vérifie que l'utilisateur est le créateur de l'espace.

    Retourne un tuple (espace, membre).
    """
    from ..crud.utilisateur import get_espace_member

    espace = _get_espace_or_404(db, espace_id)

    espace_member = get_espace_member(db, espace_id, current_user_id)
    if espace_member and espace_member.role == "Créateur":
        return espace, espace_member

    raise HTTPException(
        status_code=403,
        detail="Seul le createur peut effectuer cette action",
    )
