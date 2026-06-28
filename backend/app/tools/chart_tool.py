from ast import Return
from anyio import to_thread
from anyio import to_thread
from anyio import to_thread
from anyio import to_thread
from anyio import to_thread
import json
from langchain_core.tools import tool
from app.services.llm import llm

from pydantic import BaseModel


class ChartSpec(BaseModel):
    chart_type: str
    title: str
    x_key: str
    y_key: str
    data: list


@tool
def chart_tool(query: str, data: str) -> str:
    """Use this tool to generate a chart specification when the user asks to
    visualize, plot, graph, or chart some data. Call this AFTER you have
    already retrieved the relevant data using sql_query_tool or csv_query_tool.
    Pass the data you retrieved into this tool along with the user's request.

    Args:
        query: The user's request describing what kind of chart they want.
        data: The actual data to visualize, as a string (usually the output
              from sql_query_tool or csv_query_tool).
    """
    prompt = build_prompt(query, data)

    try:
        structured_llm = llm.with_structured_output(ChartSpec)
        result = structured_llm.invoke(prompt)

        return json.dumps(result.model_dump())

    except Exception:
        response = llm.invoke(prompt)

        return extract_json(response.content)


def build_prompt(query: str, data: str) -> str:
    """
    Build the prompt for the LLM to generate chart configuration.

    Args:
        query: User's request for chart creation
        data: JSON data to analyze

    Returns:
        Formatted prompt string
    """
    return f"""
    You are a data visualization expert.

    Question:
    {query}

    Data:
    {data}

    Your task is to generate a chart specification for the frontend.

    IMPORTANT RULES:

    - Return ONLY valid JSON.
    - Do NOT return markdown.
    - Do NOT return explanations.
    - Do NOT wrap JSON in ``` blocks.
    - Do NOT generate Python code.
    - Do NOT import matplotlib.
    - Do NOT import seaborn.
    - Do NOT import plotly.
    - Do NOT call plt.plot(), plt.bar(), plt.show().
    - The frontend will render the chart.

    Supported chart types:
    - bar
    - line
    - pie
    - scatter

    Return EXACTLY this schema:

    {{
        "chart_type": "bar|line|pie|scatter",
        "title": "Chart title",
        "x_key": "column_name",
        "y_key": "column_name",
        "data": [...]
    }}

    DATA RULES:

    - data must be a list of dictionaries.
    - Never return a pandas Series.
    - Never return a NumPy array.
    - Never return a DataFrame string representation.
    - Convert all results to JSON-compatible dictionaries.
    - Use only fields that exist in the provided data.
    - If a chart cannot be created, return:

    {{
        "chart_type": "bar",
        "title": "No Data Available",
        "x_key": "",
        "y_key": "",
        "data": []
    }}

    Return only the JSON object.
    """


def extract_json(response: str) -> str:
    """
    Extract JSON from a response.

    Args:
        response: The response from the LLM

    Returns:
        The extracted JSON as a string
    """
    json_ = response.strip()
    json_ = json_.replace("```json", "")
    json_ = json_.replace("```", "")

    return json.dumps(json.loads(json_))