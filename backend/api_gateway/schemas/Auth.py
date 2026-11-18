from .Base import Any, BaseModel, ConfigDict, EmailStr, Field, List, Optional, datetime, field_validator, model_validator
from .Utilisateur import UtilisateurOut


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UtilisateurOut
    model_config = ConfigDict(from_attributes=True)

class TokenData(BaseModel):
    user_id: Optional[str] = None

class EmailSchema(BaseModel):
    email: List[EmailStr]

class EmailVerificationCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)

    @model_validator(mode='before')
    @classmethod
    def normalize_email(cls, data: Any) -> Any:
        if isinstance(data, dict) and data.get("email"):
            data["email"] = str(data["email"]).strip().lower()
        return data

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        code = "".join(char for char in value if char.isdigit())
        if len(code) != 6:
            raise ValueError("Le format du code est invalide. Celui-ci doit être composé de 6 chiffres.")
        return code

class EmailVerificationResendRequest(BaseModel):
    email: EmailStr

    @model_validator(mode='before')
    @classmethod
    def normalize_email(cls, data: Any) -> Any:
        if isinstance(data, dict) and data.get("email"):
            data["email"] = str(data["email"]).strip().lower()
        return data

class MessageResponse(BaseModel):
    message: str

class EmailSendResponse(BaseModel):
    message: str
    email_sent: bool

class RegisterResponse(BaseModel):
    message: str
    user: UtilisateurOut

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @model_validator(mode='before')
    @classmethod
    def normalize_email(cls, data: Any) -> Any:
        if isinstance(data, dict) and data.get("email"):
            data["email"] = str(data["email"]).strip().lower()
        return data

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8)

    @model_validator(mode='before')
    @classmethod
    def normalize_email(cls, data: Any) -> Any:
        if isinstance(data, dict) and data.get("email"):
            data["email"] = str(data["email"]).strip().lower()
        return data

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        code = "".join(char for char in value if char.isdigit())
        if len(code) != 6:
            raise ValueError("Le code de reinitialisation doit contenir exactement 6 chiffres.")
        return code

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)

class GoogleAuthenticatorSetupResponse(MessageResponse):
    setup_required: bool = True
    is_2fa_enabled: bool = False
    google_auth_configured_at: Optional[datetime] = None
    google_authenticator_secret: Optional[str] = None
    google_authenticator_otpauth_url: Optional[str] = None

class GoogleAuthenticatorStatusResponse(MessageResponse):
    setup_required: bool
    is_2fa_enabled: bool
    google_auth_configured_at: Optional[datetime] = None

class TwoFactorEnableRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        code = "".join(char for char in value if char.isdigit())
        if len(code) != 6:
            raise ValueError("Le code Google Authenticator doit contenir exactement 6 chiffres.")
        return code

class TwoFactorDisableRequest(BaseModel):
    current_password: str = Field(..., min_length=8)

class LoginRequest(BaseModel):
    identifier: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)

    @model_validator(mode="before")
    @classmethod
    def normalize_identifier(cls, data: Any) -> Any:
        if isinstance(data, dict):
            identifier = data.get("identifier") or data.get("email") or data.get("username")
            if identifier is not None:
                normalized_identifier = str(identifier).strip()
                if "@" in normalized_identifier:
                    normalized_identifier = normalized_identifier.lower()
                data["identifier"] = normalized_identifier
        return data

class LoginResponse(MessageResponse):
    requires_2fa: bool = False
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    user: Optional[UtilisateurOut] = None
    challenge_token: Optional[str] = None
    setup_required: bool = False
    google_authenticator_secret: Optional[str] = None
    google_authenticator_otpauth_url: Optional[str] = None

class LoginChallengeResponse(MessageResponse):
    requires_2fa: bool = True
    challenge_token: str
    setup_required: bool = False
    google_authenticator_secret: Optional[str] = None
    google_authenticator_otpauth_url: Optional[str] = None

class TwoFactorVerifyRequest(BaseModel):
    challenge_token: str
    code: str = Field(..., min_length=6, max_length=6)

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        code = "".join(char for char in value if char.isdigit())
        if len(code) != 6:
            raise ValueError("Le code Google Authenticator doit contenir exactement 6 chiffres.")
        return code

# ============================================================================
# REFRESH TOKEN SCHEMAS
# ============================================================================

class RefreshTokenResponse(BaseModel):
    """Réponse pour le refresh token."""
    access_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Requête pour le refresh token (si utilisé dans le body)."""
    refresh_token: Optional[str] = None
