from langchain_core.messages import ToolMessage, HumanMessage, AIMessage
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.agent.graph import graph_builder

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    file_path: Optional[str] = None
    history: Optional[list] = []


def build_history(history: list) -> list:
    """Convert frontend message history into LangChain message objects."""
    messages = []
    for item in history:
        if item.get("role") == "user":
            messages.append(HumanMessage(content=item.get("content", "")))
        elif item.get("role") == "assistant":
            messages.append(AIMessage(content=item.get("content", "")))
    return messages


def extract_text(content) -> str:
    """Handles both plain string content and Gemini's list-of-blocks content."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block.get("text", "") for block in content if isinstance(block, dict)
        )
    return str(content)


@router.post("/")
async def chat(request: ChatRequest):
    try:
        history_messages = build_history(request.history)

        model_stats = {}

        final_output = None

        async for event in graph_builder.astream_events(
            {
                "messages": history_messages + [HumanMessage(content=request.message)],
                "file_path": request.file_path,
            },
            version="v2"
        ):

            if event["event"] == "on_chat_model_start":
                name = event["name"]

                model_stats[name] = model_stats.get(name, 0) + 1

                print(f"🤖 {name}")

            elif event["event"] == "on_tool_start":
                print(f"🔧 {event['name']}")
                print(event["data"])

            elif event["event"] == "on_tool_end":
                print(f"✅ {event['name']}")

            elif (
                event["event"] == "on_chain_end"
                and event["name"] == "LangGraph"
            ):
                final_output = event["data"]["output"]

                print("\n📊 MODEL USAGE")
                for k, v in model_stats.items():
                    print(f"{k}: {v}")

            

        # result = graph_builder.invoke({
        #     "messages": history_messages + [HumanMessage(content=request.message)],
        #     "file_path": request.file_path,
        # })

        messages = final_output["messages"]

        for msg in messages:
            print("\nTYPE:", msg.__class__.__name__)

            if isinstance(msg, ToolMessage):
                print("TOOL:", msg.name)

            print(msg.content)

        serialized = []
        for msg in messages:
            serialized.append({
                "type": msg.__class__.__name__,
                "content": extract_text(msg.content),
                "name": getattr(msg, "name", None),
            })

        return {"messages": serialized}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))