from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import create_tables
from .project_database import create_project_tables
from .routes import auth, users, projects, tasks

app = FastAPI(title="SparkCo ERP - Project Management API", version="1.0.0")

# Ensure tables are created at startup
@app.on_event("startup")
def on_startup():
    create_tables()
    create_project_tables()

# Include all routes with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")

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