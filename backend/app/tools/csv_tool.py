import re
import pandas as pd
from typing import Annotated
from langgraph.prebuilt import InjectedState
from pandas.errors import EmptyDataError, ParserError
from langchain_core.tools import tool
from app.services.llm import llm
from app.utils.str_conversion import safe_str
from app.core.config import get_settings


settings = get_settings()
MAX_ROWS = settings.MAX_ROWS


@tool
def csv_query_tool(query: str, state: Annotated[dict, InjectedState]) -> str:
    """Use this tool to answer questions about an uploaded CSV or Excel file.
    Use this when the user has uploaded a file and is asking a question that
    requires reading, filtering, aggregating, or analyzing that file's data
    (e.g. "what's the average price", "how many rows have X", "top 5 by Y").

    Args:
        query: The user's natural language question about the file.
    """
    file_path = state["file_path"]

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

    try:
        exec(code, namespace)
    except Exception as e:
        return f"""
        Generated code:

        {code}

        Execution error:
        {str(e)}
        """

    result = namespace.get("result", "No result variable found")

    if isinstance(result, pd.DataFrame):
        result = result.head(MAX_ROWS)

    elif isinstance(result, pd.Series):
        result = result.head(MAX_ROWS)

    return safe_str(result)


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

    Store the answer directly in `result`.

    Examples:

    result = df["sales"].mean()

    result = (
        df.groupby("month")["sales"]
        .sum()
        .reset_index()
    )

    Do NOT convert to dict.
    Do NOT call to_dict().
    Do NOT serialize anything.
    """


def extract_code(response: str) -> str:
    match = re.search(
        r"```(?:python)?\n(.*?)```",
        response,
        re.DOTALL
    )

    if match:
        return match.group(1).strip()

    return response.strip()