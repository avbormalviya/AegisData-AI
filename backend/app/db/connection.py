from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings


# Settings initialization
settings = get_settings()


# Database engine creation
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={
        "check_same_thread": False
    } if "sqlite" in settings.DATABASE_URL else {}
)


# Session local configuration
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Dependency to get a database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def validate_sql(query: str):
    query = query.strip().lower()

    if ";" in query[:-1]:
        raise ValueError(
            "Multiple statements not allowed"
        )

    if not query.startswith("select"):
        raise ValueError(
            "Only SELECT queries are allowed"
        )

    forbidden = [
        "insert",
        "update",
        "delete",
        "drop",
        "alter",
        "truncate",
        "create",
        "replace",
        "grant",
        "revoke"
    ]

    for keyword in forbidden:
        if keyword in query:
            raise ValueError(
                f"Forbidden SQL operation: {keyword}"
            )


def run_query(query: str) -> list[dict]:

    query_lower = query.strip().lower()

    if not query_lower.startswith("select"):
        raise ValueError(
            "Only SELECT queries are allowed"
        )

    with engine.connect() as conn:
        result = conn.execute(text(query))
        rows = result.fetchall()
        columns = result.keys()

        return [
            dict(zip(columns, row))
            for row in rows
        ]