# main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from authkit import add_auth_middleware
from db_mongo import init_mongo, close_mongo
from routers import catalog_viewer
import time
from metrics import (
    http_requests_total,
    http_request_duration_seconds,
    http_requests_in_progress,
    get_metrics
)
app = FastAPI(
    title="Chapinflix - Ver Catálogo",
    description="Microservicio para visualización del catálogo de películas (Mongo)",
    version="0.2.0"
)

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
    await init_mongo()

@app.on_event("shutdown")
async def shutdown():
    await close_mongo()

app.include_router(catalog_viewer.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "catalog-viewer"}
