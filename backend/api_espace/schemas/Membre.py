from .Base import (
    Any,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    Optional,
    USERNAME_REGEX,
    WORKSPACE_ASSIGNABLE_ROLES,
    datetime,
    field_validator,
    model_validator,
)


class MembreBase(BaseModel):
    id_utilisateur: str
    role: str = Field(default="Membre")
    statut: str = Field(default="Actif")

class MembreCreate(MembreBase):
    id_workspace: Optional[str] = None
    id_espace: Optional[str] = None
    id_liste: Optional[str] = None
    id_tache: Optional[str] = None

class MembreUpdate(BaseModel):
    role: Optional[str] = None
    statut: Optional[str] = None

class MembreOut(MembreBase):
    id: str
    created_at: datetime
    id_workspace: Optional[str] = None
    id_espace: Optional[str] = None
    id_liste: Optional[str] = None
    id_tache: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class WorkspaceMemberUserOut(BaseModel):
    id: str
    username: str
    email: EmailStr
    nom: Optional[str] = None
    prenoms: Optional[str] = None

class WorkspaceMemberOut(MembreOut):
    utilisateur: Optional[WorkspaceMemberUserOut] = None

class EspaceMemberUserOut(BaseModel):
    id: str
    username: str
    email: EmailStr
    nom: Optional[str] = None
    prenoms: Optional[str] = None
    photo_base64: Optional[str] = None  # ✅ Ajout

class EspaceMemberOut(MembreOut):
    utilisateur: Optional[EspaceMemberUserOut] = None

class MembreDelete(BaseModel):
    id: str

class WorkspaceMemberInvite(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=30, pattern=USERNAME_REGEX)
    role: str = Field(...)

    @model_validator(mode="before")
    @classmethod
    def normalize_invitation_target(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if data.get("email"):
                data["email"] = str(data["email"]).strip().lower()
            if data.get("username"):
                data["username"] = str(data["username"]).strip()
        return data

    @model_validator(mode="after")
    def validate_target(self):
        if not self.email and not self.username:
            raise ValueError("Fournissez l'email ou le username de l'utilisateur a inviter.")
        return self

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        role = value.strip()
        if role not in WORKSPACE_ASSIGNABLE_ROLES:
            allowed_roles = ", ".join(sorted(WORKSPACE_ASSIGNABLE_ROLES))
            raise ValueError(f"Role invalide. Valeurs autorisees: {allowed_roles}.")
        return role

class WorkspaceMemberUpdate(BaseModel):
    role: Optional[str] = None
    statut: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        role = value.strip()
        if role not in WORKSPACE_ASSIGNABLE_ROLES:
            allowed_roles = ", ".join(sorted(WORKSPACE_ASSIGNABLE_ROLES))
            raise ValueError(f"Role invalide. Valeurs autorisees: {allowed_roles}.")
        return role

    @field_validator("statut")
    @classmethod
    def validate_statut(cls, value: Optional[str]) -> Optional[str]:
        allowed_statuses = {"Actif", "En attente", "Suspendu", "Quitté"}
        if value is None:
            return value
        statut = value.strip()
        if statut not in allowed_statuses:
            allowed = ", ".join(sorted(allowed_statuses))
            raise ValueError(f"Statut invalide. Valeurs autorisees: {allowed}.")
        return statut

class WorkspaceInvitationAcceptRequest(BaseModel):
    token: str = Field(..., min_length=10)

class EspaceInvitationAcceptRequest(BaseModel):
    token: str = Field(..., min_length=10)

class EspaceInvitationResponse(BaseModel):
    status: str # "existing_user" or "guest_invitation"
    message: str
    email: str
    membre: Optional[EspaceMemberOut] = None
    token: Optional[str] = None


# Fichier
