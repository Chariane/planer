import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import HTTPException, status


ANTIVIRUS_REQUIRED = os.getenv("ANTIVIRUS_REQUIRED", "true").lower() != "false"
CLAMD_SOCKET = os.getenv("CLAMD_SOCKET", "/var/run/clamav/clamd.ctl")
CLAMAV_SCAN_TIMEOUT_SECONDS = int(os.getenv("CLAMAV_SCAN_TIMEOUT_SECONDS", "120"))


def validate_image_bytes(payload: bytes) -> str:
    if payload.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if payload.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if payload.startswith(b"RIFF") and len(payload) >= 12 and payload[8:12] == b"WEBP":
        return ".webp"
    if payload.startswith(b"GIF87a") or payload.startswith(b"GIF89a"):
        return ".gif"
    raise HTTPException(status_code=400, detail="Format de photo non autorisé.")


def _scan_path(path: Path) -> str:
    commands: list[list[str]] = []
    if shutil.which("clamdscan") and Path(CLAMD_SOCKET).exists():
        commands.append(["clamdscan", "--fdpass", "--no-summary", str(path)])
    if shutil.which("clamscan"):
        commands.append(["clamscan", "--no-summary", str(path)])

    if not commands:
        if ANTIVIRUS_REQUIRED:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Analyse antivirus indisponible. ClamAV n'est pas installé ou accessible.",
            )
        return "skipped"

    last_error = ""
    for command in commands:
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=CLAMAV_SCAN_TIMEOUT_SECONDS,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            last_error = str(exc)
            continue

        output = f"{result.stdout}\n{result.stderr}".strip()
        if result.returncode == 0:
            return "clean"
        if result.returncode == 1:
            raise HTTPException(
                status_code=400,
                detail="Photo refusée : menace détectée par l'antivirus.",
            )
        last_error = output or f"Code retour ClamAV: {result.returncode}"

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"Analyse antivirus indisponible. {last_error}".strip(),
    )


def scan_image_bytes_with_clamav(payload: bytes) -> str:
    suffix = validate_image_bytes(payload)
    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(payload)
            temp_path = Path(tmp.name)
        return _scan_path(temp_path)
    finally:
        if temp_path:
            temp_path.unlink(missing_ok=True)
