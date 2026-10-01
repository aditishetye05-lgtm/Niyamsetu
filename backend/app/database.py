"""
Database module for NiyamSetu backend.
Exposes SQLAlchemy engine, Base, SessionLocal, and get_db dependency.
"""
from app.db.session import engine, Base, SessionLocal, get_db

__all__ = ["engine", "Base", "SessionLocal", "get_db"]
