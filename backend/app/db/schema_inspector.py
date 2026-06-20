from sqlalchemy import inspect
from app.db.connection import engine


def get_schema_string() -> str:
    """
    Get the database schema as a string.
    """
    inspector = inspect(engine)
    schema_parts = []

    for table_name in inspector.get_table_names():
        columns = inspector.get_columns(table_name)
        col_defs = ", ".join(
            f"{col['name']} ({col['type']})" for col in columns
        )

        schema_parts.append(f"Table: {table_name}\nColumns: {col_defs}")

    return "\n\n".join(schema_parts)
