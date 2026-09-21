from functools import lru_cache

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=None,
        extra="ignore",
        case_sensitive=False,
    )

    gemini_api_key: SecretStr = Field(repr=False)
    github_token: str | None = Field(default=None, repr=False)
    gitlab_token: str | None = Field(default=None, repr=False)
    app_version: str = "1.0.0"
    cors_origin: str = "http://localhost:3000"

    @field_validator("gemini_api_key", mode="before")
    @classmethod
    def gemini_key_required(cls, value: object) -> object:
        if value is None or (isinstance(value, str) and not value.strip()):
            raise ValueError("GEMINI_API_KEY is required")
        return value

    @field_validator("github_token", "gitlab_token", mode="before")
    @classmethod
    def empty_optional_token(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [self.cors_origin]


@lru_cache
def get_settings() -> Settings:
    return Settings()
