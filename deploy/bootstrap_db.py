from __future__ import annotations

import os
import time
from pathlib import Path

import psycopg2
from psycopg2 import OperationalError

ROOT = Path(__file__).resolve().parents[1]
MIGRATION_TABLE = "public.render_bootstrap_migrations"
LOCK_ID = 7416385913196001


def _apply_file(cursor, version: str, path: Path) -> None:
    cursor.execute(f"SELECT 1 FROM {MIGRATION_TABLE} WHERE version = %s", (version,))
    if cursor.fetchone():
        return

    cursor.execute(path.read_text(encoding="utf-8"))
    cursor.execute(
        f"INSERT INTO {MIGRATION_TABLE} (version) VALUES (%s)",
        (version,),
    )
    print(f"Applied database migration: {version}")


def bootstrap_database() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required to initialize the demo database.")

    schema_file = ROOT / "deploy" / "db_general_v1.sql"
    migration_dir = ROOT / "deploy" / "k-messenger-migrations"
    if not schema_file.is_file():
        raise RuntimeError(f"Database schema file not found: {schema_file}")

    for attempt in range(1, 21):
        try:
            with psycopg2.connect(database_url, connect_timeout=5) as connection:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT pg_advisory_xact_lock(%s)", (LOCK_ID,))
                    cursor.execute(
                        f"""
                        CREATE TABLE IF NOT EXISTS {MIGRATION_TABLE} (
                            version TEXT PRIMARY KEY,
                            applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                        )
                        """
                    )
                    _apply_file(cursor, "planer-db-general-v1", schema_file)
                    for migration in sorted(migration_dir.glob("*.sql")):
                        _apply_file(cursor, migration.stem, migration)
            return
        except OperationalError:
            if attempt == 20:
                raise
            time.sleep(3)
