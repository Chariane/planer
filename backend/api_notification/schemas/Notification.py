from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator


NOTIFICATION_TARGET_TYPES = {"workspace", "espace", "liste", "tache", "canevas", "section", "checklist"}


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
    target_type: Optional[str] = None
    target_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationCreate(BaseModel):
    id_utilisateur: Optional[str] = None
    type: str = Field(default="info", pattern="^(info|alerte|warning|promotion|evenement|systeme)$")
    message: str = Field(..., min_length=1)
    est_globale: bool = False
    target_type: Optional[str] = None
    target_id: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def clean_notification_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for field_name in ["message", "target_type", "target_id"]:
                if isinstance(data.get(field_name), str):
                    cleaned_value = data[field_name].strip()
                    data[field_name] = cleaned_value or None
        return data

    @model_validator(mode="after")
    def validate_target_pair(self):
        if bool(self.target_type) != bool(self.target_id):
            raise ValueError("Fournissez target_type et target_id ensemble.")
        return self

    @field_validator("target_type")
    @classmethod
    def validate_target_type(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        target_type = value.lower()
        if target_type not in NOTIFICATION_TARGET_TYPES:
            allowed_values = ", ".join(sorted(NOTIFICATION_TARGET_TYPES))
            raise ValueError(f"Type de cible invalide. Valeurs autorisees: {allowed_values}.")
        return target_type


class UnreadCountOut(BaseModel):
    count: int
