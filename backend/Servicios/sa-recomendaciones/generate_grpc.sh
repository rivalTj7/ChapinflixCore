#!/bin/bash
# generate_grpc.sh

echo "Generando código gRPC desde archivos .proto..."

python -m grpc_tools.protoc \
  -I./protos \
  --python_out=./generated \
  --grpc_python_out=./generated \
  ./protos/recommendations.proto

echo "✅ Archivos generados en ./generated/"
echo "   - recommendations_pb2.py"
echo "   - recommendations_pb2_grpc.py"

# Crear __init__.py si no existe
touch ./generated/__init__.py

echo "✅ Generación completada"