from typing import Optional, Any
import pandas as pd
from langchain_core.tools import tool
from app.services.llm import llm

@tool
def code_tool(query: str, file_path: Optional[str] = None) -> dict:
    """
    Generate and execute Python code to analyze data from a file.

    Args:
        query: The natural language query to answer
        file_path: Path to the CSV or Excel file

    Returns:
        The result of the query as a string
    """
    if file_path:
        if file_path.endswith('.csv'):
            try:
                df = pd.read_csv(file_path, encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, encoding='latin-1')

        elif file_path.endswith('.xlsx'):
            df = pd.read_excel(file_path)
        else:
            raise ValueError("Unsupported file format")
    else:
        df = None

    df_info = ""
    if df is not None:
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

    namespace = {'pd': pd, 'df': df}

    try:
        exec(code, namespace)

        result = namespace.get('result', 'No result variable found')

    except Exception as e:
        result = f"Error executing code: {e}"

    return {
        "code": code,
        "result": result
    }
    

def build_prompt(query: str, df_info: str) -> str:
    """
    Build the prompt for the LLM to generate code.

    Args:
        query: The natural language query to answer
        df_info: Information about the DataFrame

    Returns:
        The prompt as a string
    """
    return f"""
You are an expert Python and Pandas developer.

YOUR TASK
Generate Python code that answers the user's request.

USER QUERY:
{query}

DATASET INFORMATION:
{df_info}

==================================================
RULES
==================================================

1. DATAFRAME USAGE

If dataset information is provided:

- A pandas DataFrame named df already exists.
- NEVER create a new DataFrame.
- NEVER use:
    pd.read_csv()
    pd.read_excel()
    open()
    requests
    databases
    APIs
    file loading operations

- ONLY use the existing df variable.
- ONLY use columns that appear in DATASET INFORMATION.
- NEVER invent column names.

2. GENERAL PROGRAMMING REQUESTS

If the user asks for:

- algorithms
- data structures
- utility functions
- Python examples
- interview questions
- coding solutions

then generate normal Python code.

Do NOT use df unless the query specifically requires dataset analysis.

3. DATETIME SAFETY

Before using .dt:

    df[column] = pd.to_datetime(
        df[column],
        errors="coerce"
    )

Never assume a column is already datetime.

4. RESULT VARIABLE

The final answer MUST be stored in:

    result

Examples:

    result = 42

    result = "hello"

    result = [1,2,3]

    result = {{"a":1}}

    result = df.head()

5. ALLOWED RESULT TYPES

result may only be:

- str
- int
- float
- bool
- list
- dict
- pandas Series
- pandas DataFrame

Never store:

- functions
- classes
- modules
- matplotlib figures
- plots
- generators

6. VISUALIZATION RESTRICTIONS

Do NOT import:

    matplotlib
    seaborn
    plotly

Do NOT create charts.

Only return data.

7. ERROR PREVENTION

Before accessing a column:

- Verify it exists in df.columns.

If a required column does not exist:

    result = "Required column not found"

8. OUTPUT FORMAT

Return ONLY executable Python code.

Do NOT return:

- explanations
- markdown
- comments
- ```python blocks
- text before code
- text after code

==================================================
EXAMPLES
==================================================

User:
Count characters by region

Code:
result = (
    df.groupby("region")
      .size()
      .reset_index(name="count")
)

User:
Top 5 characters by HP

Code:
result = df.nlargest(5, "hp")

User:
List unique regions

Code:
result = df["region"].unique().tolist()

User:
Write merge sort in Python

Code:
def merge_sort(arr):
    if len(arr) <= 1:
        return arr

    mid = len(arr) // 2

    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])

    merged = []

    i = j = 0

    while i < len(left) and j < len(right):
        if left[i] < right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1

    merged.extend(left[i:])
    merged.extend(right[j:])

    return merged

result = merge_sort([5,2,8,1,3])

==================================================
GENERATE CODE FOR:
==================================================

{query}
"""


def extract_code(response: str) -> str:
    """
    Extract code from a response.

    Args:
        response: The response from the LLM

    Returns:
        The extracted code as a string
    """
    response = response.strip()
    response = response.replace("```python", "")
    response = response.replace("```", "")
    return response.strip()