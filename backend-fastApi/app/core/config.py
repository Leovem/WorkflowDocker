from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROYECTO_NAME: str = "Workflow Inteligente"

    # Base de datos postgres
#    DATABASE_URL: str

    # Base de datos mongodb
#    MONGO_URL: str
#    MONGO_DB_NAME: str = "workflow_inteligente"

    # Base de datos redis
    REDIS_URL: str

    # Seguridad
#    SECRET_KEY: str
#    ALGORITHM: str = "HS256"
#    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 *24 # 1 dia
    
    GEMINI_API_KEY: str 

    class Config:
        env_file = ".env_docker"  # Archivo de variables de entorno para Docker
        case_sensitive = False


settings = Settings()