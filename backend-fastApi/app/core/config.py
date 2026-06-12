from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROYECTO_NAME: str = "Workflow Inteligente"

    # Base de datos Redis
    REDIS_URL: str

    # Gemini
    GEMINI_API_KEY: str

    class Config:
        env_file = ".env"  # Archivo usado en desarrollo local
        case_sensitive = False


settings = Settings()