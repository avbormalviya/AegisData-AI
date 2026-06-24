from typing import TypedDict, Annotated, Optional
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]  # full chat history, LangGraph manages this
    file_path: Optional[str]                 # path to uploaded CSV/Excel