from typing import List, Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User's query to the AI Copilot")


class ChatResponse(BaseModel):
    reply: str
    suggested_actions: List[str] = []
    timestamp: str
    engine: str = "niyamsetu-expert-rules"


class SuggestionsResponse(BaseModel):
    business_id: str
    enterprise_name: Optional[str] = None
    suggestions: List[str]
