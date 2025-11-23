from pydantic import BaseModel, Field
from typing import Optional

class User(BaseModel):
    username: str
    hashed_password: str
    id: Optional[str] = Field(None, alias="_id")

