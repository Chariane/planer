import base64
import binascii
from datetime import timedelta
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.emails import (
    resend_verification_email,
    send_reset_password_email,
    send_verification_email,
)
from ..core.function import (
    build_email_verification_metadata,
    build_email_not_verified_detail,
    build_google_authenticator_setup_payload,
    build_password_reset_metadata,
    commit_or_raise,
    disable_google_authenticator,
    email_has_changed,
    enable_google_authenticator,
    ensure_unique_user_identity_fields,
    get_current_utc_datetime,
    get_or_create_google_auth_secret,
    is_expired_datetime,
    validate_new_password_is_different,
    validate_self_password_update,
    verify_google_authenticator_code,
)
from ..core.function import get_user_navigation_data
from ..core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    logout_user,
    oauth2_scheme,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_refresh_token,
    verify_refresh_token,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from ..schemas import (
    EmailSchema,
    ChangePasswordRequest,
    EmailVerificationCodeRequest,
    EmailVerificationResendRequest,
    ForgotPasswordRequest,
    GoogleAuthenticatorSetupResponse,
    GoogleAuthenticatorStatusResponse,
    LoginResponse,
    LoginRequest,
    MessageResponse,
    PublicUserProfileOut,
    ProfilePhotoResponse,
    ProfilePhotoUpdate,
    RegisterWithWorkspaceResponse,
    ResetPasswordRequest,
    Token,
    TwoFactorDisableRequest,
    TwoFactorEnableRequest,
    TwoFactorVerifyRequest,
    UtilisateurCreate,
    UtilisateurOut,
    UtilisateurUpdate,
    RefreshTokenResponse,
)
from ..crud.utilisateur import (
    create_or_update_password_reset_request,
    get_utilisateur_by_email_or_username,
    get_utilisateur_by_email,
    create_utilisateur,
    get_utilisateur_by_id,
    get_password_reset_request_by_email_and_code,
    update_utilisateur,
)
from ..core.function import decode_token

router = APIRouter(prefix="/auth", tags=["Authentification"])

MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024


def _decode_profile_photo(photo_base64: str | None) -> bytes | None:
    if not photo_base64:
        return None

    payload = photo_base64.strip()
    if "," in payload:
        payload = payload.split(",", 1)[1]

    try:
        photo_bytes = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Photo de profil invalide.") from exc

    if len(photo_bytes) > MAX_PROFILE_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="La photo de profil ne doit pas depasser 2 Mo.")
    return photo_bytes


def _encode_profile_photo(photo: bytes | None) -> str | None:
    if not photo:
        return None
    return base64.b64encode(photo).decode("ascii")


def _guess_profile_photo_mime(photo: bytes | None) -> str | None:
    if not photo:
        return None
    if photo.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if photo.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if photo.startswith(b"RIFF") and photo[8:12] == b"WEBP":
        return "image/webp"
    if photo.startswith(b"GIF87a") or photo.startswith(b"GIF89a"):
        return "image/gif"
    return "image/jpeg"


@router.post("/register", response_model=RegisterWithWorkspaceResponse, status_code=status.HTTP_201_CREATED)
def register(
    user: UtilisateurCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    ensure_unique_user_identity_fields(db, email=user.email, username=user.username)
    
    # Préparer les données
    user_data = user.model_dump()
    password = user_data.pop("password")
    invitation_token = user_data.pop("invitation_token", None)
    user_data["mot_de_passe"] = get_password_hash(password)
    user_data.update(build_email_verification_metadata())

    # Créer l'utilisateur
    new_user, default_workspace = create_utilisateur(db, user_data, invitation_token=invitation_token)

    background_tasks.add_task(
        send_verification_email,
        new_user.username,
        EmailSchema(email=[new_user.email]),
        new_user.code_verification_email,
    )
    return {
        "message": "Compte cree. Un code de verification email a ete envoye.",
        "user": new_user,
        "workspace": default_workspace,
    }


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    response: Response,  
    db: Session = Depends(get_db)
):
    # Rechercher l'utilisateur par email ou username
    user = get_utilisateur_by_email_or_username(db, payload.identifier, payload.identifier)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.mot_de_passe or not verify_password(payload.password, user.mot_de_passe):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Utilisateur inactif")

    if not user.is_utilisateur_verifie:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=build_email_not_verified_detail(user.email),
        )

    # ✅ Si 2FA n'est pas activé
    if not user.is_2fa_enabled:
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires,
        )
        
        # ✅ CRÉER LE REFRESH TOKEN
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        # ✅ DÉFINIR LE COOKIE HTTPONLY
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,        
            secure=False,        
            samesite="lax",
            max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  
        )
        
        return {
            "message": "Connexion reussie.",
            "requires_2fa": False,
            "access_token": access_token,
            "token_type": "bearer",
            "user": user,
        }

    # ✅ Si 2FA est activé
    challenge_token = create_access_token(
        data={"sub": str(user.id), "purpose": "2fa_login"},
        expires_delta=timedelta(minutes=10),
    )
    
    # ✅ NOTA: Le refresh token n'est pas créé ici car le 2FA n'est pas encore validé
    # Il sera créé après la vérification du code 2FA dans /verify-2fa
    
    return {
        "message": "Mot de passe valide. Veuillez renseigner le code Google Authenticator.",
        "requires_2fa": True,
        "challenge_token": challenge_token,
    }


@router.post("/verify-email-code", response_model=MessageResponse)
def verify_email_code(
    payload: EmailVerificationCodeRequest,
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=404, 
            detail="Nous n'avons pas trouvé de compte associé à cette adresse email. Veuillez vérifier votre saisie."
        )

    if user.is_utilisateur_verifie:
        return {"message": "Votre adresse email est deja verifiee."}

    if is_expired_datetime(user.date_exp_code_verification_email):
        raise HTTPException(
            status_code=400,
            detail="Le code de verification a expire. Veuillez demander un nouveau code.",
        )

    expected_code = user.code_verification_email
    if not expected_code or expected_code != payload.code:
        raise HTTPException(
            status_code=400, 
            detail="Le code de confirmation saisi est incorrect. Merci de bien vouloir vérifier le code reçu par email ou de demander un nouvel envoi."
        )

    user.is_utilisateur_verifie = True
    user.email_verified_at = get_current_utc_datetime()
    user.code_verification_email = None
    user.date_exp_code_verification_email = None
    commit_or_raise(
        db,
        detail="Impossible de verifier l'email a cause d'une contrainte d'integrite.",
    )

    return {"message": "Votre adresse email a ete verifiee avec succes."}


@router.post("/resend-verification-code", response_model=MessageResponse)
def resend_verification_code(
    payload: EmailVerificationResendRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=404, 
            detail="Impossible d'identifier votre compte. Veuillez vérifier votre adresse email."
        )

    if user.is_utilisateur_verifie:
        return {"message": "Cette adresse email est déjà vérifiée."}

    verification_data = build_email_verification_metadata()
    user.is_utilisateur_verifie = verification_data["is_utilisateur_verifie"]
    user.email_verified_at = verification_data["email_verified_at"]
    user.code_verification_email = verification_data["code_verification_email"]
    user.date_exp_code_verification_email = verification_data["date_exp_code_verification_email"]
    commit_or_raise(
        db,
        detail="Impossible de renvoyer le code de verification a cause d'une contrainte d'integrite.",
    )

    background_tasks.add_task(
        resend_verification_email,
        user.username,
        EmailSchema(email=[user.email]),
        user.code_verification_email,
    )

    return {"message": "Un nouveau code de verification a ete envoye."}


@router.post("/resend-verification-email", response_model=MessageResponse, include_in_schema=False)
def resend_verification_email_legacy(
    payload: EmailVerificationResendRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    return resend_verification_code(payload, background_tasks, db)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_email(db, payload.email)
    if not user:
        return {
            "message": "Si un compte existe avec cette adresse email, un code de reinitialisation a ete envoye."
        }

    reset_data = build_password_reset_metadata()
    create_or_update_password_reset_request(
        db,
        user,
        token=reset_data["token_reinitialisation_mdp"],
        expires_at=reset_data["date_exp_token_reinitialisation"],
    )

    background_tasks.add_task(
        send_reset_password_email,
        user.username,
        EmailSchema(email=[user.email]),
        reset_data["token_reinitialisation_mdp"],
    )

    return {
        "message": "Si un compte existe avec cette adresse email, un code de reinitialisation a ete envoye."
    }


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    reset_request = get_password_reset_request_by_email_and_code(db, payload.email, payload.code)
    if not reset_request or not reset_request.utilisateur:
        raise HTTPException(
            status_code=400, 
            detail="Le code de réinitialisation saisi est invalide. Veuillez vérifier le code reçu ou effectuer une nouvelle demande."
        )

    if is_expired_datetime(reset_request.date_exp_token_reinitialisation):
        raise HTTPException(
            status_code=400,
            detail="Le code de reinitialisation a expire. Veuillez refaire la demande.",
        )

    user = reset_request.utilisateur
    if user.mot_de_passe and verify_password(payload.new_password, user.mot_de_passe):
        raise HTTPException(
            status_code=400,
            detail="Le nouveau mot de passe doit etre different de l'ancien.",
        )

    user.mot_de_passe = get_password_hash(payload.new_password)
    reset_request.token_reinitialisation_mdp = None
    reset_request.date_exp_token_reinitialisation = None
    commit_or_raise(
        db,
        detail="Impossible de reinitialiser le mot de passe a cause d'une contrainte d'integrite.",
    )
    return {"message": "Votre mot de passe a ete reinitialise avec succes."}


@router.get("/2fa/status", response_model=GoogleAuthenticatorStatusResponse)
def get_google_authenticator_status(
    current_user: UtilisateurOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_id(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")

    return {
        "message": "Statut Google Authenticator recupere avec succes.",
        "setup_required": not bool(user.is_2fa_enabled),
        "is_2fa_enabled": bool(user.is_2fa_enabled),
        "google_auth_configured_at": user.google_auth_configured_at,
    }


@router.get("/2fa/setup", response_model=GoogleAuthenticatorSetupResponse)
def get_google_authenticator_setup(
    current_user: UtilisateurOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_id(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")

    if not user.is_utilisateur_verifie:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Votre adresse email n'est pas encore verifiee.",
        )

    _, secret_created = get_or_create_google_auth_secret(user)
    if secret_created:
        commit_or_raise(
            db,
            detail="Impossible de preparer la configuration Google Authenticator a cause d'une contrainte d'integrite.",
            refresh_instance=user,
        )

    return build_google_authenticator_setup_payload(
        user,
        message="Configuration Google Authenticator recuperee avec succes.",
    )


@router.post("/2fa/enable", response_model=GoogleAuthenticatorStatusResponse)
def enable_two_factor_for_profile(
    payload: TwoFactorEnableRequest,
    current_user: UtilisateurOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_id(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")

    if not user.is_utilisateur_verifie:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Votre adresse email doit etre verifiee avant d'activer Google Authenticator.",
        )

    google_auth_secret, secret_created = get_or_create_google_auth_secret(user)
    if secret_created:
        commit_or_raise(
            db,
            detail="Impossible de preparer Google Authenticator a cause d'une contrainte d'integrite.",
            refresh_instance=user,
        )

    if not verify_google_authenticator_code(google_auth_secret, payload.code):
        raise HTTPException(status_code=400, detail="Code Google Authenticator invalide")

    enable_google_authenticator(user)
    commit_or_raise(
        db,
        detail="Impossible d'activer Google Authenticator a cause d'une contrainte d'integrite.",
        refresh_instance=user,
    )

    return {
        "message": "Google Authenticator a ete active avec succes.",
        "setup_required": False,
        "is_2fa_enabled": True,
        "google_auth_configured_at": user.google_auth_configured_at,
    }


@router.post("/2fa/disable", response_model=GoogleAuthenticatorStatusResponse)
def disable_two_factor_for_profile(
    payload: TwoFactorDisableRequest,
    current_user: UtilisateurOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_id(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")

    if not verify_password(payload.current_password, user.mot_de_passe):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")

    disable_google_authenticator(user)
    commit_or_raise(
        db,
        detail="Impossible de desactiver Google Authenticator a cause d'une contrainte d'integrite.",
        refresh_instance=user,
    )

    return {
        "message": "Google Authenticator a ete desactive avec succes.",
        "setup_required": True,
        "is_2fa_enabled": False,
        "google_auth_configured_at": None,
    }


@router.post("/verify-2fa", response_model=Token)
def verify_two_factor_code(
    payload: TwoFactorVerifyRequest,
    db: Session = Depends(get_db),
):
    try:
        challenge_payload = decode_token(payload.challenge_token, expected_purpose="2fa_login")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton de verification 2FA invalide ou expire",
        )

    user_id = challenge_payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton de verification 2FA invalide ou expire",
        )

    user = get_utilisateur_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")

    google_auth_secret = user.google_auth_secret
    if not google_auth_secret:
        raise HTTPException(
            status_code=400,
            detail="Google Authenticator n'est pas configure pour ce compte.",
        )

    if not verify_google_authenticator_code(google_auth_secret, payload.code):
        raise HTTPException(status_code=400, detail="Code Google Authenticator invalide")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: UtilisateurOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_id(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")

    if not user.mot_de_passe or not verify_password(payload.current_password, user.mot_de_passe):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")

    validate_new_password_is_different(payload.current_password, payload.new_password)
    user.mot_de_passe = get_password_hash(payload.new_password)
    commit_or_raise(
        db,
        detail="Impossible de modifier le mot de passe a cause d'une contrainte d'integrite.",
    )
    return {"message": "Votre mot de passe a ete modifie avec succes."}


@router.get("/me", response_model=UtilisateurOut)
def get_me(current_user: UtilisateurOut = Depends(get_current_user)):
    return current_user


@router.get("/me/photo", response_model=ProfilePhotoResponse)
def get_my_profile_photo(
    current_user: UtilisateurOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_id(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    return {
        "photo_base64": _encode_profile_photo(user.photo),
        "mime_type": _guess_profile_photo_mime(user.photo),
    }


@router.put("/me/photo", response_model=ProfilePhotoResponse)
def update_my_profile_photo(
    payload: ProfilePhotoUpdate,
    current_user: UtilisateurOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_id(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")

    user.photo = _decode_profile_photo(payload.photo_base64)
    commit_or_raise(
        db,
        detail="Impossible de mettre a jour la photo de profil.",
        refresh_instance=user,
    )
    return {
        "photo_base64": _encode_profile_photo(user.photo),
        "mime_type": _guess_profile_photo_mime(user.photo),
    }


@router.get("/users/{user_id}/photo", response_model=ProfilePhotoResponse)
def get_user_profile_photo(
    user_id: str,
    current_user: UtilisateurOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    return {
        "photo_base64": _encode_profile_photo(user.photo),
        "mime_type": _guess_profile_photo_mime(user.photo),
    }


@router.get("/users/{user_id}/profile", response_model=PublicUserProfileOut)
def get_user_public_profile(
    user_id: str,
    current_user: UtilisateurOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "nom": user.nom,
        "prenoms": user.prenoms,
        "telephone": user.telephone,
        "biographie": user.biographie,
        "genre": user.genre,
        "pays": user.pays,
        "ville": user.ville,
        "photo_base64": _encode_profile_photo(user.photo),
    }


@router.get("/me/resources", response_model=dict)
def get_me_resources(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    """Raccourci pour récupérer la structure de navigation complète."""
    return get_user_navigation_data(db, current_user.id)


# /backend/api_gateway/routes/auth.py

@router.put("/me", response_model=UtilisateurOut)
def update_me(
    user_update: UtilisateurUpdate,
    background_tasks: BackgroundTasks,
    current_user: UtilisateurOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_user = get_utilisateur_by_id(db, current_user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    update_data = user_update.model_dump(exclude_unset=True)
    
    # ✅ BLOQUER email et username
    if "email" in update_data:
        raise HTTPException(
            status_code=400, 
            detail="La modification de l'adresse email est interdite."
        )
    if "username" in update_data:
        raise HTTPException(
            status_code=400, 
            detail="La modification du nom d'utilisateur est interdite."
        )
    
    validate_self_password_update(update_data)

    # Gestion du changement de mot de passe
    if "current_password" in update_data and "new_password" in update_data:
        if not verify_password(update_data["current_password"], db_user.mot_de_passe):
            raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
        validate_new_password_is_different(update_data["current_password"], update_data["new_password"])
        db_user.mot_de_passe = get_password_hash(update_data["new_password"])
        del update_data["current_password"]
        del update_data["new_password"]

    # ✅ Nettoyer date_nais si c'est une chaîne vide
    if "date_nais" in update_data:
        if update_data["date_nais"] == "" or update_data["date_nais"] is None:
            update_data["date_nais"] = None

    # Mise à jour des autres champs
    try:
        updated_user = update_utilisateur(db, current_user.id, update_data)
        return updated_user
    except Exception as e:
        # ✅ Message d'erreur professionnel
        raise HTTPException(
            status_code=400,
            detail="Une erreur est survenue lors de la mise à jour de votre profil. Veuillez vérifier les champs saisis."
        )

@router.post("/logout")
def logout(
    response: Response,
    current_user: UtilisateurOut = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
):
    logout_user(token)

    # Supprimer le cookie refresh_token
    response.delete_cookie(
        key="refresh_token",
        path="/",
    )

    return {"message": "Déconnexion réussie"}


# ============================================================================
# ENDPOINT REFRESH TOKEN
# ============================================================================

@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Rafraîchit le token d'accès en utilisant le refresh token
    stocké dans un cookie httpOnly.
    
    - Lit le refresh_token depuis le cookie
    - Valide le refresh_token
    - Génère un nouveau access_token
    - Optionnel: fait la rotation du refresh_token
    """
    # 1. Lire le refresh token depuis le cookie
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token manquant. Veuillez vous reconnecter.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Valider le refresh token
    user_id = verify_refresh_token(refresh_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalide ou expiré. Veuillez vous reconnecter.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Vérifier que l'utilisateur existe toujours et est actif
    user = get_utilisateur_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur inactif ou introuvable.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 4. Générer un nouveau token d'accès
    new_access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # 5. Optionnel: rotation du refresh token (meilleure sécurité)
    # Désactiver l'ancien refresh token (le mettre dans une blacklist ou le supprimer)
    # Générer un nouveau refresh token
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Mettre à jour le cookie avec le nouveau refresh token
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,  # ✅ En production (HTTPS)
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # 30 jours en secondes
        path="/",  # Disponible sur tout le site
    )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }