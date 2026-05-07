from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import auth_router
import time
from metrics import (
    http_requests_total,
    http_request_duration_seconds,
    http_requests_in_progress,
    get_metrics
)

app = FastAPI(title="SA Practice 2 - Auth Module")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # React frontend
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
print("=" * 50)
print("=" * 50)
print("=" * 50)
print("=" * 50)
print("=" * 50)
print("=" * 50)
print("cambios realizados")
print("=" * 50)
print("🚀 AUTH SERVICE - PIPELINE TEST VERSION intento 1 calificacion fase 2")
print("=" * 50)


# Include routers
app.include_router(auth_router.router)

@app.get("/")
async def root():
    return {"message": "SA Practice 2 - Authentication Module"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Endpoint de métricas
@app.get("/metrics")
async def metrics():
    return get_metrics()

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("🚀 AUTH SERVICE - PIPELINE TEST VERSION intento 1")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)