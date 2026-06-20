from langgraph.graph import StateGraph, END
from app.agent.state import AgentState
from app.agent.nodes import (
    classify_node,
    execute_node,
    general_node,
    code_node,
    chart_node,
    summary_node
)

def route_after_execute(state: AgentState) -> str:
    """
    Route to chart or summary node based on the data source.
    """
    ds = state["data_source"]
    chart_needed = state["chart_needed"]

    if ds == "general":
        return "general"
    if ds == "code":
        return "code"
    if chart_needed:
        return "chart"
    return "summary"


graph = StateGraph(AgentState)

# add nodes
graph.add_node("classify", classify_node)
graph.add_node("execute", execute_node)
graph.add_node("general", general_node)
graph.add_node("code", code_node)
graph.add_node("chart", chart_node)
graph.add_node("summary", summary_node)

# add edges
graph.add_edge("classify", "execute")
graph.add_conditional_edges(
    "execute",
    route_after_execute,
    {
        "chart": "chart",
        "general": "general",
        "code": "code",
        "summary": "summary",
        "end": END
    }
)
graph.add_edge("chart", "summary")
graph.add_edge("summary", END)
graph.add_edge("general", END)
graph.add_edge("code", END)

# set entry point
graph.set_entry_point("classify")

graph_builder = graph.compile()