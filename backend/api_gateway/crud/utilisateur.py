from typing import Optional, List
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from ..models import Membre, Motdepasseoublie, Utilisateur, Workspace
from ..core.function import commit_or_raise
from ..core.security import SECRET_KEY, ALGORITHM
from jose import jwt, JWTError


def _build_default_workspace_name(user_data: dict) -> str:
    username = user_data.get("username")
    if isinstance(username, str) and username.strip():
        return username.strip()[:100]
    return "utilisateur"


def create_utilisateur(db: Session, user_data: dict, invitation_token: Optional[str] = None) -> tuple[Utilisateur, Workspace]:
    """
    Cree un utilisateur avec son workspace personnel par defaut et gere les invitations (JWT).
    Garantit l'integrite des donnees et la securite des invitations.
    """
    email = user_data.get("email", "").strip().lower()
    username = user_data.get("username", "").strip()

    # 1. Vérification utilisateur existant (Contrainte 1)
    existing_user = get_utilisateur_by_email_or_username(db, email, username)
    if existing_user:
        detail = "Cet email est deja utilise." if existing_user.email.lower() == email else "Ce nom d'utilisateur est deja pris."
        raise HTTPException(status_code=409, detail=detail)

    payload = None
    # 2. Gestion du token d'invitation (Contrainte 2 & 3)
    if invitation_token:
        try:
            payload = jwt.decode(invitation_token, SECRET_KEY, algorithms=[ALGORITHM])
            token_type = payload.get("type")
            target_email = payload.get("email", "").strip().lower()

            if token_type not in ["workspace_invitation", "espace_invitation"]:
                raise HTTPException(status_code=400, detail="Type de token d'invitation invalide.")
            
            # Securite Email : On force l'email du token (Contrainte 3)
            if email != target_email:
                raise HTTPException(status_code=403, detail="Cet email n'est pas celui invite.")
                
        except JWTError as exc:
            raise HTTPException(status_code=400, detail="Token d'invitation invalide ou expire.") from exc

    # Debut de la transaction
    try:
        # 3. Creation de l'utilisateur
        new_user = Utilisateur(**user_data)
        db.add(new_user)
        db.flush() # Pour obtenir l'ID de l'utilisateur

        # 4. Creation du workspace par defaut (Contrainte 9)
        default_workspace = Workspace(
            nom=_build_default_workspace_name(user_data),
            description="Workspace personnel cree automatiquement a l'inscription.",
            id_utilisateur=new_user.id,
        )
        db.add(default_workspace)
        db.flush()

        # 5. Admin de son propre workspace
        db.add(Membre(
            id_utilisateur=new_user.id,
            id_workspace=default_workspace.id,
            role="Créateur",
            statut="Actif",
        ))

        # 6. Traitement de l'invitation (Contrainte 2, 4, 5)
        if payload:
            target_role = payload.get("role") or "Membre"
            target_workspace_id = payload.get("workspace_id")
            target_espace_id = payload.get("espace_id")

            # Verification existence Workspace (Contrainte 4)
            if target_workspace_id:
                ws_exists = db.query(Workspace).filter(Workspace.id == target_workspace_id).first()
                if not ws_exists:
                    raise HTTPException(status_code=404, detail="Le workspace de l'invitation n'existe plus.")
                
                # Prevention doublon (Contrainte 5)
                existing_m = db.query(Membre).filter(
                    Membre.id_utilisateur == new_user.id,
                    (Membre.id_workspace == target_workspace_id) if not target_espace_id else (Membre.id_espace == target_espace_id)
                ).first()

                if not existing_m:
                    db.add(Membre(
                        id_utilisateur=new_user.id,
                        id_workspace=target_workspace_id if not target_espace_id else None,
                        id_espace=target_espace_id,
                        role=target_role,
                        statut="Actif",
                    ))

        # Finalisation
        db.commit()
        db.refresh(new_user)
        db.refresh(default_workspace)
        return new_user, default_workspace

    except IntegrityError as exc:
        db.rollback()
        # On log l'erreur pour le debug (Contrainte 10)
        import logging
        logging.error(f"Erreur d'integrite lors de l'inscription de {email}: {str(exc)}")
        raise HTTPException(
            status_code=409,
            detail="Une erreur d'integrite est survenue lors de la creation de votre compte.",
        ) from exc
    except Exception as exc:
        db.rollback()
        if isinstance(exc, HTTPException):
            raise exc
        logging.error(f"Erreur inattendue lors de l'inscription: {str(exc)}")
        raise HTTPException(status_code=500, detail="Erreur interne du serveur lors de l'inscription.") from exc

def get_utilisateur_by_id(db: Session, user_id: str) -> Optional[Utilisateur]:
    return db.query(Utilisateur).filter(Utilisateur.id == user_id).first()

def get_utilisateur_by_email(db: Session, email: str) -> Optional[Utilisateur]:
    normalized_email = email.strip().lower()
    return db.query(Utilisateur).filter(func.lower(Utilisateur.email) == normalized_email).first()

def get_utilisateur_by_username(db: Session, username: str) -> Optional[Utilisateur]:
    normalized_username = username.strip().lower()
    return db.query(Utilisateur).filter(func.lower(Utilisateur.username) == normalized_username).first()

def get_utilisateur_by_email_or_username(db: Session, email: str, username: str) -> Optional[Utilisateur]:
    """Retourne l'utilisateur si l'email ou le nom d'utilisateur existe."""
    normalized_email = email.strip().lower()
    normalized_username = username.strip().lower()
    return db.query(Utilisateur).filter(
        or_(
            func.lower(Utilisateur.email) == normalized_email,
            func.lower(Utilisateur.username) == normalized_username,
        )
    ).first()

def get_utilisateur_by_verification_token(db: Session, token: str) -> Optional[Utilisateur]:
    return db.query(Utilisateur).filter(Utilisateur.token_confirmation_email == token).first()


def get_password_reset_request_by_user_id(db: Session, user_id: str) -> Optional[Motdepasseoublie]:
    return db.query(Motdepasseoublie).filter(Motdepasseoublie.id_utilisateur == user_id).first()


def get_password_reset_request_by_email_and_code(
    db: Session,
    email: str,
    code: str,
) -> Optional[Motdepasseoublie]:
    normalized_email = email.strip().lower()
    return (
        db.query(Motdepasseoublie)
        .join(Utilisateur, Motdepasseoublie.id_utilisateur == Utilisateur.id)
        .filter(
            func.lower(Utilisateur.email) == normalized_email,
            Motdepasseoublie.token_reinitialisation_mdp == code,
        )
        .first()
    )


def create_or_update_password_reset_request(
    db: Session,
    user: Utilisateur,
    token: str,
    expires_at,
) -> Motdepasseoublie:
    reset_request = get_password_reset_request_by_user_id(db, user.id)
    if reset_request:
        reset_request.token_reinitialisation_mdp = token
        reset_request.date_exp_token_reinitialisation = expires_at
    else:
        reset_request = Motdepasseoublie(
            id_utilisateur=user.id,
            token_reinitialisation_mdp=token,
            date_exp_token_reinitialisation=expires_at,
        )
        db.add(reset_request)

    commit_or_raise(
        db,
        detail="Impossible de preparer la reinitialisation du mot de passe a cause d'une contrainte d'integrite.",
        refresh_instance=reset_request,
    )
    return reset_request


def clear_password_reset_request(db: Session, reset_request: Motdepasseoublie) -> None:
    reset_request.token_reinitialisation_mdp = None
    reset_request.date_exp_token_reinitialisation = None
    commit_or_raise(
        db,
        detail="Impossible de finaliser la reinitialisation du mot de passe a cause d'une contrainte d'integrite.",
    )

def get_all_utilisateurs(db: Session, skip: int = 0, limit: int = 100) -> List[Utilisateur]:
    return db.query(Utilisateur).offset(skip).limit(limit).all()

def update_utilisateur(db: Session, user_id: str, update_data: dict) -> Optional[Utilisateur]:
    user = get_utilisateur_by_id(db, user_id)
    if user:
        for key, value in update_data.items():
            setattr(user, key, value)
        commit_or_raise(
            db,
            detail="Impossible de mettre a jour l'utilisateur a cause d'une contrainte d'integrite.",
            refresh_instance=user,
        )
    return user

def delete_utilisateur(db: Session, user_id: str) -> bool:
    user = get_utilisateur_by_id(db, user_id)
    if user:
        user.statut = "Supprimé"
        user.is_active = False
        commit_or_raise(
            db,
            detail="Impossible de supprimer l'utilisateur a cause d'une contrainte d'integrite.",
        )
        return True
    return False
