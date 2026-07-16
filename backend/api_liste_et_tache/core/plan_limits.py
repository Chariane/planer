from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


@dataclass(frozen=True)
class PlanDefinition:
    code: str
    nom: str
    limits: dict[str, int | None]


UNLIMITED_PLAN = PlanDefinition(
    code="ILLIMITE",
    nom="Illimite",
    limits={
        "workspaces": None,
        "espaces": None,
        "projets": None,
        "membres": None,
        "stockage_mo": None,
        "historique_jours": None,
    },
)

PLAN_LIMITS: dict[str, PlanDefinition] = {
    "ESSENTIEL": UNLIMITED_PLAN,
    "PROFESSIONNEL": UNLIMITED_PLAN,
    "ENTREPRISE": UNLIMITED_PLAN,
    "ILLIMITE": UNLIMITED_PLAN,
}


def _row_to_dict(row: Any) -> dict[str, Any] | None:
    if not row:
        return None
    return dict(row._mapping)


def get_effective_plan(db: Session, user_id: str) -> PlanDefinition:
    return UNLIMITED_PLAN


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
    return None
