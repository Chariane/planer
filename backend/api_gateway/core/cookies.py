import os


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


COOKIE_SECURE = _as_bool(
    os.getenv("COOKIE_SECURE"),
    default=bool(os.getenv("RENDER_EXTERNAL_URL")),
)
COOKIE_SAMESITE = os.getenv(
    "COOKIE_SAMESITE", "none" if COOKIE_SECURE else "lax"
).strip().lower()

# Browsers require Secure cookies when SameSite=None.
if COOKIE_SAMESITE == "none":
    COOKIE_SECURE = True
