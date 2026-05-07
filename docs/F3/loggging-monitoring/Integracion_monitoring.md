# Manual de Integración
## Integración del Stack de Monitoring con Chapinflix

**Proyecto:** Chapinflix - Fase 3  
**Versión:** 1.0  
**Fecha:** Octubre 2025  
**Cluster:** chapinflix-standard (GKE)

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura de Integración](#arquitectura-de-integración)
3. [Configuración de Microservicios](#configuración-de-microservicios)
4. [Instrumentación de Código](#instrumentación-de-código)
5. [Configuración de Prometheus](#configuración-de-prometheus)
6. [Configuración de Grafana](#configuración-de-grafana)
7. [Recopilación de Métricas](#recopilación-de-métricas)
8. [Pruebas de Integración](#pruebas-de-integración)
9. [Troubleshooting de Integración](#troubleshooting-de-integración)

---

## Introducción

Este manual detalla cómo integrar las herramientas de monitoring (Prometheus y Grafana) con los microservicios de Chapinflix desplegados en GKE.

### Objetivos de la Integración

- Exponer métricas desde cada microservicio
- Configurar Prometheus para recopilar métricas automáticamente
- Visualizar métricas en Grafana
- Monitorear el rendimiento y disponibilidad de los servicios

### Microservicios de Chapinflix

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| auth-service | 8000 | Autenticación y autorización |
| inventario-service | 8001 | Gestión de inventario |
| ususarios-service | 8002 | Gestión de usuarios |
| pago-service | 8005 | Procesamiento de pagos |
| vercatalogo-service | 8010 | Catálogo de contenido |
| verpeli-service | 8020 | Streaming de video |

---

## Arquitectura de Integración

### Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                    Namespace: default                       │
│                                                             │
│  ┌──────────────────┐      ┌───────────────────┐            │
│  │  auth-service    │      │ inventario-service│            │
│  │  :8000/metrics   │      │  :8001/metrics    │            │
│  └────────┬─────────┘      └────────┬──────────┘            │
│           │                         │                       │
│  ┌────────┴─────────┐      ┌────────┴───────────┐           │
│  │ ususarios-service│      │  pago-service     │            │
│  │  :8002/metrics   │      │  :8005/metrics    │            │
│  └────────┬─────────┘      └────────┬──────────┘            │
│           │                         │                       │
│  ┌────────┴─────────────┐  ┌───────┴──────────┐             │
│  │ vercatalogo-service  │  │ verpeli-service  │             │
│  │  :8010/metrics       │  │  :8020/metrics   │             │
│  └──────────────────────┘  └──────────────────┘             │
│           │                         │                       │
│           │  ┌──────────────────────┘                       │
│           │  │  Annotations:                                │
│           │  │  - prometheus.io/scrape: "true"              │
│           │  │  - prometheus.io/port: "<PORT>"              │
│           │  │  - prometheus.io/path: "/metrics"            │
└───────────┼──┼──────────────────────────────────────────────┘
            │  │
            │  │ scrape
            ▼  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Namespace: monitoring                      │ │                                                             │
│  ┌────────────────────────────────────────────┐             │
│  │            Prometheus                      │             │
│  │  Job: chapinflix-services                  │             │
│  │  - Service Discovery: Kubernetes Pods      │             │
│  │  - Relabel configs: Filter by annotations  │             │
│  └───────────────┬────────────────────────────┘             │
│                  │                                          │
│                  │ query                                    │
│                  ▼                                          │
│  ┌───────────────────────────────────────────┐              │
│  │            Grafana                        │              │
│  │  - Datasource: Prometheus                 │              │
│  │  - Dashboard: Chapinflix Overview         │              │
│  └───────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Componentes de la Integración

1. **Anotaciones de Kubernetes**: Indican a Prometheus qué pods scrapear
2. **Service Discovery**: Prometheus descubre automáticamente los pods
3. **Endpoints /metrics**: Cada microservicio expone métricas
4. **Scraping**: Prometheus recopila métricas cada 15 segundos
5. **Visualización**: Grafana consulta y muestra las métricas

---

## Configuración de Microservicios

### Paso 1: Agregar Anotaciones a los Deployments

Las anotaciones de Prometheus se agregan a los pods para indicar que deben ser scrapeados.

#### Método 1: Usando kubectl patch (Recomendado)

```bash
# Auth Service (Puerto 8000)
kubectl patch deployment auth-service -n default -p '{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "prometheus.io/scrape": "true",
          "prometheus.io/port": "8000",
          "prometheus.io/path": "/metrics"
        }
      }
    }
  }
}'

# Inventario Service (Puerto 8001)
kubectl patch deployment inventario-service -n default -p '{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "prometheus.io/scrape": "true",
          "prometheus.io/port": "8001",
          "prometheus.io/path": "/metrics"
        }
      }
    }
  }
}'

# Usuarios Service (Puerto 8002)
kubectl patch deployment ususarios-service -n default -p '{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "prometheus.io/scrape": "true",
          "prometheus.io/port": "8002",
          "prometheus.io/path": "/metrics"
        }
      }
    }
  }
}'

# Pago Service (Puerto 8005)
kubectl patch deployment pago-service -n default -p '{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "prometheus.io/scrape": "true",
          "prometheus.io/port": "8005",
          "prometheus.io/path": "/metrics"
        }
      }
    }
  }
}'

# Ver Catálogo Service (Puerto 8010)
kubectl patch deployment vercatalogo-service -n default -p '{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "prometheus.io/scrape": "true",
          "prometheus.io/port": "8010",
          "prometheus.io/path": "/metrics"
        }
      }
    }
  }
}'

# Ver Peli Service (Puerto 8020)
kubectl patch deployment verpeli-service -n default -p '{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "prometheus.io/scrape": "true",
          "prometheus.io/port": "8020",
          "prometheus.io/path": "/metrics"
        }
      }
    }
  }
}'
```

#### Método 2: Modificar YAML del Deployment

Editar el archivo YAML del deployment y agregar las anotaciones:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: default
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8000"
        prometheus.io/path: "/metrics"
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: gcr.io/your-project/auth-service:latest
        ports:
        - containerPort: 8000
```

Aplicar cambios:
```bash
kubectl apply -f auth-service-deployment.yaml
```

### Paso 2: Verificar Anotaciones

```bash
# Verificar anotaciones en el deployment
kubectl get deployment auth-service -n default -o jsonpath='{.spec.template.metadata.annotations}'

# Verificar anotaciones en los pods actuales
kubectl get pods -n default -l app=auth-service -o jsonpath='{.items[0].metadata.annotations}' | jq .
```

**Salida esperada:**
```json
{
  "prometheus.io/path": "/metrics",
  "prometheus.io/port": "8000",
  "prometheus.io/scrape": "true"
}
```

### Paso 3: Verificar que los Pods se Reinicien

Después de aplicar las anotaciones, los pods deben reiniciarse:

```bash
# Ver el rollout status
kubectl rollout status deployment auth-service -n default

# Ver los pods nuevos
kubectl get pods -n default -l app=auth-service
```

---

## Instrumentación de Código

### Implementar Endpoint /metrics

Cada microservicio debe exponer un endpoint `/metrics` en formato Prometheus.

#### Para Servicios en Python (FastAPI/Flask)

**Instalar biblioteca:**
```bash
pip install prometheus-client
```

**Código de ejemplo (FastAPI):**

```python
from fastapi import FastAPI
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response
import time

app = FastAPI()

# Métricas personalizadas
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP Requests',
    ['method', 'endpoint', 'status']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP Request Duration',
    ['method', 'endpoint']
)

ACTIVE_REQUESTS = Gauge(
    'http_requests_active',
    'Active HTTP Requests'
)

# Endpoint de métricas
@app.get("/metrics")
async def metrics():
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

# Middleware para tracking
@app.middleware("http")
async def track_metrics(request, call_next):
    ACTIVE_REQUESTS.inc()
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    REQUEST_DURATION.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)
    
    ACTIVE_REQUESTS.dec()
    return response

# Endpoints de la aplicación
@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "Auth Service"}
```

**Agregar a requirements.txt:**
```
prometheus-client==0.19.0
```

#### Para Servicios en Node.js (Express)

**Instalar biblioteca:**
```bash
npm install prom-client
```

**Código de ejemplo:**

```javascript
const express = require('express');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 8000;

// Crear registry
const register = new client.Registry();

// Métricas por defecto
client.collectDefaultMetrics({ register });

// Métricas personalizadas
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP Requests',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP Request Duration',
  labelNames: ['method', 'endpoint'],
  registers: [register]
});

// Middleware para tracking
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    httpRequestCounter.labels(
      req.method,
      req.path,
      res.statusCode
    ).inc();
    
    httpRequestDuration.labels(
      req.method,
      req.path
    ).observe(duration);
  });
  
  next();
});

// Endpoint de métricas
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Endpoints de la aplicación
app.get('/', (req, res) => {
  res.json({ message: 'Auth Service' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Agregar a package.json:**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "prom-client": "^15.1.0"
  }
}
```

#### Para Servicios en Java (Spring Boot)

**Agregar dependencia a pom.xml:**
```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

**Configurar application.properties:**
```properties
management.endpoints.web.exposure.include=health,info,prometheus
management.metrics.export.prometheus.enabled=true
management.endpoint.prometheus.enabled=true
```

**El endpoint /actuator/prometheus estará disponible automáticamente.**

Para usar /metrics en lugar de /actuator/prometheus, agregar configuración:
```properties
management.endpoints.web.base-path=/
management.endpoints.web.path-mapping.prometheus=metrics
```

### Métricas Recomendadas

#### Métricas Básicas (RED Method)

1. **Rate**: Tasa de requests
   ```python
   http_requests_total
   ```

2. **Errors**: Tasa de errores
   ```python
   http_requests_total{status=~"5.."}
   ```

3. **Duration**: Latencia
   ```python
   http_request_duration_seconds
   ```

#### Métricas de Negocio

Para servicios específicos, agregar métricas de negocio:

**Auth Service:**
```python
login_attempts_total = Counter('login_attempts_total', 'Total login attempts', ['result'])
active_sessions = Gauge('active_sessions', 'Active user sessions')
```

**Ver Peli Service:**
```python
video_streams_active = Gauge('video_streams_active', 'Active video streams')
video_chunks_served = Counter('video_chunks_served_total', 'Total video chunks served')
video_processing_duration = Histogram('video_processing_duration_seconds', 'Video processing duration')
```

**Pago Service:**
```python
payment_transactions = Counter('payment_transactions_total', 'Payment transactions', ['status'])
payment_amount = Histogram('payment_amount_dollars', 'Payment amounts')
```

### Verificar Endpoint /metrics

```bash
# Port-forward al servicio
kubectl port-forward -n default deployment/auth-service 8000:8000

# En otra terminal, verificar el endpoint
curl http://localhost:8000/metrics

# Debe retornar métricas en formato Prometheus:
# HELP http_requests_total Total HTTP Requests
# TYPE http_requests_total counter
# http_requests_total{method="GET",endpoint="/health",status="200"} 42.0
# ...
```

---

## Configuración de Prometheus

### Job de Scraping para Chapinflix

El job `chapinflix-services` ya está configurado en Prometheus (archivo `02-prometheus-config.yaml`):

```yaml
- job_name: 'chapinflix-services'
  kubernetes_sd_configs:
    - role: pod
      namespaces:
        names:
          - default
  relabel_configs:
    # Solo pods con label app=*-service
    - source_labels: [__meta_kubernetes_pod_label_app]
      action: keep
      regex: '.*-service'
    
    # Solo pods con annotation prometheus.io/scrape=true
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
    
    # Usar puerto de annotation
    - source_labels: [__meta_kubernetes_pod_ip, __meta_kubernetes_pod_annotation_prometheus_io_port]
      action: replace
      target_label: __address__
      regex: ([^:]+);(\d+)
      replacement: $1:$2
    
    # Usar path de annotation
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
      action: replace
      target_label: __metrics_path__
      regex: (.+)
    
    # Agregar labels útiles
    - action: labelmap
      regex: __meta_kubernetes_pod_label_(.+)
    
    - source_labels: [__meta_kubernetes_namespace]
      action: replace
      target_label: kubernetes_namespace
    
    - source_labels: [__meta_kubernetes_pod_name]
      action: replace
      target_label: kubernetes_pod_name
```

### Verificar Targets en Prometheus

1. Acceder a Prometheus UI: `http://<PROMETHEUS_IP>:9090`
2. Ir a **Status → Targets**
3. Buscar el job `chapinflix-services`
4. Verificar que todos los servicios aparezcan como **UP**

**Ejemplo de targets esperados:**
```
Job: chapinflix-services
┌─────────────────────────────────────────────────────────────┐
│ Endpoint                              State  Labels          │
├─────────────────────────────────────────────────────────────┤
│ 10.x.x.x:8000                        UP     app=auth-service│
│ 10.x.x.x:8001                        UP     app=inventario  │
│ 10.x.x.x:8002                        UP     app=ususarios   │
│ 10.x.x.x:8005                        UP     app=pago        │
│ 10.x.x.x:8010                        UP     app=vercatalogo │
│ 10.x.x.x:8020                        UP     app=verpeli     │
└─────────────────────────────────────────────────────────────┘
```

### Troubleshooting de Scraping

#### Si los targets no aparecen:

```bash
# Verificar que las anotaciones estén presentes
kubectl get pods -n default -o yaml | grep -A 5 "prometheus.io"

# Verificar logs de Prometheus
kubectl logs -n monitoring -l app=prometheus --tail=100 | grep chapinflix
```

#### Si los targets aparecen como DOWN:

```bash
# Verificar que el endpoint /metrics responda
POD_NAME=$(kubectl get pods -n default -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $POD_NAME -n default -- curl http://localhost:8000/metrics

# Verificar conectividad desde Prometheus
kubectl exec -n monitoring -it deployment/prometheus -- wget -O- http://<POD_IP>:8000/metrics
```

---

## Configuración de Grafana

### Verificar Datasource de Prometheus

1. Acceder a Grafana: `http://<GRAFANA_IP>:3000`
2. Login con `admin` / `Chapinflix2024!`
3. Ir a **Configuration → Data Sources**
4. Click en "Prometheus"
5. Verificar configuración:
   - URL: `http://prometheus:9090`
   - Access: Server (default)
6. Click en "Test" - debe mostrar "Data source is working"

### Dashboard de Chapinflix

El dashboard "Chapinflix - Overview Dashboard" ya está provisionado automáticamente.

**Para verificar:**
1. Ir a **Dashboards → Browse**
2. Buscar "Chapinflix"
3. Abrir el dashboard

**Paneles incluidos:**
- Running Pods
- Service Status (Auth, Inventario, All)
- CPU Usage por microservicio
- Memory Usage por microservicio
- Network Traffic
- Pod Restarts
- HPA Status
- Disk I/O

### Crear Dashboard Personalizado por Servicio

#### Ejemplo: Dashboard para Auth Service

1. Click en **+ → Dashboard**
2. Click en **Add new panel**

**Panel 1: Service Status**
- Visualization: Stat
- Query: `up{kubernetes_pod_name=~"auth-service.*"}`
- Value mappings:
  - 0 → DOWN (red)
  - 1 → UP (green)

**Panel 2: Request Rate**
- Visualization: Time series
- Query: `sum(rate(http_requests_total{kubernetes_pod_name=~"auth-service.*"}[5m]))`
- Unit: requests/sec

**Panel 3: Error Rate**
- Visualization: Time series
- Query: `sum(rate(http_requests_total{kubernetes_pod_name=~"auth-service.*",status=~"5.."}[5m]))`
- Unit: errors/sec
- Thresholds: Red > 0

**Panel 4: Latency p95**
- Visualization: Time series
- Query: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{kubernetes_pod_name=~"auth-service.*"}[5m])) by (le))`
- Unit: seconds

**Panel 5: CPU Usage**
- Visualization: Time series
- Query: `sum(rate(container_cpu_usage_seconds_total{pod=~"auth-service.*"}[5m])) * 100`
- Unit: percent

**Panel 6: Memory Usage**
- Visualization: Time series
- Query: `sum(container_memory_working_set_bytes{pod=~"auth-service.*"}) / 1024 / 1024`
- Unit: MB

3. Guardar dashboard con nombre "Auth Service - Detailed"

---

## Recopilación de Métricas

### Métricas del Sistema (Automáticas)

Prometheus recopila automáticamente:

#### De Kubelet (cAdvisor):
- `container_cpu_usage_seconds_total`: Uso de CPU
- `container_memory_working_set_bytes`: Uso de memoria
- `container_network_receive_bytes_total`: Red recibida
- `container_network_transmit_bytes_total`: Red transmitida
- `container_fs_reads_bytes_total`: Lectura de disco
- `container_fs_writes_bytes_total`: Escritura de disco

#### De Kube-State-Metrics:
- `kube_pod_status_phase`: Estado de pods
- `kube_pod_container_status_restarts_total`: Reinicios
- `kube_pod_container_resource_requests`: Recursos solicitados
- `kube_pod_container_resource_limits`: Límites de recursos
- `kube_deployment_status_replicas`: Réplicas de deployments

### Métricas de Aplicación (Personalizadas)

Deben ser implementadas en el código:

#### Métricas HTTP (Recomendadas para todos los servicios):
- `http_requests_total`: Total de requests
- `http_request_duration_seconds`: Duración de requests
- `http_requests_active`: Requests activos

#### Métricas de Negocio (Específicas por servicio):

**Auth Service:**
- `login_attempts_total{result="success|failure"}`
- `active_sessions`
- `token_generations_total`

**Ver Peli Service:**
- `video_streams_active`
- `video_chunks_served_total`
- `video_processing_duration_seconds`
- `video_encoding_errors_total`

**Pago Service:**
- `payment_transactions_total{status="success|failure"}`
- `payment_amount_total`
- `payment_processing_duration_seconds`

### Consultar Métricas

#### Desde Prometheus UI:

```promql
# Ver todas las métricas de un servicio
{kubernetes_pod_name=~"auth-service.*"}

# Request rate por servicio
sum(rate(http_requests_total[5m])) by (kubernetes_pod_name)

# CPU usage por servicio
sum(rate(container_cpu_usage_seconds_total{namespace="default"}[5m])) by (pod) * 100

# Memory usage por servicio
sum(container_memory_working_set_bytes{namespace="default"}) by (pod) / 1024 / 1024
```

#### Desde Grafana:

Usar el panel de Explore para pruebas ad-hoc de consultas.

---

## Pruebas de Integración

### Checklist de Verificación

```bash
# 1. Verificar que los servicios estén corriendo
kubectl get pods -n default

# 2. Verificar anotaciones
kubectl get pods -n default -o yaml | grep -A 5 "prometheus.io"

# 3. Verificar que /metrics responda
for service in auth inventario ususarios pago vercatalogo verpeli; do
  POD=$(kubectl get pods -n default -l app=${service}-service -o jsonpath='{.items[0].metadata.name}')
  echo "Testing $service:"
  kubectl exec -it $POD -n default -- curl -s http://localhost:8000/metrics | head -5
done

# 4. Verificar targets en Prometheus
curl -s http://<PROMETHEUS_IP>:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="chapinflix-services") | {pod: .labels.kubernetes_pod_name, health: .health}'

# 5. Verificar que las métricas se estén recopilando
curl -s "http://<PROMETHEUS_IP>:9090/api/v1/query?query=up{job=\"chapinflix-services\"}" | jq '.data.result'

# 6. Verificar dashboard en Grafana
# Acceder manualmente a http://<GRAFANA_IP>:3000
```

### Pruebas de Carga

Generar tráfico para verificar que las métricas se actualizan:

```bash
# Generar requests a un servicio
for i in {1..100}; do
  kubectl exec -it $(kubectl get pods -n default -l app=auth-service -o jsonpath='{.items[0].metadata.name}') -n default -- curl -s http://localhost:8000/health > /dev/null
  echo "Request $i completed"
  sleep 0.1
done

# Verificar en Grafana que el panel de "Request Rate" muestre actividad
```

---

## Troubleshooting de Integración

### Problema: Endpoints /metrics no responden

**Diagnóstico:**
```bash
POD_NAME=$(kubectl get pods -n default -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $POD_NAME -n default -- curl http://localhost:8000/metrics
```

**Posibles causas:**
1. El código no tiene implementado el endpoint
2. El endpoint está en un path diferente
3. El servicio no está escuchando en el puerto correcto

**Solución:**
1. Implementar el endpoint según la sección "Instrumentación de Código"
2. Verificar logs de la aplicación
3. Verificar que el puerto en las anotaciones coincida con el del servicio

### Problema: Prometheus no scrapea los servicios

**Diagnóstico:**
```bash
# Ver configuración de Prometheus
kubectl get configmap prometheus-config -n monitoring -o yaml

# Ver logs de Prometheus
kubectl logs -n monitoring -l app=prometheus --tail=100 | grep -i error

# Ver targets
curl -s http://<PROMETHEUS_IP>:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="chapinflix-services")'
```

**Posibles causas:**
1. Anotaciones no están presentes en los pods
2. Service Discovery no encuentra los pods
3. Configuración de relabeling incorrecta

**Solución:**
1. Verificar y aplicar anotaciones
2. Verificar que el label `app` termine en `-service`
3. Recargar configuración de Prometheus

### Problema: Métricas aparecen en Prometheus pero no en Grafana

**Diagnóstico:**
```bash
# Verificar conexión de Grafana a Prometheus
kubectl exec -n monitoring -it deployment/grafana -- wget -O- http://prometheus:9090/api/v1/query?query=up

# Ver logs de Grafana
kubectl logs -n monitoring -l app=grafana --tail=100 | grep -i prometheus
```

**Posibles causas:**
1. Datasource de Prometheus no configurado
2. Dashboard con queries incorrectas
3. Rango de tiempo en Grafana no apropiado

**Solución:**
1. Verificar datasource en Grafana (Configuration → Data Sources)
2. Verificar queries en el panel de Explore
3. Ajustar rango de tiempo a "Last 5 minutes"

### Problema: Métricas de aplicación no aparecen

**Diagnóstico:**
```promql
# En Prometheus, buscar métricas específicas
http_requests_total{kubernetes_pod_name=~"auth-service.*"}
```

**Posibles causas:**
1. El código no está registrando las métricas
2. Middleware no está configurado
3. No hay tráfico hacia el servicio

**Solución:**
1. Verificar implementación del código
2. Verificar que el middleware esté habilitado
3. Generar tráfico de prueba

---

### Comandos Útiles

```bash
# Agregar anotaciones rápidamente
for service in auth inventario ususarios pago vercatalogo verpeli; do
  kubectl patch deployment ${service}-service -n default -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"prometheus.io/scrape\":\"true\",\"prometheus.io/port\":\"8000\",\"prometheus.io/path\":\"/metrics\"}}}}}"
done

# Verificar todas las anotaciones
kubectl get pods -n default -o json | jq -r '.items[] | select(.metadata.annotations."prometheus.io/scrape" == "true") | "\(.metadata.name): \(.metadata.annotations."prometheus.io/port")"'

# Ver todas las métricas disponibles
curl -s http://<PROMETHEUS_IP>:9090/api/v1/label/__name__/values | jq '.data[]' | grep http

# Probar una query
curl -s "http://<PROMETHEUS_IP>:9090/api/v1/query?query=up" | jq '.data.result'
```