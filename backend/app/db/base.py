"""SQLAlchemy declarative base — no engine side effects on import."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
