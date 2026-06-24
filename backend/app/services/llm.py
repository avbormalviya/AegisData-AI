from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from app.core.config import get_settings


# Settings initialization
settings = get_settings()

# LLM initialization
llm = ChatGroq(
    model=settings.MAIN_AGENT_NAME,
    temperature=settings.TEMPERATURE,
    api_key=settings.GROQ_API_KEY
)

tool_llm = ChatOpenAI(
    model=settings.TOOL_MODEL_NAME,
    temperature=settings.TEMPERATURE,
    api_key=settings.OPENROUTE_API_KEY,
    base_url="https://openrouter.ai/api/v1"
)

classifier_llm = ChatGroq(
    model=settings.CLASSIFIER_AGENT_NAME,
    temperature=settings.TEMPERATURE,
    api_key=settings.GROQ_API_KEY
)