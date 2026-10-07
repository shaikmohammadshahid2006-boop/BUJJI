from typing import List
import os
import importlib
from pathlib import Path

# Automatically load .env if present
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=env_path)
    except Exception:
        pass

# Check dynamically for pydantic_settings without static analyzer errors
_pydantic_settings = None
try:
    _pydantic_settings = importlib.import_module("pydantic_settings")
except Exception:
    _pydantic_settings = None

if _pydantic_settings:
    BaseSettings = _pydantic_settings.BaseSettings
    from pydantic import Field

    class Settings(BaseSettings):
        app_name: str = "JARVIS AI Assistant"
        version: str = "1.0.0"
        environment: str = Field(default="development", alias="ENVIRONMENT")
        host: str = Field(default="0.0.0.0", alias="HOST")
        port: int = Field(default=8000, alias="PORT")

        # Supabase Configuration
        supabase_url: str = Field(default="", alias="SUPABASE_URL")
        supabase_anon_key: str = Field(default="", alias="SUPABASE_ANON_KEY")
        supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
        supabase_jwt_secret: str = Field(default="", alias="SUPABASE_JWT_SECRET")

        # Google Gemini AI Key
        gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")

        # CORS Allowed Origins
        allowed_origins_raw: str = Field(
            default="http://localhost:5173,http://127.0.0.1:5173",
            alias="ALLOWED_ORIGINS"
        )

        @property
        def allowed_origins(self) -> List[str]:
            if not self.allowed_origins_raw:
                return ["http://localhost:5173"]
            return [origin.strip() for origin in self.allowed_origins_raw.split(",") if origin.strip()]

        class Config:
            case_sensitive = False
            extra = "ignore"

    settings = Settings()
else:
    # Reliable fallback to standard os.getenv (zero external dependencies)
    class Settings:
        app_name: str = "JARVIS AI Assistant"
        version: str = "1.0.0"
        environment: str = os.getenv("ENVIRONMENT", "development")
        host: str = os.getenv("HOST", "0.0.0.0")
        port: int = int(os.getenv("PORT", "8000"))

        supabase_url: str = os.getenv("SUPABASE_URL", "")
        supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
        supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        supabase_jwt_secret: str = os.getenv("SUPABASE_JWT_SECRET", "")

        gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
        allowed_origins_raw: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")

        @property
        def allowed_origins(self) -> List[str]:
            if not self.allowed_origins_raw:
                return ["http://localhost:5173"]
            return [origin.strip() for origin in self.allowed_origins_raw.split(",") if origin.strip()]

    settings = Settings()
