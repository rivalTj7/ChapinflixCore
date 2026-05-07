# main.py
import os
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from db_mongo import init_mongo, close_mongo
from grpc_server import serve_grpc
from metrics import get_metrics

# Configuración
GRPC_PORT = int(os.getenv("GRPC_PORT", "50051"))
HTTP_PORT = int(os.getenv("HTTP_PORT", "8040"))

# FastAPI app (solo para health check y metrics)
app = FastAPI(
    title="ChapinFlix - Recomendaciones",
    description="Microservicio de recomendaciones con IA (gRPC)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    """Inicializar MongoDB al arrancar"""
    await init_mongo()
    print("✅ MongoDB conectado")

@app.on_event("shutdown")
async def shutdown():
    """Cerrar conexión MongoDB"""
    await close_mongo()
    print("✅ MongoDB desconectado")

@app.get("/health")
async def health_check():
    """Health check HTTP"""
    return {
        "status": "healthy",
        "service": "recommendations",
        "version": "1.0.0",
        "grpc_port": GRPC_PORT,
        "http_port": HTTP_PORT
    }

@app.get("/metrics")
async def metrics():
    """Prometheus metrics"""
    return get_metrics()

@app.get("/")
async def root():
    """Información del servicio"""
    return {
        "service": "ChapinFlix Recommendations Service",
        "version": "1.0.0",
        "description": "Servicio de recomendaciones con IA usando gRPC",
        "endpoints": {
            "grpc": f"localhost:{GRPC_PORT}",
            "http_health": f"localhost:{HTTP_PORT}/health",
            "http_metrics": f"localhost:{HTTP_PORT}/metrics"
        },
        "grpc_methods": [
            "GetGeneralRecommendations",
            "GetGenreBasedRecommendations",
            "GetCollaborativeRecommendations",
            "HealthCheck"
        ]
    }

async def run_servers():
    """
    Ejecuta ambos servidores en paralelo:
    - gRPC en puerto 50051
    - HTTP (FastAPI) en puerto 8040
    """
    # Crear tareas para ambos servidores
    grpc_task = asyncio.create_task(serve_grpc(GRPC_PORT))
    
    # FastAPI con uvicorn
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=HTTP_PORT,
        log_level="info"
    )
    http_server = uvicorn.Server(config)
    http_task = asyncio.create_task(http_server.serve())
    
    print(f"""
╔══════════════════════════════════════════════════════╗
║  ChapinFlix - Servicio de Recomendaciones            ║
╠══════════════════════════════════════════════════════╣
║  gRPC Server:  0.0.0.0:{GRPC_PORT}                   ║
║  HTTP Server:  http://0.0.0.0:{HTTP_PORT}            ║
║  Metrics:      http://0.0.0.0:{HTTP_PORT}/metrics    ║
║  Health:       http://0.0.0.0:{HTTP_PORT}/health     ║
╚══════════════════════════════════════════════════════╝
    """)
    
    # Ejecutar ambos servidores
    await asyncio.gather(grpc_task, http_task)

if __name__ == "__main__":
    try:
        asyncio.run(run_servers())
    except KeyboardInterrupt:
        print("\n✋ Servidores detenidos")