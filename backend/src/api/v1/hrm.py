from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import json
import uuid
from datetime import datetime, timedelta

from ...models.unified_models import (
    Employee, EmployeeCreate, EmployeeUpdate, HRMEmployeesResponse,
    JobPosting, JobPostingCreate, JobPostingUpdate, HRMJobPostingsResponse,
    Application, ApplicationCreate, ApplicationUpdate, HRMApplicationsResponse,
    PerformanceReview, PerformanceReviewCreate, PerformanceReviewUpdate, HRMReviewsResponse,
    TimeEntry, TimeEntryCreate, TimeEntryUpdate, HRMTimeEntriesResponse,
    LeaveRequest, LeaveRequestCreate, LeaveRequestUpdate, HRMLeaveRequestsResponse,
    Payroll, PayrollCreate, PayrollUpdate, HRMPayrollResponse,
    Benefits, BenefitsCreate, BenefitsUpdate, HRMBenefitsResponse,
    Training, TrainingCreate, TrainingUpdate, HRMTrainingResponse,
    TrainingEnrollment, TrainingEnrollmentCreate, TrainingEnrollmentUpdate, HRMEnrollmentsResponse,
    HRMDashboard, HRMEmployeeFilters, HRMJobFilters, HRMApplicationFilters, HRMReviewFilters,
    HRMTimeFilters, HRMLeaveFilters, HRMPayrollFilters, HRMTrainingFilters
)
from ...config.unified_database import (
    get_db, get_user_by_id,
    get_employees, get_employee_by_id, create_employee, update_employee, delete_employee,
    get_job_postings, get_job_posting_by_id, create_job_posting, update_job_posting, delete_job_posting,
    get_applications, get_application_by_id, create_application, update_application, delete_application,
    get_performance_reviews, get_performance_review_by_id, create_performance_review, update_performance_review, delete_performance_review,
    get_time_entries, get_time_entry_by_id, create_time_entry, update_time_entry, delete_time_entry,
    get_leave_requests, get_leave_request_by_id, create_leave_request, update_leave_request, delete_leave_request,
    get_payroll, get_payroll_by_id, create_payroll, update_payroll, delete_payroll,
    get_benefits, get_benefit_by_id, create_benefit, update_benefit, delete_benefit,
    get_training, get_training_by_id, create_training, update_training, delete_training,
    get_training_enrollments, get_training_enrollment_by_id, create_training_enrollment, update_training_enrollment, delete_training_enrollment,
    get_hrm_dashboard_data
)
from ...api.dependencies import get_current_user, get_tenant_context, require_tenant_admin_or_super_admin

router = APIRouter(prefix="/hrm", tags=["hrm"])

# Employee endpoints
@router.get("/employees", response_model=HRMEmployeesResponse)
async def get_hrm_employees(
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    employee_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all employees with optional filtering"""
    try:
        skip = (page - 1) * limit
        employees = get_employees(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if department or status or employee_type or search:
            filtered_employees = []
            for employee in employees:
                if department and employee.department != department:
                    continue
                if status and employee.employmentStatus != status:
                    continue
                if employee_type and employee.employeeType != employee_type:
                    continue
                if search:
                    search_lower = search.lower()
                    if not any([
                        search_lower in (employee.firstName or "").lower(),
                        search_lower in (employee.lastName or "").lower(),
                        search_lower in (employee.email or "").lower(),
                        search_lower in (employee.position or "").lower()
                    ]):
                        continue
                filtered_employees.append(employee)
            employees = filtered_employees
        
        # Get total count for pagination
        total = len(employees)
        
        return HRMEmployeesResponse(
            employees=employees,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching employees: {str(e)}")

@router.post("/employees", response_model=Employee)
async def create_hrm_employee(
    employee_data: EmployeeCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new employee"""
    try:
        employee = Employee(
            id=str(uuid.uuid4()),
            **employee_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(employee)
        db.commit()
        db.refresh(employee)
        
        return employee
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating employee: {str(e)}")

@router.get("/employees/{employee_id}", response_model=Employee)
async def get_hrm_employee(
    employee_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get employee by ID"""
    try:
        employee = get_employee_by_id(db, employee_id, tenant_context["tenant_id"] if tenant_context else None)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        return employee
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching employee: {str(e)}")

@router.put("/employees/{employee_id}", response_model=Employee)
async def update_hrm_employee(
    employee_id: str,
    employee_update: EmployeeUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update employee"""
    try:
        update_data = {k: v for k, v in employee_update.dict().items() if v is not None}
        employee = update_employee(db, employee_id, update_data, tenant_context["tenant_id"] if tenant_context else None)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        return employee
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating employee: {str(e)}")

@router.delete("/employees/{employee_id}")
async def delete_hrm_employee(
    employee_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete employee"""
    try:
        success = delete_employee(db, employee_id, tenant_context["tenant_id"] if tenant_context else None)
        if not success:
            raise HTTPException(status_code=404, detail="Employee not found")
        return {"message": "Employee deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting employee: {str(e)}")

# Job Posting endpoints
@router.get("/jobs", response_model=HRMJobPostingsResponse)
async def get_hrm_jobs(
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    job_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all job postings with optional filtering"""
    try:
        skip = (page - 1) * limit
        jobs = get_job_postings(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if department or status or job_type or search:
            filtered_jobs = []
            for job in jobs:
                if department and job.department != department:
                    continue
                if status and job.status != status:
                    continue
                if job_type and job.type != job_type:
                    continue
                if search:
                    search_lower = search.lower()
                    if not any([
                        search_lower in (job.title or "").lower(),
                        search_lower in (job.description or "").lower(),
                        search_lower in (job.location or "").lower()
                    ]):
                        continue
                filtered_jobs.append(job)
            jobs = filtered_jobs
        
        # Get total count for pagination
        total = len(jobs)
        
        return HRMJobPostingsResponse(
            jobPostings=jobs,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching job postings: {str(e)}")

@router.post("/jobs", response_model=JobPosting)
async def create_hrm_job(
    job_data: JobPostingCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new job posting"""
    try:
        job = JobPosting(
            id=str(uuid.uuid4()),
            **job_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        return job
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating job posting: {str(e)}")

# Application endpoints
@router.get("/applications", response_model=HRMApplicationsResponse)
async def get_hrm_applications(
    status: Optional[str] = Query(None),
    job_posting_id: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all applications with optional filtering"""
    try:
        skip = (page - 1) * limit
        applications = get_applications(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if status or job_posting_id or assigned_to or search:
            filtered_applications = []
            for app in applications:
                if status and app.status != status:
                    continue
                if job_posting_id and app.jobPostingId != job_posting_id:
                    continue
                if assigned_to and app.assignedTo != assigned_to:
                    continue
                if search:
                    search_lower = search.lower()
                    if not any([
                        search_lower in (app.firstName or "").lower(),
                        search_lower in (app.lastName or "").lower(),
                        search_lower in (app.email or "").lower()
                    ]):
                        continue
                filtered_applications.append(app)
            applications = filtered_applications
        
        # Get total count for pagination
        total = len(applications)
        
        return HRMApplicationsResponse(
            applications=applications,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching applications: {str(e)}")

@router.post("/applications", response_model=Application)
async def create_hrm_application(
    application_data: ApplicationCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new application"""
    try:
        application = Application(
            id=str(uuid.uuid4()),
            **application_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(application)
        db.commit()
        db.refresh(application)
        
        return application
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating application: {str(e)}")

# Performance Review endpoints
@router.get("/reviews", response_model=HRMReviewsResponse)
async def get_hrm_reviews(
    employee_id: Optional[str] = Query(None),
    review_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    review_period: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all performance reviews with optional filtering"""
    try:
        skip = (page - 1) * limit
        reviews = get_performance_reviews(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if employee_id or review_type or status or review_period:
            filtered_reviews = []
            for review in reviews:
                if employee_id and review.employeeId != employee_id:
                    continue
                if review_type and review.reviewType != review_type:
                    continue
                if status and review.status != status:
                    continue
                if review_period and review.reviewPeriod != review_period:
                    continue
                filtered_reviews.append(review)
            reviews = filtered_reviews
        
        # Get total count for pagination
        total = len(reviews)
        
        return HRMReviewsResponse(
            reviews=reviews,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching performance reviews: {str(e)}")

@router.post("/reviews", response_model=PerformanceReview)
async def create_hrm_review(
    review_data: PerformanceReviewCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new performance review"""
    try:
        review = PerformanceReview(
            id=str(uuid.uuid4()),
            **review_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(review)
        db.commit()
        db.refresh(review)
        
        return review
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating performance review: {str(e)}")

# Time Entry endpoints
@router.get("/time-entries", response_model=HRMTimeEntriesResponse)
async def get_hrm_time_entries(
    employee_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all time entries with optional filtering"""
    try:
        skip = (page - 1) * limit
        time_entries = get_time_entries(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if employee_id or start_date or end_date or project_id:
            filtered_entries = []
            for entry in time_entries:
                if employee_id and entry.employeeId != employee_id:
                    continue
                if start_date and entry.date < start_date:
                    continue
                if end_date and entry.date > end_date:
                    continue
                if project_id and entry.projectId != project_id:
                    continue
                filtered_entries.append(entry)
            time_entries = filtered_entries
        
        # Get total count for pagination
        total = len(time_entries)
        
        return HRMTimeEntriesResponse(
            timeEntries=time_entries,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching time entries: {str(e)}")

@router.post("/time-entries", response_model=TimeEntry)
async def create_hrm_time_entry(
    time_entry_data: TimeEntryCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new time entry"""
    try:
        time_entry = TimeEntry(
            id=str(uuid.uuid4()),
            **time_entry_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(time_entry)
        db.commit()
        db.refresh(time_entry)
        
        return time_entry
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating time entry: {str(e)}")

# Leave Request endpoints
@router.get("/leave-requests", response_model=HRMLeaveRequestsResponse)
async def get_hrm_leave_requests(
    employee_id: Optional[str] = Query(None),
    leave_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all leave requests with optional filtering"""
    try:
        skip = (page - 1) * limit
        leave_requests = get_leave_requests(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if employee_id or leave_type or status or start_date or end_date:
            filtered_requests = []
            for request in leave_requests:
                if employee_id and request.employeeId != employee_id:
                    continue
                if leave_type and request.leaveType != leave_type:
                    continue
                if status and request.status != status:
                    continue
                if start_date and request.startDate < start_date:
                    continue
                if end_date and request.endDate > end_date:
                    continue
                filtered_requests.append(request)
            leave_requests = filtered_requests
        
        # Get total count for pagination
        total = len(leave_requests)
        
        return HRMLeaveRequestsResponse(
            leaveRequests=leave_requests,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching leave requests: {str(e)}")

@router.post("/leave-requests", response_model=LeaveRequest)
async def create_hrm_leave_request(
    leave_request_data: LeaveRequestCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new leave request"""
    try:
        leave_request = LeaveRequest(
            id=str(uuid.uuid4()),
            **leave_request_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(leave_request)
        db.commit()
        db.refresh(leave_request)
        
        return leave_request
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating leave request: {str(e)}")

# Payroll endpoints
@router.get("/payroll", response_model=HRMPayrollResponse)
async def get_hrm_payroll(
    employee_id: Optional[str] = Query(None),
    pay_period: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all payroll records with optional filtering"""
    try:
        skip = (page - 1) * limit
        payroll_records = get_payroll(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if employee_id or pay_period or status or start_date or end_date:
            filtered_records = []
            for record in payroll_records:
                if employee_id and record.employeeId != employee_id:
                    continue
                if pay_period and record.payPeriod != pay_period:
                    continue
                if status and record.status != status:
                    continue
                if start_date and record.startDate < start_date:
                    continue
                if end_date and record.endDate > end_date:
                    continue
                filtered_records.append(record)
            payroll_records = filtered_records
        
        # Get total count for pagination
        total = len(payroll_records)
        
        return HRMPayrollResponse(
            payroll=payroll_records,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching payroll records: {str(e)}")

@router.post("/payroll", response_model=Payroll)
async def create_hrm_payroll(
    payroll_data: PayrollCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new payroll record"""
    try:
        payroll = Payroll(
            id=str(uuid.uuid4()),
            **payroll_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(payroll)
        db.commit()
        db.refresh(payroll)
        
        return payroll
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating payroll record: {str(e)}")

# Benefits endpoints
@router.get("/benefits", response_model=HRMBenefitsResponse)
async def get_hrm_benefits(
    employee_id: Optional[str] = Query(None),
    benefit_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all benefits with optional filtering"""
    try:
        skip = (page - 1) * limit
        benefits = get_benefits(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if employee_id or benefit_type or status:
            filtered_benefits = []
            for benefit in benefits:
                if employee_id and benefit.employeeId != employee_id:
                    continue
                if benefit_type and benefit.benefitType != benefit_type:
                    continue
                if status and benefit.status != status:
                    continue
                filtered_benefits.append(benefit)
            benefits = filtered_benefits
        
        # Get total count for pagination
        total = len(benefits)
        
        return HRMBenefitsResponse(
            benefits=benefits,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching benefits: {str(e)}")

@router.post("/benefits", response_model=Benefits)
async def create_hrm_benefit(
    benefit_data: BenefitsCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new benefit"""
    try:
        benefit = Benefits(
            id=str(uuid.uuid4()),
            **benefit_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(benefit)
        db.commit()
        db.refresh(benefit)
        
        return benefit
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating benefit: {str(e)}")

# Training endpoints
@router.get("/training", response_model=HRMTrainingResponse)
async def get_hrm_training(
    training_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all training programs with optional filtering"""
    try:
        skip = (page - 1) * limit
        training_programs = get_training(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if training_type or status or provider or search:
            filtered_programs = []
            for program in training_programs:
                if training_type and program.trainingType != training_type:
                    continue
                if status and program.status != status:
                    continue
                if provider and program.provider != provider:
                    continue
                if search:
                    search_lower = search.lower()
                    if not any([
                        search_lower in (program.title or "").lower(),
                        search_lower in (program.description or "").lower(),
                        search_lower in (program.provider or "").lower()
                    ]):
                        continue
                filtered_programs.append(program)
            training_programs = filtered_programs
        
        # Get total count for pagination
        total = len(training_programs)
        
        return HRMTrainingResponse(
            training=training_programs,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching training programs: {str(e)}")

@router.post("/training", response_model=Training)
async def create_hrm_training(
    training_data: TrainingCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new training program"""
    try:
        training = Training(
            id=str(uuid.uuid4()),
            **training_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(training)
        db.commit()
        db.refresh(training)
        
        return training
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating training program: {str(e)}")

# Training Enrollment endpoints
@router.get("/training-enrollments", response_model=HRMEnrollmentsResponse)
async def get_hrm_training_enrollments(
    training_id: Optional[str] = Query(None),
    employee_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all training enrollments with optional filtering"""
    try:
        skip = (page - 1) * limit
        enrollments = get_training_enrollments(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if training_id or employee_id or status:
            filtered_enrollments = []
            for enrollment in enrollments:
                if training_id and enrollment.trainingId != training_id:
                    continue
                if employee_id and enrollment.employeeId != employee_id:
                    continue
                if status and enrollment.status != status:
                    continue
                filtered_enrollments.append(enrollment)
            enrollments = filtered_enrollments
        
        # Get total count for pagination
        total = len(enrollments)
        
        return HRMEnrollmentsResponse(
            enrollments=enrollments,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching training enrollments: {str(e)}")

@router.post("/training-enrollments", response_model=TrainingEnrollment)
async def create_hrm_training_enrollment(
    enrollment_data: TrainingEnrollmentCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new training enrollment"""
    try:
        enrollment = TrainingEnrollment(
            id=str(uuid.uuid4()),
            **enrollment_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        
        return enrollment
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating training enrollment: {str(e)}")

# HRM Dashboard endpoint
@router.get("/dashboard", response_model=HRMDashboard)
async def get_hrm_dashboard(
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get HRM dashboard data"""
    try:
        dashboard_data = get_hrm_dashboard_data(db, tenant_context["tenant_id"] if tenant_context else None)
        if not dashboard_data:
            raise HTTPException(status_code=500, detail="Error fetching dashboard data")
        return dashboard_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard data: {str(e)}")
