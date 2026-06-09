from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session


@dataclass(frozen=True)
class PlanDefinition:
    code: str
    nom: str
    limits: dict[str, int | None]


PLAN_LIMITS: dict[str, PlanDefinition] = {
    "ESSENTIEL": PlanDefinition(
        code="ESSENTIEL",
        nom="Essentiel",
        limits={
            "workspaces": 1,
            "espaces": 5,
            "projets": 10,
            "membres": 5,
            "stockage_mo": 250,
            "historique_jours": 30,
        },
    ),
    "PROFESSIONNEL": PlanDefinition(
        code="PROFESSIONNEL",
        nom="Professionnel",
        limits={
            "workspaces": 5,
            "espaces": None,
            "projets": None,
            "membres": 50,
            "stockage_mo": 5120,
            "historique_jours": 365,
        },
    ),
}


def _row_to_dict(row: Any) -> dict[str, Any] | None:
    if not row:
        return None
    return dict(row._mapping)


def get_effective_plan(db: Session, user_id: str) -> PlanDefinition:
    row = db.execute(
        text(
            """
            SELECT upper(pa.code) AS code
            FROM planer.entreprise e
            JOIN planer.abonnement_entreprise ae ON ae.id_entreprise = e.id
            JOIN planer.plan_abonnement pa ON pa.id = ae.id_plan_abonnement
            WHERE e.id_utilisateur = :user_id
              AND e.statut_compte = 'Actif'
              AND e.is_premium = true
              AND ae.statut IN ('Actif', 'Active', 'actif', 'active')
              AND ae.date_fin > CURRENT_TIMESTAMP
              AND upper(pa.code) IN ('ESSENTIEL', 'PROFESSIONNEL')
            ORDER BY ae.date_fin DESC
            LIMIT 1
            """
        ),
        {"user_id": user_id},
    ).first()
    code = _row_to_dict(row)["code"] if row else "ESSENTIEL"
    return PLAN_LIMITS.get(code, PLAN_LIMITS["ESSENTIEL"])


def resolve_workspace_owner_id(db: Session, workspace_id: str | None = None, espace_id: str | None = None) -> str | None:
    if workspace_id:
        row = db.execute(
            text("SELECT id_utilisateur FROM planer.workspace WHERE id = :workspace_id"),
            {"workspace_id": workspace_id},
        ).first()
        return _row_to_dict(row)["id_utilisateur"] if row else None

    if espace_id:
        row = db.execute(
            text(
                """
                SELECT w.id_utilisateur
                FROM planer.espace e
                JOIN planer.workspace w ON w.id = e.id_workspace
                WHERE e.id = :espace_id
                """
            ),
            {"espace_id": espace_id},
        ).first()
        return _row_to_dict(row)["id_utilisateur"] if row else None

    return None


def get_owner_usage(db: Session, owner_id: str) -> dict[str, int]:
    row = db.execute(
        text(
            """
            WITH owner_workspaces AS (
                SELECT id
                FROM planer.workspace
                WHERE id_utilisateur = :owner_id
            )
            SELECT
                (SELECT count(*) FROM owner_workspaces) AS workspaces,
                (SELECT count(*) FROM planer.espace e WHERE e.id_workspace IN (SELECT id FROM owner_workspaces)) AS espaces,
                (
                    SELECT count(*)
                    FROM planer.liste l
                    WHERE l.id_workspace IN (SELECT id FROM owner_workspaces)
                       OR l.id_espace IN (
                           SELECT e.id
                           FROM planer.espace e
                           WHERE e.id_workspace IN (SELECT id FROM owner_workspaces)
                       )
                ) AS projets,
                (
                    SELECT count(DISTINCT m.id_utilisateur)
                    FROM planer.membre m
                    WHERE m.statut = 'Actif'
                      AND m.id_utilisateur IS NOT NULL
                      AND (
                          m.id_workspace IN (SELECT id FROM owner_workspaces)
                          OR m.id_espace IN (
                              SELECT e.id
                              FROM planer.espace e
                              WHERE e.id_workspace IN (SELECT id FROM owner_workspaces)
                          )
                          OR m.id_liste IN (
                              SELECT l.id
                              FROM planer.liste l
                              WHERE l.id_workspace IN (SELECT id FROM owner_workspaces)
                                 OR l.id_espace IN (
                                     SELECT e.id
                                     FROM planer.espace e
                                     WHERE e.id_workspace IN (SELECT id FROM owner_workspaces)
                                 )
                          )
                      )
                ) AS membres
            """
        ),
        {"owner_id": owner_id},
    ).first()
    data = _row_to_dict(row) or {}
    return {
        "workspaces": int(data.get("workspaces") or 0),
        "espaces": int(data.get("espaces") or 0),
        "projets": int(data.get("projets") or 0),
        "membres": int(data.get("membres") or 0),
    }


def get_plan_usage(db: Session, owner_id: str) -> dict[str, Any]:
    plan = get_effective_plan(db, owner_id)
    return {
        "plan": {
            "code": plan.code,
            "nom": plan.nom,
            "limits": plan.limits,
        },
        "usage": get_owner_usage(db, owner_id),
    }


def require_plan_capacity(db: Session, owner_id: str, resource: str, increment: int = 1) -> None:
    plan = get_effective_plan(db, owner_id)
    limit = plan.limits.get(resource)
    if limit is None:
        return

    usage = get_owner_usage(db, owner_id)
    current = usage.get(resource, 0)
    if current + increment <= limit:
        return

    labels = {
        "workspaces": "workspace",
        "espaces": "espace",
        "projets": "projet",
        "membres": "membre",
    }
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            f"Limite du plan {plan.nom} atteinte : {limit} {labels.get(resource, resource)}"
            f"{'s' if limit > 1 else ''} maximum. Passez au plan Professionnel pour augmenter cette capacite."
        ),
    )
