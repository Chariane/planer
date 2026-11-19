import os
import re
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Iterable

from fastapi import HTTPException, UploadFile, status


MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
ANTIVIRUS_REQUIRED = os.getenv("ANTIVIRUS_REQUIRED", "true").lower() != "false"
UPLOAD_ANTIVIRUS_REQUIRED = os.getenv(
    "UPLOAD_ANTIVIRUS_REQUIRED", str(ANTIVIRUS_REQUIRED).lower()
).lower() != "false"
if os.getenv("RENDER", "").lower() == "true":
    # Keep scanning whenever ClamAV works, but let demo uploads continue if it is down.
    UPLOAD_ANTIVIRUS_REQUIRED = False
CLAMD_SOCKET = os.getenv("CLAMD_SOCKET", "/var/run/clamav/clamd.ctl")
CLAMAV_SCAN_TIMEOUT_SECONDS = int(os.getenv("CLAMAV_SCAN_TIMEOUT_SECONDS", "120"))

ALLOWED_UPLOAD_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".jfif",
    ".webp",
    ".gif",
    ".doc",
    ".docx",
    ".odt",
    ".rtf",
    ".xls",
    ".xlsx",
    ".ods",
    ".ppt",
    ".pptx",
    ".odp",
    ".txt",
    ".csv",
    ".md",
    ".json",
    ".xml",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".env",
    ".py",
    ".ts",
    ".tsx",
    ".jsx",
    ".css",
    ".scss",
    ".sql",
    ".sh",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".go",
    ".rs",
    ".php",
    ".rb",
    ".vue",
    ".svelte",
    ".zip",
    ".rar",
    ".7z",
    ".webm",
    ".mp3",
    ".m4a",
    ".aac",
    ".wav",
    ".ogg",
    ".mp4",
    ".m4v",
    ".mov",
    ".avi",
    ".mkv",
}

ALLOWED_MIME_PREFIXES = ("image/", "video/", "audio/", "text/")
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/json",
    "application/xml",
    "application/x-yaml",
    "application/x-python-code",
    "application/x-sh",
    "application/x-shellscript",
    "application/x-tiled-tsx",
    "application/sql",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.oasis.opendocument.text",
    "application/rtf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.presentation",
    "application/zip",
    "application/x-zip-compressed",
    "application/x-7z-compressed",
    "application/vnd.rar",
    "application/x-rar-compressed",
    "application/octet-stream",
}


def sanitize_filename(filename: str | None) -> str:
    original = os.path.basename(filename or "").strip()
    if not original:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide.")

    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", original)
    safe = safe.strip("._")
    if not safe:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide.")
    return safe[:160]


def validate_upload_metadata(filename: str, content_type: str | None) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_UPLOAD_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_UPLOAD_EXTENSIONS))
        detail = (
            f"Type de fichier non autorisé pour '{filename}'. "
            f"Extension reçue : '{suffix or 'aucune'}'. Extensions autorisées : {allowed}."
        )
        raise HTTPException(status_code=400, detail=detail)

    mime = (content_type or "application/octet-stream").lower()
    if not (mime in ALLOWED_MIME_TYPES or mime.startswith(ALLOWED_MIME_PREFIXES)):
        raise HTTPException(
            status_code=400,
            detail=f"Type MIME non autorisé pour '{filename}' : '{mime}'.",
        )

    return suffix


def unique_storage_name(original_filename: str) -> str:
    suffix = Path(original_filename).suffix.lower()
    stem = Path(original_filename).stem[:60] or "fichier"
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._") or "fichier"
    return f"{uuid.uuid4().hex}_{stem}{suffix}"


async def write_upload_to_temp(file: UploadFile, tmp_dir: Path) -> tuple[str, Path, int]:
    filename = sanitize_filename(file.filename)
    validate_upload_metadata(filename, file.content_type)

    tmp_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = tmp_dir / unique_storage_name(filename)

    size = 0
    try:
        with open(tmp_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Fichier trop volumineux. Taille maximale : {MAX_UPLOAD_BYTES // (1024 * 1024)} Mo.",
                    )
                buffer.write(chunk)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    if size == 0:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Le fichier est vide.")

    return filename, tmp_path, size


def _scanner_commands(path: Path) -> Iterable[list[str]]:
    if shutil.which("clamdscan") and Path(CLAMD_SOCKET).exists():
        yield ["clamdscan", "--fdpass", "--no-summary", str(path)]
    if shutil.which("clamscan"):
        yield ["clamscan", "--no-summary", str(path)]


def scan_path_with_clamav(path: Path) -> str:
    commands = list(_scanner_commands(path))
    if not commands:
        if UPLOAD_ANTIVIRUS_REQUIRED:
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
                detail="Fichier refusé : menace détectée par l'antivirus.",
            )
        last_error = output or f"Code retour ClamAV: {result.returncode}"

    if not UPLOAD_ANTIVIRUS_REQUIRED:
        return "skipped"

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"Analyse antivirus indisponible. {last_error}".strip(),
    )
