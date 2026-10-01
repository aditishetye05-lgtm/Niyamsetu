import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.business import Business
from app.schemas.agent import ChatRequest, ChatResponse, SuggestionsResponse
from app.services.ai_context import build_business_ai_context
from app.services.ai_agent import get_ai_chat_response, generate_contextual_suggestions

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/{business_id}/agent/chat",
    response_model=ChatResponse,
    summary="Chat with NiyamSetu AI Regulatory Copilot",
    description="Sends user prompt to AI guidance copilot grounded in live enterprise compliance context.",
)
async def chat_with_agent(
    business_id: str,
    req: ChatRequest,
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business profile with ID '{business_id}' not found.",
        )

    # 1. Compile live compliance context
    context = build_business_ai_context(business_id, db)

    # 2. Generate response (LLM or deterministic statutory rules)
    result = await get_ai_chat_response(req.message, context)

    return ChatResponse(
        reply=result["reply"],
        suggested_actions=result.get("suggested_actions", []),
        timestamp=result["timestamp"],
        engine=result.get("engine", "niyamsetu-expert-rules"),
    )


@router.get(
    "/{business_id}/agent/suggestions",
    response_model=SuggestionsResponse,
    summary="Get contextual quick question chips",
    description="Returns 4 prompt chips tailored to current compliance score, blocked clearances, and document backlog.",
)
def get_agent_suggestions(
    business_id: str,
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business profile with ID '{business_id}' not found.",
        )

    context = build_business_ai_context(business_id, db)
    suggestions = generate_contextual_suggestions(context)

    return SuggestionsResponse(
        business_id=business.id,
        enterprise_name=business.enterprise_name,
        suggestions=suggestions,
    )
