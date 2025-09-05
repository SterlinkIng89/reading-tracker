from pydantic import BaseModel, Field, SecretStr


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: SecretStr = Field(..., min_length=8)


class UserOut(BaseModel):
    id: str
    username: str
