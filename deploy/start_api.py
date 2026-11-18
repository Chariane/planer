from __future__ import annotations

import os
import sys
from pathlib import Path

from bootstrap_db import bootstrap_database

ROOT = Path(__file__).resolve().parents[1]
API_NAMES = {
    "api_espace",
    "api_gateway",
    "api_liste_et_tache",
    "api_notification",
    "api_workspace",
}


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in API_NAMES:
        raise SystemExit("Usage: python deploy/start_api.py <api_name>")

    bootstrap_database()
    api_dir = ROOT / "backend" / sys.argv[1]
    os.chdir(api_dir)
    sys.path.insert(0, str(api_dir))

    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "10000")),
    )


if __name__ == "__main__":
    main()
