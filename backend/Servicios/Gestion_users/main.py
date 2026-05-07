from fastapi import FastAPI, Request
from db import init_pool, close_pool
from routers import users
from authkit import add_auth_middleware
from fastapi.middleware.cors import CORSMiddleware
import time
from metrics import (
    http_requests_total,
    http_request_duration_seconds,
    http_requests_in_progress,
    get_metrics
)

app = FastAPI(
    title="Chapinflix - Gestionar Usuarios", 
    version="0.1.0",
    description="User management service for administrators"
)

# Add JWT middleware
add_auth_middleware(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware para métricas
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    method = request.method
    endpoint = request.url.path
    
    http_requests_in_progress.labels(method=method, endpoint=endpoint).inc()
    start_time = time.time()
    
    try:
        response = await call_next(request)
        status = response.status_code
    except Exception:
        status = 500
        raise
    finally:
        duration = time.time() - start_time
        http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration)
        http_requests_total.labels(method=method, endpoint=endpoint, status=status).inc()
        http_requests_in_progress.labels(method=method, endpoint=endpoint).dec()
    
    return response

# Endpoint de métricas
@app.get("/metrics")
async def metrics():
    return get_metrics()

@app.on_event("startup")
async def startup():
    await init_pool()

@app.on_event("shutdown")
async def shutdown():
    await close_pool()

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "user-management"}

# Include routers
app.include_router(users.router)