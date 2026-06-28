from langsmith.client import _OPENAI_API_KEY
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Data Analyst Agent"
    VERSION: str = "2.0.0"
    DEBUG: bool = False

    # LLM
    GROQ_API_KEY: str
    OPENROUTE_API_KEY: str
    MAIN_AGENT_NAME: str = "llama-3.3-70b-versatile"
    # MAIN_AGENT_NAME: str = "llama-3.1-8b-instant"
    TOOL_MODEL_NAME: str = "openai/gpt-oss-120b"
    CLASSIFIER_AGENT_NAME: str = "llama-3.1-8b-instant"
    TEMPERATURE: float = 0.0

    # Database
    DB_TYPE: str = "sqlite"
    DATABASE_URL: str = "sqlite:///./data.db"

    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024
    MAX_ROWS: int = 500

    # CORS (for React frontend)
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = True


# get_settings function to access settings from anywhere in the app
@lru_cache()
def get_settings() -> Settings:
    return Settings()