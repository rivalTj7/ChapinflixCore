# Metodología de versionamiento (SemVer) y etiquetado de imágenes

### 1) Esquema de versiones (SemVer)

Formato: `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]`

* **MAJOR**: cambios incompatibles (breaking changes) en APIs o contratos entre servicios.
* **MINOR**: nuevas funcionalidades compatibles hacia atrás.
* **PATCH**: correcciones de errores, cambios internos sin afectar contratos.
* **PRERELEASE** (opcional): `-alpha.N`, `-beta.N`, `-rc.N` para candidatos antes del `stable`.
* **BUILD** (opcional): metadatos no semánticos, usualmente se evita en tags.

### 2) Convención de commits y cómo determinan el bump

Se recomienda **Conventional Commits**:

* `feat: ...` → sugiere **MINOR**
* `fix: ...` → sugiere **PATCH**
* `feat!:` o `fix!:` o `refactor!:` → implica **MAJOR** (breaking)
* `chore:`, `docs:`, `test:`, `refactor:` (sin `!`) → no necesariamente cambia versión


### 3) Mapeo con GitFlow y ramas

* **feature/**: no generan versiones; sólo *builds* con etiqueta `:SHA` para pruebas en `develop`.
* **develop**: *builds* de imágenes `:SHA`. No versiona.
* **release/x.y.z[-prerelease]**: prepara una versión. Desde aquí se:

  1. Ajusta `CHANGELOG.md` y versiones de manifiestos si aplica.
  2. Corre *hardening* y pruebas de humo.
  3. Al hacer *merge* o finalizar release, el job **create_release** crea el **tag** `x.y.z`.
* **main**: despliegue a producción. Se recomienda promover **tags estables** (`x.y.z`) en lugar de `:SHA` cuando se requiera trazabilidad estricta.
* **hotfix/x.y.(z+1)**: rama creada desde `main` para correcciones urgentes; se publica como `x.y.(z+1)`.

### 4) Política de etiquetado de imágenes Docker

* **Builds de CI**: `:<CI_COMMIT_SHA>` (inmutables por commit).
* **Release estable**: `:x.y.z` y `:latest`.
* **Pre-release**: opcional `:x.y.z-rc.N` si se requiere canal de candidatos.
* **Sugerencia producción**: fijar despliegues a `:x.y.z` (o por **digest**) para auditoría y *rollbacks* reproducibles.

### 5) Flujo operativo para cortar una versión

1. Decidir el *bump* (**MAJOR/MINOR/PATCH**) con base en cambios acumulados.
2. Crear rama de release:

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/2.3.0
   ```
3. Actualizar `CHANGELOG.md` (ver §6) y versiones en archivos si aplica.
4. *Push* y abrir MR si se requiere revisión:

   ```bash
   git push origin release/2.3.0
   ```
5. El pipeline de **release**:

   * `create_release` → crea **tag** `2.3.0` en el repo.
   * `push_release_images` → re-etiqueta imágenes `:2.3.0` y `:latest` desde el `:SHA`.
6. Desplegar a producción desde `main` o promover explícitamente el tag:

   ```bash
   kubectl -n default set image deployment/auth-service \
     auth=gcr.io/chapinflix-sa/sa-auth:2.3.0
   kubectl -n default rollout status deployment/auth-service
   ```

### 6) CHANGELOG y trazabilidad

* Mantener `CHANGELOG.md` con entradas por versión:

  * **Added**, **Changed**, **Fixed**, **Removed**, **Security**.
* Generación manual mínima:

  ```bash
  git log --pretty=format:"* %s (%h)" TAG_PREV..HEAD > .changes.tmp
  ```

  y luego clasificar.
* Alternativa: usar herramientas como *conventional-changelog* o *git-cliff* (opcional, fuera del pipeline actual).

### 7) Hotfixes

1. Crear rama desde `main`:

   ```bash
   git checkout main && git pull
   git checkout -b hotfix/2.3.1
   ```
2. Aplicar fix, actualizar `CHANGELOG.md` en **Fixed**.
3. *Push* y ejecutar pipeline de release (tag `2.3.1`).
4. *Merge back* a `develop` para no perder el fix:

   ```bash
   git checkout develop
   git pull
   git merge --no-ff hotfix/2.3.1
   git push
   ```

### 8) Compatibilidad y contratos entre servicios

* **MAJOR** se reserva para cambios que rompen APIs públicas (REST/GRPC), esquemas de BD o contratos de eventos.
* Cambios en esquemas de BD deben planificarse como **migraciones compatibles**: primero añadir campos y tolerar ambos formatos; retirar en la siguiente **MAJOR**.

### 9) Ventanas y reglas

* **Congelamiento de release**: durante `release/x.y.z` sólo se aceptan fixes y *doc*.
* **RC opcional**: `release/x.y.z-rc.1` si se necesita estabilización en *testing*.
* **Soporte**: mantener al menos `N` últimas **MINOR**; parches sólo en la **stable** y **hotfix** vigente.

### 10) Matriz rápida de decisión

| Tipo de cambio                 | Ejemplo                               | Bump      |
| ------------------------------ | ------------------------------------- | --------- |
| Breaking en API/contrato       | eliminar campo requerido en respuesta | **MAJOR** |
| Nueva capacidad compatible     | nuevo endpoint opcional               | **MINOR** |
| Corrección sin impacto público | fix de bug interno                    | **PATCH** |

