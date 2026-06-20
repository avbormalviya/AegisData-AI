from langchain_core.tools import tool
from app.db.connection import validate_sql, run_query
from app.db.schema_inspector import get_schema_string
from app.services.llm import llm


@tool
def sql_query_tool(query: str) -> str:
    """
    Use this tool to answer questions from a SQL database using natural language.

    Args:
        query: The natural language query to answer

    Returns:
        The result of the query as a string
    """
    schema_string = get_schema_string()
    prompt = build_prompt(query, schema_string)
    response = llm.invoke(prompt)
    sql_query = extract_sql(response.content)

    validate_sql(sql_query)

    result = run_query(sql_query)
    return str(result)


def build_prompt(query: str, schema: str) -> str:
    """
    Build prompt for LLM to generate SQL query.

    Args:
        query: The natural language query to answer
        schema: The database schema as a string

    Returns:
        The prompt as a string
    """
    return (
        f"""
You are a SQL expert.

Database Schema:
{schema}

User Question:
{query}

RULES:

- Generate ONLY a SELECT query.
- Never generate INSERT.
- Never generate UPDATE.
- Never generate DELETE.
- Never generate DROP.
- Never generate ALTER.
- Never generate TRUNCATE.
- Never modify data.
- Read-only access only.

Return only SQL.
"""
)


def extract_sql(response: str) -> str:
    """
    Extract SQL query from LLM response.

    Args:
        response: The response from the LLM

    Returns:
        The extracted SQL query as a string
    """
    sql = response.strip()
    sql = sql.replace("```sql", "")
    sql = sql.replace("```", "")
    return sql.strip()