from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from langchain_core.messages import HumanMessage
from app.agent.graph import graph_builder
from app.core.config import get_settings


# define request model
class ChatRequest(BaseModel):
    message: str
    file_path: Optional[str] = None
    mode: Optional[str] = None


router = APIRouter()


@router.post("/")
def chat(request: ChatRequest):
    print("chat endpoint hit")
    try:
        result = graph_builder.invoke({
            "messages": [HumanMessage(content=request.message)],
            "file_path": request.file_path,
            "data_source": request.mode or "",
            "code": "",
            "result": "",
            "chart_needed": False,
            "chart_spec": None,
            "summary": "",
            "error": None,
            "tool_calls": 0,
            "query": request.message,
            "df_summary": None
        })
        return {
            "summary": result["summary"],
            "chart_spec": result["chart_spec"],
            "code": result["code"],
            "result": result["result"]
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))