# Manual de Instalación y Configuración
## Stack de Logging: Elasticsearch + Logstash + Kibana (ELK) + Filebeat
---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Instalación de Elasticsearch](#instalación-de-elasticsearch)
5. [Instalación de Logstash](#instalación-de-logstash)
6. [Instalación de Kibana](#instalación-de-kibana)
7. [Instalación de Filebeat](#instalación-de-filebeat)
8. [Verificación de la Instalación](#verificación-de-la-instalación)
9. [Configuración Inicial de Kibana](#configuración-inicial-de-kibana)
10. [Troubleshooting](#troubleshooting)

---

## Introducción

Este manual proporciona instrucciones detalladas para instalar y configurar el stack de logging de Chapinflix (ELK Stack), que incluye:

- **Elasticsearch**: Motor de búsqueda y almacenamiento de logs
- **Logstash**: Procesamiento y transformación de logs
- **Kibana**: Interfaz de visualización y análisis
- **Filebeat**: Recolector de logs de contenedores

### Objetivo

Implementar un sistema centralizado de gestión de logs que permita:
- Recopilar logs de todos los microservicios
- Procesar y enriquecer logs
- Almacenar logs de forma estructurada
- Visualizar y analizar logs en tiempo real
- Realizar búsquedas y troubleshooting eficientes

---

## Requisitos Previos

### Software Requerido

- **kubectl** v1.28 o superior instalado y configurado
- **gcloud CLI** configurado con el proyecto activo
- Acceso al cluster GKE `chapinflix-standard`
- Permisos de administrador en el cluster
- **Stack de Monitoring** ya instalado (recomendado)

### Verificación de Requisitos

```bash
# Verificar kubectl
kubectl version --client

# Verificar contexto del cluster
kubectl config current-context

# Verificar acceso al cluster
kubectl cluster-info

# Verificar permisos
kubectl auth can-i create namespace
```

### Recursos del Cluster

El stack ELK requiere recursos significativos:

- **CPU**: Mínimo 3 vCPUs disponibles
- **Memoria**: Mínimo 4 GB disponibles
- **Almacenamiento**: 20 GB para Elasticsearch (PersistentVolume)

```bash
# Verificar recursos disponibles
kubectl top nodes
kubectl describe nodes
```

---

## Arquitectura del Sistema

### Componentes

```
┌──────────────────────────────────────────────────────────────┐
│                    Namespace: default                        │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Microservicios de Chapinflix                       │     │
│  │  - auth-service                                     │     │
│  │  - inventario-service                               │     │
│  │  - ususarios-service                                │     │
│  │  - pago-service                                     │     │
│  │  - vercatalogo-service                              │     │
│  │  - verpeli-service                                  │     │
│  │                                                     │     │
│  │  Generan logs → /var/log/containers/*.log           │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ Lee logs
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Namespace: logging                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────┐           │
│  │         Filebeat (DaemonSet)                 │           │
│  │  - Corre en cada nodo                        │           │
│  │  - Lee logs de /var/log/containers/          │           │
│  │  - Filtra por microservicios de Chapinflix   │           │
│  │  - Agrega metadatos de Kubernetes            │           │
│  └───────────────────┬──────────────────────────┘           │
│                      │                                      │
│                      │ Envía logs                           │
│                      ▼                                      │
│  ┌──────────────────────────────────────────────┐           │
│  │         Logstash                             │           │
│  │  Puerto: 5044 (Beats input)                  │           │
│  │  - Recibe logs de Filebeat                   │           │
│  │  - Parsea JSON                               │           │
│  │  - Enriquece con información adicional       │           │
│  │  - Detecta nivel de log (ERROR, WARN, etc)   │           │
│  └───────────────────┬──────────────────────────┘           │
│                      │                                      │
│                      │ Indexa logs                          │
│                      ▼                                      │
│  ┌──────────────────────────────────────────────┐           │
│  │         Elasticsearch (StatefulSet)          │           │
│  │  Puerto: 9200 (HTTP REST), 9300 (inter-node) │           │
│  │  - Almacena logs en índices                  │           │
│  │  - Índice: chapinflix-logs-YYYY.MM.dd        │           │
│  │  - Volumen persistente: 20Gi                 │           │
│  └───────────────────┬──────────────────────────┘           │
│                      │                                      │
│                      │ Consulta logs                        │
│                      ▼                                      │
│  ┌──────────────────────────────────────────────┐           │
│  │         Kibana (LoadBalancer)                │           │
│  │  Puerto: 5601                                │           │
│  │  - Interfaz web para visualización           │           │
│  │  - Dashboards y búsquedas                    │           │
│  │  - IP Externa: <KIBANA_IP>                   │           │
│  └──────────────────────────────────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Logs

1. **Microservicios** generan logs en stdout/stderr
2. **Kubernetes** redirige logs a `/var/log/containers/`
3. **Filebeat** (DaemonSet) lee los archivos de log
4. **Filebeat** filtra solo logs de servicios de Chapinflix
5. **Filebeat** agrega metadatos de Kubernetes
6. **Filebeat** envía logs a **Logstash**
7. **Logstash** procesa, parsea y enriquece los logs
8. **Logstash** indexa los logs en **Elasticsearch**
9. **Kibana** consulta **Elasticsearch** para visualización
10. Usuario accede a **Kibana** para análisis

---

## Instalación de Elasticsearch

### Paso 1: Crear el Namespace

```bash
# Aplicar el archivo 11-logging-namespace.yaml
kubectl apply -f 11-logging-namespace.yaml
```

**Contenido del archivo:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: logging
  labels:
    name: logging
    environment: production
    project: chapinflix-gke
```

**Verificación:**
```bash
kubectl get namespace logging
```

### Paso 2: Crear Secret de Credenciales

```bash
# Aplicar el archivo 12-elasticsearch-secret.yaml
kubectl apply -f 12-elasticsearch-secret.yaml
```

**Contenido del secret:**
- Usuario: `elastic`
- Contraseña: `ChapinElastic2024!Secure`

**Nota:** Las credenciales no se usan actualmente porque la seguridad de Elasticsearch está deshabilitada para simplificar la configuración.

**Verificación:**
```bash
kubectl get secret elasticsearch-credentials -n logging
```

### Paso 3: Desplegar Elasticsearch

```bash
# Aplicar el archivo 13-elasticsearch-statefulset.yaml
kubectl apply -f 13-elasticsearch-statefulset.yaml
```

**Especificaciones del StatefulSet:**
- **Réplicas**: 1
- **Imagen**: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
- **Puertos**:
  - 9200: HTTP REST API
  - 9300: Inter-node communication
- **Recursos**:
  - CPU: 500m (request) / 1000m (limit)
  - Memoria: 1Gi (request) / 1.5Gi (limit)
- **Java Heap**: 512MB (Xms y Xmx)
- **Almacenamiento**: 20Gi (PersistentVolumeClaim)
- **StorageClass**: standard-rwo

**Configuraciones importantes:**
- `discovery.type: single-node` - Modo single-node (no cluster)
- `xpack.security.enabled: false` - Seguridad deshabilitada
- `xpack.security.http.ssl.enabled: false` - SSL deshabilitado

**InitContainers:**
1. `fix-permissions`: Ajusta permisos del volumen de datos
2. `increase-vm-max-map`: Aumenta `vm.max_map_count` (requerido por Elasticsearch)

**Verificación:**
```bash
# Ver el StatefulSet
kubectl get statefulset elasticsearch -n logging

# Ver el pod (puede tardar 2-3 minutos en estar Running)
kubectl get pods -n logging -l app=elasticsearch -w

# Ver el servicio
kubectl get svc elasticsearch -n logging

# Ver el PVC (PersistentVolumeClaim)
kubectl get pvc -n logging
```

### Paso 4: Verificar Elasticsearch

```bash
# Esperar a que el pod esté listo
kubectl wait --for=condition=ready pod -l app=elasticsearch -n logging --timeout=300s

# Ver logs de Elasticsearch
kubectl logs -n logging -l app=elasticsearch --tail=50

# Verificar health del cluster
kubectl exec -n logging -it statefulset/elasticsearch -- curl -s http://localhost:9200/_cluster/health | jq .

# Verificar nodos
kubectl exec -n logging -it statefulset/elasticsearch -- curl -s http://localhost:9200/_cat/nodes?v
```

**Salida esperada del health check:**
```json
{
  "cluster_name": "chapinflix-logs",
  "status": "green",
  "timed_out": false,
  "number_of_nodes": 1,
  "number_of_data_nodes": 1,
  "active_primary_shards": 0,
  "active_shards": 0,
  "relocating_shards": 0,
  "initializing_shards": 0,
  "unassigned_shards": 0
}
```

---

## Instalación de Logstash

### Paso 1: Configurar Logstash

```bash
# Aplicar el archivo 14-logstash-config.yaml
kubectl apply -f 14-logstash-config.yaml
```

**Configuraciones incluidas:**

**logstash.yml:**
- HTTP host: 0.0.0.0
- Path de configuración: /usr/share/logstash/pipeline
- Monitoring deshabilitado

**logstash.conf (Pipeline):**

**Input:**
```
beats {
  port => 5044
}
```
Recibe logs de Filebeat en el puerto 5044.

**Filters:**
1. **Parse JSON**: Si el mensaje es JSON, lo parsea
2. **Extrae metadatos de Kubernetes**: namespace, pod, container
3. **Detecta nivel de log**: ERROR, WARN, INFO, DEBUG
4. **Agrega timestamp procesado**
5. **Agrega tags**: chapinflix, gke

**Output:**
```
elasticsearch {
  hosts => ["elasticsearch.logging.svc.cluster.local:9200"]
  index => "chapinflix-logs-%{+YYYY.MM.dd}"
}
```
Indexa logs en Elasticsearch con índice diario.

**Verificación:**
```bash
kubectl get configmap logstash-config -n logging
```

### Paso 2: Desplegar Logstash

```bash
# Aplicar el archivo 15-logstash-deployment.yaml
kubectl apply -f 15-logstash-deployment.yaml
```

**Especificaciones del Deployment:**
- **Réplicas**: 1
- **Imagen**: docker.elastic.co/logstash/logstash:8.11.0
- **Puertos**:
  - 5044: Beats input
  - 9600: HTTP API
- **Recursos**:
  - CPU: 100m (request) / 500m (limit)
  - Memoria: 384Mi (request) / 768Mi (limit)
- **Java Heap**: 256MB

**Verificación:**
```bash
# Ver el deployment
kubectl get deployment logstash -n logging

# Ver el pod (puede tardar 2 minutos en estar Running)
kubectl get pods -n logging -l app=logstash -w

# Ver el servicio
kubectl get svc logstash -n logging
```

### Paso 3: Verificar Logstash

```bash
# Esperar a que el pod esté listo
kubectl wait --for=condition=ready pod -l app=logstash -n logging --timeout=300s

# Ver logs de Logstash
kubectl logs -n logging -l app=logstash --tail=50

# Verificar API de Logstash
kubectl exec -n logging -it deployment/logstash -- curl -s http://localhost:9600/ | jq .

# Verificar que puede conectarse a Elasticsearch
kubectl exec -n logging -it deployment/logstash -- curl -s http://elasticsearch.logging.svc.cluster.local:9200/
```

---

## Instalación de Kibana

### Paso 1: Desplegar Kibana

```bash
# Aplicar el archivo 16-kibana-deployment.yaml
kubectl apply -f 16-kibana-deployment.yaml
```

**Especificaciones del Deployment:**
- **Réplicas**: 1
- **Imagen**: docker.elastic.co/kibana/kibana:8.11.0
- **Puerto**: 5601
- **Recursos**:
  - CPU: 100m (request) / 500m (limit)
  - Memoria: 384Mi (request) / 768Mi (limit)
- **Tipo de Servicio**: LoadBalancer

**Variables de entorno:**
- `ELASTICSEARCH_HOSTS`: http://elasticsearch.logging.svc.cluster.local:9200
- `SERVER_NAME`: chapinflix-kibana
- `XPACK_SECURITY_ENABLED`: false
- `NODE_OPTIONS`: --max-old-space-size=768

**Verificación:**
```bash
# Ver el deployment
kubectl get deployment kibana -n logging

# Ver el pod (puede tardar 3-4 minutos en estar Running)
kubectl get pods -n logging -l app=kibana -w

# Ver el servicio
kubectl get svc kibana -n logging

# Esperar a que el LoadBalancer obtenga una IP externa
kubectl get svc kibana -n logging -w
```

**Obtener la IP externa:**
```bash
export KIBANA_IP=$(kubectl get svc kibana -n logging -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Kibana URL: http://$KIBANA_IP:5601"
```

### Paso 2: Verificar Kibana

```bash
# Esperar a que el pod esté listo (puede tardar hasta 5 minutos)
kubectl wait --for=condition=ready pod -l app=kibana -n logging --timeout=600s

# Ver logs de Kibana
kubectl logs -n logging -l app=kibana --tail=50

# Verificar status de Kibana
kubectl exec -n logging -it deployment/kibana -- curl -s http://localhost:5601/api/status | jq '.status.overall.state'

# Debe retornar "green"
```

**Acceder a la UI:**
1. Abrir navegador en `http://<KIBANA_IP>:5601`
2. Kibana puede tardar 2-3 minutos adicionales en estar completamente listo
3. La primera vez mostrará una página de bienvenida

---

## Instalación de Filebeat

### Paso 1: Configurar Filebeat

```bash
# Aplicar el archivo 17-filebeat-config.yaml
kubectl apply -f 17-filebeat-config.yaml
```

**Configuraciones incluidas:**

**Input:**
- Tipo: container
- Paths: `/var/log/containers/*_default_*.log`

**Processors:**
1. **add_kubernetes_metadata**: Agrega metadatos de K8s
2. **drop_event**: Filtra solo logs de microservicios de Chapinflix:
   - auth-service
   - inventario-service
   - usuarios-service
   - pago-service
   - vercatalogo-service
   - verpeli-service
3. **decode_json_fields**: Intenta parsear mensaje como JSON

**Additional Processors:**
- add_host_metadata
- add_cloud_metadata
- add_docker_metadata
- add_fields: Agrega cluster, environment, project

**Output:**
- Logstash: `logstash.logging.svc.cluster.local:5044`
- Workers: 2
- Compression: level 3
- Bulk max size: 2048

**HTTP Endpoint:**
- Puerto: 5066 (para métricas)

**Verificación:**
```bash
kubectl get configmap filebeat-config -n logging
```

### Paso 2: Configurar RBAC para Filebeat

```bash
# Aplicar el archivo 18-filebeat-rbac.yaml
kubectl apply -f 18-filebeat-rbac.yaml
```

**Permisos otorgados:**
- Lectura de namespaces, pods, nodes
- Lectura de replicasets, deployments, statefulsets, daemonsets
- Lectura de jobs, cronjobs

**Verificación:**
```bash
kubectl get serviceaccount filebeat -n logging
kubectl get clusterrole filebeat
kubectl get clusterrolebinding filebeat
```

### Paso 3: Desplegar Filebeat

```bash
# Aplicar el archivo 19-filebeat-daemonset.yaml
kubectl apply -f 19-filebeat-daemonset.yaml
```

**Especificaciones del DaemonSet:**
- **Imagen**: docker.elastic.co/beats/filebeat:8.11.0
- **Modo**: Se ejecuta en todos los nodos (DaemonSet)
- **SecurityContext**: runAsUser: 0 (root - necesario para leer logs)
- **Recursos**:
  - CPU: 50m (request) / 200m (limit)
  - Memoria: 100Mi (request) / 300Mi (limit)

**Volúmenes montados:**
- `/etc/filebeat.yml`: Configuración
- `/usr/share/filebeat/data`: Datos de Filebeat
- `/var/log`: Logs del host (read-only)

**Verificación:**
```bash
# Ver el DaemonSet
kubectl get daemonset filebeat -n logging

# Ver los pods (debe haber uno por nodo)
kubectl get pods -n logging -l app=filebeat -o wide

# Contar nodos y pods de Filebeat (deben coincidir)
echo "Nodos: $(kubectl get nodes --no-headers | wc -l)"
echo "Filebeat pods: $(kubectl get pods -n logging -l app=filebeat --no-headers | wc -l)"
```

### Paso 4: Verificar Filebeat

```bash
# Ver logs de Filebeat (de un pod específico)
FILEBEAT_POD=$(kubectl get pods -n logging -l app=filebeat -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n logging $FILEBEAT_POD --tail=50

# Verificar que puede conectarse a Logstash
kubectl exec -n logging -it $FILEBEAT_POD -- sh -c "curl -s telnet://logstash.logging.svc.cluster.local:5044"
```

---

## Verificación de la Instalación

### Paso 1: Verificar Todos los Pods

```bash
# Ver todos los pods en logging
kubectl get pods -n logging -o wide

# Salida esperada:
# NAME                         READY   STATUS    RESTARTS   AGE
# elasticsearch-0              1/1     Running   0          Xm
# logstash-xxxxxxxxxx-xxxxx    1/1     Running   0          Xm
# kibana-xxxxxxxxxx-xxxxx      1/1     Running   0          Xm
# filebeat-xxxxx               1/1     Running   0          Xm
# filebeat-xxxxx               1/1     Running   0          Xm
# ...
```

**Todos los pods deben estar en estado `Running` con `1/1 READY`.**

### Paso 2: Verificar Servicios

```bash
# Ver todos los servicios
kubectl get svc -n logging

# Salida esperada:
# NAME            TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)          AGE
# elasticsearch   ClusterIP      None            <none>          9200/TCP,9300/TCP   Xm
# logstash        ClusterIP      10.x.x.x        <none>          5044/TCP,9600/TCP   Xm
# kibana          LoadBalancer   10.x.x.x        <EXTERNAL-IP>   5601:xxxxx/TCP      Xm
```

### Paso 3: Verificar Almacenamiento

```bash
# Ver PersistentVolumeClaims
kubectl get pvc -n logging

# Salida esperada:
# NAME                     STATUS   VOLUME                                     CAPACITY   STORAGECLASS
# data-elasticsearch-0     Bound    pvc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   20Gi       standard-rwo
```

### Paso 4: Verificar Flujo de Logs

```bash
# Verificar índices en Elasticsearch
kubectl exec -n logging -it statefulset/elasticsearch -- curl -s http://localhost:9200/_cat/indices?v

# Debe mostrar índices como:
# health status index                           pri rep docs.count
# yellow open   chapinflix-logs-2025.10.21      1   1          0

# Verificar que Logstash está recibiendo eventos
kubectl exec -n logging -it deployment/logstash -- curl -s http://localhost:9600/_node/stats | jq '.events'

# Verificar métricas de Filebeat
FILEBEAT_POD=$(kubectl get pods -n logging -l app=filebeat -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n logging -it $FILEBEAT_POD -- curl -s http://localhost:5066/ | jq '.filebeat.harvester'
```

### Paso 5: Generar Logs de Prueba

```bash
# Generar actividad en un microservicio para crear logs
kubectl exec -n default -it deployment/auth-service -- sh -c "for i in {1..10}; do echo 'Test log entry \$i'; sleep 1; done"

# Esperar 30 segundos y verificar que los logs llegaron a Elasticsearch
kubectl exec -n logging -it statefulset/elasticsearch -- curl -s "http://localhost:9200/chapinflix-logs-*/_search?size=5&sort=@timestamp:desc" | jq '.hits.hits[]._source.message'
```

---

## Configuración Inicial de Kibana

### Paso 1: Acceder a Kibana

1. Abrir navegador en `http://<KIBANA_IP>:5601`
2. Esperar a que Kibana cargue completamente
3. En la página de bienvenida, click en "Explore on my own"

### Paso 2: Crear Index Pattern

Un Index Pattern es necesario para visualizar los logs en Kibana.

**Método 1: Interfaz Gráfica**

1. En Kibana, ir al menú (≡) → **Management** → **Stack Management**
2. En el menú lateral, click en **Data Views** (o **Index Patterns**)
3. Click en "Create data view"
4. Configurar:
   - **Name**: `Chapinflix Logs`
   - **Index pattern**: `chapinflix-logs-*`
   - **Timestamp field**: `@timestamp`
5. Click en "Create data view"

**Método 2: Dev Tools (API)**

1. Ir al menú (≡) → **Management** → **Dev Tools**
2. Ejecutar:
```json
PUT _index_template/chapinflix-logs-template
{
  "index_patterns": ["chapinflix-logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "message": { "type": "text" },
        "log_level": { "type": "keyword" },
        "k8s_namespace": { "type": "keyword" },
        "k8s_pod": { "type": "keyword" },
        "k8s_container": { "type": "keyword" }
      }
    }
  }
}
```

### Paso 3: Visualizar Logs

1. Ir al menú (≡) → **Analytics** → **Discover**
2. Seleccionar el data view "Chapinflix Logs"
3. Ajustar el rango de tiempo (esquina superior derecha):
   - Seleccionar "Last 15 minutes" o "Last 1 hour"
4. Ver logs en la tabla
5. Expandir un log para ver todos los campos

**Campos importantes:**
- `@timestamp`: Timestamp del log
- `message`: Mensaje del log
- `log_level`: ERROR, WARN, INFO, DEBUG
- `k8s_namespace`: Namespace de Kubernetes
- `k8s_pod`: Nombre del pod
- `k8s_container`: Nombre del contenedor
- `kubernetes.pod.name`: Nombre completo del pod
- `kubernetes.namespace`: Namespace

### Paso 4: Crear Búsquedas (Queries)

En Discover, usar la barra de búsqueda (KQL - Kibana Query Language):

**Filtrar por nivel de log:**
```
log_level: "ERROR"
```

**Filtrar por servicio:**
```
k8s_pod: "auth-service*"
```

**Filtrar por múltiples condiciones:**
```
log_level: "ERROR" AND k8s_pod: "verpeli-service*"
```

**Buscar en el mensaje:**
```
message: "failed" OR message: "error"
```

**Rango de tiempo:**
Usar el selector de tiempo en la esquina superior derecha.

### Paso 5: Guardar Búsquedas

1. Después de crear una búsqueda útil
2. Click en "Save" (esquina superior derecha)
3. Dar un nombre: ej. "Auth Service Errors"
4. Click en "Save"

### Paso 6: Crear Visualizaciones (Opcional)

1. Ir al menú (≡) → **Analytics** → **Visualize Library**
2. Click en "Create visualization"
3. Seleccionar tipo de visualización (Line, Bar, Pie, etc.)
4. Seleccionar data view "Chapinflix Logs"
5. Configurar la visualización
6. Guardar

**Ejemplo: Gráfico de logs por nivel:**
- Tipo: Bar
- Y-axis: Count
- X-axis: Breakdown by → log_level.keyword
- Time range: Last 24 hours

---

## Troubleshooting

### Problema: Pod de Elasticsearch en CrashLoopBackOff

**Síntomas:**
```bash
kubectl get pods -n logging
# elasticsearch-0   0/1   CrashLoopBackOff
```

**Diagnóstico:**
```bash
# Ver logs
kubectl logs -n logging elasticsearch-0 --tail=100

# Errores comunes:
# - "max virtual memory areas vm.max_map_count [65530] is too low"
# - "insufficient memory mapped areas"
```

**Solución:**
```bash
# El initContainer debe haberlo resuelto, pero si persiste:
# Verificar que el initContainer se ejecutó
kubectl describe pod elasticsearch-0 -n logging | grep -A 20 "Init Containers"

# Si el problema persiste, puede ser necesario configurar a nivel de nodo:
# Esto requiere acceso a los nodos del cluster
# En GKE, el initContainer privileged debería manejarlo

# Verificar el PVC
kubectl get pvc -n logging
kubectl describe pvc data-elasticsearch-0 -n logging

# Eliminar y recrear si es necesario
kubectl delete pod elasticsearch-0 -n logging
```

### Problema: Elasticsearch no puede escribir en el volumen

**Síntomas:**
Error en logs: "ElasticsearchException: failed to bind service; nested: AccessDeniedException"

**Diagnóstico:**
```bash
# Ver logs del initContainer fix-permissions
kubectl logs elasticsearch-0 -n logging -c fix-permissions

# Verificar permisos del volumen
kubectl exec -n logging -it elasticsearch-0 -- ls -la /usr/share/elasticsearch/data
```

**Solución:**
```bash
# El initContainer fix-permissions debe resolver esto
# Si persiste, verificar la configuración del StorageClass
kubectl describe storageclass standard-rwo

# Eliminar el StatefulSet y el PVC, y recrear
kubectl delete statefulset elasticsearch -n logging
kubectl delete pvc data-elasticsearch-0 -n logging
kubectl apply -f 13-elasticsearch-statefulset.yaml
```

### Problema: Logstash no puede conectarse a Elasticsearch

**Síntomas:**
En logs de Logstash: "Connection refused" o "Host unreachable"

**Diagnóstico:**
```bash
# Ver logs de Logstash
kubectl logs -n logging -l app=logstash --tail=100

# Verificar que Elasticsearch esté accesible
kubectl exec -n logging -it deployment/logstash -- curl -s http://elasticsearch.logging.svc.cluster.local:9200/

# Verificar el servicio de Elasticsearch
kubectl get svc elasticsearch -n logging
kubectl describe svc elasticsearch -n logging
```

**Solución:**
```bash
# Verificar que el pod de Elasticsearch esté Running
kubectl get pods -n logging -l app=elasticsearch

# Esperar a que Elasticsearch esté completamente listo
kubectl wait --for=condition=ready pod -l app=elasticsearch -n logging --timeout=300s

# Reiniciar Logstash
kubectl rollout restart deployment logstash -n logging
```

### Problema: Filebeat no envía logs a Logstash

**Síntomas:**
No aparecen logs en Kibana, o los índices de Elasticsearch están vacíos.

**Diagnóstico:**
```bash
# Ver logs de Filebeat
FILEBEAT_POD=$(kubectl get pods -n logging -l app=filebeat -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n logging $FILEBEAT_POD --tail=100

# Buscar errores como:
# - "Connection refused"
# - "Failed to publish events"
# - "No matching files found"

# Verificar que Logstash esté accesible
kubectl exec -n logging -it $FILEBEAT_POD -- nc -zv logstash.logging.svc.cluster.local 5044

# Verificar configuración de Filebeat
kubectl get configmap filebeat-config -n logging -o yaml
```

**Solución:**
```bash
# Verificar que Logstash esté Running y listo
kubectl get pods -n logging -l app=logstash

# Verificar el servicio de Logstash
kubectl get svc logstash -n logging

# Si Logstash está listo, reiniciar Filebeat
kubectl delete pods -n logging -l app=filebeat

# Verificar que haya logs para recolectar
kubectl logs -n default -l app=auth-service --tail=10
```

### Problema: Kibana no puede conectarse a Elasticsearch

**Síntomas:**
Kibana muestra error "Kibana server is not ready yet"

**Diagnóstico:**
```bash
# Ver logs de Kibana
kubectl logs -n logging -l app=kibana --tail=100

# Buscar errores como:
# - "Unable to retrieve version information from Elasticsearch"
# - "Connection timeout"

# Verificar que Elasticsearch esté accesible desde Kibana
kubectl exec -n logging -it deployment/kibana -- curl -s http://elasticsearch.logging.svc.cluster.local:9200/
```

**Solución:**
```bash
# Verificar que Elasticsearch esté completamente listo
kubectl exec -n logging -it statefulset/elasticsearch -- curl -s http://localhost:9200/_cluster/health | jq .

# El status debe ser "green" o "yellow"

# Si Elasticsearch está listo, reiniciar Kibana
kubectl rollout restart deployment kibana -n logging

# Esperar a que Kibana esté listo (puede tardar 5 minutos)
kubectl wait --for=condition=ready pod -l app=kibana -n logging --timeout=600s
```

### Problema: No aparecen logs en Kibana

**Síntomas:**
Kibana carga correctamente, pero no muestra logs en Discover.

**Diagnóstico:**
```bash
# Verificar que hay índices en Elasticsearch
kubectl exec -n logging -it statefulset/elasticsearch -- curl -s http://localhost:9200/_cat/indices?v

# Debe haber índices como chapinflix-logs-2025.10.21

# Verificar documentos en el índice
kubectl exec -n logging -it statefulset/elasticsearch -- curl -s "http://localhost:9200/chapinflix-logs-*/_count" | jq .

# Si count es 0, no hay logs indexados

# Verificar que Filebeat está recolectando logs
FILEBEAT_POD=$(kubectl get pods -n logging -l app=filebeat -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n logging -it $FILEBEAT_POD -- curl -s http://localhost:5066/ | jq '.filebeat.harvester'
```

**Soluciones:**

1. **Si no hay índices:**
   - Verificar que los microservicios estén generando logs
   - Verificar logs de Logstash para ver si está recibiendo eventos

2. **Si hay índices pero no documentos:**
   - Verificar que Filebeat esté filtrando correctamente
   - Revisar la configuración de drop_event en Filebeat

3. **Si Kibana no encuentra los índices:**
   - Verificar/recrear el Index Pattern en Kibana
   - Ajustar el rango de tiempo en Discover

4. **Si los microservicios no están generando logs:**
   ```bash
   # Generar logs de prueba
   kubectl exec -n default -it deployment/auth-service -- sh -c "echo 'Test log from auth-service'"
   
   # Ver que los logs aparezcan en /var/log/containers/
   kubectl exec -n logging -it $FILEBEAT_POD -- ls -la /var/log/containers/ | grep auth-service
   ```

### Problema: Kibana LoadBalancer no obtiene IP externa

**Síntomas:**
```bash
kubectl get svc kibana -n logging
# EXTERNAL-IP muestra <pending>
```

**Solución:**
```bash
# Esperar 5-10 minutos (GKE puede tardar)

# Si persiste, usar NodePort temporalmente
kubectl patch svc kibana -n logging -p '{"spec":{"type":"NodePort"}}'

# O usar port-forward
kubectl port-forward -n logging svc/kibana 5601:5601
# Acceder a http://localhost:5601
```

### Problema: Alto uso de recursos

**Síntomas:**
Elasticsearch o Logstash consumen mucha CPU o memoria.

**Diagnóstico:**
```bash
# Ver uso de recursos
kubectl top pods -n logging

# Ver métricas detalladas
kubectl describe pod -n logging -l app=elasticsearch
```

**Solución:**
```bash
# Ajustar recursos de Elasticsearch
kubectl edit statefulset elasticsearch -n logging
# Aumentar limits de CPU y memoria

# Ajustar heap de Elasticsearch
# En el YAML, cambiar ES_JAVA_OPTS:
# De: "-Xms512m -Xmx512m"
# A: "-Xms1g -Xmx1g"

# Similar para Logstash
kubectl edit deployment logstash -n logging
```

### Problema: Logs duplicados en Kibana

**Síntomas:**
Los mismos logs aparecen múltiples veces.

**Diagnóstico:**
```bash
# Verificar número de pods de Filebeat
kubectl get pods -n logging -l app=filebeat

# Debe haber exactamente un pod por nodo
```

**Causa:**
Puede ocurrir si hay múltiples pods de Filebeat en el mismo nodo.

**Solución:**
```bash
# Verificar DaemonSet
kubectl get daemonset filebeat -n logging

# Si hay problemas, eliminar y recrear
kubectl delete daemonset filebeat -n logging
kubectl apply -f 19-filebeat-daemonset.yaml
```

### Comandos Útiles para Debugging

```bash
# Ver todos los recursos en logging
kubectl get all -n logging

# Ver eventos recientes
kubectl get events -n logging --sort-by='.lastTimestamp'

# Describir un recurso problemático
kubectl describe pod <pod-name> -n logging

# Ver logs en tiempo real
kubectl logs -n logging -l app=logstash -f

# Ejecutar comandos dentro de un pod
kubectl exec -n logging -it statefulset/elasticsearch -- sh

# Reiniciar todos los deployments
kubectl rollout restart deployment -n logging

# Eliminar un pod para forzar recreación
kubectl delete pod <pod-name> -n logging

# Verificar conectividad entre pods
kubectl exec -n logging -it deployment/logstash -- curl -s http://elasticsearch.logging.svc.cluster.local:9200/

# Ver estadísticas de Elasticsearch
kubectl exec -n logging -it statefulset/elasticsearch -- curl -s http://localhost:9200/_stats | jq .

# Ver nodos de Elasticsearch
kubectl exec -n logging -it statefulset/elasticsearch -- curl -s http://localhost:9200/_cat/nodes?v

# Ver índices con detalles
kubectl exec -n logging -it statefulset/elasticsearch -- curl -s http://localhost:9200/_cat/indices?v\&s=index

# Eliminar índices antiguos (ejemplo: mayores a 7 días)
kubectl exec -n logging -it statefulset/elasticsearch -- curl -XDELETE http://localhost:9200/chapinflix-logs-2025.10.14
```

---

## Resumen de Comandos de Instalación

```bash
# 1. Crear namespace
kubectl apply -f 11-logging-namespace.yaml

# 2. Configurar y desplegar Elasticsearch
kubectl apply -f 12-elasticsearch-secret.yaml
kubectl apply -f 13-elasticsearch-statefulset.yaml

# Esperar a que Elasticsearch esté listo
kubectl wait --for=condition=ready pod -l app=elasticsearch -n logging --timeout=300s

# 3. Configurar y desplegar Logstash
kubectl apply -f 14-logstash-config.yaml
kubectl apply -f 15-logstash-deployment.yaml

# Esperar a que Logstash esté listo
kubectl wait --for=condition=ready pod -l app=logstash -n logging --timeout=300s

# 4. Desplegar Kibana
kubectl apply -f 16-kibana-deployment.yaml

# Esperar a que Kibana esté listo
kubectl wait --for=condition=ready pod -l app=kibana -n logging --timeout=600s

# 5. Configurar y desplegar Filebeat
kubectl apply -f 17-filebeat-config.yaml
kubectl apply -f 18-filebeat-rbac.yaml
kubectl apply -f 19-filebeat-daemonset.yaml

# 6. Verificar instalación
kubectl get pods -n logging
kubectl get svc -n logging

# 7. Obtener IP de Kibana
kubectl get svc kibana -n logging
```

---

## Verificación Final

### Checklist Completo

```bash
# Namespace creado
kubectl get namespace logging

# Todos los pods Running
kubectl get pods -n logging
# Debe mostrar: elasticsearch-0, logstash-xxx, kibana-xxx, filebeat-xxx (múltiples)

# Servicios configurados
kubectl get svc -n logging
# Debe mostrar: elasticsearch, logstash, kibana (con EXTERNAL-IP)

# PVC creado y bound
kubectl get pvc -n logging
# Debe mostrar: data-elasticsearch-0 (Bound)

# Elasticsearch saludable
kubectl exec -n logging -it statefulset/elasticsearch -- curl -s http://localhost:9200/_cluster/health | jq '.status'
# Debe retornar: "green" o "yellow"

# Índices creados
kubectl exec -n logging -it statefulset/elasticsearch -- curl -s http://localhost:9200/_cat/indices?v
# Debe mostrar: chapinflix-logs-YYYY.MM.DD

# Logstash procesando eventos
kubectl exec -n logging -it deployment/logstash -- curl -s http://localhost:9600/_node/stats | jq '.events.in'
# Debe mostrar número > 0

# Filebeat recolectando logs
FILEBEAT_POD=$(kubectl get pods -n logging -l app=filebeat -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n logging -it $FILEBEAT_POD -- curl -s http://localhost:5066/ | jq '.filebeat.harvester.running'
# Debe mostrar número > 0

# Kibana accesible
curl -s http://<KIBANA_IP>:5601/api/status | jq '.status.overall.state'
# Debe retornar: "green"

# Logs visibles en Kibana
# Acceder manualmente a http://<KIBANA_IP>:5601
# Ir a Discover y verificar que se muestren logs
```