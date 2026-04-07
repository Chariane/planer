from datetime import timedelta
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.emails import EmailSchema, resend_verification_email, send_verification_email
from ..core.function import (
    build_email_verification_metadata,
    build_google_authenticator_setup_payload,
    email_has_changed,
    enable_google_authenticator,
    ensure_unique_user_identity_fields,
    get_current_utc_datetime,
    get_or_create_google_auth_secret,
    is_google_authenticator_setup_required,
    is_expired_datetime,
    validate_self_password_update,
    verify_google_authenticator_code,
)
from ..core.security import (
    decode_token,
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    logout_user,
    oauth2_scheme,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from ..schemas import (
    EmailVerificationCodeRequest,
    EmailVerificationResendRequest,
    GoogleAuthenticatorSetupResponse,
    GoogleAuthenticatorStatusResponse,
    LoginChallengeResponse,
    LoginRequest,
    MessageResponse,
    RegisterResponse,
    Token,
    TwoFactorVerifyRequest,
    UtilisateurCreate,
    UtilisateurOut,
    UtilisateurUpdate,
)
from ..crud.utilisateur import (
    get_utilisateur_by_email_or_username,
    get_utilisateur_by_email,
    create_utilisateur,
    get_utilisateur_by_id,
    update_utilisateur,
)

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(
    user: UtilisateurCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    ensure_unique_user_identity_fields(db, email=user.email, username=user.username)
    
    # Préparer les données
    user_data = user.model_dump()
    password = user_data.pop("password")
    user_data["mot_de_passe"] = get_password_hash(password)
    user_data.update(build_email_verification_metadata())

    # Créer l'utilisateur
    new_user = create_utilisateur(db, user_data)

    background_tasks.add_task(
        send_verification_email,
        new_user.username,
        EmailSchema(email=[new_user.email]),
        new_user.code_verification_email,
    )
    return {
        "message": "Compte cree. Un code de verification email a ete envoye.",
        "user": new_user,
    }


@router.post("/login", response_model=LoginChallengeResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
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
            detail="Votre adresse email n'est pas encore vérifiée.",
        )

    google_auth_secret, secret_created = get_or_create_google_auth_secret(user)
    setup_required = is_google_authenticator_setup_required(user)
    if secret_created:
        db.commit()
        db.refresh(user)

    challenge_token = create_access_token(
        data={"sub": str(user.id), "purpose": "2fa_login"},
        expires_delta=timedelta(minutes=10),
    )
    response = {
        "message": "Mot de passe valide. Veuillez renseigner le code Google Authenticator.",
        "requires_2fa": True,
        "challenge_token": challenge_token,
        "setup_required": setup_required,
    }
    if setup_required:
        setup_payload = build_google_authenticator_setup_payload(
            user,
            message="Configuration Google Authenticator preparee.",
        )
        response["google_authenticator_secret"] = google_auth_secret
        response["google_authenticator_otpauth_url"] = setup_payload["google_authenticator_otpauth_url"]
    return response


@router.post("/verify-email-code", response_model=GoogleAuthenticatorSetupResponse)
def verify_email_code(
    payload: EmailVerificationCodeRequest,
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="Aucun utilisateur trouve avec cette adresse email")

    if user.is_utilisateur_verifie:
        return {"message": "Votre adresse email est deja verifiee."}

    if is_expired_datetime(user.date_exp_code_verification_email):
        raise HTTPException(
            status_code=400,
            detail="Le code de verification a expire. Veuillez demander un nouveau code.",
        )

    expected_code = user.code_verification_email
    if not expected_code or expected_code != payload.code:
        raise HTTPException(status_code=400, detail="Code de verification invalide")

    get_or_create_google_auth_secret(user)
    user.is_utilisateur_verifie = True
    user.email_verified_at = get_current_utc_datetime()
    user.code_verification_email = None
    user.date_exp_code_verification_email = None
    db.commit()

    return build_google_authenticator_setup_payload(
        user,
        message="Votre adresse email a ete verifiee avec succes.",
    )


@router.post("/resend-verification-code", response_model=MessageResponse)
def resend_verification_code(
    payload: EmailVerificationResendRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = get_utilisateur_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="Aucun utilisateur trouvé avec cette adresse email")

    if user.is_utilisateur_verifie:
        return {"message": "Cette adresse email est déjà vérifiée."}

    verification_data = build_email_verification_metadata()
    user.is_utilisateur_verifie = verification_data["is_utilisateur_verifie"]
    user.email_verified_at = verification_data["email_verified_at"]
    user.code_verification_email = verification_data["code_verification_email"]
    user.date_exp_code_verification_email = verification_data["date_exp_code_verification_email"]
    db.commit()

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
        "setup_required": is_google_authenticator_setup_required(user),
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
        db.commit()
        db.refresh(user)

    return build_google_authenticator_setup_payload(
        user,
        message="Configuration Google Authenticator recuperee avec succes.",
    )


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

    if not user.is_2fa_enabled:
        enable_google_authenticator(user)
        db.commit()
        db.refresh(user)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UtilisateurOut)
def get_me(current_user: UtilisateurOut = Depends(get_current_user)):
    return current_user


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
    ensure_unique_user_identity_fields(
        db,
        email=update_data.get("email"),
        username=update_data.get("username"),
        current_user_id=current_user.id,
    )
    validate_self_password_update(update_data)

    # Gestion du changement de mot de passe
    if "current_password" in update_data and "new_password" in update_data:
        if not verify_password(update_data["current_password"], db_user.mot_de_passe):
            raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
        db_user.mot_de_passe = get_password_hash(update_data["new_password"])
        del update_data["current_password"]
        del update_data["new_password"]

    email_changed = email_has_changed(db_user, update_data)
    if email_changed:
        update_data.update(build_email_verification_metadata())

    # Mise à jour des autres champs
    updated_user = update_utilisateur(db, current_user.id, update_data)

    if email_changed:
        background_tasks.add_task(
            send_verification_email,
            updated_user.username,
            EmailSchema(email=[updated_user.email]),
            updated_user.code_verification_email,
        )
    return updated_user


@router.post("/logout")
def logout(current_user: UtilisateurOut = Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    logout_user(token)
    return {"message": "Déconnexion réussie"}
