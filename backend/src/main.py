from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config.unified_database import create_tables
from .api.v1 import auth, users, projects, tasks, tenants, plans, events, sales, crm, hrm, custom_options, invoices

app = FastAPI(title="SparkCo ERP - Project Management & Sales API", version="1.0.0")

# Ensure tables are created at startup
@app.on_event("startup")
def on_startup():
    create_tables()

# Include all routes
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(tenants.router)
app.include_router(plans.router)
app.include_router(events.router)
app.include_router(sales.router)
app.include_router(crm.router)
app.include_router(hrm.router)
app.include_router(custom_options.router)
app.include_router(invoices.router)

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "SparkCo ERP - Project Management & Sales API", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "SparkCo ERP API"}