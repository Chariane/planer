from .Base import BaseModel, ConfigDict, Field, List, Optional, datetime
from .Tache import TacheOut


class AbsenceEtCongeBase(BaseModel):
    is_absence: bool = Field(default=True)
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    statut: Optional[str] = None   # Valeurs autorisées : 'en_attente', 'approuvee', 'rejetee', 'annulee', 'terminee'
    motif: Optional[str] = None
    is_conge_planifie: Optional[bool] = Field(default=False)
    duree_demandee_en_jours: Optional[int] = Field(None, ge=0)
    decision_commentaire: Optional[str] = None   # Stocke les infos de décision (qui, quand) + commentaire

class AbsenceEtCongeCreate(AbsenceEtCongeBase):
    id_membre: Optional[str] = None

class AbsenceEtCongeUpdate(BaseModel):
    is_absence: Optional[bool] = None
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    statut: Optional[str] = None
    motif: Optional[str] = None
    is_conge_planifie: Optional[bool] = None
    duree_demandee_en_jours: Optional[int] = Field(None, ge=0)
    decision_commentaire: Optional[str] = None
    id_membre: Optional[str] = None

class AbsenceEtCongeOut(AbsenceEtCongeBase):
    id: str
    statut: str
    statut_date: datetime
    created_at: datetime
    id_membre: Optional[str] = None
    owner_name: Optional[str] = None
    owner_user_id: Optional[str] = None  # ✅ AJOUTER CETTE LIGNE
    author_role: Optional[str] = None    # ✅ AUSSI AJOUTER (utile pour le frontend)
    model_config = ConfigDict(from_attributes=True)

class AbsenceEtCongeDelete(BaseModel):
    id: str

class AbsenceDecisionRequest(BaseModel):
    motif: Optional[str] = Field(None, max_length=255)
    commentaire: Optional[str] = Field(None, max_length=255)

class AbsenceCalendarOut(BaseModel):
    id: str
    id_membre: Optional[str] = None
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    statut: str
    motif: Optional[str] = None
    is_absence: bool
    is_conge_planifie: bool
    created_at: datetime

class AbsenceConflictOut(BaseModel):
    id: str
    id_membre: Optional[str] = None
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None
    statut: str
    motif: Optional[str] = None

class AbsenceImpactOut(BaseModel):
    overlapping_tasks: List[TacheOut] = []
    overdue_tasks: List[TacheOut] = []
    high_priority_tasks: List[TacheOut] = []
    conflicting_absences: List[AbsenceConflictOut] = []
    sole_admin_resources: List[dict] = []
    sole_creator_resources: List[dict] = []
    risk_level: str = "faible"
    recommendation: Optional[str] = None
    risk_reasons: List[str] = []
    approved_absences_last_3_months: Optional[int] = 0
    approved_days_last_3_months: Optional[int] = 0

class UserAvailabilityOut(BaseModel):
    id_utilisateur: str
    is_available: bool
    current_absence: Optional[AbsenceEtCongeOut] = None
    next_absence_start: Optional[datetime] = None

class UserAvailabilityRequest(BaseModel):
    user_ids: List[str]
    reference_date: Optional[datetime] = None
