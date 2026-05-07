# Contratos de Microservicios — Chapinflix

Este directorio contiene los **contratos de API** de los microservicios, publicados en dos formatos:
- **OpenAPI** (exportado de cada servicio: `/openapi.json`)
- **Colecciones de Postman** (con Examples + Environment)

## Endpoints base (API Gateway)
- Auth: `{{gateway}}/auth`
- Ver Películas: `{{gateway}}/verpeli`
- Ver Catálogo: `{{gateway}}/vercatalogo`
- Inventario: `{{gateway}}/inventario`
- Usuarios: `{{gateway}}/ususarios`

> Por defecto `{{gateway}} = http://localhost:8080`.

---

## Cómo importar en Postman

1. Abrir Postman → **Import** → arrastrar las colecciones de `/postman/*.json` y el environment `Chapinflix-Local.postman_environment.json`.
2. Seleccionar environment **Chapinflix Local**.
3. En la colección **Auth**, ejecutar **POST** `/api/auth/login` con tus credenciales para poblar `{{access_token}}` automáticamente.
4. Probar las requests de **Ver Películas** y **Ver Catálogo**. Los Examples están guardados en cada request como parte del contrato.

---

## Autenticación

- Tipo: **Bearer JWT**  
- Cómo obtenerlo: **POST** `{{auth_base}}/api/auth/login`  
  Body:
  ```json
  {"username":"<usuario>","password":"<password>","totp_code": null}
