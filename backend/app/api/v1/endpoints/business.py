from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.business import Business
from app.schemas.business import BusinessCreate, BusinessResponse

router = APIRouter()


@router.post(
    "/profile",
    response_model=BusinessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register / Create Business Profile",
    description="Save the initial enterprise details to establish compliance and approval roadmap.",
)
def create_business_profile(
    business_in: BusinessCreate,
    db: Session = Depends(get_db),
):
    try:
        new_business = Business(
            enterprise_name=business_in.enterprise_name.strip(),
            business_type=business_in.business_type.strip(),
            state=business_in.state.strip(),
            investment_inr=business_in.investment_inr,
            employee_count=business_in.employee_count,
        )
        db.add(new_business)
        db.commit()
        db.refresh(new_business)
        return new_business
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create business profile: {str(e)}",
        )


@router.get(
    "/{business_id}",
    response_model=BusinessResponse,
    summary="Get Business Profile by ID",
    description="Retrieve business information for a specific business ID.",
)
def get_business_by_id(
    business_id: str,
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business profile with ID '{business_id}' not found.",
        )
    return business


@router.get(
    "/",
    response_model=List[BusinessResponse],
    summary="List Businesses",
    description="Retrieve a list of registered business profiles (paginated limit=50).",
)
def list_businesses(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    businesses = db.query(Business).offset(skip).limit(limit).all()
    return businesses
