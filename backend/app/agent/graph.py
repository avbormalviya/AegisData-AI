from langgraph.graph import StateGraph, END
from langchain_core.messages import ToolMessage, HumanMessage
from langgraph.prebuilt import tools_condition
from app.agent.state import AgentState
from app.agent.nodes import (
    agent_node,
    tool_node
)


def my_tools_condition(state):
    last = state["messages"][-1]

    # Find the index of the last HumanMessage in the current state
    last_human_idx = 0
    for i in range(len(state["messages"]) - 1, -1, -1):
        if isinstance(state["messages"][i], HumanMessage):
            last_human_idx = i
            break

    # Count only the tool messages generated in the current turn
    current_turn_tool_messages = [
        msg for msg in state["messages"][last_human_idx:]
        if isinstance(msg, ToolMessage)
    ]

    if len(current_turn_tool_messages) >= 5:
        print("🛑 Tool limit reached for this turn")
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