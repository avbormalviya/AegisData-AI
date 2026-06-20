from typing import TypedDict, Annotated, Optional
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]  # full chat history, LangGraph manages this
    query: str                               # current user question
    data_source: str                         # "sql" or "csv"
    file_path: Optional[str]                 # path to uploaded CSV/Excel
    code: Optional[str]                      # generated code
    df_summary: Optional[str]                # schema/column info passed to LLM
    result: Optional[str]                    # raw query result as string
    chart_needed: Optional[bool]             # whether chart is needed
    chart_spec: Optional[dict]               # chart JSON for frontend
    summary: Optional[str]                   # final human-readable answer
    error: Optional[str]                     # any error to handle gracefully
    tool_calls: int                          # retry counter