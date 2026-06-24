from langgraph.graph import StateGraph, END
from langchain_core.messages import ToolMessage
from langgraph.prebuilt import tools_condition
from app.agent.state import AgentState
from app.agent.nodes import (
    agent_node,
    tool_node
)


def my_tools_condition(state):
    last = state["messages"][-1]

    tool_messages = [
        msg for msg in state["messages"]
        if isinstance(msg, ToolMessage)
    ]

    if len(tool_messages) >= 3:
        print("🛑 Tool limit reached")
        return END

    if getattr(last, "tool_calls", None):
        return "tools"

    return END


graph = StateGraph(AgentState)

# add nodes
graph.add_node("agent", agent_node)
graph.add_node("tools", tool_node)

# add edges
graph.set_entry_point("agent")
graph.add_conditional_edges(
    "agent",
    my_tools_condition,
    {
        "tools": "tools",
        END: END,
    }
)
graph.add_edge("tools", "agent")

graph_builder = graph.compile()