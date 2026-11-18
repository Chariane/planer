import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

load_dotenv()

ENV = os.getenv("ENV", "Dev")
if ENV == "Prod":
    DB_USER = os.getenv("DB_USER_PROD")
    DB_PASSWORD = os.getenv("DB_PASSWORD_PROD")
    DB_HOST = os.getenv("DB_HOST_PROD")
    DB_PORT = os.getenv("DB_PORT_PROD")
    DB_NAME = os.getenv("DB_NAME_PROD")
else:
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT")
    DB_NAME = os.getenv("DB_NAME")

# Convertir le port en entier (si None, mettre 5432)
try:
    port_int = int(DB_PORT) if DB_PORT else 5432
except ValueError:
    port_int = 5432

DATABASE_URL = os.getenv("DATABASE_URL") or f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{port_int}/{DB_NAME}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()