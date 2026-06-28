# backend/api_liste_et_tache/core/function.py
import base64
from fastapi import HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from ..models import (
    Workspace,
    Espace,
    Membre,
    Liste,
    Tache,
    Canevas,
    Section,
    Checklist,
    Fichier,
    Rapport,
    AbsenceEtConge,
)
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from typing import Any, Optional
from datetime import datetime, timezone

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

# Les invités et membres workspace peuvent lire le contenu descendant.
WORKSPACE_DESCENDANT_READ_ROLES = {
    WORKSPACE_OWNER_ROLE,
    WORKSPACE_ADMIN_ROLE,
    WORKSPACE_MEMBER_ROLE,
    WORKSPACE_GUEST_ROLE,
}
WORKSPACE_DESCENDANT_MANAGEMENT_ROLES = {
    WORKSPACE_OWNER_ROLE,
    WORKSPACE_ADMIN_ROLE,
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
    ESPACE_MEMBER_ROLE,
    ESPACE_GUEST_ROLE,
}
ESPACE_DESCENDANT_MANAGEMENT_ROLES = {
    ESPACE_OWNER_ROLE,
    ESPACE_ADMIN_ROLE,
}

# Rôles Liste
LISTE_OWNER_ROLE = "Créateur"
LISTE_ADMIN_ROLE = "Administrateur"
LISTE_MEMBER_ROLE = "Membre"
LISTE_GUEST_ROLE = "Invité"

LISTE_MANAGEMENT_ROLES = {LISTE_OWNER_ROLE, LISTE_ADMIN_ROLE}
LISTE_ADMIN_MANAGEABLE_ROLES = {LISTE_MEMBER_ROLE, LISTE_GUEST_ROLE}
LISTE_READ_ROLES = {LISTE_OWNER_ROLE, LISTE_ADMIN_ROLE, LISTE_MEMBER_ROLE, LISTE_GUEST_ROLE}


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
    CANEVAS = "canevas"
    SECTION = "section"
    CHECKLIST = "checklist"
    FICHIER = "fichier"


ROLE_HIERARCHY = {
    WORKSPACE_GUEST_ROLE: 1,
    WORKSPACE_MEMBER_ROLE: 2,
    WORKSPACE_ADMIN_ROLE: 3,
    WORKSPACE_OWNER_ROLE: 4,
}


# ========== FONCTIONS DE DATES (déplacées depuis absence.py) ==========
def _as_naive_datetime(value):
    if value is None:
        return None
    if isinstance(value, datetime) and value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _date_overlap(start_a, end_a, start_b, end_b) -> bool:
    start_a = _as_naive_datetime(start_a)
    end_a = _as_naive_datetime(end_a)
    start_b = _as_naive_datetime(start_b)
    end_b = _as_naive_datetime(end_b)
    if not start_a or not start_b:
        return False
    a_end = end_a or start_a
    b_end = end_b or start_b
    return start_a <= b_end and start_b <= a_end


# ========== NOUVELLES FONCTIONS POUR ABSENCES GLOBALES ==========
def _get_user_active_memberships(db: Session, user_id: str) -> list[Membre]:
    """Récupère toutes les adhésions actives d'un utilisateur."""
    return db.query(Membre).filter(
        Membre.id_utilisateur == user_id,
        Membre.statut == "Actif"
    ).all()


def _has_overlapping_leave_for_user(
    db: Session,
    user_id: str,
    date_debut,
    date_fin,
    exclude_absence_id: Optional[str] = None,
    exclude_member_ids: Optional[list[str]] = None,
    statuses: Optional[list[str]] = None,
) -> bool:
    """
    Vérifie si l'utilisateur a une absence (en attente ou approuvée par défaut) sur la période donnée,
    sur l'un de ses membres actifs.
    """
    membres = _get_user_active_memberships(db, user_id)
    member_ids = [m.id for m in membres]
    if exclude_member_ids:
        member_ids = [mid for mid in member_ids if mid not in exclude_member_ids]
    if not member_ids:
        return False

    query = db.query(AbsenceEtConge).filter(
        AbsenceEtConge.id_membre.in_(member_ids),
    )
    if statuses is None:
        statuses = ["en_attente", "approuvee"]
    query = query.filter(AbsenceEtConge.statut.in_(statuses))
    if exclude_absence_id:
        query = query.filter(AbsenceEtConge.id != exclude_absence_id)

    for absence in query.all():
        if _date_overlap(date_debut, date_fin, absence.date_debut, absence.date_fin):
            return True
    return False


def _is_user_available_now(db: Session, user_id: str) -> bool:
    """Checks if the user has an approved absence covering the current date."""
    now = datetime.now()
    # Utilisation de la nouvelle fonction pour vérifier les absences approuvées sur la date actuelle
    return not _has_overlapping_leave_for_user(
        db,
        user_id,
        date_debut=now,
        date_fin=now,
        statuses=["approuvee"]
    )


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
    if role and resource_id:
        candidates.append((role, resource_type, resource_id))


def _require_workspace_management_access(db: Session, workspace_id: str, current_user_id: str):
    membre = _get_workspace_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Privileges insuffisants sur le workspace")
    return membre


def _require_workspace_descendant_read_access(db: Session, workspace_id: str, current_user_id: str):
    """Donne un accès de lecture descendante sur le contenu du workspace (Créateur, Admin, Invité)."""
    membre = _get_workspace_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_DESCENDANT_READ_ROLES:
        raise HTTPException(status_code=403, detail="Acces refuse au contenu du workspace")
    return membre


def _require_workspace_descendant_management_access(db: Session, workspace_id: str, current_user_id: str):
    """Donne un accès de gestion descendante sur le contenu du workspace (Créateur, Admin uniquement)."""
    membre = _get_workspace_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_DESCENDANT_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Acces refuse a la gestion du contenu du workspace")
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

        # Héritage depuis le workspace parent
        if liste.id_workspace:
            workspace_member = _get_active_workspace_membership(db, liste.id_workspace, user_id)
            if workspace_member:
                candidates.append((workspace_member.role, ResourceType.WORKSPACE, liste.id_workspace))

        # Héritage depuis l'espace parent et ses ancêtres
        parent_espace_id = liste.id_espace
        while parent_espace_id:
            parent_member = _get_espace_member_record(db, parent_espace_id, user_id)
            if parent_member and parent_member.statut == "Actif":
                candidates.append((parent_member.role, ResourceType.ESPACE, parent_espace_id))

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
                    candidates.append((workspace_member.role, ResourceType.WORKSPACE, parent_espace.id_workspace))
            
            parent_espace_id = parent_espace.id_espace_parent

    elif target_type == ResourceType.TACHE:
        tache = db.query(Tache).filter(Tache.id == target_id).first()
        if not tache:
            raise HTTPException(status_code=404, detail="Tache non trouvee.")

        liste_member = _get_liste_member_record(db, tache.id_liste, user_id)
        if liste_member and liste_member.statut == "Actif":
            candidates.append((liste_member.role, ResourceType.LISTE, tache.id_liste))

        liste = _get_liste_or_404(db, tache.id_liste)
        
        if liste.id_workspace:
            workspace_member = _get_active_workspace_membership(db, liste.id_workspace, user_id)
            if workspace_member:
                candidates.append((workspace_member.role, ResourceType.WORKSPACE, liste.id_workspace))

        parent_espace_id = liste.id_espace
        while parent_espace_id:
            parent_member = _get_espace_member_record(db, parent_espace_id, user_id)
            if parent_member and parent_member.statut == "Actif":
                candidates.append((parent_member.role, ResourceType.ESPACE, parent_espace_id))

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
                    candidates.append((workspace_member.role, ResourceType.WORKSPACE, parent_espace.id_workspace))
            
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
                f"Invitation non nécessaire : cette personne possède déjà le rôle "
                f"'{inherited_role}' hérité depuis un {source_type} parent. "
                f"Vous ne pouvez pas lui attribuer le rôle '{new_role}' sur cette ressource enfant, "
                "car ce rôle est inférieur ou équivalent à son rôle parent."
            ),
        )

    return inherited


# -----------------------------------------------
# Helpers d'accès — Espace
# -----------------------------------------------

def _get_all_descendant_espace_ids(db: Session, espace_id: str) -> list[str]:
    """Récupère récursivement tous les IDs des sous-espaces d'un espace donné."""
    all_ids = []
    
    def collect(parent_id: str):
        children = db.query(Espace.id).filter(Espace.id_espace_parent == parent_id).all()
        for child in children:
            all_ids.append(child.id)
            collect(child.id)
            
    collect(espace_id)
    return all_ids


def _get_all_descendant_lists(db: Session, espace_id: str) -> list[Liste]:
    """Récupère toutes les listes d'un espace et de sa descendance récursive."""
    espace_ids = [espace_id] + _get_all_descendant_espace_ids(db, espace_id)
    return db.query(Liste).filter(Liste.id_espace.in_(espace_ids)).all()


def _get_espace_or_404(db: Session, espace_id: str) -> Espace:
    espace = db.query(Espace).filter(Espace.id == espace_id).first()
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    return espace


def _require_espace_access(db: Session, espace_id: str, current_user_id: str):
    """Vérifie l'accès au contenu d'un espace."""
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


def _require_espace_descendant_management_access(db: Session, espace_id: str, current_user_id: str):
    """Vérifie l'accès de gestion descendante sur les enfants d'un espace (Créateur/Admin uniquement)."""
    espace = _get_espace_or_404(db, espace_id)

    espace_member = _get_espace_member_record(db, espace_id, current_user_id)
    if (
        espace_member
        and espace_member.statut == "Actif"
        and espace_member.role in ESPACE_DESCENDANT_MANAGEMENT_ROLES
    ):
        return espace_member

    try:
        workspace_member = _require_workspace_descendant_management_access(
            db, espace.id_workspace, current_user_id
        )
        if workspace_member:
            return workspace_member
    except HTTPException:
        pass

    ancestor_member = _get_active_ancestor_espace_manager(
        db, espace, current_user_id
    )
    if ancestor_member:
        return ancestor_member

    raise HTTPException(status_code=403, detail="Acces refuse a la gestion du contenu descendant de l'espace")


def _require_espace_management_access(db: Session, espace_id: str, current_user_id: str):
    """Vérifie l'accès de gestion à un espace."""
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


def _get_list_management_grant(
    db: Session,
    liste_id: str,
    current_user_id: str,
) -> tuple[Membre, str, str, str]:
    """Décrit l'origine du droit de gestion sur une liste."""
    liste = _get_liste_or_404(db, liste_id)

    # 1. Rôle direct sur la liste
    liste_member = _get_liste_member_record(db, liste_id, current_user_id)
    if (
        liste_member
        and liste_member.statut == "Actif"
        and liste_member.role in LISTE_MANAGEMENT_ROLES
    ):
        return liste_member, liste_member.role, ResourceType.LISTE, liste_id

    # 2. Héritage depuis l'espace parent (Créateur/Admin uniquement)
    if liste.id_espace:
        try:
            espace_member = _require_espace_descendant_management_access(
                db, liste.id_espace, current_user_id
            )
            return espace_member, espace_member.role, ResourceType.ESPACE, liste.id_espace
        except HTTPException:
            pass

    # 3. Héritage depuis le workspace parent (Créateur/Admin uniquement)
    if liste.id_workspace:
        try:
            workspace_member = _require_workspace_descendant_management_access(
                db, liste.id_workspace, current_user_id
            )
            return workspace_member, workspace_member.role, ResourceType.WORKSPACE, liste.id_workspace
        except HTTPException:
            pass

    raise HTTPException(status_code=403, detail="Privileges insuffisants pour gerer cette liste")


def _get_direct_list_management_grant(
    db: Session,
    liste_id: str,
    current_user_id: str,
) -> tuple[Membre, str, str, str]:
    liste_member = _get_liste_member_record(db, liste_id, current_user_id)
    if (
        liste_member
        and liste_member.statut == "Actif"
        and liste_member.role in LISTE_MANAGEMENT_ROLES
    ):
        return liste_member, liste_member.role, ResourceType.LISTE, liste_id

    raise HTTPException(
        status_code=403,
        detail="Privileges insuffisants pour gerer directement cette liste",
    )


def _get_inherited_list_management_grant(
    db: Session,
    liste_id: str,
    current_user_id: str,
) -> tuple[Membre, str, str, str]:
    liste = _get_liste_or_404(db, liste_id)

    if liste.id_espace:
        try:
            espace_member = _require_espace_descendant_management_access(
                db,
                liste.id_espace,
                current_user_id,
            )
            return espace_member, espace_member.role, ResourceType.ESPACE, liste.id_espace
        except HTTPException:
            pass

    if liste.id_workspace:
        try:
            workspace_member = _require_workspace_descendant_management_access(
                db,
                liste.id_workspace,
                current_user_id,
            )
            return workspace_member, workspace_member.role, ResourceType.WORKSPACE, liste.id_workspace
        except HTTPException:
            pass

    raise HTTPException(
        status_code=403,
        detail="Privileges insuffisants par heritage pour gerer cette liste",
    )


def _require_list_management_access(db: Session, liste_id: str, current_user_id: str):
    """Vérifie l'accès de gestion d'une liste (Créateur ou Admin uniquement)."""
    actor_member, _, _, _ = _get_list_management_grant(db, liste_id, current_user_id)
    return actor_member


def _require_list_read_access(db: Session, liste_id: str, current_user_id: str):
    """Vérifie l'accès en lecture à une liste."""
    liste = _get_liste_or_404(db, liste_id)

    # 1. Rôle direct sur la liste
    liste_member = _get_liste_member_record(db, liste_id, current_user_id)
    if liste_member and liste_member.statut == "Actif" and liste_member.role in LISTE_READ_ROLES:
        return liste_member

    # 2. Héritage depuis l'espace parent (lecture)
    if liste.id_espace:
        try:
            espace_member = _require_espace_descendant_read_access(
                db, liste.id_espace, current_user_id
            )
            return espace_member
        except HTTPException:
            pass

    # 3. Héritage depuis le workspace parent (lecture)
    if liste.id_workspace:
        try:
            workspace_member = _require_workspace_descendant_read_access(
                db, liste.id_workspace, current_user_id
            )
            return workspace_member
        except HTTPException:
            pass

    raise HTTPException(status_code=403, detail="Acces non autorise a cette liste")


# 🔧 Alias pour compatibilité
_require_list_access = _require_list_read_access


def _member_has_assigned_task_in_list(db: Session, *, liste_id: str, user_id: str) -> bool:
    return (
        db.query(Membre.id)
        .join(Tache, Membre.id_tache == Tache.id)
        .filter(
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif",
            Membre.id_tache.isnot(None),
            Tache.id_liste == liste_id,
        )
        .first()
        is not None
    )


def _require_list_operational_contribution_access(db: Session, liste_id: str, current_user_id: str):
    """
    Autorise une action contributive sur une liste :
    - Créateur/Admin directs ou hérités : autorisés ;
    - Membre direct : autorisé seulement s'il a au moins une tâche assignée ;
    - Invité direct ou hérité : lecture seule.
    """
    direct_member = _get_liste_member_record(db, liste_id, current_user_id)
    if direct_member and direct_member.statut == "Actif":
        if direct_member.role in LISTE_MANAGEMENT_ROLES:
            return direct_member
        if direct_member.role == LISTE_MEMBER_ROLE:
            if _member_has_assigned_task_in_list(db, liste_id=liste_id, user_id=current_user_id):
                return direct_member
            raise HTTPException(
                status_code=403,
                detail="Un membre de liste doit avoir au moins une tache assignee pour effectuer cette action.",
            )
        raise HTTPException(
            status_code=403,
            detail="Un invite de liste dispose uniquement d'un acces en lecture.",
        )

    try:
        actor_member, _, _, _ = _get_list_management_grant(db, liste_id, current_user_id)
        return actor_member
    except HTTPException as exc:
        raise HTTPException(
            status_code=403,
            detail="Seuls les gestionnaires ou les membres avec au moins une tache assignee peuvent effectuer cette action.",
        ) from exc


def _require_list_admin_access(db: Session, liste_id: str, current_user_id: str):
    """Vérifie l'accès de gestion de la liste elle-même."""
    actor_member, _, _, _ = _get_list_management_grant(db, liste_id, current_user_id)
    return actor_member


def _get_list_member_management_grant(
    db: Session,
    liste_id: str,
    current_user_id: str,
) -> tuple[Membre, str, str, str]:
    """Décrit l'origine du droit de gestion des membres d'une liste."""
    return _get_list_management_grant(db, liste_id, current_user_id)


def _validate_list_member_management_permissions(
    *,
    liste_id: str,
    actor_role: str,
    actor_source_type: str,
    actor_source_id: str,
    target_member: Membre | None,
    new_role: str | None = None,
) -> None:
    """Valide les permissions de gestion des membres d'une liste."""

    # Ajout d'un nouveau membre (target_member None)
    if target_member is None:
        if actor_role not in LISTE_MANAGEMENT_ROLES:
            raise HTTPException(
                status_code=403,
                detail="Permissions insuffisantes pour ajouter un membre."
            )
        if actor_role == LISTE_ADMIN_ROLE and actor_source_type == ResourceType.LISTE and actor_source_id == liste_id:
            raise HTTPException(
                status_code=403,
                detail="Un administrateur direct de la liste ne peut pas ajouter de membres. Seul le créateur peut le faire."
            )
        return

    # RÈGLE 1 : Le Créateur de la liste ne peut pas être modifié ou retiré
    if target_member.role == LISTE_OWNER_ROLE:
        is_creator_parent = (
            actor_role == LISTE_OWNER_ROLE
            and (
                actor_source_type == ResourceType.WORKSPACE
                or actor_source_type == ResourceType.ESPACE
                or actor_source_id != liste_id
            )
        )
        if not is_creator_parent:
            raise HTTPException(
                status_code=403,
                detail="Le créateur de la liste ne peut pas être modifié ou retiré.",
            )

    # RÈGLE 2 : Un administrateur direct d'une liste ne peut modifier AUCUN membre
    if actor_role == LISTE_ADMIN_ROLE and actor_source_type == ResourceType.LISTE and actor_source_id == liste_id:
        raise HTTPException(
            status_code=403,
            detail="Un administrateur direct de la liste ne peut pas modifier les membres de cette liste. Seul le créateur peut le faire.",
        )

    # RÈGLE 3 : Un administrateur par héritage (workspace ou espace parent) 
    # peut modifier des membres, mais avec des restrictions spécifiques
    if actor_role == LISTE_ADMIN_ROLE:
        if actor_source_type != ResourceType.LISTE or actor_source_id != liste_id:
            if new_role and new_role != target_member.role:
                if _get_role_rank(new_role) > _get_role_rank(target_member.role):
                    return
                else:
                    raise HTTPException(
                        status_code=403,
                        detail="Un administrateur par héritage ne peut que promouvoir un membre, pas le rétrograder.",
                    )
            return

    # RÈGLE 4 : Le Créateur direct peut tout modifier (sauf se modifier lui-même)
    if actor_role == LISTE_OWNER_ROLE:
        if target_member.role == LISTE_OWNER_ROLE:
            raise HTTPException(
                status_code=403,
                detail="Le créateur ne peut pas modifier son propre rôle.",
            )
        return

    # RÈGLE 5 : Seul un manager (Admin par héritage ou Créateur) peut accéder à cette fonction
    if actor_role not in LISTE_MANAGEMENT_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Permissions insuffisantes pour gérer les membres de cette liste.",
        )


def _validate_liste_invitation_permissions(
    *,
    liste_id: str,
    actor_role: str,
    actor_source_type: str,
    actor_source_id: str,
    invited_role: str,
) -> None:
    """Valide les permissions d'invitation dans une liste."""

    if actor_role not in LISTE_MANAGEMENT_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Seul un administrateur ou le créateur peut inviter des membres.",
        )

    if actor_role == LISTE_ADMIN_ROLE:
        is_direct_admin = (actor_source_type == ResourceType.LISTE and actor_source_id == liste_id)
        
        if is_direct_admin:
            if invited_role not in {LISTE_MEMBER_ROLE, LISTE_GUEST_ROLE}:
                raise HTTPException(
                    status_code=403,
                    detail="Un administrateur direct de la liste ne peut inviter qu'avec les rôles 'Membre' ou 'Invité'. L'invitation avec le rôle 'Administrateur' est réservée au créateur.",
                )
        else:
            if invited_role not in {LISTE_GUEST_ROLE, LISTE_MEMBER_ROLE, LISTE_ADMIN_ROLE}:
                raise HTTPException(
                    status_code=403,
                    detail=f"Rôle '{invited_role}' non autorisé pour cette invitation.",
                )


def _require_liste_invitation_access(
    db: Session,
    liste_id: str,
    current_user_id: str,
    invited_role: str,
) -> tuple[Membre, str, str, str]:
    """Vérifie l'accès d'invitation à une liste."""
    liste = _get_liste_or_404(db, liste_id)
    actor_member, actor_role, actor_source_type, actor_source_id = _get_list_management_grant(
        db,
        liste_id,
        current_user_id,
    )
    
    _validate_liste_invitation_permissions(
        liste_id=liste_id,
        actor_role=actor_role,
        actor_source_type=actor_source_type,
        actor_source_id=actor_source_id,
        invited_role=invited_role,
    )
    return actor_member, actor_role


def _require_list_member_management_access(db: Session, liste_id: str, current_user_id: str):
    """Vérifie l'accès de gestion des membres d'une liste."""
    actor_member, _, _, _ = _get_list_member_management_grant(db, liste_id, current_user_id)
    return actor_member


def _require_list_delete_access(db: Session, liste_id: str, current_user_id: str):
    """Vérifie l'accès de suppression d'une liste."""
    actor_member, actor_role, source_type, source_id = _get_list_management_grant(
        db,
        liste_id,
        current_user_id,
    )

    if (
        actor_role == LISTE_ADMIN_ROLE
        and source_type == ResourceType.LISTE
        and source_id == liste_id
    ):
        try:
            inherited_member, _, _, _ = _get_inherited_list_management_grant(
                db,
                liste_id,
                current_user_id,
            )
            return inherited_member
        except HTTPException:
            pass

        raise HTTPException(
            status_code=403,
            detail="Un administrateur ne peut pas supprimer la liste racine de son perimetre.",
        )

    return actor_member


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


def _get_active_task_assignment(db: Session, tache_id: str, current_user_id: str) -> Membre | None:
    direct_assignment = (
        db.query(Membre)
        .filter(
            Membre.id_tache == tache_id,
            Membre.id_utilisateur == current_user_id,
            Membre.statut == "Actif",
        )
        .first()
    )
    if direct_assignment:
        return direct_assignment

    current_tache = db.query(Tache).filter(Tache.id == tache_id).first()
    parent_id = current_tache.id_tache_parent if current_tache else None
    visited: set[str] = set()

    while parent_id and parent_id not in visited:
        visited.add(parent_id)
        parent_assignment = (
            db.query(Membre)
            .filter(
                Membre.id_tache == parent_id,
                Membre.id_utilisateur == current_user_id,
                Membre.statut == "Actif",
            )
            .first()
        )
        if parent_assignment:
            return parent_assignment

        parent_tache = db.query(Tache).filter(Tache.id == parent_id).first()
        parent_id = parent_tache.id_tache_parent if parent_tache else None

    return None


def _require_task_access(db: Session, tache_id: str, current_user_id: str):
    """Vérifie l'accès opérationnel à une tâche."""
    tache = _get_tache_or_404(db, tache_id)
    liste = _get_liste_or_404(db, tache.id_liste)
    
    try:
        return _require_list_read_access(db, liste.id, current_user_id)
    except HTTPException:
        pass
    
    raise HTTPException(status_code=403, detail="Acces non autorise a cette tache")


def _require_task_management_access(db: Session, tache_id: str, current_user_id: str):
    """
    Vérifie l'accès de gestion d'une tâche.
    - Créateur/Admin de la liste, du workspace ou d'un espace parent : peuvent gérer toutes les tâches
    - Membre direct de liste : lecture seule, même sur les tâches assignées
    """
    tache = _get_tache_or_404(db, tache_id)
    liste = _get_liste_or_404(db, tache.id_liste)

    try:
        _get_list_management_grant(db, liste.id, current_user_id)
        return True
    except HTTPException:
        pass
    
    raise HTTPException(status_code=403, detail="Acces non autorise a cette tache")


def _require_assigned_task_operational_access(db: Session, tache_id: str, current_user_id: str):
    """
    Donne un accès opérationnel limité à la tâche :
    - Créateur/Admin de la liste ou parent : accès opérationnel accepté ;
    - Membre assigné à la tâche ou à une tâche parente : peut suivre l'exécution
      de toute la branche, créer des sous-tâches/checklists, cocher les checklists
      et joindre des fichiers, sans obtenir les droits de suppression ni d'assignation.
    """
    tache = _get_tache_or_404(db, tache_id)

    try:
        _get_list_management_grant(db, tache.id_liste, current_user_id)
        return True
    except HTTPException:
        pass

    if _get_active_task_assignment(db, tache_id, current_user_id):
        return True

    raise HTTPException(status_code=403, detail="Acces non autorise a cette tache")


def _require_task_read_access(db: Session, tache_id: str, current_user_id: str):
    """Vérifie l'accès en lecture à une tâche."""
    tache = _get_tache_or_404(db, tache_id)
    return _require_list_read_access(db, tache.id_liste, current_user_id)


def commit_or_raise(
    db: Session,
    *,
    detail: str,
    status_code: int = 409,
    refresh_instance: Any | None = None,
) -> None:
    try:
        db.commit()
        if refresh_instance is not None:
            db.refresh(refresh_instance)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status_code, detail=f"{detail} Error: {str(exc.orig)}") from exc


# -----------------------------------------------
# Sérialiseurs
# -----------------------------------------------

def _serialize_member(membre):
    """Sérialise un membre pour les réponses API."""
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
                "photo_base64": base64.b64encode(utilisateur.photo).decode("ascii") if utilisateur and utilisateur.photo else None,
            }
            if utilisateur
            else None
        ),
    }


def _require_workspace_read_access(db: Session, workspace_id: str, current_user_id: str):
    """Donne l'accès complet au workspace uniquement aux membres directs actifs."""
    return _get_workspace_member_or_403(db, workspace_id, current_user_id)


def _get_canevas_or_404(db: Session, canevas_id: str) -> Canevas:
    canevas = db.query(Canevas).filter(Canevas.id == canevas_id).first()
    if not canevas:
        raise HTTPException(status_code=404, detail="Canevas non trouve")
    return canevas


def _get_section_or_404(db: Session, section_id: str) -> Section:
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section non trouvee")
    return section


def _get_checklist_or_404(db: Session, checklist_id: str) -> Checklist:
    checklist = db.query(Checklist).filter(Checklist.id == checklist_id).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist non trouvee")
    return checklist


def _get_fichier_or_404(db: Session, file_id: str) -> Fichier:
    fichier = db.query(Fichier).filter(Fichier.id == file_id).first()
    if not fichier:
        raise HTTPException(status_code=404, detail="Fichier non trouve")
    return fichier


def _require_canevas_access(db: Session, canevas_id: str, current_user_id: str):
    canevas = _get_canevas_or_404(db, canevas_id)
    return _require_list_access(db, canevas.id_liste, current_user_id)


def _require_canevas_read_access(db: Session, canevas_id: str, current_user_id: str):
    canevas = _get_canevas_or_404(db, canevas_id)
    return _require_list_read_access(db, canevas.id_liste, current_user_id)


def _require_section_access(db: Session, section_id: str, current_user_id: str):
    section = _get_section_or_404(db, section_id)
    canevas = _get_canevas_or_404(db, section.id_canevas)
    return _require_list_access(db, canevas.id_liste, current_user_id)


def _require_section_read_access(db: Session, section_id: str, current_user_id: str):
    section = _get_section_or_404(db, section_id)
    canevas = _get_canevas_or_404(db, section.id_canevas)
    return _require_list_read_access(db, canevas.id_liste, current_user_id)


def _require_checklist_access(db: Session, checklist_id: str, current_user_id: str):
    checklist = _get_checklist_or_404(db, checklist_id)
    if checklist.id_tache:
        return _require_task_management_access(db, checklist.id_tache, current_user_id)
    if checklist.id_section:
        return _require_section_access(db, checklist.id_section, current_user_id)
    raise HTTPException(status_code=403, detail="Checklist orpheline ou acces refuse")


def _require_checklist_read_access(db: Session, checklist_id: str, current_user_id: str):
    checklist = _get_checklist_or_404(db, checklist_id)
    if checklist.id_tache:
        return _require_task_read_access(db, checklist.id_tache, current_user_id)
    if checklist.id_section:
        return _require_section_read_access(db, checklist.id_section, current_user_id)
    raise HTTPException(status_code=403, detail="Checklist orpheline ou acces refuse")


def _get_direct_target_membership(
    db: Session,
    user_id: str,
    target_type: str,
    target_id: str,
) -> Membre | None:
    filters = {
        ResourceType.WORKSPACE: Membre.id_workspace == target_id,
        ResourceType.ESPACE: Membre.id_espace == target_id,
        ResourceType.LISTE: Membre.id_liste == target_id,
        ResourceType.TACHE: Membre.id_tache == target_id,
    }
    membership_filter = filters.get(target_type)
    if membership_filter is None:
        return None
    return (
        db.query(Membre)
        .filter(
            membership_filter,
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif",
        )
        .first()
    )


def _resolve_resource_hierarchy(db: Session, resource_type: str, resource_id: str) -> dict[str, Any]:
    if resource_type == ResourceType.WORKSPACE:
        workspace = _get_workspace_or_404(db, resource_id)
        return {
            "resource_type": resource_type,
            "resource_id": workspace.id,
            "workspace_id": workspace.id,
            "espace_ids": [],
            "liste_id": None,
            "tache_id": None,
            "canevas_id": None,
            "section_id": None,
        }

    if resource_type == ResourceType.ESPACE:
        espace = _get_espace_or_404(db, resource_id)
        espace_ids = [espace.id]
        parent_id = espace.id_espace_parent
        while parent_id:
            parent = _get_espace_or_404(db, parent_id)
            espace_ids.append(parent.id)
            parent_id = parent.id_espace_parent
        return {
            "resource_type": resource_type,
            "resource_id": espace.id,
            "workspace_id": espace.id_workspace,
            "espace_ids": espace_ids,
            "liste_id": None,
            "tache_id": None,
            "canevas_id": None,
            "section_id": None,
        }

    if resource_type == ResourceType.LISTE:
        liste = _get_liste_or_404(db, resource_id)
        espace_ids: list[str] = []
        workspace_id = liste.id_workspace
        if liste.id_espace:
            espace_hierarchy = _resolve_resource_hierarchy(db, ResourceType.ESPACE, liste.id_espace)
            espace_ids = espace_hierarchy["espace_ids"]
            workspace_id = espace_hierarchy["workspace_id"]
        return {
            "resource_type": resource_type,
            "resource_id": liste.id,
            "workspace_id": workspace_id,
            "espace_ids": espace_ids,
            "liste_id": liste.id,
            "tache_id": None,
            "canevas_id": None,
            "section_id": None,
        }

    if resource_type == ResourceType.TACHE:
        tache = _get_tache_or_404(db, resource_id)
        hierarchy = _resolve_resource_hierarchy(db, ResourceType.LISTE, tache.id_liste)
        hierarchy["resource_type"] = resource_type
        hierarchy["resource_id"] = tache.id
        hierarchy["tache_id"] = tache.id
        return hierarchy

    if resource_type == ResourceType.CANEVAS:
        canevas = _get_canevas_or_404(db, resource_id)
        hierarchy = _resolve_resource_hierarchy(db, ResourceType.LISTE, canevas.id_liste)
        hierarchy["resource_type"] = resource_type
        hierarchy["resource_id"] = canevas.id
        hierarchy["canevas_id"] = canevas.id
        return hierarchy

    if resource_type == ResourceType.SECTION:
        section = _get_section_or_404(db, resource_id)
        canevas = _get_canevas_or_404(db, section.id_canevas)
        hierarchy = _resolve_resource_hierarchy(db, ResourceType.LISTE, canevas.id_liste)
        hierarchy["resource_type"] = resource_type
        hierarchy["resource_id"] = section.id
        hierarchy["canevas_id"] = canevas.id
        hierarchy["section_id"] = section.id
        return hierarchy

    if resource_type == ResourceType.CHECKLIST:
        checklist = _get_checklist_or_404(db, resource_id)
        if checklist.id_tache:
            hierarchy = _resolve_resource_hierarchy(db, ResourceType.TACHE, checklist.id_tache)
        elif checklist.id_section:
            hierarchy = _resolve_resource_hierarchy(db, ResourceType.SECTION, checklist.id_section)
        else:
            raise HTTPException(status_code=404, detail="Checklist orpheline")
        hierarchy["resource_type"] = resource_type
        hierarchy["resource_id"] = checklist.id
        return hierarchy

    raise HTTPException(status_code=400, detail="Type de ressource non supporte")


def _is_resource_within_scope(
    db: Session,
    *,
    target_type: str,
    target_id: str,
    scope_type: str,
    scope_id: str,
) -> bool:
    target_hierarchy = _resolve_resource_hierarchy(db, target_type, target_id)
    if scope_type == ResourceType.WORKSPACE:
        return target_hierarchy["workspace_id"] == scope_id
    if scope_type == ResourceType.ESPACE:
        return scope_id in target_hierarchy["espace_ids"]
    if scope_type == ResourceType.LISTE:
        return target_hierarchy["liste_id"] == scope_id
    if scope_type == ResourceType.TACHE:
        return target_hierarchy["tache_id"] == scope_id
    if scope_type == ResourceType.CANEVAS:
        return target_hierarchy["canevas_id"] == scope_id
    if scope_type == ResourceType.SECTION:
        return target_hierarchy["section_id"] == scope_id
    if scope_type == ResourceType.CHECKLIST:
        return target_type == ResourceType.CHECKLIST and target_id == scope_id
    return False


def _resolve_file_target_context(
    db: Session,
    target_type: str,
    target_id: str,
) -> dict[str, Any]:
    if target_type == ResourceType.WORKSPACE:
        _get_workspace_or_404(db, target_id)
        return {"target_type": target_type, "target_id": target_id, "anchor_type": ResourceType.WORKSPACE, "anchor_id": target_id}
    if target_type == ResourceType.ESPACE:
        _get_espace_or_404(db, target_id)
        return {"target_type": target_type, "target_id": target_id, "anchor_type": ResourceType.ESPACE, "anchor_id": target_id}
    if target_type == ResourceType.LISTE:
        _get_liste_or_404(db, target_id)
        return {"target_type": target_type, "target_id": target_id, "anchor_type": ResourceType.LISTE, "anchor_id": target_id}
    if target_type == ResourceType.TACHE:
        _get_tache_or_404(db, target_id)
        return {"target_type": target_type, "target_id": target_id, "anchor_type": ResourceType.TACHE, "anchor_id": target_id}
    if target_type == ResourceType.CANEVAS:
        canevas = _get_canevas_or_404(db, target_id)
        return {"target_type": target_type, "target_id": target_id, "anchor_type": ResourceType.LISTE, "anchor_id": canevas.id_liste}
    if target_type == ResourceType.SECTION:
        section = _get_section_or_404(db, target_id)
        canevas = _get_canevas_or_404(db, section.id_canevas)
        return {"target_type": target_type, "target_id": target_id, "anchor_type": ResourceType.LISTE, "anchor_id": canevas.id_liste}
    if target_type == ResourceType.CHECKLIST:
        checklist = _get_checklist_or_404(db, target_id)
        if checklist.id_tache:
            return {"target_type": target_type, "target_id": target_id, "anchor_type": ResourceType.TACHE, "anchor_id": checklist.id_tache}
        if checklist.id_section:
            section = _get_section_or_404(db, checklist.id_section)
            canevas = _get_canevas_or_404(db, section.id_canevas)
            return {"target_type": target_type, "target_id": target_id, "anchor_type": ResourceType.LISTE, "anchor_id": canevas.id_liste}
        raise HTTPException(status_code=404, detail="Checklist orpheline")
    raise HTTPException(status_code=400, detail="Type de cible de fichier invalide")


def _require_attachment_target_read_access(
    db: Session,
    target_type: str,
    target_id: str,
    current_user_id: str,
):
    if target_type == ResourceType.WORKSPACE:
        return _require_workspace_descendant_read_access(db, target_id, current_user_id)
    if target_type == ResourceType.ESPACE:
        return _require_espace_read_access(db, target_id, current_user_id)
    if target_type == ResourceType.LISTE:
        return _require_list_read_access(db, target_id, current_user_id)
    if target_type == ResourceType.TACHE:
        return _require_task_read_access(db, target_id, current_user_id)
    if target_type == ResourceType.CANEVAS:
        return _require_canevas_read_access(db, target_id, current_user_id)
    if target_type == ResourceType.SECTION:
        return _require_section_read_access(db, target_id, current_user_id)
    if target_type == ResourceType.CHECKLIST:
        return _require_checklist_read_access(db, target_id, current_user_id)
    raise HTTPException(status_code=400, detail="Type de cible de fichier invalide")


def _require_attachment_target_write_access(
    db: Session,
    target_type: str,
    target_id: str,
    current_user_id: str,
):
    if target_type == ResourceType.WORKSPACE:
        return _require_workspace_descendant_management_access(db, target_id, current_user_id)
    if target_type == ResourceType.ESPACE:
        return _require_espace_management_access(db, target_id, current_user_id)
    if target_type == ResourceType.LISTE:
        return _require_list_management_access(db, target_id, current_user_id)
    if target_type == ResourceType.TACHE:
        return _require_assigned_task_operational_access(db, target_id, current_user_id)
    if target_type == ResourceType.CANEVAS:
        return _require_canevas_access(db, target_id, current_user_id)
    if target_type == ResourceType.SECTION:
        return _require_section_access(db, target_id, current_user_id)
    if target_type == ResourceType.CHECKLIST:
        return _require_checklist_access(db, target_id, current_user_id)
    raise HTTPException(status_code=400, detail="Type de cible de fichier invalide")


def _require_attachment_target_management_access(
    db: Session,
    target_type: str,
    target_id: str,
    current_user_id: str,
):
    if target_type == ResourceType.WORKSPACE:
        return _require_workspace_descendant_management_access(db, target_id, current_user_id)
    if target_type == ResourceType.ESPACE:
        return _require_espace_management_access(db, target_id, current_user_id)
    if target_type == ResourceType.LISTE:
        return _require_list_management_access(db, target_id, current_user_id)
    if target_type == ResourceType.TACHE:
        return _require_task_management_access(db, target_id, current_user_id)
    if target_type in {ResourceType.CANEVAS, ResourceType.SECTION, ResourceType.CHECKLIST}:
        return _require_attachment_target_write_access(db, target_type, target_id, current_user_id)
    
    raise HTTPException(status_code=400, detail="Type de cible de fichier invalide pour la gestion")


def _extract_file_target(file: Fichier) -> tuple[str | None, str | None]:
    if not file.meta_donnees:
        return None, None
    target_type = file.meta_donnees.get("target_type")
    target_id = file.meta_donnees.get("target_id")
    if target_type and target_id:
        return str(target_type), str(target_id)
    return None, None


def _require_file_read_access(db: Session, file_id: str, current_user_id: str):
    fichier = _get_fichier_or_404(db, file_id)
    target_type, target_id = _extract_file_target(fichier)
    if not target_type or not target_id:
        raise HTTPException(status_code=403, detail="Ce fichier n'est pas correctement rattache a une ressource.")
    _require_attachment_target_read_access(db, target_type, target_id, current_user_id)
    return fichier


def _require_file_management_access(db: Session, file_id: str, current_user_id: str):
    fichier = _get_fichier_or_404(db, file_id)
    target_type, target_id = _extract_file_target(fichier)
    if not target_type or not target_id:
        raise HTTPException(status_code=403, detail="Ce fichier n'est pas correctement rattache a une ressource.")

    owner_user_id = (fichier.meta_donnees or {}).get("owner_user_id")
    if owner_user_id == current_user_id:
        return fichier
    if fichier.membres and fichier.membres.id_utilisateur == current_user_id:
        return fichier

    _require_attachment_target_management_access(db, target_type, target_id, current_user_id)
    return fichier


def _get_member_or_404(db: Session, member_id: str) -> Membre:
    membre = db.query(Membre).filter(Membre.id == member_id).first()
    if not membre:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    return membre


def _get_member_scope_liste_id(db: Session, membre: Membre) -> str:
    if membre.id_liste:
        return membre.id_liste
    if membre.id_tache:
        return _get_tache_or_404(db, membre.id_tache).id_liste
    raise HTTPException(
        status_code=400,
        detail="Ce membre n'est pas rattache a une liste exploitable pour cette operation.",
    )


def _require_member_read_access(db: Session, member_id: str, current_user_id: str):
    membre = _get_member_or_404(db, member_id)
    liste_id = _get_member_scope_liste_id(db, membre)
    _require_list_read_access(db, liste_id, current_user_id)
    return membre


def _require_member_management_access(db: Session, member_id: str, current_user_id: str):
    membre = _get_member_or_404(db, member_id)
    liste_id = _get_member_scope_liste_id(db, membre)
    _get_list_management_grant(db, liste_id, current_user_id)
    return membre


def _require_member_self_or_management_access(db: Session, member_id: str, current_user_id: str):
    membre = _get_member_or_404(db, member_id)
    if membre.id_utilisateur == current_user_id:
        _require_member_read_access(db, member_id, current_user_id)
        return membre
    return _require_member_management_access(db, member_id, current_user_id)


def _member_is_direct_list_manager(membre: Membre) -> bool:
    return bool(membre.id_liste and membre.role in LISTE_MANAGEMENT_ROLES)


def _direct_list_has_admin(db: Session, liste_id: str) -> bool:
    return db.query(Membre.id).filter(
        Membre.id_liste == liste_id,
        Membre.statut == "Actif",
        Membre.role == LISTE_ADMIN_ROLE,
    ).first() is not None


def _require_direct_list_admin_grant(db: Session, liste_id: str, current_user_id: str) -> Membre:
    membre = _get_liste_member_record(db, liste_id, current_user_id)
    if membre and membre.statut == "Actif" and membre.role == LISTE_ADMIN_ROLE:
        return membre
    raise HTTPException(status_code=403, detail="Cette action est reservee aux administrateurs directs de la liste.")


def _require_direct_list_creator_grant(db: Session, liste_id: str, current_user_id: str) -> Membre:
    membre = _get_liste_member_record(db, liste_id, current_user_id)
    if membre and membre.statut == "Actif" and membre.role == LISTE_OWNER_ROLE:
        return membre
    raise HTTPException(status_code=403, detail="Cette action est reservee au createur direct de la liste.")


def _require_direct_espace_admin_grant(db: Session, espace_id: str, current_user_id: str) -> Membre:
    membre = _get_espace_member_record(db, espace_id, current_user_id)
    if membre and membre.statut == "Actif" and membre.role == ESPACE_ADMIN_ROLE:
        return membre
    raise HTTPException(status_code=403, detail="Cette action est reservee aux administrateurs directs de l'espace.")


def _get_direct_espace_creator_record(db: Session, espace_id: str, user_id: str) -> Membre | None:
    membre = _get_espace_member_record(db, espace_id, user_id)
    if membre and membre.statut == "Actif" and membre.role == ESPACE_OWNER_ROLE:
        return membre
    return None


def _require_direct_espace_creator_grant(db: Session, espace_id: str, current_user_id: str) -> Membre:
    membre = _get_direct_espace_creator_record(db, espace_id, current_user_id)
    if membre:
        return membre
    raise HTTPException(status_code=403, detail="Ce rapport est reserve au createur direct de l'espace.")


def _require_workspace_creator_grant(db: Session, workspace_id: str, current_user_id: str) -> Membre:
    membre = _get_active_workspace_membership(db, workspace_id, current_user_id)
    if membre and membre.statut == "Actif" and membre.role == WORKSPACE_OWNER_ROLE:
        return membre
    raise HTTPException(status_code=403, detail="Ce rapport est reserve au createur du workspace.")


def _require_direct_workspace_admin_grant(db: Session, workspace_id: str, current_user_id: str) -> Membre:
    membre = _get_active_workspace_membership(db, workspace_id, current_user_id)
    if membre and membre.statut == "Actif" and membre.role == WORKSPACE_ADMIN_ROLE:
        return membre
    raise HTTPException(status_code=403, detail="Cette action est reservee aux administrateurs directs du workspace.")


def _report_scope_and_author(db: Session, rapport: Rapport) -> tuple[str, str, str | None, str | None]:
    membre = _get_member_or_404(db, rapport.id_membre) if rapport.id_membre else None
    liste_id = getattr(rapport, "id_liste", None) or (membre.id_liste if membre else None)
    espace_id = getattr(rapport, "id_espace", None) or (membre.id_espace if membre else None)
    workspace_id = getattr(rapport, "id_workspace", None) or (membre.id_workspace if membre else None)
    author_role = getattr(rapport, "author_role", None) or (membre.role if membre else None)
    owner_user_id = getattr(rapport, "owner_user_id", None) or (membre.id_utilisateur if membre else None)

    if liste_id:
        return ResourceType.LISTE, liste_id, author_role, owner_user_id
    if espace_id:
        return ResourceType.ESPACE, espace_id, author_role, owner_user_id
    if workspace_id:
        return ResourceType.WORKSPACE, workspace_id, author_role, owner_user_id

    raise HTTPException(status_code=403, detail="Ce rapport n'est plus rattache a une ressource accessible.")


def _require_report_workflow_read_access(db: Session, rapport: Rapport, current_user_id: str):
    """
    Circuit rapports :
    - l'auteur voit toujours son rapport ;
    - rapports des membres directs de liste : administrateurs directs de la liste ;
      s'il n'y a aucun administrateur direct, le createur direct de la liste reçoit ;
    - rapports des administrateurs directs de liste : createur direct de la liste ;
    - rapports d'espace/workspace : createur direct de la ressource uniquement.
    """
    scope_type, scope_id, author_role, owner_user_id = _report_scope_and_author(db, rapport)
    if owner_user_id == current_user_id:
        if scope_type == ResourceType.LISTE:
            _require_list_read_access(db, scope_id, current_user_id)
        elif scope_type == ResourceType.ESPACE:
            _require_espace_read_access(db, scope_id, current_user_id)
        elif scope_type == ResourceType.WORKSPACE:
            _require_workspace_read_access(db, scope_id, current_user_id)
        return _get_member_or_404(db, rapport.id_membre) if rapport.id_membre else None

    if scope_type == ResourceType.LISTE:
        if author_role == LISTE_MEMBER_ROLE:
            if _direct_list_has_admin(db, scope_id):
                return _require_direct_list_admin_grant(db, scope_id, current_user_id)
            return _require_direct_list_creator_grant(db, scope_id, current_user_id)

        if author_role == LISTE_ADMIN_ROLE:
            return _require_direct_list_creator_grant(db, scope_id, current_user_id)

    if scope_type == ResourceType.ESPACE and author_role == ESPACE_ADMIN_ROLE:
        return _require_direct_espace_creator_grant(db, scope_id, current_user_id)

    if scope_type == ResourceType.WORKSPACE and author_role == WORKSPACE_ADMIN_ROLE:
        return _require_workspace_creator_grant(db, scope_id, current_user_id)

    raise HTTPException(status_code=403, detail="Vous n'avez pas acces a ce rapport.")


def _require_member_workflow_read_access(db: Session, member_id: str, current_user_id: str):
    """
    Accès lecture pour absences/congés :
    - l'auteur voit toujours son propre historique ;
    - les demandes d'un membre direct de liste vont aux admins directs ;
      s'il n'y a aucun admin direct, elles vont au créateur direct ;
    - les demandes d'un administrateur direct de liste vont au créateur direct ;
    - pour un espace : même logique ;
    - pour un workspace : les administrateurs voient les demandes des membres,
      le créateur voit les demandes des administrateurs ;
    - le créateur direct ne crée pas de demande dans sa propre ressource.
    """
    membre = _get_member_or_404(db, member_id)

    # Demande de l'utilisateur lui-même
    if membre.id_utilisateur == current_user_id:
        if membre.id_liste or membre.id_tache:
            _require_member_read_access(db, member_id, current_user_id)
        elif membre.id_espace:
            _require_espace_read_access(db, membre.id_espace, current_user_id)
        elif membre.id_workspace:
            _require_workspace_read_access(db, membre.id_workspace, current_user_id)
        else:
            _require_member_read_access(db, member_id, current_user_id)
        return membre

    # --- LISTE ---
    if membre.id_liste and membre.role == LISTE_MEMBER_ROLE:
        liste_id = _get_member_scope_liste_id(db, membre)
        try:
            _require_direct_list_admin_grant(db, liste_id, current_user_id)
        except HTTPException:
            _require_direct_list_creator_grant(db, liste_id, current_user_id)
        return membre

    if membre.id_liste and membre.role == LISTE_ADMIN_ROLE:
        liste_id = _get_member_scope_liste_id(db, membre)
        _require_direct_list_creator_grant(db, liste_id, current_user_id)
        return membre

    if membre.id_liste and membre.role == LISTE_OWNER_ROLE:
        raise HTTPException(
            status_code=403,
            detail="Le createur direct de la liste ne fait pas de demande dans sa propre liste en V1.",
        )

    # --- ESPACE ---
    if membre.id_espace and membre.id_liste is None and membre.role == ESPACE_MEMBER_ROLE:
        try:
            _require_direct_espace_admin_grant(db, membre.id_espace, current_user_id)
        except HTTPException:
            _require_direct_espace_creator_grant(db, membre.id_espace, current_user_id)
        return membre

    if membre.id_espace and membre.id_liste is None and membre.role == ESPACE_ADMIN_ROLE:
        _require_direct_espace_creator_grant(db, membre.id_espace, current_user_id)
        return membre

    if membre.id_espace and membre.id_liste is None and membre.role == ESPACE_OWNER_ROLE:
        raise HTTPException(
            status_code=403,
            detail="Le createur direct de l'espace ne fait pas de demande dans son propre espace.",
        )

    # --- WORKSPACE ---
    if membre.id_workspace and membre.id_espace is None and membre.id_liste is None and membre.role == WORKSPACE_MEMBER_ROLE:
        # Un administrateur du workspace peut voir les demandes des membres
        try:
            _require_direct_workspace_admin_grant(db, membre.id_workspace, current_user_id)
        except HTTPException:
            # Si aucun admin direct, le créateur peut voir (mais en V1 seul l'admin direct est autorisé)
            # On applique la même règle que pour l'espace : le créateur ne voit que les admins, pas les membres
            # Donc ici, seul l'admin direct peut voir les demandes des membres
            raise HTTPException(status_code=403, detail="Seul un administrateur direct du workspace peut voir les demandes des membres.")
        return membre

    if membre.id_workspace and membre.id_espace is None and membre.id_liste is None and membre.role == WORKSPACE_ADMIN_ROLE:
        _require_workspace_creator_grant(db, membre.id_workspace, current_user_id)
        return membre

    if membre.id_workspace and membre.id_espace is None and membre.id_liste is None and membre.role == WORKSPACE_OWNER_ROLE:
        raise HTTPException(
            status_code=403,
            detail="Le createur direct du workspace ne fait pas de demande dans son propre workspace.",
        )

    raise HTTPException(status_code=403, detail="Vous n'avez pas acces a cette demande.")


def _require_member_workflow_evaluation_access(db: Session, member_id: str, current_user_id: str):
    """
    Accès décision/évaluation pour demandes :
    même routage que la lecture, mais l'auteur ne peut jamais évaluer sa propre demande.
    """
    membre = _get_member_or_404(db, member_id)
    if membre.id_utilisateur == current_user_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas evaluer votre propre demande.")

    return _require_member_workflow_read_access(db, member_id, current_user_id)


def _get_rapport_or_404(db: Session, rapport_id: str) -> Rapport:
    rapport = db.query(Rapport).filter(Rapport.id == rapport_id).first()
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouve")
    return rapport


def _get_absence_or_404(db: Session, absence_id: str) -> AbsenceEtConge:
    absence = db.query(AbsenceEtConge).filter(AbsenceEtConge.id == absence_id).first()
    if not absence:
        raise HTTPException(status_code=404, detail="Absence ou conge non trouve")
    return absence


def _require_report_read_access(db: Session, rapport_id: str, current_user_id: str):
    rapport = _get_rapport_or_404(db, rapport_id)
    membre = _require_report_workflow_read_access(db, rapport, current_user_id)
    return rapport, membre


def _require_report_management_access(db: Session, rapport_id: str, current_user_id: str):
    rapport = _get_rapport_or_404(db, rapport_id)
    scope_type, scope_id, author_role, owner_user_id = _report_scope_and_author(db, rapport)
    if owner_user_id == current_user_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas evaluer votre propre rapport.")

    if scope_type == ResourceType.LISTE:
        if author_role == LISTE_MEMBER_ROLE:
            if _direct_list_has_admin(db, scope_id):
                membre = _require_direct_list_admin_grant(db, scope_id, current_user_id)
            else:
                membre = _require_direct_list_creator_grant(db, scope_id, current_user_id)
        elif author_role == LISTE_ADMIN_ROLE:
            membre = _require_direct_list_creator_grant(db, scope_id, current_user_id)
        else:
            raise HTTPException(status_code=403, detail="Vous n'avez pas acces a ce rapport.")
        return rapport, membre

    if scope_type == ResourceType.ESPACE and author_role == ESPACE_ADMIN_ROLE:
        return rapport, _require_direct_espace_creator_grant(db, scope_id, current_user_id)

    if scope_type == ResourceType.WORKSPACE and author_role == WORKSPACE_ADMIN_ROLE:
        return rapport, _require_workspace_creator_grant(db, scope_id, current_user_id)

    raise HTTPException(status_code=403, detail="Vous n'avez pas acces a ce rapport.")


def _require_report_owner_or_management_access(
    db: Session,
    rapport_id: str,
    current_user_id: str,
):
    rapport = _get_rapport_or_404(db, rapport_id)
    membre = _get_member_or_404(db, rapport.id_membre) if rapport.id_membre else None
    owner_user_id = getattr(rapport, "owner_user_id", None) or (membre.id_utilisateur if membre else None)

    if owner_user_id == current_user_id:
        if membre:
            if membre.id_liste:
                _require_member_read_access(db, membre.id, current_user_id)
            elif membre.id_espace:
                _require_espace_read_access(db, membre.id_espace, current_user_id)
            elif membre.id_workspace:
                _require_workspace_read_access(db, membre.id_workspace, current_user_id)
        else:
            scope_type, scope_id, _, _ = _report_scope_and_author(db, rapport)
            if scope_type == ResourceType.LISTE:
                _require_list_read_access(db, scope_id, current_user_id)
            elif scope_type == ResourceType.ESPACE:
                _require_espace_read_access(db, scope_id, current_user_id)
            elif scope_type == ResourceType.WORKSPACE:
                _require_workspace_read_access(db, scope_id, current_user_id)
        return rapport, membre, "owner"

    _require_report_management_access(db, rapport_id, current_user_id)
    return rapport, membre, "manager"


def _require_absence_read_access(db: Session, absence_id: str, current_user_id: str):
    absence = _get_absence_or_404(db, absence_id)
    membre = _require_member_workflow_read_access(db, absence.id_membre, current_user_id)
    return absence, membre


def _require_absence_management_access(db: Session, absence_id: str, current_user_id: str):
    absence = _get_absence_or_404(db, absence_id)
    membre = _require_member_workflow_evaluation_access(db, absence.id_membre, current_user_id)
    return absence, membre


def _require_absence_self_or_management_access(db: Session, absence_id: str, current_user_id: str):
    absence = _get_absence_or_404(db, absence_id)
    membre = _get_member_or_404(db, absence.id_membre)
    if membre.id_utilisateur == current_user_id:
        if membre.id_liste or membre.id_tache:
            _require_member_read_access(db, membre.id, current_user_id)
        elif membre.id_espace:
            _require_espace_read_access(db, membre.id_espace, current_user_id)
        elif membre.id_workspace:
            _require_workspace_read_access(db, membre.id_workspace, current_user_id)
        return absence, membre, "owner"
    _require_member_workflow_evaluation_access(db, membre.id, current_user_id)
    return absence, membre, "manager"