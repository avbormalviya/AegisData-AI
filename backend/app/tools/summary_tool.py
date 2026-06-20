from langchain_core.tools import tool
from app.services.llm import llm


@tool
def summary_tool(query: str, data: str) -> str:
    """
    Summarize the data based on the query.

    Args:
        query: User's request for summary
        data: JSON data to analyze

    Returns:
        Summary as a string
    """
    prompt = build_prompt(query, data)
    response = llm.invoke(prompt)
    return response.content.strip()


def build_prompt(query: str, data: str) -> str:
    """
    Build the prompt for the LLM to generate a summary.

    Args:
        query: User's request for summary
        data: JSON data to analyze

    Returns:
        Formatted prompt string
    """
    return (
        f"""
        You are a data summary expert. Your task is to analyze the following data and provide a summary based on the user's query.
        
        User Query: {query}
        Data: {data}
        
        Provide a clear summary with key insights, trends, notable numbers, plain English and concise.
        """
    )