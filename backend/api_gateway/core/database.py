import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

# Charge le fichier .env s'il existe (local), sinon ne fait rien
load_dotenv()

def _clean_env_value(value: str | None) -> str | None:
    if value in (None, "", "None"):
        return None
    return value

def _build_database_url() -> str | None:
    # 1. PRIORITÉ À DATABASE_URL (utilisé sur Render)
    explicit_url = _clean_env_value(os.getenv("DATABASE_URL"))
    if explicit_url:
        return explicit_url

    # 2. Sinon construction avec les variables individuelles (pour le local)
    env = _clean_env_value(os.getenv("ENV", "Dev"))
    if env == "Prod":
        user = _clean_env_value(os.getenv("DB_USER_PROD"))
        password = _clean_env_value(os.getenv("DB_PASSWORD_PROD"))
        host = _clean_env_value(os.getenv("DB_HOST_PROD"))
        port = _clean_env_value(os.getenv("DB_PORT_PROD"))
        db_name = _clean_env_value(os.getenv("DB_NAME_PROD"))
    else:
        user = _clean_env_value(os.getenv("DB_USER"))
        password = _clean_env_value(os.getenv("DB_PASSWORD"))
        host = _clean_env_value(os.getenv("DB_HOST"))
        port = _clean_env_value(os.getenv("DB_PORT"))
        db_name = _clean_env_value(os.getenv("DB_NAME"))

    if not all([user, password, host, port, db_name]):
        return None

    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db_name}"

DATABASE_URL = _build_database_url()
engine = create_engine(DATABASE_URL) if DATABASE_URL else None
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None
Base = declarative_base()

# 🔥 Conserve config_data pour la compatibilité avec emails.py et autres modules
config_data = {
    key: os.getenv(key) for key in [
        "MAIL_USERNAME", "MAIL_PASSWORD", "MAIL_FROM", "MAIL_PORT",
        "MAIL_SERVER", "MAIL_SSL_TLS", "MAIL_STARTTLS", "MAIL_SSL",
        "USE_CREDENTIALS", "VALIDATE_CERTS", "FRONT_BASE_URL",
        "FRONT_ACCOUNT_VERIFICATION_URL", "FRONT_PASSWORD_RESET_URL",
        "SECRET_KEY", "ALGORITHM", "ACCESS_TOKEN_EXPIRE_MINUTES",
        "ALLOW_ORIGINS", "ALLOW_CREDENTIALS", "ALLOW_METHODS", "ALLOW_HEADERS",
        "FEDAPAY_SECRET_KEY", "REDIS_URL"
    ]
}

def get_db():
    if SessionLocal is None:
        raise RuntimeError("Configuration de base de données absente ou invalide")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()