# Manual de Integración
## Integración del Stack de Logging con Chapinflix
---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura de Integración](#arquitectura-de-integración)
3. [Generación de Logs en Microservicios](#generación-de-logs-en-microservicios)
4. [Configuración de Filebeat](#configuración-de-filebeat)
5. [Configuración de Logstash](#configuración-de-logstash)
6. [Estructura de Logs](#estructura-de-logs)

---

## Introducción

Este manual detalla cómo integrar el stack de logging (ELK) con los microservicios de Chapinflix para centralizar y analizar logs de forma eficiente.

### Objetivos de la Integración

- Recopilar logs de todos los microservicios automáticamente
- Estructurar logs con información relevante
- Enriquecer logs con metadatos de Kubernetes
- Hacer los logs fácilmente buscables en Kibana
- Detectar y categorizar niveles de log (ERROR, WARN, INFO, DEBUG)

### Microservicios de Chapinflix

| Servicio | Puerto | Namespace | Descripción |
|----------|--------|-----------|-------------|
| auth-service | 8000 | default | Autenticación y autorización |
| inventario-service | 8001 | default | Gestión de inventario |
| ususarios-service | 8002 | default | Gestión de usuarios |
| pago-service | 8005 | default | Procesamiento de pagos |
| vercatalogo-service | 8010 | default | Catálogo de contenido |
| verpeli-service | 8020 | default | Streaming de video |

---

## Arquitectura de Integración

### Flujo Completo de Logs

```
┌────────────────────────────────────────────────────────────┐
│  Microservicio (Python/Node.js/Java)                       │
│  ┌───────────────────────────────────────────────────┐     │
│  │  Aplicación                                       │     │
│  │  - logger.info("User logged in")                  │     │
│  │  - logger.error("Connection failed")              │     │
│  └─────────────────┬─────────────────────────────────┘     │
│                    │                                       │
│                    │ stdout/stderr                         │
│                    ▼                                       │
│  ┌───────────────────────────────────────────────────┐     │
│  │  Docker Container Runtime                         │     │
│  │  - Redirige stdout/stderr a archivos de log       │     │
│  └─────────────────┬─────────────────────────────────┘     │
└────────────────────┼───────────────────────────────────────┘
                     │
                     │ Escribe a
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Node (Host)                                               │
│  /var/log/containers/                                      │
│  ├── auth-service-7d8f9c-abc_default_auth_xxx.log          │
│  ├── inventario-service-8e9g0d-xyz_default_inv_xxx.log     │
│  ├── ususarios-service-9f0h1e-def_default_user_xxx.log     │
│  └── ...                                                   │
└───────────────────┬────────────────────────────────────────┘
                    │
                    │ Lee logs
                    ▼
┌────────────────────────────────────────────────────────────┐
│  Filebeat (DaemonSet - corre en cada nodo)                 │
│  ┌───────────────────────────────────────────────────┐     │
│  │  1. Lee /var/log/containers/*.log                 │     │
│  │  2. Filtra solo pods de Chapinflix                │     │
│  │  3. Agrega metadatos de Kubernetes:               │     │
│  │     - namespace, pod name, container name         │     │
│  │     - node name, labels                           │     │
│  │  4. Intenta parsear JSON                          │     │
│  │  5. Envía a Logstash                              │     │
│  └─────────────────┬─────────────────────────────────┘     │
└────────────────────┼───────────────────────────────────────┘
                     │
                     │ Beats protocol (puerto 5044)
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Logstash (Deployment)                                     │
│  ┌───────────────────────────────────────────────────┐     │
│  │  Input: Beats (puerto 5044)                       │     │
│  │  ↓                                                │     │
│  │  Filters:                                         │     │
│  │  1. Parse JSON si el mensaje es JSON              │     │
│  │  2. Extrae info de Kubernetes                     │     │
│  │     k8s_namespace, k8s_pod, k8s_container         │     │
│  │  3. Detecta nivel de log:                         │     │
│  │     ERROR, WARN, INFO, DEBUG                      │     │
│  │  4. Agrega timestamp de procesamiento             │     │
│  │  5. Agrega tags: chapinflix, gke                  │     │
│  │  ↓                                                │     │
│  │  Output: Elasticsearch                            │     │
│  │  - Index: chapinflix-logs-YYYY.MM.dd              │     │
│  └─────────────────┬─────────────────────────────────┘     │
└────────────────────┼───────────────────────────────────────┘
                     │
                     │ HTTP REST (puerto 9200)
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Elasticsearch (StatefulSet)                               │
│  ┌───────────────────────────────────────────────────┐     │
│  │  - Indexa logs                                    │     │
│  │  - Crea índice por día                            │     │
│  │  - Permite búsquedas rápidas                      │     │
│  │  - Almacena en PersistentVolume (20Gi)            │     │
│  └─────────────────┬─────────────────────────────────┘     │
└────────────────────┼───────────────────────────────────────┘
                     │
                     │ Queries HTTP REST
                     ▼
┌────────────────────────────────────────────────────────────┐
│  Kibana (Deployment + LoadBalancer)                        │
│  - Visualiza logs                                          │
│  - Permite búsquedas                                       │
│  - Crea dashboards                                         │
│  - Acceso: http://<KIBANA_IP>:5601                         │
└────────────────────────────────────────────────────────────┘
```

### Componentes Clave

1. **Aplicación**: Genera logs usando bibliotecas de logging
2. **Docker**: Redirige stdout/stderr a archivos
3. **Kubernetes**: Gestiona los archivos de log en `/var/log/containers/`
4. **Filebeat**: Recolecta logs de archivos del host
5. **Logstash**: Procesa y enriquece logs
6. **Elasticsearch**: Almacena e indexa logs
7. **Kibana**: Interfaz de visualización

---

## Generación de Logs en Microservicios

### Principios de Logging

1. **Usar bibliotecas de logging estándar** (no `print()` o `console.log()` directamente)
2. **Incluir niveles de log apropiados** (ERROR, WARN, INFO, DEBUG)
3. **Logs estructurados en JSON cuando sea posible**
4. **Incluir información contextual** (request_id, user_id, etc.)
5. **No registrar información sensible** (passwords, tokens, PII)

### Implementación por Lenguaje

#### Python (usando logging)

**Configuración básica:**

```python
import logging
import json
from datetime import datetime

# Configurar logging estructurado
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Agregar información extra si existe
        if hasattr(record, 'request_id'):
            log_obj['request_id'] = record.request_id
        if hasattr(record, 'user_id'):
            log_obj['user_id'] = record.user_id
        
        return json.dumps(log_obj)

# Configurar logger
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',
    handlers=[
        logging.StreamHandler()  # stdout
    ]
)

logger = logging.getLogger(__name__)

# Usar formatter JSON
for handler in logger.handlers:
    handler.setFormatter(JSONFormatter())
```

**Uso en código:**

```python
# auth_service.py
import logging

logger = logging.getLogger(__name__)

def login(username, password):
    logger.info(f"Login attempt for user: {username}")
    
    try:
        # Lógica de autenticación
        user = authenticate(username, password)
        logger.info(f"User {username} logged in successfully", 
                   extra={'user_id': user.id})
        return user
    
    except AuthenticationError as e:
        logger.warning(f"Failed login attempt for user: {username}", 
                      extra={'error': str(e)})
        raise
    
    except Exception as e:
        logger.error(f"Unexpected error during login: {str(e)}", 
                    exc_info=True)
        raise
```

**Para FastAPI con middleware:**

```python
from fastapi import FastAPI, Request
import uuid
import time

app = FastAPI()

@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())
    
    logger.info("Request started", extra={
        'request_id': request_id,
        'method': request.method,
        'path': request.url.path,
        'client_ip': request.client.host
    })
    
    start_time = time.time()
    
    try:
        response = await call_next(request)
        
        duration = time.time() - start_time
        logger.info("Request completed", extra={
            'request_id': request_id,
            'status_code': response.status_code,
            'duration_ms': round(duration * 1000, 2)
        })
        
        return response
    
    except Exception as e:
        logger.error("Request failed", extra={
            'request_id': request_id,
            'error': str(e)
        }, exc_info=True)
        raise
```

### Niveles de Log Recomendados

| Nivel | Uso | Ejemplo |
|-------|-----|---------|
| **ERROR** | Errores que impiden funcionalidad | "Database connection failed", "Payment processing error" |
| **WARN** | Situaciones problemáticas pero recuperables | "High memory usage", "Slow query detected", "Deprecated API used" |
| **INFO** | Eventos importantes del sistema | "User logged in", "Order created", "Service started" |
| **DEBUG** | Información detallada para debugging | "Function called with params X", "Query result: Y" |

### Información a Incluir en Logs

**Siempre incluir:**
- Timestamp
- Nivel de log
- Mensaje descriptivo
- Servicio/módulo que generó el log

**Incluir cuando sea relevante:**
- Request ID (para rastrear requests a través de servicios)
- User ID (para rastrear acciones de usuarios)
- Session ID
- Transaction ID
- Duración de operaciones
- Códigos de error
- Stack traces (solo para ERROR)

**NUNCA incluir:**
- Passwords
- Tokens de autenticación
- Números de tarjeta de crédito
- Información personal identificable sensible (SSN, etc.)
- API keys o secrets

---

## Configuración de Filebeat

### Configuración Actual

La configuración de Filebeat (archivo `17-filebeat-config.yaml`) ya está optimizada para Chapinflix:

```yaml
filebeat.inputs:
  - type: container
    paths:
      - /var/log/containers/*_default_*.log
    processors:
      - add_kubernetes_metadata:
          host: ${NODE_NAME}
          matchers:
            - logs_path:
                logs_path: "/var/log/containers/"
      
      - drop_event:
          when:
            not:
              or:
                - contains:
                    kubernetes.pod.name: "auth-service"
                - contains:
                    kubernetes.pod.name: "inventario-service"
                - contains:
                    kubernetes.pod.name: "usuarios-service"
                - contains:
                    kubernetes.pod.name: "pago-service"
                - contains:
                    kubernetes.pod.name: "vercatalogo-service"
                - contains:
                    kubernetes.pod.name: "verpeli-service"
      
      - decode_json_fields:
          fields: ["message"]
          target: "json"
          overwrite_keys: true
          add_error_key: true
```

### Qué Hace Esta Configuración

1. **Lee logs de contenedores:**
   - Path: `/var/log/containers/*_default_*.log`
   - Solo del namespace `default`

2. **Agrega metadatos de Kubernetes:**
   - `kubernetes.namespace`
   - `kubernetes.pod.name`
   - `kubernetes.container.name`
   - `kubernetes.node.name`
   - `kubernetes.labels`

3. **Filtra solo servicios de Chapinflix:**
   - Descarta logs de pods que no sean de los 6 microservicios
   - Reduce carga y almacenamiento

4. **Parsea JSON:**
   - Si el mensaje del log es JSON, lo parsea automáticamente
   - Crea campos individuales para cada clave del JSON

5. **Enriquece con información adicional:**
   - Host metadata
   - Cloud metadata (GCP)
   - Docker metadata

### Agregar Nuevos Servicios

Si se agrega un nuevo microservicio a Chapinflix:

1. Editar el ConfigMap:
   ```bash
   kubectl edit configmap filebeat-config -n logging
   ```

2. Agregar el nuevo servicio en la sección `drop_event`:
   ```yaml
   - contains:
       kubernetes.pod.name: "nuevo-service"
   ```

3. Reiniciar Filebeat:
   ```bash
   kubectl delete pods -n logging -l app=filebeat
   ```

---

## Configuración de Logstash

### Pipeline de Procesamiento

La configuración de Logstash (archivo `14-logstash-config.yaml`) define cómo se procesan los logs:

```
Input (Beats) → Filters (Procesamiento) → Output (Elasticsearch)
```

### Filters Configurados

#### 1. Parse JSON

```ruby
if [message] =~ /^\{.*\}$/ {
  json {
    source => "message"
    target => "parsed_json"
  }
}
```

**Qué hace:**
- Detecta si el mensaje del log es JSON
- Parsea el JSON y guarda en `parsed_json`
- Permite búsquedas por campos individuales del JSON

**Ejemplo:**
```
Input: {"level": "ERROR", "user": "john", "action": "login"}
Output: 
  parsed_json.level = "ERROR"
  parsed_json.user = "john"
  parsed_json.action = "login"
```

#### 2. Extraer Información de Kubernetes

```ruby
if [kubernetes] {
  mutate {
    add_field => {
      "k8s_namespace" => "%{[kubernetes][namespace]}"
      "k8s_pod" => "%{[kubernetes][pod][name]}"
      "k8s_container" => "%{[kubernetes][container][name]}"
    }
  }
}
```

**Qué hace:**
- Extrae información de Kubernetes a campos de primer nivel
- Facilita búsquedas en Kibana

#### 3. Detectar Nivel de Log

```ruby
if [message] =~ /(?i)error/ {
  mutate { add_field => { "log_level" => "ERROR" } }
} else if [message] =~ /(?i)warn/ {
  mutate { add_field => { "log_level" => "WARN" } }
} else if [message] =~ /(?i)info/ {
  mutate { add_field => { "log_level" => "INFO" } }
} else if [message] =~ /(?i)debug/ {
  mutate { add_field => { "log_level" => "DEBUG" } }
} else {
  mutate { add_field => { "log_level" => "UNKNOWN" } }
}
```

**Qué hace:**
- Busca palabras clave en el mensaje (error, warn, info, debug)
- Agrega campo `log_level` para facilitar filtrado en Kibana
- Case-insensitive (reconoce ERROR, error, Error, etc.)

**Limitación:**
- Solo detecta por palabras clave en el mensaje
- Si el log JSON ya tiene un campo `level`, este filtro puede no ser necesario

#### 4. Agregar Timestamp de Procesamiento

```ruby
mutate {
  add_field => { "processed_at" => "%{@timestamp}" }
}
```

**Qué hace:**
- Registra cuándo Logstash procesó el log
- Útil para detectar delays en el pipeline

#### 5. Agregar Tags

```ruby
mutate {
  add_tag => [ "chapinflix", "gke" ]
}
```

**Qué hace:**
- Agrega tags para identificar origen de logs
- Facilita filtrado por proyecto o infraestructura

### Personalizar Pipeline de Logstash

#### Agregar Filtro de Grok (Parse de Logs No Estructurados)

Si los logs no están en JSON, usar Grok para parsearlos:

```ruby
# Ejemplo: Parsear logs de formato: "2025-10-21 14:30:45 ERROR User not found"
if [message] !~ /^\{/ {
  grok {
    match => { 
      "message" => "%{TIMESTAMP_ISO8601:log_timestamp} %{LOGLEVEL:log_level} %{GREEDYDATA:log_message}" 
    }
  }
  
  date {
    match => [ "log_timestamp", "ISO8601" ]
    target => "@timestamp"
  }
}
```

#### Agregar Enriquecimiento con GeoIP

Si los logs incluyen IPs de clientes:

```ruby
if [client_ip] {
  geoip {
    source => "client_ip"
    target => "geoip"
  }
}
```

#### Agregar Filtro de Sensibilidad

Para remover información sensible:

```ruby
# Remover campos sensibles
mutate {
  remove_field => [ "password", "token", "api_key" ]
}

# Enmascarar números de tarjeta
if [credit_card] {
  mutate {
    gsub => [
      "credit_card", "\d{12}(\d{4})", "************\1"
    ]
  }
}
```

### Aplicar Cambios en Logstash

1. Editar ConfigMap:
   ```bash
   kubectl edit configmap logstash-config -n logging
   ```

2. Reiniciar Logstash:
   ```bash
   kubectl rollout restart deployment logstash -n logging
   ```

3. Verificar logs de Logstash:
   ```bash
   kubectl logs -n logging -l app=logstash --tail=100
   ```

---

## Estructura de Logs

### Campos Estándar en Elasticsearch

Cada documento de log en Elasticsearch tiene los siguientes campos:

#### Campos Principales

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `@timestamp` | date | Timestamp del log | 2025-10-21T14:30:45.123Z |
| `message` | text | Mensaje original del log | "User login successful" |
| `log_level` | keyword | Nivel del log | ERROR, WARN, INFO, DEBUG |
| `k8s_namespace` | keyword | Namespace de K8s | default |
| `k8s_pod` | keyword | Nombre del pod | auth-service-7d8f9c-abc123 |
| `k8s_container` | keyword | Nombre del contenedor | auth-service |
| `processed_at` | date | Timestamp de procesamiento | 2025-10-21T14:30:46.000Z |
| `tags` | keyword[] | Tags del log | ["chapinflix", "gke"] |

#### Campos de Kubernetes (kubernetes.*)

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `kubernetes.namespace` | Namespace | default |
| `kubernetes.pod.name` | Nombre completo del pod | auth-service-7d8f9c-abc123 |
| `kubernetes.pod.uid` | UID del pod | a1b2c3d4-e5f6-... |
| `kubernetes.container.name` | Nombre del contenedor | auth-service |
| `kubernetes.node.name` | Nombre del nodo | gke-chapinflix-xyz |
| `kubernetes.labels.*` | Labels del pod | app, version, etc. |

#### Campos de Host/Agent

| Campo | Descripción |
|-------|-------------|
| `host.name` | Nombre del host |
| `agent.hostname` | Hostname del agente Filebeat |
| `agent.type` | Tipo de agente (filebeat) |
| `agent.version` | Versión de Filebeat |

#### Campos Personalizados (parsed_json.*)

Si el log es JSON, todos los campos del JSON estarán disponibles bajo `parsed_json.*`

Ejemplo de log JSON:
```json
{
  "level": "ERROR",
  "user_id": "12345",
  "action": "login",
  "error": "Invalid password",
  "duration_ms": 150
}
```

Campos en Elasticsearch:
- `parsed_json.level` = "ERROR"
- `parsed_json.user_id` = "12345"
- `parsed_json.action` = "login"
- `parsed_json.error` = "Invalid password"
- `parsed_json.duration_ms` = 150

### Ejemplo de Documento Completo

```json
{
  "@timestamp": "2025-10-21T14:30:45.123Z",
  "message": "{\"level\":\"ERROR\",\"user_id\":\"12345\",\"action\":\"login\",\"error\":\"Invalid password\"}",
  "log_level": "ERROR",
  "k8s_namespace": "default",
  "k8s_pod": "auth-service-7d8f9c-abc123",
  "k8s_container": "auth-service",
  "processed_at": "2025-10-21T14:30:46.000Z",
  "tags": ["chapinflix", "gke"],
  "kubernetes": {
    "namespace": "default",
    "pod": {
      "name": "auth-service-7d8f9c-abc123",
      "uid": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
    },
    "container": {
      "name": "auth-service"
    },
    "node": {
      "name": "gke-chapinflix-standard-default-pool-xyz"
    },
    "labels": {
      "app": "auth-service",
      "version": "v1.2.3"
    }
  },
  "parsed_json": {
    "level": "ERROR",
    "user_id": "12345",
    "action": "login",
    "error": "Invalid password"
  },
  "host": {
    "name": "gke-chapinflix-standard-default-pool-xyz"
  },
  "agent": {
    "hostname": "filebeat-xyz",
    "type": "filebeat",
    "version": "8.11.0"
  }
}
```