from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "gstrecon2025"
    APP_NAME: str = "GST Graph Reconciliation Engine"
    DEBUG: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
