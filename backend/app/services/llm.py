from langchain_groq import ChatGroq
from app.core.config import get_settings


# Settings initialization
settings = get_settings()

# LLM initialization
llm = ChatGroq(
    model=settings.MODEL_NAME,
    temperature=0,
    api_key=settings.GROQ_API_KEY
)
