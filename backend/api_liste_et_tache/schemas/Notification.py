from .Base import BaseModel, ConfigDict, Field, List, Optional, datetime


class NotificationOut(BaseModel):
    id: str
    type: str
    message: Optional[str] = None
    est_lu: bool = False
    est_globale: bool = False
    date_creation: Optional[datetime] = None
    date_modif: Optional[datetime] = None
    date_lecture: Optional[datetime] = None
    id_utilisateur: Optional[str] = None
    resource_type: Optional[str] = None   # ✅ Ajout
    resource_id: Optional[str] = None     # ✅ Ajout

    model_config = ConfigDict(from_attributes=True)


class NotificationCreate(BaseModel):
    id_utilisateur: Optional[str] = None
    type: str = Field(default="info", pattern="^(info|alerte|warning|promotion|evenement|systeme)$")
    message: str = Field(..., min_length=1)
    est_globale: bool = False


class DashboardStatsOut(BaseModel):
    total_projects: int
    total_spaces: int
    active_members: int
    recent_activities: List[NotificationOut]

    model_config = ConfigDict(from_attributes=True)
