from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.business import Business
from app.schemas.dependency import DAGResponse
from app.services.dependency_engine import build_dependency_dag
from app.services.discovery_engine import evaluate_and_generate_approvals

router = APIRouter()


@router.get(
    "/{business_id}/dependency-map",
    response_model=DAGResponse,
    summary="Get Approval Dependency Map (Directed Acyclic Graph)",
    description="Returns interactive DAG nodes and edges analyzing independent clearances (ready to apply now), in-progress, completed, and blocked clearances with prerequisite tracking.",
)
def get_dependency_map(
    business_id: str,
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business profile with ID '{business_id}' not found.",
        )

    # Ensure approvals are initialized
    evaluate_and_generate_approvals(business, db)

    return build_dependency_dag(business, db)
