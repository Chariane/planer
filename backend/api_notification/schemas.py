from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class UtilisateurOut(BaseModel):
    id: str
    username: str
    email: str
    is_active: bool = True
    is_admin: bool = False
    is_super_admin: bool = False
    nom: Optional[str] = None
    prenoms: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationOut(BaseModel):
    id: str
    type: str
    message: str
    est_lu: bool = False
    est_globale: bool = False
    date_creation: Optional[datetime] = None
    date_modif: Optional[datetime] = None
    date_lecture: Optional[datetime] = None
    id_utilisateur: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationCreate(BaseModel):
    id_utilisateur: Optional[str] = None
    type: str = Field(default="info", pattern="^(info|alerte|warning|promotion|evenement|systeme)$")
    message: str = Field(..., min_length=1)
    est_globale: bool = False


class UnreadCountOut(BaseModel):
    count: int
