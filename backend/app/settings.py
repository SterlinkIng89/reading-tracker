from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.security import OAuth2PasswordBearer


class Settings(BaseSettings):
    # configure env file and encoding using pydantic-settings
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Mongo
    MONGO_USER: str | None = None
    MONGO_PASS: str | None = None
    MONGO_HOST: str = "mongo:27017"
    MONGO_AUTH_DB: str = "admin"
    MONGO_URL: str | None = None

    # JWT
    JWT_SECRET: str = Field("change_this_secret", env="JWT_SECRET")
    JWT_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # Cookie security for refresh token
    COOKIE_SECURE: bool = False
    # CORS
    # Accept either a comma-separated string or a JSON array in the env var
    ALLOWED_ORIGINS: str | list[str] = Field(
        "http://localhost:3000", env="ALLOWED_ORIGINS"
    )

    # (no Config class needed with pydantic-settings)


settings = Settings()


# Parse ALLOWED_ORIGINS into a list[str]
def _parse_allowed_origins(val: str | list[str] | None) -> list[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return [str(s) for s in val if str(s).strip()]
    # string: comma-separated
    if isinstance(val, str):
        return [s.strip() for s in val.split(",") if s.strip()]
    return []


ALLOWED_ORIGINS = _parse_allowed_origins(settings.ALLOWED_ORIGINS)

# build mongo url
if settings.MONGO_USER and settings.MONGO_PASS:
    MONGO_URL = f"mongodb://{settings.MONGO_USER}:{settings.MONGO_PASS}@{settings.MONGO_HOST}/?authSource={settings.MONGO_AUTH_DB}"
else:
    MONGO_URL = settings.MONGO_URL or f"mongodb://{settings.MONGO_HOST}"

_client = AsyncIOMotorClient(MONGO_URL)


def get_client() -> AsyncIOMotorClient:
    return _client


# OAuth2 scheme for dependencies (points to auth token route)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
