from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import json
import uuid
from datetime import datetime, timedelta

from ...models.unified_models import (
    Lead, LeadCreate, LeadUpdate, LeadsResponse,
    Contact, ContactCreate, ContactUpdate, ContactsResponse,
    Company, CompanyCreate, CompanyUpdate, CompaniesResponse,
    Opportunity, OpportunityCreate, OpportunityUpdate, OpportunitiesResponse,
    Quote, QuoteCreate, QuoteUpdate, QuotesResponse,
    Contract, ContractCreate, ContractUpdate, ContractsResponse,
    SalesActivity, SalesActivityCreate, SalesActivityUpdate, SalesActivitiesResponse,
    SalesDashboard, SalesMetrics, SalesPipeline,
    LeadStatus, LeadSource, OpportunityStage, QuoteStatus, ContractStatus, ContactType, ActivityType
)
from ...config.unified_database import (
    get_db, get_user_by_id
)
from ...api.dependencies import get_current_user, get_tenant_context, require_tenant_admin_or_super_admin

router = APIRouter(prefix="/sales", tags=["sales"])

# Helper functions
def generate_quote_number():
    """Generate unique quote number"""
    return f"Q-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

def generate_contract_number():
    """Generate unique contract number"""
    return f"C-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

# Lead endpoints
@router.get("/leads", response_model=LeadsResponse)
async def get_leads(
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all leads with optional filtering"""
    try:
        query = db.query(Lead)
        
        if tenant_context:
            query = query.filter(Lead.tenantId == tenant_context["tenant_id"])
        
        if status:
            query = query.filter(Lead.status == status)
        if source:
            query = query.filter(Lead.leadSource == source)
        if assigned_to:
            query = query.filter(Lead.assignedTo == assigned_to)
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Lead.firstName.ilike(search_filter)) |
                (Lead.lastName.ilike(search_filter)) |
                (Lead.email.ilike(search_filter)) |
                (Lead.company.ilike(search_filter))
            )
        
        total = query.count()
        leads = query.offset((page - 1) * limit).limit(limit).all()
        
        return LeadsResponse(
            leads=leads,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching leads: {str(e)}")

@router.post("/leads", response_model=Lead)
async def create_lead(
    lead_data: LeadCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new lead"""
    try:
        lead = Lead(
            id=str(uuid.uuid4()),
            **lead_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(lead)
        db.commit()
        db.refresh(lead)
        
        return lead
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating lead: {str(e)}")

@router.get("/leads/{lead_id}", response_model=Lead)
async def get_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get a specific lead"""
    try:
        query = db.query(Lead).filter(Lead.id == lead_id)
        if tenant_context:
            query = query.filter(Lead.tenantId == tenant_context["tenant_id"])
        
        lead = query.first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        return lead
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching lead: {str(e)}")

@router.put("/leads/{lead_id}", response_model=Lead)
async def update_lead(
    lead_id: str,
    lead_data: LeadUpdate,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update a lead"""
    try:
        query = db.query(Lead).filter(Lead.id == lead_id)
        if tenant_context:
            query = query.filter(Lead.tenantId == tenant_context["tenant_id"])
        
        lead = query.first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        for field, value in lead_data.dict(exclude_unset=True).items():
            setattr(lead, field, value)
        
        lead.updatedAt = datetime.now()
        db.commit()
        db.refresh(lead)
        
        return lead
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating lead: {str(e)}")

@router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete a lead"""
    try:
        query = db.query(Lead).filter(Lead.id == lead_id)
        if tenant_context:
            query = query.filter(Lead.tenantId == tenant_context["tenant_id"])
        
        lead = query.first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        db.delete(lead)
        db.commit()
        
        return {"message": "Lead deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting lead: {str(e)}")

# Contact endpoints
@router.get("/contacts", response_model=ContactsResponse)
async def get_contacts(
    company_id: Optional[str] = Query(None),
    contact_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all contacts with optional filtering"""
    try:
        query = db.query(Contact)
        
        if tenant_context:
            query = query.filter(Contact.tenantId == tenant_context["tenant_id"])
        
        if company_id:
            query = query.filter(Contact.companyId == company_id)
        if contact_type:
            query = query.filter(Contact.contactType == contact_type)
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Contact.firstName.ilike(search_filter)) |
                (Contact.lastName.ilike(search_filter)) |
                (Contact.email.ilike(search_filter))
            )
        
        total = query.count()
        contacts = query.offset((page - 1) * limit).limit(limit).all()
        
        return ContactsResponse(
            contacts=contacts,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contacts: {str(e)}")

@router.post("/contacts", response_model=Contact)
async def create_contact(
    contact_data: ContactCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new contact"""
    try:
        contact = Contact(
            id=str(uuid.uuid4()),
            **contact_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(contact)
        db.commit()
        db.refresh(contact)
        
        return contact
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating contact: {str(e)}")

@router.put("/contacts/{contact_id}", response_model=Contact)
async def update_contact(
    contact_id: str,
    contact_data: ContactUpdate,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update a contact"""
    try:
        query = db.query(Contact).filter(Contact.id == contact_id)
        if tenant_context:
            query = query.filter(Contact.tenantId == tenant_context["tenant_id"])
        
        contact = query.first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        for field, value in contact_data.dict(exclude_unset=True).items():
            setattr(contact, field, value)
        
        contact.updatedAt = datetime.now()
        db.commit()
        db.refresh(contact)
        
        return contact
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating contact: {str(e)}")

@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete a contact"""
    try:
        query = db.query(Contact).filter(Contact.id == contact_id)
        if tenant_context:
            query = query.filter(Contact.tenantId == tenant_context["tenant_id"])
        
        contact = query.first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        db.delete(contact)
        db.commit()
        
        return {"message": "Contact deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting contact: {str(e)}")

# Company endpoints
@router.get("/companies", response_model=CompaniesResponse)
async def get_companies(
    industry: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all companies with optional filtering"""
    try:
        query = db.query(Company)
        
        if tenant_context:
            query = query.filter(Company.tenantId == tenant_context["tenant_id"])
        
        if industry:
            query = query.filter(Company.industry == industry)
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Company.name.ilike(search_filter)) |
                (Company.description.ilike(search_filter))
            )
        
        total = query.count()
        companies = query.offset((page - 1) * limit).limit(limit).all()
        
        return CompaniesResponse(
            companies=companies,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching companies: {str(e)}")

@router.post("/companies", response_model=Company)
async def create_company(
    company_data: CompanyCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new company"""
    try:
        company = Company(
            id=str(uuid.uuid4()),
            **company_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(company)
        db.commit()
        db.refresh(company)
        
        return company
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating company: {str(e)}")

@router.put("/companies/{company_id}", response_model=Company)
async def update_company(
    company_id: str,
    company_data: CompanyUpdate,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update a company"""
    try:
        query = db.query(Company).filter(Company.id == company_id)
        if tenant_context:
            query = query.filter(Company.tenantId == tenant_context["tenant_id"])
        
        company = query.first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        for field, value in company_data.dict(exclude_unset=True).items():
            setattr(company, field, value)
        
        company.updatedAt = datetime.now()
        db.commit()
        db.refresh(company)
        
        return company
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating company: {str(e)}")

@router.delete("/companies/{company_id}")
async def delete_company(
    company_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete a company"""
    try:
        query = db.query(Company).filter(Company.id == company_id)
        if tenant_context:
            query = query.filter(Company.tenantId == tenant_context["tenant_id"])
        
        company = query.first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        db.delete(company)
        db.commit()
        
        return {"message": "Company deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting company: {str(e)}")

# Opportunity endpoints
@router.get("/opportunities", response_model=OpportunitiesResponse)
async def get_opportunities(
    stage: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all opportunities with optional filtering"""
    try:
        query = db.query(Opportunity)
        
        if tenant_context:
            query = query.filter(Opportunity.tenantId == tenant_context["tenant_id"])
        
        if stage:
            query = query.filter(Opportunity.stage == stage)
        if assigned_to:
            query = query.filter(Opportunity.assignedTo == assigned_to)
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Opportunity.name.ilike(search_filter)) |
                (Opportunity.title.ilike(search_filter)) |
                (Opportunity.description.ilike(search_filter))
            )
        
        total = query.count()
        opportunities = query.offset((page - 1) * limit).limit(limit).all()
        
        return OpportunitiesResponse(
            opportunities=opportunities,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching opportunities: {str(e)}")

@router.post("/opportunities", response_model=Opportunity)
async def create_opportunity(
    opportunity_data: OpportunityCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new opportunity"""
    try:
        opportunity = Opportunity(
            id=str(uuid.uuid4()),
            **opportunity_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(opportunity)
        db.commit()
        db.refresh(opportunity)
        
        return opportunity
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating opportunity: {str(e)}")

@router.put("/opportunities/{opportunity_id}", response_model=Opportunity)
async def update_opportunity(
    opportunity_id: str,
    opportunity_data: OpportunityUpdate,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update an opportunity"""
    try:
        query = db.query(Opportunity).filter(Opportunity.id == opportunity_id)
        if tenant_context:
            query = query.filter(Opportunity.tenantId == tenant_context["tenant_id"])
        
        opportunity = query.first()
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        for field, value in opportunity_data.dict(exclude_unset=True).items():
            setattr(opportunity, field, value)
        
        opportunity.updatedAt = datetime.now()
        db.commit()
        db.refresh(opportunity)
        
        return opportunity
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating opportunity: {str(e)}")

@router.delete("/opportunities/{opportunity_id}")
async def delete_opportunity(
    opportunity_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete an opportunity"""
    try:
        query = db.query(Opportunity).filter(Opportunity.id == opportunity_id)
        if tenant_context:
            query = query.filter(Opportunity.tenantId == tenant_context["tenant_id"])
        
        opportunity = query.first()
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        db.delete(opportunity)
        db.commit()
        
        return {"message": "Opportunity deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting opportunity: {str(e)}")

# Quote endpoints
@router.get("/quotes", response_model=QuotesResponse)
async def get_quotes(
    status: Optional[str] = Query(None),
    opportunity_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all quotes with optional filtering"""
    try:
        query = db.query(Quote)
        
        if tenant_context:
            query = query.filter(Quote.tenantId == tenant_context["tenant_id"])
        
        if status:
            query = query.filter(Quote.status == status)
        if opportunity_id:
            query = query.filter(Quote.opportunityId == opportunity_id)
        
        total = query.count()
        quotes = query.offset((page - 1) * limit).limit(limit).all()
        
        return QuotesResponse(
            quotes=quotes,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching quotes: {str(e)}")

@router.post("/quotes", response_model=Quote)
async def create_quote(
    quote_data: QuoteCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new quote"""
    try:
        quote = Quote(
            id=str(uuid.uuid4()),
            **quote_data.dict(),
            quoteNumber=generate_quote_number(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(quote)
        db.commit()
        db.refresh(quote)
        
        return quote
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating quote: {str(e)}")

@router.put("/quotes/{quote_id}", response_model=Quote)
async def update_quote(
    quote_id: str,
    quote_data: QuoteUpdate,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update a quote"""
    try:
        query = db.query(Quote).filter(Quote.id == quote_id)
        if tenant_context:
            query = query.filter(Quote.tenantId == tenant_context["tenant_id"])
        
        quote = query.first()
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        for field, value in quote_data.dict(exclude_unset=True).items():
            setattr(quote, field, value)
        
        quote.updatedAt = datetime.now()
        db.commit()
        db.refresh(quote)
        
        return quote
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating quote: {str(e)}")

@router.delete("/quotes/{quote_id}")
async def delete_quote(
    quote_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete a quote"""
    try:
        query = db.query(Quote).filter(Quote.id == quote_id)
        if tenant_context:
            query = query.filter(Quote.tenantId == tenant_context["tenant_id"])
        
        quote = query.first()
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        db.delete(quote)
        db.commit()
        
        return {"message": "Quote deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting quote: {str(e)}")

# Contract endpoints
@router.get("/contracts", response_model=ContractsResponse)
async def get_contracts(
    status: Optional[str] = Query(None),
    opportunity_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all contracts with optional filtering"""
    try:
        query = db.query(Contract)
        
        if tenant_context:
            query = query.filter(Contract.tenantId == tenant_context["tenant_id"])
        
        if status:
            query = query.filter(Contract.status == status)
        if opportunity_id:
            query = query.filter(Contract.opportunityId == opportunity_id)
        
        total = query.count()
        contracts = query.offset((page - 1) * limit).limit(limit).all()
        
        return ContractsResponse(
            contracts=contracts,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contracts: {str(e)}")

@router.post("/contracts", response_model=Contract)
async def create_contract(
    contract_data: ContractCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new contract"""
    try:
        contract = Contract(
            id=str(uuid.uuid4()),
            **contract_data.dict(),
            contractNumber=generate_contract_number(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(contract)
        db.commit()
        db.refresh(contract)
        
        return contract
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating contract: {str(e)}")

@router.put("/contracts/{contract_id}", response_model=Contract)
async def update_contract(
    contract_id: str,
    contract_data: ContractUpdate,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update a contract"""
    try:
        query = db.query(Contract).filter(Contract.id == contract_id)
        if tenant_context:
            query = query.filter(Contract.tenantId == tenant_context["tenant_id"])
        
        contract = query.first()
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        for field, value in contract_data.dict(exclude_unset=True).items():
            setattr(contract, field, value)
        
        contract.updatedAt = datetime.now()
        db.commit()
        db.refresh(contract)
        
        return contract
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating contract: {str(e)}")

@router.delete("/contracts/{contract_id}")
async def delete_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete a contract"""
    try:
        query = db.query(Contract).filter(Contract.id == contract_id)
        if tenant_context:
            query = query.filter(Contract.tenantId == tenant_context["tenant_id"])
        
        contract = query.first()
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
        
        db.delete(contract)
        db.commit()
        
        return {"message": "Contract deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting contract: {str(e)}")

# Sales Activity endpoints
@router.get("/activities", response_model=SalesActivitiesResponse)
async def get_sales_activities(
    lead_id: Optional[str] = Query(None),
    opportunity_id: Optional[str] = Query(None),
    contact_id: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all sales activities with optional filtering"""
    try:
        query = db.query(SalesActivity)
        
        if tenant_context:
            query = query.filter(SalesActivity.tenantId == tenant_context["tenant_id"])
        
        if lead_id:
            query = query.filter(SalesActivity.leadId == lead_id)
        if opportunity_id:
            query = query.filter(SalesActivity.opportunityId == opportunity_id)
        if contact_id:
            query = query.filter(SalesActivity.contactId == contact_id)
        if company_id:
            query = query.filter(SalesActivity.companyId == company_id)
        if type:
            query = query.filter(SalesActivity.type == type)
        
        total = query.count()
        activities = query.offset((page - 1) * limit).limit(limit).all()
        
        return SalesActivitiesResponse(
            activities=activities,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sales activities: {str(e)}")

@router.post("/activities", response_model=SalesActivity)
async def create_sales_activity(
    activity_data: SalesActivityCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new sales activity"""
    try:
        activity = SalesActivity(
            id=str(uuid.uuid4()),
            **activity_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(activity)
        db.commit()
        db.refresh(activity)
        
        return activity
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating sales activity: {str(e)}")

# Sales Dashboard endpoint
@router.get("/dashboard", response_model=SalesDashboard)
async def get_sales_dashboard(
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get sales dashboard data"""
    try:
        # Build base queries with tenant filtering
        base_lead_query = db.query(Lead)
        base_opportunity_query = db.query(Opportunity)
        
        if tenant_context:
            base_lead_query = base_lead_query.filter(Lead.tenantId == tenant_context["tenant_id"])
            base_opportunity_query = base_opportunity_query.filter(Opportunity.tenantId == tenant_context["tenant_id"])
        
        # Calculate metrics
        total_leads = base_lead_query.count()
        active_leads = base_lead_query.filter(Lead.status.in_([LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED])).count()
        
        total_opportunities = base_opportunity_query.count()
        open_opportunities = base_opportunity_query.filter(
            Opportunity.stage.in_([OpportunityStage.PROSPECTING, OpportunityStage.QUALIFICATION, OpportunityStage.QUALIFIED, OpportunityStage.PROPOSAL, OpportunityStage.NEGOTIATION])
        ).count()
        
        # Calculate revenue metrics
        revenue_query = base_opportunity_query.filter(Opportunity.stage == OpportunityStage.CLOSED_WON)
        total_revenue = revenue_query.with_entities(db.func.sum(Opportunity.amount)).scalar() or 0
        
        projected_query = base_opportunity_query.filter(
            Opportunity.stage.in_([OpportunityStage.PROPOSAL, OpportunityStage.NEGOTIATION])
        )
        projected_revenue = projected_query.with_entities(db.func.sum(Opportunity.amount)).scalar() or 0
        
        # Calculate conversion rate
        conversion_rate = 0
        if total_leads > 0:
            converted_leads = base_lead_query.filter(Lead.status == LeadStatus.WON).count()
            conversion_rate = round((converted_leads / total_leads) * 100, 1)
        
        # Calculate average deal size
        avg_deal_size = 0
        if total_opportunities > 0:
            avg_deal_size = total_revenue / total_opportunities
        
        metrics = SalesMetrics(
            totalLeads=total_leads,
            activeLeads=active_leads,
            totalOpportunities=total_opportunities,
            openOpportunities=open_opportunities,
            totalRevenue=float(total_revenue),
            projectedRevenue=float(projected_revenue),
            conversionRate=conversion_rate,
            averageDealSize=float(avg_deal_size)
        )
        
        # Build pipeline data
        pipeline_stages = [
            OpportunityStage.PROSPECTING,
            OpportunityStage.QUALIFICATION,
            OpportunityStage.QUALIFIED,
            OpportunityStage.PROPOSAL,
            OpportunityStage.NEGOTIATION
        ]
        
        pipeline = []
        for stage in pipeline_stages:
            stage_query = base_opportunity_query.filter(Opportunity.stage == stage)
            count = stage_query.count()
            value = stage_query.with_entities(db.func.sum(Opportunity.amount)).scalar() or 0
            
            # Calculate probability based on stage
            probability_map = {
                OpportunityStage.PROSPECTING: 20,
                OpportunityStage.QUALIFICATION: 40,
                OpportunityStage.QUALIFIED: 60,
                OpportunityStage.PROPOSAL: 80,
                OpportunityStage.NEGOTIATION: 90
            }
            probability = probability_map.get(stage, 50)
            
            pipeline.append(SalesPipeline(
                stage=stage,
                count=count,
                value=float(value),
                probability=probability
            ))
        
        # Get recent activities and top opportunities
        recent_activities = []
        top_opportunities = []
        
        if tenant_context:
            recent_activities = db.query(SalesActivity).filter(
                SalesActivity.tenantId == tenant_context["tenant_id"]
            ).order_by(SalesActivity.createdAt.desc()).limit(10).all()
            
            top_opportunities = base_opportunity_query.filter(
                Opportunity.stage.in_([OpportunityStage.PROPOSAL, OpportunityStage.NEGOTIATION])
            ).order_by(Opportunity.amount.desc()).limit(5).all()
        
        return SalesDashboard(
            metrics=metrics,
            pipeline=pipeline,
            recentActivities=recent_activities,
            topOpportunities=top_opportunities
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sales dashboard: {str(e)}")

# Sales Analytics endpoints
@router.get("/analytics/revenue")
async def get_revenue_analytics(
    period: str = Query("monthly", description="Period: daily, weekly, monthly, yearly"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get revenue analytics data"""
    try:
        # This would implement real analytics based on your data structure
        # For now, returning a basic structure
        return {
            "period": period,
            "data": [
                {"date": "2024-01", "revenue": 0.0},
                {"date": "2024-02", "revenue": 0.0},
                {"date": "2024-03", "revenue": 0.0},
                {"date": "2024-04", "revenue": 0.0}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching revenue analytics: {str(e)}")

@router.get("/analytics/conversion")
async def get_conversion_analytics(
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get conversion rate analytics"""
    try:
        # This would implement real conversion analytics
        # For now, returning a basic structure
        return {
            "overallConversionRate": 0.0,
            "conversionBySource": [
                {"source": "Website", "rate": 0.0},
                {"source": "Referral", "rate": 0.0},
                {"source": "Cold Outreach", "rate": 0.0}
            ],
            "conversionByStage": [
                {"stage": "Lead to Opportunity", "rate": 0.0},
                {"stage": "Opportunity to Quote", "rate": 0.0},
                {"stage": "Quote to Contract", "rate": 0.0}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching conversion analytics: {str(e)}")

