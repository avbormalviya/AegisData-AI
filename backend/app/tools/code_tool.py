import json
import pandas as pd
from typing import Annotated
from pydantic import BaseModel
from langgraph.prebuilt import InjectedState
from langchain_core.tools import tool
from app.services.llm import tool_llm, classifier_llm
from app.utils.extract_text import extract_text
from app.utils.str_conversion import safe_str


@tool
def code_tool(query: str, state: Annotated[dict, InjectedState]) -> str:
    """Use this tool when the user asks for code to be written in any
    programming language. Handles both general coding requests (any language,
    code returned only) and Python/Pandas data analysis requests on an
    uploaded file (code is generated AND executed, with results returned).

    Args:
        query: The user's request describing what the code should do.
    """
    file_path = state.get("file_path")

    if file_path is None:
        decision = {"language": "python", "should_execute": False}
    else:
        decision = classify_code_request(query, has_file=True)


    if decision["should_execute"]:
        return generate_and_execute(query, file_path)
    else:
        return generate_only(query, decision["language"])


def classify_code_request(query: str, has_file: bool) -> dict:
    """Asks the LLM to decide: what language, and should it be executed
    against the uploaded data."""
    prompt = f"""
    Classify this code request.

    Request: {query}
    A file is uploaded: {has_file}

    Reply with ONLY valid JSON, no markdown, in this exact format:
    {{"language": "python" or "cpp" or "java" or "javascript" or other,
    "should_execute": true or false}}

    should_execute must be true ONLY if:
    - the language is python
    - AND a file is uploaded
    - AND the request is about analyzing that file's data

    Otherwise should_execute must be false.
    """
    response = classifier_llm.invoke(prompt)

    text = extract_text(response.content)

    data = json.loads(text)

    return {
        "language": data["language"],
        "should_execute": data["should_execute"]
    }


def generate_only(query: str, language: str) -> str:
    """Generates code in the requested language without executing it."""
    prompt = f"Write {language} code for this request. Return only the code, no explanation:\n{query}"
    response = tool_llm.invoke(prompt)
    code = extract_code(extract_text(response.content))
    return f"```{language}\n{code}\n```"


def generate_and_execute(query: str, file_path: str) -> str:
    """Generates Python/Pandas code and executes it against the uploaded file."""
    if file_path.endswith(".csv"):
        try:
            df = pd.read_csv(file_path, encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, encoding="latin-1")
    elif file_path.endswith((".xlsx", ".xls")):
        df = pd.read_excel(file_path)
    else:
        return "Unsupported file format."

    df_info = f"Columns: {list(df.columns)}\nDtypes:\n{df.dtypes}\nSample:\n{df.head()}"
    prompt = build_data_prompt(query, df_info)
    response = tool_llm.invoke(prompt)
    code = extract_code(extract_text(response.content))

    namespace = {"pd": pd, "df": df}
    try:
        exec(code, namespace)
        result = namespace.get("result", "No result variable found")
    except Exception as e:
        return f"Code:\n{code}\n\nError executing code: {str(e)}"

    return f"Code:\n{code}\n\nResult:\n{safe_str(result)}"


def build_data_prompt(query: str, df_info: str) -> str:
    return (
        f"A pandas DataFrame is ALREADY loaded as `df`. DO NOT load any files.\n\n"
        f"{df_info}\n\nQuestion: {query}\n\n"
        f"Write Python code using `df`. Store the final answer in `result`. "
        f"Return only code, no explanations, no markdown."
    )


def extract_code(response: str) -> str:
    response = response.strip()
    response = response.replace("```python", "").replace("```", "")
    return response.strip()