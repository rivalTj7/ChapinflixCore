# Microservicio de Recomendaciones - ChapinFlix

## Estructura de Directorios

```
sa-recomendaciones/
├── main.py
├── grpc_server.py            (servidor gRPC)
├── recommendations_service.py (lógica de recomendaciones)
├── ai_service.py             (integración OpenAI)
├── db_mongo.py               (conexión MongoDB - igual que catálogo)
├── authkit.py                (mismo archivo)
├── metrics.py                (Prometheus)
├── requirements.txt
├── Dockerfile
├── .env.example
├── protos/
│   ├── recommendations.proto  (definición gRPC)
│   └── __init__.py
├── generated/                 (archivos generados por protoc)
│   ├── __init__.py
│   ├── recommendations_pb2.py
│   └── recommendations_pb2_grpc.py
└── models/
    ├── __init__.py
    └── schemas.py
```

## Puerto y Servicios

- **Puerto gRPC**: 50051 (interno, no expuesto al exterior)
- **Puerto HTTP/Metrics**: 8040 (solo para health check y metrics)
- **Base de datos**: MongoDB (lectura de movies y user_views)

## 3 Tipos de Recomendaciones

### 1. **Recomendaciones Generales** (sin autenticación)
- Películas más populares
- Contenido reciente con buena valoración
- No requiere historial del usuario

### 2. **Recomendaciones por Género Favorito** (con autenticación)
- Analiza el historial de visualización del usuario
- Identifica sus géneros favoritos
- Recomienda contenido similar

### 3. **Recomendaciones por Similitud de Usuarios** (con autenticación)
- Encuentra usuarios con gustos similares (collaborative filtering básico)
- Recomienda contenido que esos usuarios han visto y gustado
- Usa IA para entender patrones de visualización

## Integración con OpenAI

Se usará OpenAI para:
- Analizar descripciones de películas
- Encontrar similitudes semánticas
- Generar recomendaciones personalizadas basadas en el perfil del usuario

## Flujo de Comunicación

```
Frontend → REST → Servicio Catálogo
                       ↓
                  Cliente gRPC
                       ↓
            Servidor gRPC (Recomendaciones)
                       ↓
              ┌────────┴────────┐
              ↓                 ↓
           MongoDB          OpenAI API
```
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Dar permisos de ejecución al script
chmod +x generate_grpc.sh

# 3. Generar código gRPC
./generate_grpc.sh

# O manualmente:
python -m grpc_tools.protoc -I./protos --python_out=./generated --grpc_python_out=./generated ./protos/recommendations.proto

# 4. Ejecutar servidor
python main.py
