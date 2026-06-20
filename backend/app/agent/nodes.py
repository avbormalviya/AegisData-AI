from app.agent.state import AgentState
from app.services.llm import llm
from app.tools.sql_tool import sql_query_tool
from app.tools.csv_tool import csv_query_tool
from app.tools.code_tool import code_tool
from app.tools.chart_tool import chart_tool
from app.tools.summary_tool import summary_tool


def classify_node(state: AgentState) -> dict:
    """
    Classify the user's query into one of the following categories:
    - sql: If the query is related to SQL database
    - csv: If the query is related to CSV file
    - chart: If the query is related to chart
    - unknown: If the query is not related to any of the above categories
    """
    if state.get("data_source") and state["data_source"] != "":
        return {"data_source": state["data_source"]}
        
    query = state["messages"][-1].content

    response = llm.invoke(
        f"""
        Classify the user's request into exactly one category:

        code:
        - user asks for code
        - user says "write code"
        - user says "python code"
        - user says "show query"
        - user says "how to do this"

        analysis:
        - user wants insights
        - user wants explanation
        - user wants summary

        chart:
        - user wants graph/chart/plot

        Question:
        {query}

        Reply with only:
        code, analysis, or chart
        """
    )

    content = response.content.lower().strip()

    if "sql" in content:
        return {"data_source": "sql"}
    elif "csv" in content:
        return {"data_source": "csv"}
    elif "code" in content:
        return {"data_source": "code"}
    else:
        return {"data_source": "general"}


def should_create_chart(query: str, result: str) -> bool:
    response = llm.invoke(
        f"""
        Decide whether a chart is needed to answer the query.

        Question: {query}
        Data:
        {result}

        **CRITICAL RULES:**

        1. Only return true or false 
        2. No explanation. No other text.

        Return ONLY true or false. No explanation. No other text.
        """
    )
    print(response.content)
    return response.content.lower().strip() == "true"


def execute_node(state: AgentState) -> dict:
    """
    Execute the appropriate tool based on the data source.
    """
    query = state["messages"][-1].content
    data_source = state["data_source"]
    file_path = state.get("file_path")

    if data_source == "sql":
        result = sql_query_tool.invoke({"query": query})
    elif data_source in ("csv", "chart", "code"):
        if not file_path:
            return {"result": "No file path provided"}
        result = csv_query_tool.invoke({"query": query, "file_path": file_path})
    else:
        result = "General question, no data query needed."

    return {"result": result, "chart_needed": should_create_chart(query, result)}


def general_node(state: AgentState) -> dict:
    query = state["messages"][-1].content
    response = llm.invoke(f"You are a helpful data analyst assistant. Respond naturally to this message: {query}")
    return {"summary": response.content.strip()}


def code_node(state: AgentState) -> dict:
    """
    Generate code based on the query result.
    """
    query = state["messages"][-1].content
    file_path = state["file_path"]

    result = code_tool.invoke({"query": query, "file_path": file_path})

    return {"code": result.get("code"), "result": result.get("result") }


def chart_node(state: AgentState) -> dict:
    """
    Generate a chart based on the query result.
    """
    query = state["messages"][-1].content
    data = state["result"]

    chart_result = chart_tool.invoke({"query": query, "data": data})

    # print("\n=== RAW RESPONSE ===")
    # print(data)
    # print("====================\n")

    return {"chart_spec": chart_result}


def summary_node(state: AgentState) -> dict:
    """
    Generate a summary of the query result.
    """
    query = state["messages"][-1].content
    data = state["result"]

    summary_result = summary_tool.invoke({"query": query, "data": data})

    return {"summary": summary_result}
