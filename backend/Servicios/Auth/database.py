from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import get_settings
import os

settings = get_settings()

# Usar DATABASE_URL de la variable de entorno o del config
DATABASE_URL = os.getenv("DATABASE_URL", settings.database_url)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base with schema search path
metadata = MetaData(schema="app")
Base = declarative_base(metadata=metadata)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()