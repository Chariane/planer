from .Base import BaseModel, ConfigDict, Field, List, Optional, TACHE_PRIORITIES, TACHE_STATUSES, datetime, field_validator
from .Checklist import ChecklistOut
from .Membre import WorkspaceMemberOut


class TacheBase(BaseModel):
    titre: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    date_debut: Optional[datetime] = None
    date_fin_prevue: Optional[datetime] = None
    statut: str = Field(default="en attente")
    priorite: str = Field(default="moyenne")
    ordre_affichage: Optional[int] = Field(None, ge=0)

    @field_validator("statut")
    @classmethod
    def validate_statut(cls, v: str) -> str:
        if v not in TACHE_STATUSES:
            allowed = ", ".join(TACHE_STATUSES)
            raise ValueError(f"Statut invalide. Valeurs autorisees : {allowed}")
        return v

    @field_validator("priorite")
    @classmethod
    def validate_priorite(cls, v: str) -> str:
        if v not in TACHE_PRIORITIES:
            allowed = ", ".join(TACHE_PRIORITIES)
            raise ValueError(f"Priorite invalide. Valeurs autorisees : {allowed}")
        return v

class TacheCreate(TacheBase):
    id_liste: Optional[str] = None
    id_tache_parent: Optional[str] = None

class TacheUpdate(BaseModel):
    titre: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    date_debut: Optional[datetime] = None
    date_fin_prevue: Optional[datetime] = None
    statut: Optional[str] = None
    priorite: Optional[str] = None
    ordre_affichage: Optional[int] = Field(None, ge=0)
    id_liste: Optional[str] = None
    id_tache_parent: Optional[str] = None

    @field_validator("statut")
    @classmethod
    def validate_statut_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in TACHE_STATUSES:
            allowed = ", ".join(TACHE_STATUSES)
            raise ValueError(f"Statut invalide. Valeurs autorisees : {allowed}")
        return v

    @field_validator("priorite")
    @classmethod
    def validate_priorite_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in TACHE_PRIORITIES:
            allowed = ", ".join(TACHE_PRIORITIES)
            raise ValueError(f"Priorite invalide. Valeurs autorisees : {allowed}")
        return v

class TacheOut(TacheBase):
    id: str
    statut_date: Optional[datetime] = None
    created_at: datetime
    id_liste: Optional[str] = None
    id_tache_parent: Optional[str] = None
    progression: float = 0.0
    model_config = ConfigDict(from_attributes=True)

class TacheFullOut(TacheOut):
    membres: List[WorkspaceMemberOut] = []
    checklists: List[ChecklistOut] = []

class TacheDelete(BaseModel):
    id: str

class TacheKanbanOut(BaseModel):
    columns: dict[str, List[TacheFullOut]]

class TacheBulkUpdateItem(BaseModel):
    id: str
    statut: Optional[str] = None
    ordre_affichage: Optional[int] = None

class TacheBulkUpdate(BaseModel):
    items: List[TacheBulkUpdateItem]
