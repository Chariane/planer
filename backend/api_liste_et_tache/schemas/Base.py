from decimal import Decimal
from datetime import date, datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator, model_validator

PHONE_NUMBER_CLEANED_REGEX = r"^\+?\d{7,20}$"
NAME_REGEX = r"^[a-zA-ZÀ-ÿ\s'-]+$"
USERNAME_REGEX = r"^[a-zA-Z0-9_.-]+$"
WORKSPACE_ASSIGNABLE_ROLES = {"Administrateur", "Membre", "Invité"}

TACHE_STATUSES = {"en attente", "en cours", "terminé", "bloqué"}
TACHE_PRIORITIES = {"basse", "moyenne", "haute", "critique"}
