FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar archivos proto
COPY protos/ ./protos/

# Crear directorio generated si no existe
RUN mkdir -p generated

# Generar archivos Python desde proto
RUN python -m grpc_tools.protoc \
    -I./protos \
    --python_out=./generated \
    --grpc_python_out=./generated \
    --pyi_out=./generated \
    ./protos/recommendations.proto

# Crear __init__.py en generated
RUN touch generated/__init__.py

# Copiar el resto del código
COPY . .

# Exponer puertos
EXPOSE 8040 50051

# Comando de inicio
CMD ["python", "main.py"]