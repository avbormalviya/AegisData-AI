from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Data Analyst Agent"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # LLM
    GROQ_API_KEY: str
    MODEL_NAME: str = "llama-3.3-70b-versatile"
    TEMPERATURE: float = 0.0

    # Database
    DB_TYPE: str = "sqlite"
    DATABASE_URL: str = "sqlite:///./data.db"

    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024
    MAX_ROWS: int = 1000

    # CORS (for React frontend)
    FRONTEND_URL: list = ["http://localhost:5173", "http://127.0.0.1:5173"]

    class Config:
        env_file = ".env"
        case_sensitive = True


# get_settings function to access settings from anywhere in the app
@lru_cache()
def get_settings() -> Settings:
    return Settings()