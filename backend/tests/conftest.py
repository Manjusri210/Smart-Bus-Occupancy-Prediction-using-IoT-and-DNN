import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from backend.app import create_app
from backend.app.config import Config
from backend.app.database import Base, SessionLocal
from backend.app.ml_service import MLService


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    BUS_CAPACITY = 40
    ENABLE_MODEL_TRAINING_ENDPOINT = True


@pytest.fixture(scope="session")
def app():
    # Use in-memory SQLite database
    test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=test_engine)

    # Override SessionLocal to bind to test_engine
    TestSession = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=test_engine))
    import backend.app.database as db_mod
    import backend.app.routes as routes_mod

    db_mod.engine = test_engine
    db_mod.SessionLocal = TestSession
    routes_mod.SessionLocal = TestSession

    app = create_app(TestConfig)
    return app


@pytest.fixture(scope="function")
def db_session(app):
    """Provides a clean database session for each test function."""
    import backend.app.database as db_mod
    Base.metadata.drop_all(bind=db_mod.engine)
    Base.metadata.create_all(bind=db_mod.engine)
    session = db_mod.SessionLocal()
    yield session
    session.close()


@pytest.fixture
def client(app, db_session):
    with app.test_client() as client:
        yield client
