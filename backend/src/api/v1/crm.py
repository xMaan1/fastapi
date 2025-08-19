from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import json
import uuid
from datetime import datetime, timedelta

from ...models.unified_models import (
    Lead, LeadCreate, LeadUpdate, CRMLeadsResponse,
    Contact, ContactCreate, ContactUpdate, CRMContactsResponse,
    Company, CompanyCreate, CompanyUpdate, CRMCompaniesResponse,
    Opportunity, OpportunityCreate, OpportunityUpdate, CRMOpportunitiesResponse,
    SalesActivity, SalesActivityCreate, SalesActivityUpdate, CRMActivitiesResponse,
    CRMDashboard, CRMMetrics, CRMPipeline,
    LeadStatus, LeadSource, OpportunityStage, ContactType, ActivityType
)
from ...config.unified_database import (
    get_db, get_user_by_id,
    get_leads, get_lead_by_id, create_lead, update_lead, delete_lead,
    get_contacts, get_contact_by_id, create_contact, update_contact, delete_contact,
    get_companies, get_company_by_id, create_company, update_company, delete_company,
    get_opportunities, get_opportunity_by_id, create_opportunity, update_opportunity, delete_opportunity,
    get_sales_activities, get_sales_activity_by_id, create_sales_activity, update_sales_activity, delete_sales_activity,
    get_crm_dashboard_data
)
from ...api.dependencies import get_current_user, get_tenant_context, require_tenant_admin_or_super_admin

router = APIRouter(prefix="/crm", tags=["crm"])

# Lead endpoints
@router.get("/leads", response_model=CRMLeadsResponse)
async def get_crm_leads(
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
        skip = (page - 1) * limit
        leads = get_leads(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if status or source or assigned_to or search:
            filtered_leads = []
            for lead in leads:
                if status and lead.status != status:
                    continue
                if source and lead.source != source:
                    continue
                if assigned_to and lead.assignedTo != assigned_to:
                    continue
                if search:
                    search_lower = search.lower()
                    if not any([
                        search_lower in (lead.firstName or "").lower(),
                        search_lower in (lead.lastName or "").lower(),
                        search_lower in (lead.email or "").lower(),
                        search_lower in (lead.company or "").lower()
                    ]):
                        continue
                filtered_leads.append(lead)
            leads = filtered_leads
        
        # Get total count for pagination
        total = len(leads)
        
        return CRMLeadsResponse(
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
async def create_crm_lead(
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
async def get_crm_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get a specific lead by ID"""
    try:
        lead = get_lead_by_id(lead_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        return lead
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching lead: {str(e)}")

@router.put("/leads/{lead_id}", response_model=Lead)
async def update_crm_lead(
    lead_id: str,
    lead_data: LeadUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update a lead"""
    try:
        lead = get_lead_by_id(lead_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        update_data = lead_data.dict(exclude_unset=True)
        update_data["updatedAt"] = datetime.now()
        
        updated_lead = update_lead(lead_id, update_data, db, tenant_context["tenant_id"] if tenant_context else None)
        return updated_lead
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating lead: {str(e)}")

@router.delete("/leads/{lead_id}")
async def delete_crm_lead(
    lead_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete a lead"""
    try:
        success = delete_lead(lead_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not success:
            raise HTTPException(status_code=404, detail="Lead not found")
        return {"message": "Lead deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting lead: {str(e)}")

# Contact endpoints
@router.get("/contacts", response_model=CRMContactsResponse)
async def get_crm_contacts(
    type: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all contacts with optional filtering"""
    try:
        skip = (page - 1) * limit
        contacts = get_contacts(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if type or company_id or search:
            filtered_contacts = []
            for contact in contacts:
                if type and contact.type != type:
                    continue
                if company_id and contact.companyId != company_id:
                    continue
                if search:
                    search_lower = search.lower()
                    if not any([
                        search_lower in (contact.firstName or "").lower(),
                        search_lower in (contact.lastName or "").lower(),
                        search_lower in (contact.email or "").lower(),
                        search_lower in (contact.jobTitle or "").lower()
                    ]):
                        continue
                filtered_contacts.append(contact)
            contacts = filtered_contacts
        
        total = len(contacts)
        
        return CRMContactsResponse(
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
async def create_crm_contact(
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

@router.get("/contacts/{contact_id}", response_model=Contact)
async def get_crm_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get a specific contact by ID"""
    try:
        contact = get_contact_by_id(contact_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        return contact
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contact: {str(e)}")

@router.put("/contacts/{contact_id}", response_model=Contact)
async def update_crm_contact(
    contact_id: str,
    contact_data: ContactUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update a contact"""
    try:
        contact = get_contact_by_id(contact_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        update_data = contact_data.dict(exclude_unset=True)
        update_data["updatedAt"] = datetime.now()
        
        updated_contact = update_contact(contact_id, update_data, db, tenant_context["tenant_id"] if tenant_context else None)
        return updated_contact
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating contact: {str(e)}")

@router.delete("/contacts/{contact_id}")
async def delete_crm_contact(
    contact_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete a contact"""
    try:
        success = delete_contact(contact_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not success:
            raise HTTPException(status_code=404, detail="Contact not found")
        return {"message": "Contact deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting contact: {str(e)}")

# Company endpoints
@router.get("/companies", response_model=CRMCompaniesResponse)
async def get_crm_companies(
    industry: Optional[str] = Query(None),
    size: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all companies with optional filtering"""
    try:
        skip = (page - 1) * limit
        companies = get_companies(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if industry or size or search:
            filtered_companies = []
            for company in companies:
                if industry and company.industry != industry:
                    continue
                if size and company.size != size:
                    continue
                if search:
                    search_lower = search.lower()
                    if not any([
                        search_lower in (company.name or "").lower(),
                        search_lower in (company.industry or "").lower(),
                        search_lower in (company.city or "").lower()
                    ]):
                        continue
                filtered_companies.append(company)
            companies = filtered_companies
        
        total = len(companies)
        
        return CRMCompaniesResponse(
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
async def create_crm_company(
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

@router.get("/companies/{company_id}", response_model=Company)
async def get_crm_company(
    company_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get a specific company by ID"""
    try:
        company = get_company_by_id(company_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        return company
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching company: {str(e)}")

@router.put("/companies/{company_id}", response_model=Company)
async def update_crm_company(
    company_id: str,
    company_data: CompanyUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update a company"""
    try:
        company = get_company_by_id(company_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        update_data = company_data.dict(exclude_unset=True)
        update_data["updatedAt"] = datetime.now()
        
        updated_company = update_company(company_id, update_data, db, tenant_context["tenant_id"] if tenant_context else None)
        return updated_company
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating company: {str(e)}")

@router.delete("/companies/{company_id}")
async def delete_crm_company(
    company_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete a company"""
    try:
        success = delete_company(company_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not success:
            raise HTTPException(status_code=404, detail="Company not found")
        return {"message": "Company deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting company: {str(e)}")

# Opportunity endpoints
@router.get("/opportunities", response_model=CRMOpportunitiesResponse)
async def get_crm_opportunities(
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
        skip = (page - 1) * limit
        opportunities = get_opportunities(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if stage or assigned_to or search:
            filtered_opportunities = []
            for opportunity in opportunities:
                if stage and opportunity.stage != stage:
                    continue
                if assigned_to and opportunity.assignedTo != assigned_to:
                    continue
                if search:
                    search_lower = search.lower()
                    if not any([
                        search_lower in (opportunity.title or "").lower(),
                        search_lower in (opportunity.description or "").lower()
                    ]):
                        continue
                filtered_opportunities.append(opportunity)
            opportunities = filtered_opportunities
        
        total = len(opportunities)
        
        return CRMOpportunitiesResponse(
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
async def create_crm_opportunity(
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

@router.get("/opportunities/{opportunity_id}", response_model=Opportunity)
async def get_crm_opportunity(
    opportunity_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get a specific opportunity by ID"""
    try:
        opportunity = get_opportunity_by_id(opportunity_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        return opportunity
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching opportunity: {str(e)}")

@router.put("/opportunities/{opportunity_id}", response_model=Opportunity)
async def update_crm_opportunity(
    opportunity_id: str,
    opportunity_data: OpportunityUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update an opportunity"""
    try:
        opportunity = get_opportunity_by_id(opportunity_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        update_data = opportunity_data.dict(exclude_unset=True)
        update_data["updatedAt"] = datetime.now()
        
        updated_opportunity = update_opportunity(opportunity_id, update_data, db, tenant_context["tenant_id"] if tenant_context else None)
        return updated_opportunity
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating opportunity: {str(e)}")

@router.delete("/opportunities/{opportunity_id}")
async def delete_crm_opportunity(
    opportunity_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete an opportunity"""
    try:
        success = delete_opportunity(opportunity_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not success:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        return {"message": "Opportunity deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting opportunity: {str(e)}")

# Sales Activity endpoints
@router.get("/activities", response_model=CRMActivitiesResponse)
async def get_crm_activities(
    type: Optional[str] = Query(None),
    completed: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all sales activities with optional filtering"""
    try:
        skip = (page - 1) * limit
        activities = get_sales_activities(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if type or completed is not None or search:
            filtered_activities = []
            for activity in activities:
                if type and activity.type != type:
                    continue
                if completed is not None and activity.completed != completed:
                    continue
                if search:
                    search_lower = search.lower()
                    if not any([
                        search_lower in (activity.subject or "").lower(),
                        search_lower in (activity.description or "").lower()
                    ]):
                        continue
                filtered_activities.append(activity)
            activities = filtered_activities
        
        total = len(activities)
        
        return CRMActivitiesResponse(
            activities=activities,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching activities: {str(e)}")

@router.post("/activities", response_model=SalesActivity)
async def create_crm_activity(
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
        raise HTTPException(status_code=500, detail=f"Error creating activity: {str(e)}")

@router.get("/activities/{activity_id}", response_model=SalesActivity)
async def get_crm_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get a specific sales activity by ID"""
    try:
        activity = get_sales_activity_by_id(activity_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        return activity
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching activity: {str(e)}")

@router.put("/activities/{activity_id}", response_model=SalesActivity)
async def update_crm_activity(
    activity_id: str,
    activity_data: SalesActivityUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update a sales activity"""
    try:
        activity = get_sales_activity_by_id(activity_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        update_data = activity_data.dict(exclude_unset=True)
        update_data["updatedAt"] = datetime.now()
        
        # If marking as completed, set completedAt
        if update_data.get("completed") and not activity.completed:
            update_data["completedAt"] = datetime.now()
        
        updated_activity = update_sales_activity(activity_id, update_data, db, tenant_context["tenant_id"] if tenant_context else None)
        return updated_activity
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating activity: {str(e)}")

@router.delete("/activities/{activity_id}")
async def delete_crm_activity(
    activity_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete a sales activity"""
    try:
        success = delete_sales_activity(activity_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not success:
            raise HTTPException(status_code=404, detail="Activity not found")
        return {"message": "Activity deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting activity: {str(e)}")

# Dashboard endpoint
@router.get("/dashboard", response_model=CRMDashboard)
async def get_crm_dashboard(
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get CRM dashboard data and metrics"""
    try:
        if not tenant_context:
            raise HTTPException(status_code=400, detail="Tenant context required")
        
        # Get dashboard metrics
        metrics_data = get_crm_dashboard_data(db, tenant_context["tenant_id"])
        
        # Get recent activities
        recent_activities = get_sales_activities(db, tenant_context["tenant_id"], 0, 10)
        
        # Get top opportunities
        opportunities = get_opportunities(db, tenant_context["tenant_id"], 0, 10)
        top_opportunities = sorted(opportunities, key=lambda x: x.amount or 0, reverse=True)[:5]
        
        # Get recent leads
        recent_leads = get_leads(db, tenant_context["tenant_id"], 0, 10)
        
        # Create pipeline data
        pipeline_stages = ["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"]
        pipeline_data = []
        
        for stage in pipeline_stages:
            stage_opportunities = [o for o in opportunities if o.stage == stage]
            count = len(stage_opportunities)
            value = sum(o.amount or 0 for o in stage_opportunities)
            probability = 50  # Default probability, can be enhanced later
            
            pipeline_data.append(CRMPipeline(
                stage=stage,
                count=count,
                value=value,
                probability=probability
            ))
        
        # Create dashboard response
        dashboard = CRMDashboard(
            metrics=CRMMetrics(**metrics_data),
            pipeline=pipeline_data,
            recentActivities=recent_activities,
            topOpportunities=top_opportunities,
            recentLeads=recent_leads
        )
        
        return dashboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard data: {str(e)}")

# Convert lead to contact
@router.post("/leads/{lead_id}/convert")
async def convert_lead_to_contact(
    lead_id: str,
    contact_data: ContactCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Convert a lead to a contact"""
    try:
        # Get the lead
        lead = get_lead_by_id(lead_id, db, tenant_context["tenant_id"] if tenant_context else None)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Create contact
        contact = Contact(
            id=str(uuid.uuid4()),
            **contact_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(contact)
        
        # Update lead status
        lead.status = "converted"
        lead.convertedToContact = contact.id
        lead.updatedAt = datetime.now()
        
        db.commit()
        db.refresh(contact)
        
        return {"message": "Lead converted successfully", "contact": contact}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error converting lead: {str(e)}")
