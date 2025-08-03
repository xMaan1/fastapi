from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..unified_database import get_db, get_plans
from ..unified_models import PlansResponse

router = APIRouter(prefix="/plans", tags=["plans"])

@router.get("", response_model=PlansResponse)
async def get_available_plans(db: Session = Depends(get_db)):
    """Get all available subscription plans"""
    plans = get_plans(db)
    # Convert UUID id to string for each plan
    plans_out = []
    for plan in plans:
        plan_dict = plan.__dict__.copy()
        if isinstance(plan_dict.get('id'), (str, type(None))):
            pass
        else:
            plan_dict['id'] = str(plan_dict['id'])
        # Remove SQLAlchemy internal state if present
        plan_dict.pop('_sa_instance_state', None)
        plans_out.append(plan_dict)
    return PlansResponse(plans=plans_out)