from .Base import Any, BaseModel, ConfigDict, Field, Optional, datetime, model_validator
from .Membre import MembreOut


class ListeBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None

class ListeCreate(ListeBase):
    id_espace: Optional[str] = None
    id_workspace: Optional[str] = None

    @model_validator(mode="after")
    def validate_scope(self):
        if (self.id_espace is None) == (self.id_workspace is None):
            raise ValueError(
                "Une liste doit etre rattachee soit a un espace, soit a un workspace, jamais aux deux."
            )
        return self

class ListeUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    id_espace: Optional[str] = None
    id_workspace: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def validate_scope_update(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        has_id_espace = "id_espace" in data
        has_id_workspace = "id_workspace" in data

        if not has_id_espace and not has_id_workspace:
            return data

        id_espace = data.get("id_espace")
        id_workspace = data.get("id_workspace")

        if (id_espace is None) == (id_workspace is None):
            raise ValueError(
                "Pour modifier le rattachement d'une liste, fournissez soit id_espace, soit id_workspace, jamais les deux."
            )
        return data

class ListeOut(ListeBase):
    id: str
    created_at: datetime
    id_espace: Optional[str] = None
    id_workspace: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ListeDelete(BaseModel):
    id: str

class ListeInvitationResponse(BaseModel):
    status: str
    message: str
    email: str
    membre: Optional[MembreOut] = None
    token: Optional[str] = None

class ListeInvitationAcceptRequest(BaseModel):
    token: str = Field(..., min_length=10)
