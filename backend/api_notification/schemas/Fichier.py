from .Base import BaseModel, ConfigDict, Field, Optional, datetime, field_validator


class FichierBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=255)
    url_fichier: Optional[str] = None
    type_fichier: Optional[str] = Field(None, max_length=20)
    meta_donnees: Optional[dict] = None

class FichierCreate(FichierBase):
    id_membre: Optional[str] = None

class FichierUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=255)
    url_fichier: Optional[str] = None
    type_fichier: Optional[str] = Field(None, max_length=20)
    meta_donnees: Optional[dict] = None
    id_membre: Optional[str] = None

class FichierOut(FichierBase):
    id: str
    created_at: datetime
    id_membre: Optional[str] = None
    owner_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class FichierDelete(BaseModel):
    id: str

class FichierAttachmentCreate(FichierBase):
    target_type: str = Field(..., min_length=1, max_length=20)
    target_id: str = Field(..., min_length=1, max_length=12)

    @field_validator("target_type")
    @classmethod
    def validate_target_type(cls, value: str) -> str:
        allowed = {"workspace", "espace", "liste", "tache", "canevas", "section", "checklist"}
        target_type = value.strip().lower()
        if target_type not in allowed:
            allowed_values = ", ".join(sorted(allowed))
            raise ValueError(f"Type de cible invalide. Valeurs autorisees: {allowed_values}.")
        return target_type

class FichierShareCreate(BaseModel):
    expires_in_hours: int = Field(default=24, ge=1, le=168)
    allow_download: bool = Field(default=True)

class FichierShareOut(BaseModel):
    token: str
    expires_at: datetime
    file_id: str
    allow_download: bool
