from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..unified_database import get_db, get_plans
from ..unified_models import PlansResponse

router = APIRouter(prefix="/plans", tags=["plans"])

@router.get("", response_model=PlansResponse)
async def get_available_plans(db: Session = Depends(get_db)):
    """Get all available subscription plans"""
    plans = get_plans(db)
    return PlansResponse(plans=plans)