# Manual de Instalación y Configuración
## Stack de Monitoring: Prometheus + Grafana + Kube-State-Metrics


## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Instalación de Prometheus](#instalación-de-prometheus)
5. [Instalación de Grafana](#instalación-de-grafana)
6. [Instalación de Kube-State-Metrics](#instalación-de-kube-state-metrics)
7. [Instalación de Node Exporter](#instalación-de-node-exporter)
8. [Verificación de la Instalación](#verificación-de-la-instalación)
9. [Configuración Inicial](#configuración-inicial)
10. [Troubleshooting](#troubleshooting)

---

## Introducción

Este manual proporciona instrucciones detalladas para instalar y configurar el stack de monitoring de Chapinflix, que incluye:

- **Prometheus**: Sistema de monitoreo y alertas para recopilación de métricas
- **Grafana**: Plataforma de visualización y análisis de datos
- **Kube-State-Metrics**: Exportador de métricas del estado del cluster
- **Node Exporter**: Exportador de métricas de hardware y sistema operativo

### Objetivo

Implementar un sistema completo de monitoreo que permita:
- Supervisar el rendimiento de microservicios
- Monitorear recursos del cluster Kubernetes
- Visualizar métricas en tiempo real
- Configurar alertas proactivas
- Analizar tendencias y patrones de uso

---

## Requisitos Previos

### Software Requerido

- **kubectl** v1.28 o superior instalado y configurado
- **gcloud CLI** configurado con el proyecto activo
- Acceso al cluster GKE `chapinflix-standard`
- Permisos de administrador en el cluster

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

Asegúrese de que el cluster tiene recursos suficientes:

- **CPU**: Mínimo 4 vCPUs disponibles
- **Memoria**: Mínimo 8 GB disponibles
- **Almacenamiento**: Volúmenes persistentes disponibles

```bash
# Verificar recursos disponibles
kubectl top nodes
kubectl describe nodes
```

---

## Arquitectura del Sistema

### Componentes

```
┌───────────────────────────────────────────────────────────┐
│                    Namespace: monitoring                  │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐       ┌──────────────┐                  │
│  │  Prometheus  │───────│   Grafana    │                  │
│  │   :9090      │       │    :3000     │                  │
│  └───────┬──────┘       └──────────────┘                  │
│          │                                                │
│          │ scrape                                         │
│          │                                                │
│          ├──────────────────┬──────────────────┐          │
│          ▼                  ▼                  ▼          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐      │
│  │ Kube-State   │  │ Node Exporter│  │  cAdvisor   │      │
│  │   Metrics    │  │  DaemonSet   │  │  (Kubelet)  │      │
│  └──────────────┘  └──────────────┘  └─────────────┘      │
│                                                           │
└───────────────────────────────────────────────────────────┘
                          │
                          │ scrape
                          ▼
          ┌────────────────────────────────┐
          │  Namespace: default            │
          │  ┌────────────────────────┐    │
          │  │  Microservicios        │    │
          │  │  - auth-service        │    │
          │  │  - inventario-service  │    │
          │  │  - ususarios-service   │    │
          │  │  - vercatalogo-service │    │
          │  │  - verpeli-service     │    │
          │  └────────────────────────┘    │
          └────────────────────────────────┘
```

### Flujo de Datos

1. **Prometheus** scrapea métricas de:
   - Kube-State-Metrics (estado del cluster)
   - Node Exporter (métricas de nodos)
   - cAdvisor (métricas de contenedores)
   - Microservicios de Chapinflix (métricas de aplicación)

2. **Grafana** consulta a Prometheus para visualizar datos

3. Las **alertas** se evalúan en Prometheus según las reglas configuradas

---

## Instalación de Prometheus

### Paso 1: Crear el Namespace

```bash
# Aplicar el archivo 01-monitoring-namespace.yaml
kubectl apply -f 01-monitoring-namespace.yaml
```

**Contenido del archivo:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    name: monitoring
    environment: production
    project: chapinflix-gke
```

**Verificación:**
```bash
kubectl get namespace monitoring
```

### Paso 2: Configurar Prometheus

```bash
# Aplicar configuración principal
kubectl apply -f 02-prometheus-config.yaml
```

**Configuraciones incluidas:**

- **Intervalo de scraping global**: 15 segundos
- **Retención de datos**: 15 días
- **Jobs configurados**:
  - Prometheus self-monitoring
  - Kubernetes API Server
  - Node Exporter
  - Kube-State-Metrics
  - cAdvisor
  - Microservicios de Chapinflix

**Verificación:**
```bash
kubectl get configmap prometheus-config -n monitoring
kubectl describe configmap prometheus-config -n monitoring
```

### Paso 3: Configurar Reglas de Alertas

```bash
# Aplicar reglas de alertas
kubectl apply -f 03-prometheus-rules.yaml
```

**Alertas configuradas:**

| Alerta | Condición | Severidad |
|--------|-----------|-----------|
| NodeCPUUsageHigh | CPU > 80% por 5 min | warning |
| PodCPUUsageHigh | Pod CPU > 80% por 5 min | warning |
| PodMemoryUsageHigh | Pod Memory > 85% por 5 min | warning |
| PodCrashLooping | Reinicios frecuentes | critical |
| PodNotReady | Pod no listo > 10 min | warning |
| ChapinflixServiceDown | Servicio caído > 2 min | critical |

**Verificación:**
```bash
kubectl get configmap prometheus-rules -n monitoring
```

### Paso 4: Configurar RBAC

```bash
# Aplicar permisos de Prometheus
kubectl apply -f 04-prometheus-rbac.yaml
```

**Permisos otorgados:**
- Lectura de nodos, pods, servicios, endpoints
- Acceso a métricas de la API de Kubernetes
- Lectura de deployments, statefulsets, daemonsets

**Verificación:**
```bash
kubectl get serviceaccount prometheus -n monitoring
kubectl get clusterrole prometheus
kubectl get clusterrolebinding prometheus
```

### Paso 5: Desplegar Prometheus

```bash
# Desplegar Prometheus
kubectl apply -f 05-prometheus-deployment.yaml
```

**Especificaciones del Deployment:**
- **Réplicas**: 1
- **Imagen**: prom/prometheus:v2.48.0
- **Puerto**: 9090
- **Recursos**:
  - CPU: 200m (request) / 1000m (limit)
  - Memoria: 512Mi (request) / 2Gi (limit)
- **Retención**: 15 días
- **Tipo de Servicio**: LoadBalancer

**Verificación:**
```bash
# Ver el deployment
kubectl get deployment prometheus -n monitoring

# Ver los pods
kubectl get pods -n monitoring -l app=prometheus

# Ver el servicio
kubectl get svc prometheus -n monitoring

# Esperar a que el LoadBalancer obtenga una IP externa
kubectl get svc prometheus -n monitoring -w
```

**Obtener la IP externa:**
```bash
export PROMETHEUS_IP=$(kubectl get svc prometheus -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Prometheus URL: http://$PROMETHEUS_IP:9090"
```

### Paso 6: Verificar Prometheus

```bash
# Ver logs de Prometheus
kubectl logs -n monitoring -l app=prometheus --tail=50

# Verificar health
kubectl exec -n monitoring -it deployment/prometheus -- wget -qO- http://localhost:9090/-/healthy

# Verificar readiness
kubectl exec -n monitoring -it deployment/prometheus -- wget -qO- http://localhost:9090/-/ready
```

**Acceder a la UI:**
1. Abrir navegador en `http://<PROMETHEUS_IP>:9090`
2. Verificar que la UI cargue correctamente
3. Ir a **Status → Targets** para ver los targets configurados

---

## Instalación de Grafana

### Paso 1: Configurar Datasources

```bash
# Aplicar configuración de datasources
kubectl apply -f 07-grafana-datasources.yaml
```

**Datasources configurados:**
- **Prometheus**: Datasource principal (por defecto)
  - URL: `http://prometheus:9090`
  - Método HTTP: POST
  - Intervalo: 15s
  
- **Elasticsearch**: Datasource secundario para logs
  - URL: `http://elasticsearch.logging.svc.cluster.local:9200`
  - Database: `chapinflix-logs-*`

**Verificación:**
```bash
kubectl get configmap grafana-datasources -n monitoring
```

### Paso 2: Configurar Dashboards

```bash
# Aplicar configuración de provisioning de dashboards
kubectl apply -f 08-grafana-dashboards-config.yaml

# Aplicar dashboard de Chapinflix
kubectl apply -f 09-grafana-dashboard.json
```

**Dashboard incluido: "Chapinflix - Overview Dashboard"**

Paneles configurados:
1. Running Pods
2. Auth Service Status
3. Inventario Service Status
4. All Services Status
5. Microservices CPU Usage
6. Microservices Memory Usage
7. Network Traffic (RX/TX)
8. Pod Restarts
9. HPA Current Replicas
10. Container Disk I/O

**Verificación:**
```bash
kubectl get configmap grafana-dashboards-config -n monitoring
kubectl get configmap grafana-dashboards -n monitoring
```

### Paso 3: Desplegar Grafana

```bash
# Desplegar Grafana
kubectl apply -f 10-grafana-deployment.yaml
```

**Especificaciones del Deployment:**
- **Réplicas**: 1
- **Imagen**: grafana/grafana:10.2.2
- **Puerto**: 3000
- **Credenciales**:
  - Usuario: `admin`
  - Contraseña: `Chapinflix2024!`
- **Recursos**:
  - CPU: 100m (request) / 500m (limit)
  - Memoria: 256Mi (request) / 512Mi (limit)
- **Tipo de Servicio**: LoadBalancer

**Plugins instalados automáticamente:**
- grafana-clock-panel
- grafana-simple-json-datasource
- grafana-piechart-panel

**Verificación:**
```bash
# Ver el deployment
kubectl get deployment grafana -n monitoring

# Ver los pods
kubectl get pods -n monitoring -l app=grafana

# Ver el servicio
kubectl get svc grafana -n monitoring

# Esperar a que el LoadBalancer obtenga una IP externa
kubectl get svc grafana -n monitoring -w
```

**Obtener la IP externa:**
```bash
export GRAFANA_IP=$(kubectl get svc grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Grafana URL: http://$GRAFANA_IP:3000"
echo "Usuario: admin"
echo "Contraseña: Chapinflix2024!"
```

### Paso 4: Verificar Grafana

```bash
# Ver logs de Grafana
kubectl logs -n monitoring -l app=grafana --tail=50

# Verificar health
kubectl exec -n monitoring -it deployment/grafana -- wget -qO- http://localhost:3000/api/health
```

**Acceder a la UI:**
1. Abrir navegador en `http://<GRAFANA_IP>:3000`
2. Iniciar sesión con las credenciales
3. Verificar que el datasource de Prometheus esté conectado:
   - Ir a **Configuration → Data Sources**
   - Click en "Prometheus"
   - Click en "Test" (debe mostrar "Data source is working")
4. Verificar que el dashboard esté disponible:
   - Ir a **Dashboards → Browse**
   - Buscar "Chapinflix - Overview Dashboard"

---

## Instalación de Kube-State-Metrics

### Paso 1: Desplegar Kube-State-Metrics

```bash
# Aplicar todo el archivo
kubectl apply -f 06-kube-state-metrics.yaml
```

**Componentes creados:**
- ServiceAccount
- ClusterRole (permisos de lectura sobre recursos de K8s)
- ClusterRoleBinding
- Deployment
- Service (ClusterIP)

**Especificaciones:**
- **Imagen**: registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.10.1
- **Puertos**:
  - 8080: HTTP metrics
  - 8081: Telemetry
- **Recursos**:
  - CPU: 100m (request) / 200m (limit)
  - Memoria: 128Mi (request) / 256Mi (limit)

**Verificación:**
```bash
# Ver el deployment
kubectl get deployment kube-state-metrics -n monitoring

# Ver el pod
kubectl get pods -n monitoring -l app=kube-state-metrics

# Ver el servicio
kubectl get svc kube-state-metrics -n monitoring

# Verificar métricas
kubectl exec -n monitoring -it deployment/kube-state-metrics -- wget -qO- http://localhost:8080/metrics | head -20
```

---

## Instalación de Node Exporter

### Paso 1: Desplegar Node Exporter

```bash
# Aplicar el archivo
kubectl apply -f 11-node-exporter.yaml
```

**Componentes creados:**
- ServiceAccount
- DaemonSet (se ejecuta en todos los nodos)
- Service (ClusterIP None - Headless)

**Especificaciones:**
- **Imagen**: prom/node-exporter:v1.7.0
- **Puerto**: 9100
- **Modo**: HostNetwork, HostPID, HostIPC
- **Recursos**:
  - CPU: 102m (request) / 250m (limit)
  - Memoria: 180Mi

**Verificación:**
```bash
# Ver el daemonset
kubectl get daemonset node-exporter -n monitoring

# Ver los pods (debe haber uno por nodo)
kubectl get pods -n monitoring -l app=node-exporter -o wide

# Contar cuántos nodes hay
kubectl get nodes --no-headers | wc -l

# Contar cuántos pods de node-exporter hay (debe coincidir)
kubectl get pods -n monitoring -l app=node-exporter --no-headers | wc -l

# Verificar métricas de un pod
POD_NAME=$(kubectl get pods -n monitoring -l app=node-exporter -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n monitoring -it $POD_NAME -- wget -qO- http://localhost:9100/metrics | head -20
```

---

## Verificación de la Instalación

### Paso 1: Verificar Todos los Pods

```bash
# Ver todos los pods en monitoring
kubectl get pods -n monitoring

# Salida esperada:
# NAME                                  READY   STATUS    RESTARTS   AGE
# prometheus-xxxxxxxxxx-xxxxx           1/1     Running   0          Xm
# grafana-xxxxxxxxxx-xxxxx              1/1     Running   0          Xm
# kube-state-metrics-xxxxxxxxxx-xxxxx   1/1     Running   0          Xm
# node-exporter-xxxxx                   1/1     Running   0          Xm
# node-exporter-xxxxx                   1/1     Running   0          Xm
# ...
```

**Todos los pods deben estar en estado `Running` con `1/1 READY`.**

### Paso 2: Verificar Servicios

```bash
# Ver todos los servicios
kubectl get svc -n monitoring

# Salida esperada:
# NAME                 TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)          AGE
# prometheus           LoadBalancer   10.x.x.x        <EXTERNAL-IP>   9090:xxxxx/TCP   Xm
# grafana              LoadBalancer   10.x.x.x        <EXTERNAL-IP>   3000:xxxxx/TCP   Xm
# kube-state-metrics   ClusterIP      10.x.x.x        <none>          8080/TCP         Xm
# node-exporter        ClusterIP      None            <none>          9100/TCP         Xm
```

### Paso 3: Verificar Configuraciones

```bash
# Listar ConfigMaps
kubectl get configmap -n monitoring

# Salida esperada:
# NAME                          DATA   AGE
# prometheus-config             1      Xm
# prometheus-rules              1      Xm
# grafana-datasources           1      Xm
# grafana-dashboards-config     1      Xm
# grafana-dashboards            1      Xm
```

### Paso 4: Verificar RBAC

```bash
# Verificar ServiceAccounts
kubectl get serviceaccount -n monitoring

# Verificar ClusterRoles
kubectl get clusterrole | grep -E "prometheus|kube-state-metrics|node-exporter"

# Verificar ClusterRoleBindings
kubectl get clusterrolebinding | grep -E "prometheus|kube-state-metrics|node-exporter"
```

### Paso 5: Verificar Targets en Prometheus

1. Acceder a Prometheus UI: `http://<PROMETHEUS_IP>:9090`
2. Ir a **Status → Targets**
3. Verificar que todos los jobs estén **UP**:
   - prometheus
   - kubernetes-apiservers
   - kubernetes-cadvisor
   - kube-state-metrics
   - node-exporter
   - chapinflix-services (puede estar DOWN si los microservicios no tienen anotaciones)

```bash
# Alternativa: verificar targets via API
curl -s http://<PROMETHEUS_IP>:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

### Paso 6: Verificar Grafana

1. Acceder a Grafana UI: `http://<GRAFANA_IP>:3000`
2. Login con `admin` / `Chapinflix2024!`
3. Verificar datasources:
   - **Configuration → Data Sources**
   - Prometheus debe estar marcado como "default" y con estado "working"
4. Verificar dashboard:
   - **Dashboards → Browse**
   - Debe aparecer "Chapinflix - Overview Dashboard"
   - Abrir el dashboard y verificar que muestre datos

---

## Configuración Inicial

### Configurar Anotaciones en Microservicios

Para que Prometheus pueda scrapear métricas de los microservicios de Chapinflix, es necesario agregar anotaciones a los pods.

```bash
# Para cada microservicio, agregar anotaciones
kubectl patch deployment auth-service -p '{"spec":{"template":{"metadata":{"annotations":{"prometheus.io/scrape":"true","prometheus.io/port":"8000","prometheus.io/path":"/metrics"}}}}}'

kubectl patch deployment inventario-service -p '{"spec":{"template":{"metadata":{"annotations":{"prometheus.io/scrape":"true","prometheus.io/port":"8001","prometheus.io/path":"/metrics"}}}}}'

kubectl patch deployment ususarios-service -p '{"spec":{"template":{"metadata":{"annotations":{"prometheus.io/scrape":"true","prometheus.io/port":"8002","prometheus.io/path":"/metrics"}}}}}'

kubectl patch deployment vercatalogo-service -p '{"spec":{"template":{"metadata":{"annotations":{"prometheus.io/scrape":"true","prometheus.io/port":"8010","prometheus.io/path":"/metrics"}}}}}'

kubectl patch deployment verpeli-service -p '{"spec":{"template":{"metadata":{"annotations":{"prometheus.io/scrape":"true","prometheus.io/port":"8020","prometheus.io/path":"/metrics"}}}}}'
```

**Verificar anotaciones:**
```bash
kubectl get deployment auth-service -o jsonpath='{.spec.template.metadata.annotations}'
```

### Configurar Retención de Datos

Si necesita cambiar la retención de datos de Prometheus (por defecto 15 días):

```bash
# Editar el deployment
kubectl edit deployment prometheus -n monitoring

# Cambiar el argumento:
# - '--storage.tsdb.retention.time=15d'
# Por ejemplo, para 30 días:
# - '--storage.tsdb.retention.time=30d'
```

### Cambiar Contraseña de Grafana

```bash
# Método 1: Editar deployment
kubectl edit deployment grafana -n monitoring
# Cambiar GF_SECURITY_ADMIN_PASSWORD

# Método 2: Desde la UI de Grafana
# Profile → Change Password
```

---

## Troubleshooting

### Problema: Pod de Prometheus en CrashLoopBackOff

**Síntomas:**
```bash
kubectl get pods -n monitoring
# prometheus-xxx   0/1   CrashLoopBackOff
```

**Diagnóstico:**
```bash
# Ver logs
kubectl logs -n monitoring -l app=prometheus --tail=100

# Errores comunes:
# - "error loading config" → ConfigMap mal formado
# - "permission denied" → RBAC no configurado correctamente
```

**Solución:**
```bash
# Verificar ConfigMap
kubectl get configmap prometheus-config -n monitoring -o yaml

# Verificar RBAC
kubectl get clusterrolebinding prometheus
kubectl describe clusterrolebinding prometheus

# Reintentar deployment
kubectl rollout restart deployment prometheus -n monitoring
```

### Problema: Prometheus no puede scrapear targets

**Síntomas:**
En Prometheus UI, los targets aparecen como **DOWN** con error de conexión.

**Diagnóstico:**
```bash
# Ver targets desde la API
curl -s http://<PROMETHEUS_IP>:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'

# Ver logs de Prometheus
kubectl logs -n monitoring -l app=prometheus --tail=100 | grep -i error
```

**Soluciones:**

1. **Para microservicios de Chapinflix:**
   ```bash
   # Verificar que las anotaciones estén presentes
   kubectl get pods -n default -o yaml | grep -A 5 "prometheus.io"
   
   # Verificar que el endpoint /metrics exista
   POD_NAME=$(kubectl get pods -n default -l app=auth-service -o jsonpath='{.items[0].metadata.name}')
   kubectl exec -it $POD_NAME -- curl http://localhost:8000/metrics
   ```

2. **Para kube-state-metrics:**
   ```bash
   # Verificar que el servicio esté accesible
   kubectl exec -n monitoring -it deployment/prometheus -- wget -qO- http://kube-state-metrics.monitoring.svc.cluster.local:8080/metrics | head
   ```

3. **Para node-exporter:**
   ```bash
   # Verificar que el DaemonSet esté corriendo en todos los nodos
   kubectl get pods -n monitoring -l app=node-exporter -o wide
   ```

### Problema: Grafana no puede conectarse a Prometheus

**Síntomas:**
En Grafana, el datasource de Prometheus muestra error al hacer "Test".

**Diagnóstico:**
```bash
# Verificar que Prometheus esté accesible desde Grafana
kubectl exec -n monitoring -it deployment/grafana -- wget -qO- http://prometheus:9090/api/v1/query?query=up

# Ver logs de Grafana
kubectl logs -n monitoring -l app=grafana --tail=100 | grep -i prometheus
```

**Solución:**
```bash
# Verificar el ConfigMap de datasources
kubectl get configmap grafana-datasources -n monitoring -o yaml

# Reiniciar Grafana
kubectl rollout restart deployment grafana -n monitoring

# Esperar a que esté listo
kubectl rollout status deployment grafana -n monitoring
```

### Problema: No aparecen datos en los dashboards de Grafana

**Síntomas:**
Los dashboards cargan pero no muestran datos o muestran "No data".

**Diagnóstico:**
```bash
# Verificar que Prometheus tenga datos
curl -s "http://<PROMETHEUS_IP>:9090/api/v1/query?query=up" | jq '.data.result'

# Verificar el rango de tiempo en Grafana
# Asegurarse de que está en "Last 5 minutes" o similar
```

**Solución:**
1. Verificar que el rango de tiempo en Grafana sea apropiado
2. Verificar que las queries en el dashboard sean correctas
3. Verificar que los targets en Prometheus estén UP

### Problema: LoadBalancer no obtiene IP externa

**Síntomas:**
```bash
kubectl get svc prometheus -n monitoring
# EXTERNAL-IP muestra <pending>
```

**Diagnóstico:**
```bash
# Ver eventos del servicio
kubectl describe svc prometheus -n monitoring | grep -i events

# Verificar configuración del LoadBalancer en GKE
gcloud compute forwarding-rules list
```

**Solución:**
```bash
# Esperar 5-10 minutos (GKE puede tardar)

# Si persiste, usar NodePort temporalmente
kubectl patch svc prometheus -n monitoring -p '{"spec":{"type":"NodePort"}}'

# O usar port-forward
kubectl port-forward -n monitoring svc/prometheus 9090:9090
```

### Problema: Alto uso de recursos

**Síntomas:**
Prometheus consume mucha CPU o memoria.

**Diagnóstico:**
```bash
# Ver uso de recursos
kubectl top pods -n monitoring

# Ver métricas detalladas
kubectl describe pod -n monitoring -l app=prometheus
```

**Solución:**
```bash
# Aumentar límites de recursos
kubectl edit deployment prometheus -n monitoring

# Cambiar:
# resources:
#   limits:
#     cpu: 2000m      # De 1000m a 2000m
#     memory: 4Gi     # De 2Gi a 4Gi

# Reducir retención
# - '--storage.tsdb.retention.time=7d'  # De 15d a 7d
```

### Comandos Útiles para Debugging

```bash
# Ver todos los recursos en monitoring
kubectl get all -n monitoring

# Ver eventos recientes
kubectl get events -n monitoring --sort-by='.lastTimestamp'

# Describir un recurso problemático
kubectl describe pod <pod-name> -n monitoring

# Ver logs en tiempo real
kubectl logs -n monitoring -l app=prometheus -f

# Ejecutar comandos dentro de un pod
kubectl exec -n monitoring -it deployment/prometheus -- sh

# Reiniciar todos los deployments
kubectl rollout restart deployment -n monitoring

# Eliminar un pod para forzar recreación
kubectl delete pod <pod-name> -n monitoring
```

---

## Resumen de Comandos de Instalación

```bash
# 1. Crear namespace
kubectl apply -f 01-monitoring-namespace.yaml

# 2. Configurar Prometheus
kubectl apply -f 02-prometheus-config.yaml
kubectl apply -f 03-prometheus-rules.yaml
kubectl apply -f 04-prometheus-rbac.yaml
kubectl apply -f 05-prometheus-deployment.yaml

# 3. Configurar Grafana
kubectl apply -f 07-grafana-datasources.yaml
kubectl apply -f 08-grafana-dashboards-config.yaml
kubectl apply -f 09-grafana-dashboard.yaml
kubectl apply -f 10-grafana-deployment.yaml

# 4. Configurar componentes adicionales
kubectl apply -f 06-kube-state-metrics.yaml
kubectl apply -f 11-node-exporter.yaml

# 5. Verificar instalación
kubectl get pods -n monitoring
kubectl get svc -n monitoring

# 6. Obtener IPs externas
kubectl get svc prometheus -n monitoring
kubectl get svc grafana -n monitoring
```