# ==========================================
# GUÍA DE DEPLOYMENT
# Microservicios: Estadísticas + Recomendaciones
# ==========================================

## PASO 1: Preparar API Keys

### OpenAI API Key
1. Ir a https://platform.openai.com/api-keys
2. Crear nueva API key
3. Guardar para usar en el secret de Kubernetes

## PASO 2: Crear Secrets en Kubernetes

```bash
# Secret para estadísticas
kubectl create secret generic stats-secrets \
  --from-literal=DATABASE_URL='postgresql://postgres:<DB_PASSWORD>@<DB_HOST>:5432/chapinflix_db' \
  --from-literal=AUTH_SECRET_KEY='<AUTH_SECRET_KEY>' \
  -n default

# Secret para recomendaciones
kubectl create secret generic recommendations-secrets \
  --from-literal=MONGO_URI='mongodb+srv://<MONGO_USER>:<MONGO_PASSWORD>@<MONGO_HOST>/?retryWrites=true&w=majority&appName=content' \
  --from-literal=MONGO_DB='chapinflix_content' \
  --from-literal=OPENAI_API_KEY='<OPENAI_API_KEY>' \
  --from-literal=AUTH_SECRET_KEY='<AUTH_SECRET_KEY>' \
  -n default
```

## PASO 3: Build y Push de Imágenes Docker

```bash
# Estadísticas
cd sa-estadisticas
docker build -t gcr.io/sa-proyecto-475802/sa-estadisticas:latest .
docker push gcr.io/sa-proyecto-475802/sa-estadisticas:latest

# Recomendaciones
cd ../sa-recomendaciones
docker build -t gcr.io/sa-proyecto-475802/sa-recomendaciones:latest .
docker push gcr.io/sa-proyecto-475802/sa-recomendaciones:latest
```

## PASO 4: Deployments de Kubernetes

# ==========================================
# deployment-estadisticas.yaml
# ==========================================
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: estadisticas-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: estadisticas-service
  template:
    metadata:
      labels:
        app: estadisticas-service
    spec:
      containers:
      - name: estadisticas
        image: gcr.io/sa-proyecto-475802/sa-estadisticas:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8030
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: stats-secrets
              key: DATABASE_URL
        - name: AUTH_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: stats-secrets
              key: AUTH_SECRET_KEY
        - name: AUTH_ALGORITHM
          value: "HS256"
        - name: PORT
          value: "8030"
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: estadisticas-service
  namespace: default
spec:
  selector:
    app: estadisticas-service
  ports:
  - port: 8030
    targetPort: 8030
  type: ClusterIP

# ==========================================
# deployment-recomendaciones.yaml
# ==========================================
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: recommendations-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: recommendations-service
  template:
    metadata:
      labels:
        app: recommendations-service
    spec:
      containers:
      - name: recommendations
        image: gcr.io/sa-proyecto-475802/sa-recomendaciones:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 50051
          name: grpc
        - containerPort: 8040
          name: http
        env:
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: recommendations-secrets
              key: MONGO_URI
        - name: MONGO_DB
          valueFrom:
            secretKeyRef:
              name: recommendations-secrets
              key: MONGO_DB
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: recommendations-secrets
              key: OPENAI_API_KEY
        - name: AUTH_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: recommendations-secrets
              key: AUTH_SECRET_KEY
        - name: AUTH_ALGORITHM
          value: "HS256"
        - name: GRPC_PORT
          value: "50051"
        - name: HTTP_PORT
          value: "8040"
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: recommendations-service
  namespace: default
spec:
  selector:
    app: recommendations-service
  ports:
  - port: 50051
    targetPort: 50051
    name: grpc
  - port: 8040
    targetPort: 8040
    name: http
  type: ClusterIP

## PASO 5: Actualizar Ingress (agregar estadísticas)

```yaml
# En ingress.yaml, agregar:
- path: /stats(/|$)(.*)
  pathType: ImplementationSpecific
  backend:
    service:
      name: estadisticas-service
      port:
        number: 8030
```

## PASO 6: Aplicar deployments

```bash
kubectl apply -f deployment-estadisticas.yaml
kubectl apply -f deployment-recomendaciones.yaml
kubectl apply -f ingress.yaml
```

## PASO 7: Verificar

```bash
# Ver pods
kubectl get pods | grep -E "(estadisticas|recommendations)"

# Ver logs
kubectl logs -f deployment/estadisticas-service
kubectl logs -f deployment/recommendations-service

# Test estadísticas
curl http://<INGRESS_IP>/stats/health

# Test recomendaciones (gRPC health check desde dentro del cluster)
kubectl exec -it <catalog-pod> -- python -c "
from recommendations_client import get_recommendations_client
client = get_recommendations_client()
print(client.health_check())
"
```

## ENDPOINTS DISPONIBLES

### Estadísticas (Puerto 8030)
**Admin:**
- GET /stats/subscriptions/current
- GET /stats/subscriptions/history
- GET /stats/views/top-content
- GET /stats/views/by-genre
- GET /stats/views/demographics
- GET /stats/likes/summary
- GET /stats/likes/top-content

**Usuario:**
- POST /stats/views/record
- POST /stats/likes/toggle
- GET /stats/likes/my-likes

### Recomendaciones (gRPC Puerto 50051, HTTP 8040)
**gRPC Methods:**
- GetGeneralRecommendations
- GetGenreBasedRecommendations
- GetCollaborativeRecommendations
- HealthCheck

**Acceso desde Catálogo:**
- GET /catalog/recommendations/for-you?rec_type=general
- GET /catalog/recommendations/for-you?rec_type=genre
- GET /catalog/recommendations/for-you?rec_type=collaborative

## NOTAS IMPORTANTES

1. **OpenAI API Key**: Necesitas crearla en https://platform.openai.com
2. **gRPC**: Solo se comunica internamente entre servicios
3. **Frontend**: Solo habla con el servicio de catálogo vía REST
4. **Estadísticas**: Puede ser expuesto vía Ingress para el admin
5. **Datos de prueba**: Ya insertados en PostgreSQL con el script init.sql