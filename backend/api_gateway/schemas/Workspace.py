from .Base import BaseModel, ConfigDict, Field, Optional, datetime
from .Utilisateur import UtilisateurOut


class WorkspaceBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class WorkspaceCreate(WorkspaceBase):
    id_utilisateur: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None

class WorkspaceOut(WorkspaceBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    id_utilisateur: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class WorkspaceWithContextOut(WorkspaceOut):
    member_count: int = 0
    current_user_role: Optional[str] = None
    current_user_statut: Optional[str] = None

class RegisterWithWorkspaceResponse(BaseModel):
    message: str
    email_sent: bool = False
    user: UtilisateurOut
    workspace: WorkspaceOut

class WorkspaceDelete(BaseModel):
    id: str

# Espace
