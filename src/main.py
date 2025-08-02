from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import create_tables
from .project_database import create_project_tables
from .tenant_database import create_tenant_tables
from .routes import auth, users, projects, tasks, tenants

app = FastAPI(title="SparkCo ERP - Project Management API", version="1.0.0")

# Ensure tables are created at startup
@app.on_event("startup")
def on_startup():
    create_tables()
    create_project_tables()
    create_tenant_tables()

# Include all routes
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(tenants.router)

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
    return {"message": "SparkCo ERP - Project Management API", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "SparkCo ERP API"}