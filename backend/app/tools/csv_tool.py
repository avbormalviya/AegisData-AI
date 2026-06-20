from typing import Optional
import pandas as pd
from pandas.errors import EmptyDataError, ParserError
from langchain_core.tools import tool
from app.services.llm import llm
from app.core.config import get_settings


settings = get_settings()
MAX_ROWS = settings.MAX_ROWS


@tool
def csv_query_tool(query: str, file_path: Optional[str] = None) -> str:
    """
    Query a CSV or Excel file using natural language.

    Args:
        query: The natural language query to answer
        file_path: Path to the CSV or Excel file

    Returns:
        The result of the query as a string
    """
    if file_path is None:
        return "Please upload a CSV or Excel file first."

    if file_path.endswith(".csv"):
        try:
            try:
                df = pd.read_csv(
                    file_path,
                    encoding="utf-8",
                sep=None,
                engine="python",
                on_bad_lines="skip"
            )

            except UnicodeDecodeError:
                df = pd.read_csv(
                    file_path,
                    encoding="latin-1",
                    sep=None,
                    engine="python",
                    on_bad_lines="skip"
                )

        except EmptyDataError:
            return "The uploaded CSV file is empty."

        except ParserError:
            return "The uploaded CSV file is malformed."

        except Exception as e:
            return f"Failed to read CSV file: {str(e)}"

    # normalize columns
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(r"[^a-zA-Z0-9_]", "_", regex=True)
    )

    df_info = f"""
    DataFrame Shape: {df.shape}
    Columns: {list(df.columns)}
    Data Types:
    {df.dtypes}
    First 5 Rows:
    {df.head()}
    """

    prompt = build_prompt(query, df_info)
    response = llm.invoke(prompt)
    code = extract_code(response.content)

    namespace = {"pd": pd, "df": df}
    exec(code, namespace)

    result = namespace.get("result", "No result variable found")

    return str(result)


def build_prompt(query: str, df_info: str) -> str:
    return f"""
You are an expert Python and Pandas developer.

A pandas DataFrame named `df` is ALREADY loaded and available.

DATASET INFORMATION:
{df_info}

USER QUESTION:
{query}

IMPORTANT:

NEVER generate visualization code.

FORBIDDEN:
- df.plot(...)
- .plot(...)
- matplotlib
- seaborn
- plotly
- altair
- bokeh
- plt.plot()
- plt.bar()
- plt.show()
- px.line()
- px.bar()

If the user requests a chart:
- Return the data needed for the chart.
- Store that data in `result`.
- Do NOT create the chart.

Example:

User: Plot sales by month

Code:

result = (
    df.groupby("month")["sales"]
    .sum()
    .reset_index()
    .to_dict("records")
)

CRITICAL:

Your response will be executed directly using:

exec(response)

If you return ANYTHING except valid Python code,
the application will crash.

Do not explain.
Do not describe.
Do not apologize.
Do not provide alternatives.

Return executable Python only.
"""


def extract_code(response: str) -> str:
    """
    Extract Python code from a response.

    Args:
        response: The response from the LLM

    Returns:
        The extracted Python code as a string
    """
    response = response.strip()
    response = response.replace("```python", "")
    response = response.replace("```", "")
    return response.strip()