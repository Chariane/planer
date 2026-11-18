# api_gateway/databases.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import dotenv_values, load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
dotenv_path = os.path.join(BASE_DIR, ".env")

# Charge le .env
load_dotenv(dotenv_path)

config_data = dotenv_values(dotenv_path)

def _clean_env_value(value: str | None) -> str | None:
    if value in (None, "", "None"):
        return None
    return value


def _build_database_url() -> str | None:
    explicit_database_url = _clean_env_value(config_data.get("DATABASE_URL"))
    if explicit_database_url:
        return explicit_database_url

    env = _clean_env_value(config_data.get("ENV"))
    if env == "Prod":
        user = _clean_env_value(config_data.get("DB_USER_PROD"))
        password = _clean_env_value(config_data.get("DB_PASSWORD_PROD"))
        host = _clean_env_value(config_data.get("DB_HOST_PROD"))
        port = _clean_env_value(config_data.get("DB_PORT_PROD"))
        db_name = _clean_env_value(config_data.get("DB_NAME_PROD"))
    else:
        user = _clean_env_value(config_data.get("DB_USER"))
        password = _clean_env_value(config_data.get("DB_PASSWORD"))
        host = _clean_env_value(config_data.get("DB_HOST"))
        port = _clean_env_value(config_data.get("DB_PORT"))
        db_name = _clean_env_value(config_data.get("DB_NAME"))

    if not all([user, password, host, port, db_name]):
        return None

    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db_name}"


DATABASE_URL = _build_database_url()
engine = create_engine(DATABASE_URL) if DATABASE_URL else None
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None
Base = declarative_base()


def get_db():
    if SessionLocal is None:
        raise RuntimeError("Configuration de base de donnees absente ou invalide dans backend/api_gateway/.env")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
