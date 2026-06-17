from typing import Optional, List
import logging
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from ..models import Espace, Liste, Membre, Motdepasseoublie, PlanerEntreprise, Utilisateur, Workspace
from ..core.function import commit_or_raise, ensure_unique_user_identity_fields
from ..core.security import SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from backend.api_gateway.chat_client import ensure_resource_group, sync_resource_member


ENTREPRISE_REGISTRATION_FIELDS = {
    "nom",
    "description",
    "statut_juridique",
    "adresse",
    "telephone",
    "numero_ifu",
    "numero_rccm",
    "nom_responsable_entreprise",
    "prenoms_responsable_entreprise",
    "telephone_responsable_entreprise",
    "site_web",
    "date_creation_entreprise",
}


def _clean_optional_entreprise_payload(payload: dict | None) -> dict:
    if not payload:
        return {}
    cleaned: dict = {}
    for key in ENTREPRISE_REGISTRATION_FIELDS:
        value = payload.get(key)
        if isinstance(value, str):
            value = value.strip() or None
        if value is not None:
            cleaned[key] = value
    return cleaned


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
    entreprise_payload = _clean_optional_entreprise_payload(user_data.pop("entreprise", None))
    wants_entreprise = bool(user_data.get("is_entreprise")) or bool(entreprise_payload)
    if wants_entreprise and not entreprise_payload.get("nom"):
        raise HTTPException(status_code=400, detail="Le nom de l'entreprise est obligatoire pour creer un compte entreprise.")
    if entreprise_payload:
        user_data["is_entreprise"] = True

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

            if token_type not in ["workspace_invitation", "espace_invitation", "liste_invitation"]:
                raise HTTPException(status_code=400, detail="Type de token d'invitation invalide.")
            
            if email != target_email:
                raise HTTPException(status_code=403, detail="Cet email n'est pas celui invite.")
                
        except JWTError as exc:
            raise HTTPException(status_code=400, detail="Token d'invitation invalide ou expire.") from exc

    try:
        # 3. Creation de l'utilisateur
        new_user = Utilisateur(**user_data)
        db.add(new_user)
        db.flush()

        if entreprise_payload:
            db.add(PlanerEntreprise(
                **entreprise_payload,
                id_utilisateur=new_user.id,
            ))

        db.commit()
        db.refresh(new_user)

        # 4. Creation du workspace par defaut
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

        db.commit()
        db.refresh(default_workspace)

        # 6. Creation du groupe de discussion dans K-Messenger
        try:
            group_id = ensure_resource_group(
                db,
                resource_type="workspace",
                resource_id=default_workspace.id,
                name=default_workspace.nom,
                creator_id=new_user.id,
                members=[new_user.id],
            )
            if group_id:
                logging.info(f"✅ Groupe de discussion créé avec succès: {group_id}")
            else:
                logging.warning("⚠️ Le groupe de discussion n'a pas pu être créé, mais l'inscription continue")
        except Exception as e:
            logging.warning(f"⚠️ Erreur lors de la création du groupe: {e}")

        # 7. Traitement de l'invitation
        if payload:
            target_role = payload.get("role")
            target_workspace_id = payload.get("workspace_id")
            target_espace_id = payload.get("espace_id")
            target_liste_id = payload.get("liste_id")

            if not target_role:
                raise HTTPException(
                    status_code=400,
                    detail="Role d'invitation absent du token."
                )

            if target_workspace_id:
                ws_exists = db.query(Workspace).filter(Workspace.id == target_workspace_id).first()
                if not ws_exists:
                    raise HTTPException(status_code=404, detail="Le workspace de l'invitation n'existe plus.")
                
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
                    if target_espace_id:
                        espace = db.query(Espace).filter(Espace.id == target_espace_id).first()
                        creator_id = (
                            db.query(Membre.id_utilisateur)
                            .filter(
                                Membre.id_espace == target_espace_id,
                                Membre.role == "Créateur",
                                Membre.statut == "Actif",
                            )
                            .scalar()
                        )
                        sync_resource_member(
                            db,
                            resource_type="espace",
                            resource_id=target_espace_id,
                            user_id=new_user.id,
                            name=espace.nom if espace else None,
                            creator_id=creator_id,
                            role=target_role,
                        )
                    else:
                        sync_resource_member(
                            db,
                            resource_type="workspace",
                            resource_id=target_workspace_id,
                            user_id=new_user.id,
                            name=ws_exists.nom,
                            creator_id=ws_exists.id_utilisateur,
                            role=target_role,
                        )
            
            if target_liste_id:
                liste_exists = db.query(Liste).filter(Liste.id == target_liste_id).first()
                if not liste_exists:
                    raise HTTPException(status_code=404, detail="La liste de l'invitation n'existe plus.")
                
                existing_m = db.query(Membre).filter(
                    Membre.id_utilisateur == new_user.id,
                    Membre.id_liste == target_liste_id
                ).first()
                
                if not existing_m:
                    db.add(Membre(
                        id_utilisateur=new_user.id,
                        id_liste=target_liste_id,
                        role=target_role,
                        statut="Actif",
                    ))
                    creator_id = (
                        db.query(Membre.id_utilisateur)
                        .filter(
                            Membre.id_liste == target_liste_id,
                            Membre.role == "Créateur",
                            Membre.statut == "Actif",
                        )
                        .scalar()
                    )
                    sync_resource_member(
                        db,
                        resource_type="liste",
                        resource_id=target_liste_id,
                        user_id=new_user.id,
                        name=liste_exists.nom,
                        creator_id=creator_id,
                        role=target_role,
                    )

        db.commit()
        db.refresh(new_user)
        db.refresh(default_workspace)
        return new_user, default_workspace

    except IntegrityError as exc:
        db.rollback()
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