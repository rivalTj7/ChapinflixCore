# Casos de Uso

## CUN 100 Autenticación

<table>
  <tr>
    <th colspan="2">CDU 101 – Registrar Usuario</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Registrar Usuario</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Usuario, Frontend (Angular), Auth Service, Email Service</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Crear una cuenta nueva, almacenando datos personales y credenciales de forma segura, y enviar un correo de verificación para activar la cuenta.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El usuario completa el formulario en el Frontend. El Auth Service valida unicidad de email/username, encripta datos sensibles, guarda el registro y genera un token de verificación que se envía por correo. El caso de uso finaliza con la confirmación de registro pendiente de verificación.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El usuario completa el formulario de registro.</td>
    <td>2. El Frontend envía <em>POST</em> <code>/auth/api/auth/register</code> al Auth Service.</td>
  </tr>
  <tr>
    <td></td>
    <td>3. El Auth Service valida que no exista email o username duplicado.</td>
  </tr>
  <tr>
    <td></td>
    <td>4. Se encriptan email y nombres; se hashea la contraseña y se inserta el usuario (inactivo/no verificado).</td>
  </tr>
  <tr>
    <td></td>
    <td>5. Se genera y almacena el token de verificación (24h).</td>
  </tr>
  <tr>
    <td></td>
    <td>6. Se envía correo con link <code>/verify-email?token=...</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>7. Se responde 200 con mensaje “Registro exitoso, revisa tu correo”.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 3</td>
    <td>Si email o username ya existen, responder 400 “Usuario ya existe”.</td>
  </tr>
  <tr>
    <td>En la línea 6</td>
    <td>Si el email no puede enviarse, registrar el evento y mostrar mensaje de reintento (sin revelar detalles técnicos).</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — puerta de entrada al sistema.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Reenvío de verificación; CAPTCHA; registro social (OAuth); límites de tasa por IP.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: password seguro; unicidad de email/username; expiración de token (24h); cifrado de PII.</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 102 – Verificar Email</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Verificar Email</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Usuario, Frontend (Angular), Auth Service, Email Service</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Confirmar que la dirección de correo electrónico proporcionada en el registro es válida y pertenece al usuario.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El usuario recibe un correo con un enlace de verificación generado en el registro. Al hacer clic, el Frontend envía el token al Auth Service, que valida su existencia y vigencia. Si es válido, activa la cuenta y elimina el token. El caso de uso finaliza cuando el sistema confirma que el usuario ya puede iniciar sesión.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El usuario revisa su bandeja y hace clic en el enlace de verificación.</td>
    <td>2. El Frontend envía <em>GET</em> <code>/auth/api/auth/verify-email?token=...</code> al Auth Service.</td>
  </tr>
  <tr>
    <td></td>
    <td>3. El Auth Service consulta la tabla de tokens y valida que exista y no haya expirado.</td>
  </tr>
  <tr>
    <td></td>
    <td>4. Si el token es válido, actualiza el usuario (<code>is_verified=true</code>, <code>is_active=true</code>).</td>
  </tr>
  <tr>
    <td></td>
    <td>5. Elimina el token de verificación utilizado.</td>
  </tr>
  <tr>
    <td></td>
    <td>6. Responde 200 con mensaje “Email verificado exitosamente”.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 3</td>
    <td>Si el token no existe o está vencido, se responde 400 “Token inválido o expirado” y no se activa la cuenta.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — asegura que solo usuarios legítimos tengan cuentas activas.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Opción de reenviar correo de verificación desde la pantalla de login; tokens de un solo uso con refresh automático.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: token válido solo 24 horas; solo cuentas no verificadas pueden usarlo.</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 103 – Iniciar Sesión</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Iniciar Sesión</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Usuario, Frontend (Angular), Auth Service, PostgreSQL</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Permitir al usuario autenticarse en el sistema mediante sus credenciales, generando tokens de acceso y actualización para la sesión.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El usuario ingresa su nombre de usuario y contraseña en el Frontend. El Auth Service valida la existencia del usuario, revisa bloqueos, verifica la contraseña y el estado de verificación de correo. Si todo es correcto, genera los tokens JWT (access y refresh), los guarda y los devuelve al Frontend para establecer la sesión. Si el usuario tiene habilitado 2FA, se extiende el flujo al CDU 104.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El usuario ingresa credenciales (usuario/contraseña).</td>
    <td>2. El Frontend envía <em>POST</em> <code>/auth/api/auth/login</code> al Auth Service.</td>
  </tr>
  <tr>
    <td></td>
    <td>3. El Auth Service busca el usuario en la base de datos.</td>
  </tr>
  <tr>
    <td></td>
    <td>4. Si existe, verifica que la cuenta no esté bloqueada (<code>locked_until</code>).</td>
  </tr>
  <tr>
    <td></td>
    <td>5. Valida la contraseña con el hash almacenado.</td>
  </tr>
  <tr>
    <td></td>
    <td>6. Si la contraseña es correcta y el correo está verificado, genera tokens JWT con claims (id, roles, flags) y guarda el refresh token en la BD.</td>
  </tr>
  <tr>
    <td></td>
    <td>7. Devuelve tokens y establece cookies seguras (<code>access_token</code>, <code>refresh_token</code>).</td>
  </tr>
  <tr>
    <td></td>
    <td>8. El usuario accede a su dashboard autenticado.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 3</td>
    <td>Si el usuario no existe, se devuelve 401 “Credenciales inválidas”.</td>
  </tr>
  <tr>
    <td>En la línea 4</td>
    <td>Si la cuenta está bloqueada, se devuelve 423 “Cuenta bloqueada hasta [fecha]”.</td>
  </tr>
  <tr>
    <td>En la línea 5</td>
    <td>Si la contraseña es incorrecta, se incrementa <code>failed_login_attempts</code>; al superar el máximo se bloquea temporalmente la cuenta.</td>
  </tr>
  <tr>
    <td>En la línea 6</td>
    <td>Si el correo no está verificado, se devuelve 401 “Debe verificar su email”.</td>
  </tr>
  <tr>
    <td>En la línea 6</td>
    <td>Si el usuario tiene habilitado 2FA, se extiende el flujo al CDU 104 – Autenticación 2FA.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — fundamental para el acceso al sistema.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Integrar inicio de sesión con proveedores externos (OAuth2), notificaciones de inicio sospechoso, límites de intentos distribuidos.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: contraseñas hasheadas con bcrypt/argon2; tokens con expiración corta (access) y larga (refresh).</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 104 – Autenticación en Dos Factores (2FA)</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Autenticación en Dos Factores (2FA)</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Usuario, Frontend (Angular), Auth Service, PostgreSQL</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Reforzar la seguridad del inicio de sesión validando un código temporal generado por una aplicación de autenticación (ej. Google Authenticator), además de la contraseña del usuario.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>Después de ingresar usuario y contraseña correctos (CDU 103), si la cuenta tiene 2FA habilitado, el Auth Service solicita un código TOTP al usuario. El Frontend lo envía y el servicio valida el código con la clave secreta cifrada del usuario. Si es correcto, el login continúa con éxito; en caso contrario, se rechaza el acceso.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El usuario ingresa usuario y contraseña correctos.</td>
    <td>2. El Auth Service detecta que la cuenta tiene 2FA habilitado.</td>
  </tr>
  <tr>
    <td>3. El usuario recibe mensaje solicitando su código 2FA.</td>
    <td>4. El Frontend envía <em>POST</em> <code>/auth/api/auth/login</code> con <code>totp_code</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>5. El Auth Service desencripta el secreto almacenado y valida el código TOTP.</td>
  </tr>
  <tr>
    <td></td>
    <td>6. Si el código es válido, se generan los tokens JWT, se almacenan en BD y se devuelven al Frontend.</td>
  </tr>
  <tr>
    <td></td>
    <td>7. El usuario accede a su dashboard autenticado.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 4</td>
    <td>Si el usuario no envía el código, se devuelve 401 “Código 2FA requerido”.</td>
  </tr>
  <tr>
    <td>En la línea 5</td>
    <td>Si el código TOTP es inválido, se devuelve 401 “Código 2FA incorrecto” y no se completa el login.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Media-Alta — opcional pero crucial para usuarios que requieren mayor seguridad.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Incluir soporte para métodos alternativos (correo/SMS), permitir “recordar dispositivo” de confianza por 30 días.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: secreto cifrado en BD, códigos TOTP válidos solo por 30 segundos; requiere librerías seguras de verificación.</td>
  </tr>
</table>

---

## CUN 200 Ver Catálogo

<table>
  <tr>
    <th colspan="2">CDU 201 – Explorar Carruseles Principales</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Explorar Carruseles Principales</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Usuario, Frontend (Angular), Ver Catálogo Service, PostgreSQL (content)</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Permitir que el usuario explore el contenido disponible en la página principal a través de carruseles como “Más Populares”, “Top 15”, “Recientemente Agregados” y “Película Destacada”.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El usuario accede a la página principal. El Frontend realiza llamadas al servicio de catálogo para obtener carruseles generales. El servicio consulta la base de datos aplicando filtros de disponibilidad, suscripción y popularidad. El caso de uso finaliza cuando el usuario visualiza la página con todos los carruseles cargados.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El usuario ingresa a la página principal.</td>
    <td>2. El Frontend solicita datos de los carruseles al servicio de catálogo.</td>
  </tr>
  <tr>
    <td>3. El servicio de catálogo identifica si el usuario está autenticado (opcional).</td>
    <td>4. Se consultan funciones en BD: <code>fn_catalog_featured</code>, <code>fn_catalog_most_popular</code>, <code>fn_catalog_top_15</code>, <code>fn_catalog_recently_added</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>5. La base devuelve las películas filtradas y ordenadas.</td>
  </tr>
  <tr>
    <td></td>
    <td>6. El servicio responde con carruseles en JSON.</td>
  </tr>
  <tr>
    <td></td>
    <td>7. El Frontend renderiza la página con los carruseles.</td>
  </tr>
  <tr>
    <td></td>
    <td>8. El usuario visualiza la película destacada y los carruseles generales.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 4</td>
    <td>Si no hay contenido disponible (ej. sin destacados), el servicio responde <code>null</code> y el Frontend muestra secciones vacías.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — es la entrada principal para el descubrimiento de contenido.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Permitir personalizar el orden de los carruseles según preferencias; incluir más filtros (ej. “Recomendados para ti”).</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: solo películas activas, con banner o poster válido y dentro de las fechas de disponibilidad.</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 202 – Explorar Catálogo Personal (Historial y “Ver otra vez”)</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Explorar Catálogo Personal</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Usuario (autenticado), Frontend (Angular), Ver Catálogo Service, PostgreSQL (content)</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Mostrar carruseles personalizados basados en el comportamiento del usuario: “Vistos recientemente” y “Ver otra vez”.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>Con el usuario autenticado, el Frontend solicita carruseles personales. El servicio consulta el historial (<code>view_history</code>) y calcula listas como “Vistos recientemente” y “Ver otra vez” (vistas &gt; 1), aplicando filtros de disponibilidad y acceso (pago/gratis). El usuario visualiza su catálogo personalizado junto a los carruseles generales.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El usuario autenticado abre el catálogo.</td>
    <td>2. El Frontend incluye el JWT y solicita carruseles personales:
      <ul>
        <li><code>GET /vercatalogo/catalog/recently-watched?limit=20</code></li>
        <li><code>GET /vercatalogo/catalog/watch-again?limit=20</code></li>
      </ul>
    </td>
  </tr>
  <tr>
    <td></td>
    <td>3. El servicio extrae <code>user_id</code> del JWT y valida estado de pago (claim <code>paid</code>).</td>
  </tr>
  <tr>
    <td></td>
    <td>4. Consulta BD:
      <ul>
        <li><code>fn_catalog_recently_watched(user_id, limit)</code></li>
        <li><code>fn_catalog_watch_again(user_id, limit)</code></li>
      </ul>
      aplicando filtros: <em>is_active</em>, disponibilidad vigente y acceso según suscripción.
    </td>
  </tr>
  <tr>
    <td></td>
    <td>5. Devuelve listas personalizadas (títulos, posters, clasificación, timestamps/contadores).</td>
  </tr>
  <tr>
    <td></td>
    <td>6. El Frontend renderiza carruseles personales junto a los generales (CDU 201).</td>
  </tr>
  <tr>
    <td></td>
    <td>7. El usuario navega su contenido personalizado.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 1–2 (usuario no autenticado)</td>
    <td>El servicio responde con carruseles vacíos para personales (items=[], total=0); se muestran solo carruseles generales.</td>
  </tr>
  <tr>
    <td>En la línea 4 (sin historial)</td>
    <td>“Vistos recientemente” y/o “Ver otra vez” regresan vacíos; el Frontend oculta la sección o muestra estado vacío.</td>
  </tr>
  <tr>
    <td>En la línea 4 (títulos no disponibles)</td>
    <td>Se excluyen títulos no activos o fuera de ventana de disponibilidad.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — aumenta engagement y retorno del usuario.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Agregar “Continuar viendo”, recomendaciones basadas en similitud, y filtros por género dentro de personales.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: requiere JWT válido para personales; privacidad del historial por usuario.</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 203 – Navegar por Categorías</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Navegar por Categorías</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Usuario, Frontend (Angular), Ver Catálogo Service, PostgreSQL (content)</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Permitir al usuario explorar películas organizadas por categorías o géneros, con paginación y filtrado automático según disponibilidad y suscripción.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El usuario accede al menú de categorías. El Frontend consulta la lista disponible y la muestra. Al seleccionar una categoría (ejemplo: Aventura), el servicio consulta en BD y devuelve las películas correspondientes. El usuario puede paginar para ver más resultados. El caso de uso finaliza cuando el usuario visualiza contenido organizado por categorías.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El usuario abre el menú de categorías.</td>
    <td>2. El Frontend solicita <code>GET /vercatalogo/catalog/categories</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>3. El servicio consulta <code>fn_catalog_categories()</code> y devuelve todas las categorías activas.</td>
  </tr>
  <tr>
    <td>4. El usuario selecciona una categoría (ej. “aventura”).</td>
    <td>5. El Frontend solicita <code>GET /vercatalogo/catalog/category/aventura?limit=20&amp;offset=0</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>6. El servicio normaliza slug y consulta <code>fn_catalog_by_category(slug, user_id, limit, offset)</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>7. La base devuelve películas de esa categoría filtradas por disponibilidad y acceso (gratis/pago).</td>
  </tr>
  <tr>
    <td></td>
    <td>8. El servicio responde con <code>CarouselResponse</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>9. El Frontend renderiza grid de películas de la categoría.</td>
  </tr>
  <tr>
    <td>10. El usuario puede solicitar más (scroll o “cargar más”).</td>
    <td>11. El Frontend envía nuevamente la solicitud con <code>offset</code> incrementado.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 3</td>
    <td>Si no hay categorías activas, se devuelve lista vacía y el Frontend oculta el menú.</td>
  </tr>
  <tr>
    <td>En la línea 7</td>
    <td>Si no hay películas en esa categoría, se devuelve vacía y se muestra mensaje al usuario.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Media-Alta — facilita exploración estructurada del catálogo.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Agregar filtros combinados (ej. “Aventura + Animación”), orden por popularidad o recientes.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: solo categorías activas y con slug único; paginación controlada por offset/limit.</td>
  </tr>
</table>

---

## CUN 300 Ver Películas

<table>
  <tr>
    <th colspan="2">CDU 301 – Ver Detalle de Película (por <em>slug</em>)</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Ver Detalle de Película</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Usuario, Frontend (Angular), Movie Viewer Service (<code>verpeli-service</code>), PostgreSQL (schema <code>content</code>)</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Obtener los metadatos completos de una película (títulos, clasificación, categorías, imágenes y disponibilidad) para mostrarlos en la pantalla de detalle.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El usuario navega a la página de una película. El Frontend solicita el detalle por <em>slug</em> al Movie Viewer Service, que consulta la función <code>content.fn_movie_detail_by_slug</code> y retorna la información para renderizar la vista. La validación de acceso/reproducción se gestiona en CDUs aparte (CDU 302/303).</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El usuario abre la página de detalle de una película.</td>
    <td>2. El Frontend invoca <code>GET /verpeli/movie/{slug}</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>3. El Movie Viewer Service normaliza el <em>slug</em> a minúsculas.</td>
  </tr>
  <tr>
    <td></td>
    <td>4. Consulta BD: <code>SELECT * FROM content.fn_movie_detail_by_slug($1)</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>5. La BD retorna: <code>movie_id</code>, <code>title</code>, <code>slug</code>, <code>classification</code>, <code>categories[]</code>, <code>images JSONB</code>, <code>is_free</code>, <code>available_from</code>, <code>available_until</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>6. El servicio responde 200 con el <em>payload</em> <code>MovieDetail</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>7. El Frontend renderiza la ficha de la película y habilita acciones (p. ej. botón “Reproducir”).</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 4</td>
    <td>Si la consulta no encuentra el <em>slug</em>, el servicio responde 404 “Movie not found”.</td>
  </tr>
  <tr>
    <td>En la línea 7</td>
    <td>Si la película existe pero está inactiva o fuera de ventana, la vista puede mostrarse; el acceso/reproducción se validará en CDU 302/303.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — base para mostrar información previa a reproducción.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Incluir “similares” (por categorías); caché de respuesta; <em>prefetch</em> de carruseles relacionados.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: <em>slug</em> único y en minúsculas; la función no aplica filtros de acceso (se delega a CDU 302/303).</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 302 – Validar Acceso a Película (Can-View)</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Validar Acceso a Película</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Usuario (autenticado u opcional), Frontend (Angular), Movie Viewer Service (<code>verpeli-service</code>), PostgreSQL (schema <code>content</code>)</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Determinar si un usuario puede acceder a la visualización de una película específica según su estado de suscripción, disponibilidad y reglas de acceso.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>Antes de habilitar la reproducción, el Frontend invoca al servicio de películas para validar si el usuario tiene derecho a ver la película (gratis/pago). El servicio consulta la función <code>content.fn_movie_can_view</code> en la BD, que devuelve una bandera de permitido y un motivo de negación en caso de denegación. El resultado determina si se habilita o no el botón “Reproducir”.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El usuario abre la página de detalle de la película.</td>
    <td>2. El Frontend solicita <code>GET /verpeli/movie/{slug}/can-view</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>3. El servicio extrae <code>user_id</code> del contexto (si existe) y estado de pago (<code>paid</code>).</td>
  </tr>
  <tr>
    <td></td>
    <td>4. Consulta BD: <code>SELECT allowed, denial_reason FROM content.fn_movie_can_view(movie_id, is_paid, now())</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>5. La BD responde con <code>allowed=true/false</code> y <code>denial_reason</code> (ej. “requiere suscripción”, “fuera de ventana”).</td>
  </tr>
  <tr>
    <td></td>
    <td>6. El servicio responde con <code>CanViewResponse</code> al Frontend.</td>
  </tr>
  <tr>
    <td></td>
    <td>7. El Frontend habilita o deshabilita el botón “Reproducir” según resultado.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 2</td>
    <td>Si el <em>slug</em> o ID no existe, el servicio responde 404 “Movie not found”.</td>
  </tr>
  <tr>
    <td>En la línea 5</td>
    <td>Si <code>allowed=false</code>, el Frontend muestra el motivo (ej. “Disponible solo para usuarios premium”).</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — control esencial de derechos de acceso al contenido.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Mensajes personalizados según plan del usuario; prevalidación en carruseles para ocultar botones de reproducción en títulos no disponibles.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: la función requiere <code>movie_id</code> válido; considera disponibilidad temporal, flag de gratuito y estado de pago del usuario.</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 303 – Reproducir Película (Play)</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Reproducir Película</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Usuario (autenticado), Frontend (Angular), Movie Viewer Service (<code>verpeli-service</code>), PostgreSQL (schema <code>content</code>)</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Permitir la reproducción de una película asegurando que el usuario cumple con los requisitos de acceso (verificación de suscripción, disponibilidad y permisos).</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>Cuando el usuario pulsa el botón “Reproducir”, el Frontend solicita al servicio de películas ejecutar la función <code>content.fn_movie_play</code>. Esta valida el acceso con el usuario autenticado, registra el intento de reproducción en el historial y retorna el resultado. Si está permitido, el usuario puede acceder al streaming del contenido.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El usuario autenticado hace clic en “Reproducir”.</td>
    <td>2. El Frontend envía <code>POST /verpeli/movie/{slug}/play</code> (con <code>access_token</code> en cookies).</td>
  </tr>
  <tr>
    <td></td>
    <td>3. El Movie Viewer Service extrae <code>user_id</code> y flag <code>paid</code> del JWT.</td>
  </tr>
  <tr>
    <td></td>
    <td>4. Consulta BD: <code>SELECT * FROM content.fn_movie_play(user_id, slug, is_paid, now())</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>5. La función valida acceso y registra el evento de reproducción en el historial.</td>
  </tr>
  <tr>
    <td></td>
    <td>6. Si es permitido, retorna <code>allowed=true</code>, <code>title</code>, <code>slug</code>, <code>is_free</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>7. El servicio responde con <code>PlayResult</code> al Frontend.</td>
  </tr>
  <tr>
    <td></td>
    <td>8. El Frontend habilita el reproductor y carga el contenido.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 4</td>
    <td>Si el <em>slug</em> o ID no existe, responde 404 “Movie not found”.</td>
  </tr>
  <tr>
    <td>En la línea 5</td>
    <td>Si el usuario no tiene acceso (no pago, fuera de ventana, inactivo), <code>allowed=false</code> con <code>denial_reason</code>; el Frontend muestra mensaje.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Crítica — habilita el consumo del contenido principal de la plataforma.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Registro detallado de métricas de consumo (progreso, duración reproducida), integración con un servicio de streaming seguro, control de concurrencia por usuario.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: requiere usuario autenticado y JWT válido; funciones consideran disponibilidad, suscripción y condiciones comerciales.</td>
  </tr>
</table>

---

## CUN 400 Gestión de Usuarios

<table>
  <tr>
    <th colspan="2">CDU 401 – Listar Usuarios</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Listar Usuarios</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Administrador, Frontend (Angular), User Management Service (<code>usuarios-service</code>), PostgreSQL</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Permitir que un administrador consulte la lista de usuarios registrados en el sistema, con filtros, paginación y ordenamiento.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El administrador accede al módulo de gestión de usuarios. El Frontend envía una petición al servicio de usuarios, que consulta la función <code>fn_admin_users_list</code> aplicando los filtros solicitados. Se retorna la lista con la información básica y el total de registros para paginación.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El administrador accede a la sección de usuarios.</td>
    <td>2. El Frontend solicita <code>GET /usuarios/users/list</code> con filtros opcionales (estado, rol, fechas, etc.).</td>
  </tr>
  <tr>
    <td></td>
    <td>3. El servicio valida que el actor sea administrador (<code>admin_required</code>).</td>
  </tr>
  <tr>
    <td></td>
    <td>4. Consulta BD: <code>SELECT * FROM fn_admin_users_list(...)</code> con parámetros (query, fechas, roles, flags, orden, limit, offset).</td>
  </tr>
  <tr>
    <td></td>
    <td>5. La BD retorna filas con datos de usuarios (id, email, username, flags, timestamps) y el campo <code>total_count</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>6. El servicio responde con <code>UserListResponse</code> (items + total_count).</td>
  </tr>
  <tr>
    <td></td>
    <td>7. El Frontend muestra la tabla de usuarios con paginación y filtros aplicados.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 3</td>
    <td>Si el actor no es administrador, se devuelve 403 “Forbidden”.</td>
  </tr>
  <tr>
    <td>En la línea 5</td>
    <td>Si no hay usuarios que coincidan, se retorna lista vacía (total_count=0).</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — esencial para la administración del sistema.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Agregar exportación a CSV/Excel, búsqueda avanzada por múltiples campos, autocompletado en filtros.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: máximo 100 resultados por página; requiere autenticación como administrador.</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 402 – Obtener Contadores de Usuarios</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Obtener Contadores de Usuarios</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Administrador, Frontend (Angular), User Management Service (<code>usuarios-service</code>), PostgreSQL</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Proporcionar al administrador estadísticas generales del sistema de usuarios, incluyendo totales y segmentaciones (activos, verificados, bloqueados, con 2FA, etc.).</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El administrador consulta la sección de métricas de usuarios. El Frontend solicita los contadores al servicio, que invoca la función <code>fn_admin_users_counters</code> en la base de datos. Se devuelve un resumen numérico que facilita la gestión y monitoreo del sistema.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El administrador accede al panel de métricas de usuarios.</td>
    <td>2. El Frontend envía <code>GET /usuarios/users/counters</code> al servicio.</td>
  </tr>
  <tr>
    <td></td>
    <td>3. El servicio valida la autenticación y el rol de administrador (<code>admin_required</code>).</td>
  </tr>
  <tr>
    <td></td>
    <td>4. Consulta BD: <code>SELECT * FROM fn_admin_users_counters(failed_login_min)</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>5. La BD responde con métricas: total usuarios, activos, verificados, pagos, administradores, manejadores de contenido, con 2FA, bloqueados y con intentos fallidos &gt; N.</td>
  </tr>
  <tr>
    <td></td>
    <td>6. El servicio retorna un <code>UserCounters</code> con todos los valores.</td>
  </tr>
  <tr>
    <td></td>
    <td>7. El Frontend renderiza gráficos/tablas con los contadores.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 3</td>
    <td>Si el actor no es administrador, se devuelve 403 “Forbidden”.</td>
  </tr>
  <tr>
    <td>En la línea 4</td>
    <td>Si la BD no puede procesar la función, retorna error y el servicio responde 400 con el detalle.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Media-Alta — útil para la supervisión y auditoría del sistema.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Visualización en dashboards en tiempo real; integración con alertas automáticas si hay muchos bloqueos o fallos de login.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: requiere permisos de administrador; parámetro <code>failed_login_min</code> configurable (default=5).</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 403 – Consultar Detalle de Usuario</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Consultar Detalle de Usuario</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Administrador, Frontend (Angular), User Management Service (<code>usuarios-service</code>), PostgreSQL</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Permitir a un administrador visualizar el perfil completo de un usuario, incluyendo estado de cuenta y estadísticas de tokens.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El administrador selecciona un usuario en el módulo de gestión. El Frontend invoca el endpoint de detalle; el servicio valida el rol y consulta la función <code>fn_admin_user_detail</code> para obtener datos generales (perfil y flags) y métricas relacionadas (tokens de verificación y refresh activos/total). Devuelve la información para visualización y auditoría.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El administrador elige un usuario desde la lista.</td>
    <td>2. El Frontend solicita <code>GET /usuarios/users/{user_id}/detail</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>3. El servicio valida permisos (<code>admin_required</code>).</td>
  </tr>
  <tr>
    <td></td>
    <td>4. Consulta BD: <code>SELECT * FROM fn_admin_user_detail($1::int)</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>5. La BD retorna: datos del usuario (id, email, username, nombres, flags de estado/roles/2FA, intentos fallidos, <em>locked_until</em>, timestamps) y contadores: <em>email_tokens_total/activos</em>, <em>refresh_tokens_total/activos</em>.</td>
  </tr>
  <tr>
    <td></td>
    <td>6. El servicio responde con <code>UserDetail</code> y el Frontend muestra el perfil completo.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 3</td>
    <td>Si el actor no es administrador, responde 403 “Forbidden”.</td>
  </tr>
  <tr>
    <td>En la línea 4–5</td>
    <td>Si el <code>user_id</code> no existe, responde 404 “User not found”.</td>
  </tr>
  <tr>
    <td>Errores de BD</td>
    <td>Si ocurre un error en la función SQL, responde 400 con el detalle.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — soporte a auditoría y soporte operativo.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Historial de actividad (últimos logins, cambios de flags), trazabilidad de administración (quién cambió qué y cuándo).</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: acceso exclusivo de administradores; datos sensibles pueden estar cifrados en BD — mostrar ofuscado o desencriptado según política y capacidades del servicio de Auth.</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 404 – Modificar Estado de Usuario (Flags)</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Modificar Estado de Usuario</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Administrador, Frontend (Angular), User Management Service (<code>usuarios-service</code>), PostgreSQL</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Permitir que un administrador modifique los estados y roles de un usuario, tales como: activo/inactivo, verificado, de pago, administrador o manejador de contenido.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El administrador accede al perfil de un usuario y selecciona la acción de cambio de estado (activar, verificar, asignar pago, etc.). El Frontend envía la petición correspondiente (<code>PUT</code>) al servicio, que valida permisos de administrador y ejecuta la función en BD para actualizar el flag indicado. Se confirma el cambio al administrador.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El administrador abre el detalle del usuario.</td>
    <td>2. Selecciona una acción (activar, verificar, asignar rol, etc.).</td>
  </tr>
  <tr>
    <td>3. El Frontend envía la petición:</td>
    <td>
      <ul>
        <li><code>PUT /usuarios/users/{user_id}/active</code></li>
        <li><code>PUT /usuarios/users/{user_id}/verified</code></li>
        <li><code>PUT /usuarios/users/{user_id}/paid</code></li>
        <li><code>PUT /usuarios/users/{user_id}/admin</code></li>
        <li><code>PUT /usuarios/users/{user_id}/content-handler</code></li>
      </ul>
    </td>
  </tr>
  <tr>
    <td></td>
    <td>4. El servicio valida permisos (<code>admin_required</code>).</td>
  </tr>
  <tr>
    <td></td>
    <td>5. Ejecuta función SQL correspondiente (ej. <code>fn_admin_user_set_active</code>, <code>fn_admin_user_set_verified</code>, etc.).</td>
  </tr>
  <tr>
    <td></td>
    <td>6. La BD actualiza el estado y confirma ejecución.</td>
  </tr>
  <tr>
    <td></td>
    <td>7. El servicio responde con <code>{ok: true, user_id, flag}</code>.</td>
  </tr>
  <tr>
    <td></td>
    <td>8. El Frontend notifica al administrador que el cambio fue exitoso.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 4</td>
    <td>Si el actor no es administrador, responde 403 “Forbidden”.</td>
  </tr>
  <tr>
    <td>En la línea 5</td>
    <td>Si el usuario no existe, responde 404 “User not found”.</td>
  </tr>
  <tr>
    <td>En la línea 5 (para rol admin)</td>
    <td>Si se intenta remover el último administrador, la BD lanza error y el servicio responde 400 “Cannot remove admin role from the last administrator”.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — esencial para control de acceso y operación del sistema.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Incluir historial de cambios (quién modificó, cuándo y qué); validación en cascada (ej. si se desactiva un usuario, invalidar sus tokens).</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: solo administradores autorizados; algunas acciones críticas (roles) requieren salvaguardas adicionales.</td>
  </tr>
</table>

---

## CUN 500 Gestión de Catálogo

<table>
  <tr>
    <th colspan="2">CDU 501 – Gestionar películas</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Gestionar películas</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Gestor de Contenido, Frontend (Angular), Catalog Service, PostgreSQL (schema <code>content</code>)</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Crear y mantener los metadatos de una película (título, sinopsis, clasificación, estudio, idioma, país, póster, banner, duración y flags operativos: activo, disponibilidad, gratis/pago).</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El Gestor crea o edita películas desde el Frontend. El servicio valida permisos (<code>content_handler_required</code>) y ejecuta funciones SQL: <code>fn_movie_create</code>, <code>fn_movie_patch</code>, <code>fn_movie_set_active</code>, <code>fn_movie_set_availability</code>, <code>fn_movie_set_is_free</code>. <em>Include:</em> CDU 503 para galería de imágenes. <em>Extend:</em> CDU 505 para carga masiva.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. Registrar una nueva película (formulario completo).</td>
    <td>2. Frontend envía <code>POST /catalog/movies</code>. Servicio ejecuta <code>fn_movie_create(...)</code> y retorna <code>movie_id</code>.</td>
  </tr>
  <tr>
    <td>3. Editar metadatos de una película existente.</td>
    <td>4. Frontend envía <code>PATCH /catalog/movies/{movie_id}</code>. Servicio ejecuta <code>fn_movie_patch(movie_id, patch::jsonb)</code>.</td>
  </tr>
  <tr>
    <td>5. Cambiar estado: activo/inactivo.</td>
    <td>6. <code>PUT /catalog/movies/{movie_id}/active</code> → <code>fn_movie_set_active</code>.</td>
  </tr>
  <tr>
    <td>7. Ajustar ventana de disponibilidad.</td>
    <td>8. <code>PUT /catalog/movies/{movie_id}/availability</code> → <code>fn_movie_set_availability</code>.</td>
  </tr>
  <tr>
    <td>9. Marcar como gratis o de pago.</td>
    <td>10. <code>PUT /catalog/movies/{movie_id}/is-free</code> → <code>fn_movie_set_is_free</code>.</td>
  </tr>
  <tr>
    <td>11. (Opcional) Gestionar imágenes.</td>
    <td>12. <em>Include CDU 503</em> para agregar, ordenar o eliminar imágenes.</td>
  </tr>
  <tr>
    <td>13. (Opcional) Cargar/actualizar en lote.</td>
    <td>14. <em>Extend CDU 505</em> para carga masiva.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>Permisos insuficientes</td>
    <td>403 Forbidden si no posee rol de Gestor de Contenido.</td>
  </tr>
  <tr>
    <td>Validaciones de datos</td>
    <td>400 Bad Request ante slug duplicado, fechas inválidas o payload incorrecto.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — núcleo del catálogo.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Vista previa de banners; validaciones de imagen; auditoría de cambios.</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 503 – Gestionar galería de imágenes (Include de CDU 501)</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Gestionar galería de imágenes de película</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Gestor de Contenido, Frontend (Angular), Catalog Service, PostgreSQL (schema <code>content</code>)</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Administrar imágenes asociadas a una película (agregar, reordenar, eliminar) para cards, banners y galería.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>Desde el detalle de película, el Gestor añade URLs de imágenes, define orden y elimina elementos. El servicio ejecuta <code>fn_movie_image_add</code>, <code>fn_movie_images_reorder</code> y <code>fn_movie_image_delete</code>.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. Agregar imagen a la película.</td>
    <td>2. <code>POST /catalog/movies/{movie_id}/images</code> → <code>fn_movie_image_add</code> (retorna <code>image_id</code>).</td>
  </tr>
  <tr>
    <td>3. Reordenar galería.</td>
    <td>4. <code>PUT /catalog/movies/{movie_id}/images/reorder</code> → <code>fn_movie_images_reorder</code>.</td>
  </tr>
  <tr>
    <td>5. Eliminar imagen.</td>
    <td>6. <code>DELETE /catalog/images/{image_id}</code> → <code>fn_movie_image_delete</code>.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>Permisos insuficientes</td>
    <td>403 Forbidden si no posee rol de Gestor de Contenido.</td>
  </tr>
  <tr>
    <td>Imagen inexistente</td>
    <td>404 si el <code>image_id</code> no corresponde a la galería/registro.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Media — clave para la UX visual.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Validación de accesibilidad de URLs; compresión/optimización previa.</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 505 – Carga Masiva de contenido (Extend de CDU 501)</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Carga masiva de películas</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Gestor de Contenido, Frontend (Angular), Catalog Service, PostgreSQL (schema <code>content</code>)</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Crear o actualizar películas en lote a partir de un JSON con múltiples elementos (upsert por <code>slug</code>).</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El Gestor importa un conjunto de películas. El servicio ejecuta <code>fn_bulk_upsert_movies(payload::jsonb, created_by)</code> y retorna conteo de insertados/actualizados.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. Preparar JSON con películas (título, slug, metadatos, categorías).</td>
    <td>2. <code>POST /catalog/movies/bulk-upsert</code> → <code>fn_bulk_upsert_movies</code> (retorna <code>{ inserted, updated }</code>).</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>Validación de estructura</td>
    <td>400 si el JSON no es un array válido o contiene campos inválidos.</td>
  </tr>
  <tr>
    <td>Conflictos de slug</td>
    <td>Los slugs existentes se actualizan (patch); los nuevos se crean.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Media/Alta — agiliza operación editorial.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Previsualización y validación por lote; reporte detallado por fila.</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 502 – Gestionar categorías de películas (Include: CDU 504)</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Gestionar categorías asignadas a una película</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Gestor de Contenido, Frontend (Angular), Catalog Service, PostgreSQL (schema <code>content</code>)</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Asignar, reemplazar o quitar categorías a películas específicas, usando slugs del sistema.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El Gestor administra las categorías de una película mediante endpoints: <code>fn_movie_set_categories</code>, <code>fn_movie_add_category</code>, <code>fn_movie_remove_category</code>. Si falta una categoría, <em>Include:</em> CDU 504 para crear/editar categorías del sistema.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. Reemplazar categorías completas de una película.</td>
    <td>2. <code>PUT /catalog/movies/{movie_id}/categories</code> → <code>fn_movie_set_categories(movie_id, slugs[])</code>.</td>
  </tr>
  <tr>
    <td>3. Agregar una categoría por slug.</td>
    <td>4. <code>POST /catalog/movies/{movie_id}/categories/{slug}</code> → <code>fn_movie_add_category</code>.</td>
  </tr>
  <tr>
    <td>5. Quitar una categoría por slug.</td>
    <td>6. <code>DELETE /catalog/movies/{movie_id}/categories/{slug}</code> → <code>fn_movie_remove_category</code>.</td>
  </tr>
  <tr>
    <td>7. (Opcional) Crear/editar una categoría del sistema inexistente.</td>
    <td>8. <em>Include CDU 504</em> para alta/edición de categoría base.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>Slug inexistente</td>
    <td>Si el slug no existe y no se ejecuta CDU 504, el cambio puede fallar; alternativamente, algunos flujos crean/upsert con <code>fn_movie_set_categories</code>.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — clasificación editorial del catálogo.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Autocomplete de slugs; control de jerarquías; validación de duplicados.</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 504 – Administrar categorías del sistema (Include de CDU 502)</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Administrar categorías del sistema</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Gestor de Contenido, Frontend (Angular), Catalog Service, PostgreSQL (schema <code>content</code>)</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Crear, actualizar y desactivar categorías base (con slug único y soportando jerarquía por <code>parent_id</code>).</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El Gestor administra el catálogo de categorías maestras mediante <code>fn_category_create</code>, <code>fn_category_update</code> y <code>fn_category_soft_delete</code>. Estas categorías luego se asignan a películas (CDU 502).</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. Crear una categoría nueva.</td>
    <td>2. <code>POST /catalog/categories</code> → <code>fn_category_create(name, slug, parent_id)</code> (retorna <code>category_id</code>).</td>
  </tr>
  <tr>
    <td>3. Editar una categoría existente.</td>
    <td>4. <code>PATCH /catalog/categories/{category_id}</code> → <code>fn_category_update</code>.</td>
  </tr>
  <tr>
    <td>5. Desactivar (soft delete) una categoría.</td>
    <td>6. <code>DELETE /catalog/categories/{category_id}</code> → <code>fn_category_soft_delete</code>.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>Slug duplicado</td>
    <td>400 si el slug ya existe (violación de único).</td>
  </tr>
  <tr>
    <td>Jerarquía inválida</td>
    <td>400 si <code>parent_id</code> no existe o crea ciclos.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Media — base taxonómica del catálogo.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Gestión visual de jerarquías; slugs multilenguaje; auditoría.</td>
  </tr>
</table>


## CUN 600 Gestión de pagos y sucripciones

<table>
  <tr>
    <th colspan="2">CDU 601 – Suscribirse a plan</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Suscribirse a plan</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Usuario, Frontend, Servicio de Pagos, Sistema de Pagos</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Permitir que un usuario contrate un plan de suscripción seleccionando la opción deseada y realizando el pago correspondiente.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El usuario elige un plan en el Frontend. El Servicio de Pagos genera una sesión de suscripción con el Sistema de Pagos. El usuario completa el proceso de pago externo. El Sistema de Pagos confirma la transacción y notifica al Servicio de Pagos, que activa la suscripción en el sistema interno.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El usuario selecciona un plan de suscripción.</td>
    <td>2. El Frontend solicita iniciar suscripción al Servicio de Pagos.</td>
  </tr>
  <tr>
    <td>—</td>
    <td>3. El Servicio de Pagos genera sesión de pago y redirige al Sistema de Pagos.</td>
  </tr>
  <tr>
    <td>4. El usuario ingresa datos y confirma el pago.</td>
    <td>5. El Sistema de Pagos procesa la transacción y responde éxito/fallo.</td>
  </tr>
  <tr>
    <td>—</td>
    <td>6. El Sistema de Pagos envía notificación al Servicio de Pagos.</td>
  </tr>
  <tr>
    <td>—</td>
    <td>7. El Servicio de Pagos activa la suscripción y actualiza el estado del usuario.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 5</td>
    <td>Si el pago es rechazado, se muestra error y no se activa la suscripción.</td>
  </tr>
  <tr>
    <td>En la línea 6</td>
    <td>Si no se recibe confirmación del Sistema de Pagos, la suscripción queda pendiente.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — acceso principal al servicio.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Permitir varios métodos de pago; guardar métodos de pago para renovaciones automáticas.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: el plan seleccionado debe estar activo; los pagos deben confirmarse mediante notificación segura.</td>
  </tr>
</table>

---
<table>
  <tr>
    <th colspan="2">CDU 602 – Renovar suscripción</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Renovar suscripción</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Usuario, Frontend, Servicio de Pagos, Sistema de Pagos</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Extender la vigencia de una suscripción existente mediante la ejecución de un nuevo pago o la renovación automática configurada en el sistema de pagos.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El usuario con suscripción activa puede renovarla antes de su vencimiento, o bien el Sistema de Pagos procesa la renovación automática. El Servicio de Pagos recibe la confirmación y actualiza el estado de la suscripción en el sistema interno.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El usuario solicita renovar manualmente o se ejecuta la renovación automática.</td>
    <td>2. El Frontend o el Sistema de Pagos inicia la operación con el Servicio de Pagos.</td>
  </tr>
  <tr>
    <td>—</td>
    <td>3. El Servicio de Pagos confirma datos de suscripción y solicita procesamiento al Sistema de Pagos.</td>
  </tr>
  <tr>
    <td>4. El Sistema de Pagos procesa el cobro.</td>
    <td>5. El Sistema de Pagos devuelve resultado de éxito o fallo.</td>
  </tr>
  <tr>
    <td>—</td>
    <td>6. El Servicio de Pagos actualiza la fecha de vigencia de la suscripción y el estado del usuario.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 5</td>
    <td>Si el pago falla, la suscripción no se renueva y se notifica al usuario.</td>
  </tr>
  <tr>
    <td>En la línea 6</td>
    <td>Si el usuario decide cancelar durante el proceso, se activa el CDU 603 – Cancelar suscripción.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Alta — garantiza continuidad del servicio.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Configurar recordatorios de renovación; permitir múltiples métodos de pago pre-registrados.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: solo suscripciones activas o próximas a vencer pueden renovarse; requiere confirmación de pago válida.</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 603 – Cancelar suscripción</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Cancelar suscripción</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Usuario, Frontend, Servicio de Pagos, Sistema de Pagos</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Permitir que un usuario finalice su suscripción activa de manera voluntaria, manteniendo o no el acceso al servicio hasta la fecha de vencimiento.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El usuario solicita la cancelación desde el Frontend. El Servicio de Pagos comunica la petición al Sistema de Pagos, que marca la suscripción como cancelada. El Servicio de Pagos actualiza el estado del usuario y define si mantiene acceso hasta el final del periodo o se corta de inmediato, según la política definida.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El usuario solicita cancelar su suscripción.</td>
    <td>2. El Frontend envía la petición al Servicio de Pagos.</td>
  </tr>
  <tr>
    <td>—</td>
    <td>3. El Servicio de Pagos comunica la cancelación al Sistema de Pagos.</td>
  </tr>
  <tr>
    <td>—</td>
    <td>4. El Sistema de Pagos marca la suscripción como cancelada y responde confirmación.</td>
  </tr>
  <tr>
    <td>—</td>
    <td>5. El Servicio de Pagos actualiza el estado del usuario (cancelada/pending-cancel) y define acceso hasta fecha de vencimiento.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 3</td>
    <td>Si la comunicación con el Sistema de Pagos falla, el estado queda pendiente de confirmación.</td>
  </tr>
  <tr>
    <td>En la línea 5</td>
    <td>Si la política es cancelación inmediata, se bloquea acceso al instante.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Media-Alta — otorga control al usuario sobre su suscripción.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Permitir cancelación programada; mostrar fecha exacta de finalización del acceso.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: solo usuarios con suscripción activa pueden cancelarla; debe registrarse fecha de cancelación en sistema interno.</td>
  </tr>
</table>

---

<table>
  <tr>
    <th colspan="2">CDU 604 – Procesar pago</th>
  </tr>
  <tr>
    <td><strong>Nombre</strong></td>
    <td>Procesar pago</td>
  </tr>
  <tr>
    <td><strong>Actores</strong></td>
    <td>Sistema de Pagos, Servicio de Pagos</td>
  </tr>
  <tr>
    <td><strong>Propósito</strong></td>
    <td>Recibir, validar y registrar la confirmación de un pago efectuado por el Sistema de Pagos externo, actualizando el estado de la suscripción del usuario en el sistema interno.</td>
  </tr>
  <tr>
    <td><strong>Resumen</strong></td>
    <td>El Sistema de Pagos envía una notificación de resultado al Servicio de Pagos. Este valida la información, registra la transacción y actualiza el estado de la suscripción del usuario. Si la confirmación es positiva, el usuario obtiene o renueva acceso; si es negativa, se mantiene o cambia a estado pendiente/cancelado.</td>
  </tr>
  <tr>
    <th colspan="2">Curso Normal de Eventos</th>
  </tr>
  <tr>
    <td><strong>Acción del actor</strong></td>
    <td><strong>Respuesta del proceso de negocio</strong></td>
  </tr>
  <tr>
    <td>1. El Sistema de Pagos envía notificación de pago al Servicio de Pagos.</td>
    <td>2. El Servicio de Pagos recibe y valida la notificación (autenticidad y datos del pago).</td>
  </tr>
  <tr>
    <td>—</td>
    <td>3. El Servicio de Pagos registra la transacción en el sistema interno.</td>
  </tr>
  <tr>
    <td>—</td>
    <td>4. El Servicio de Pagos actualiza el estado de la suscripción del usuario (activo, renovado, rechazado).</td>
  </tr>
  <tr>
    <td>—</td>
    <td>5. El sistema notifica al usuario en el Frontend sobre el resultado del pago.</td>
  </tr>
  <tr>
    <th colspan="2">Cursos alternos</th>
  </tr>
  <tr>
    <td>En la línea 2</td>
    <td>Si la notificación no pasa validación, se rechaza y se registra intento inválido.</td>
  </tr>
  <tr>
    <td>En la línea 4</td>
    <td>Si la actualización de suscripción falla, el estado queda en pendiente hasta corrección manual.</td>
  </tr>
  <tr>
    <td><strong>Prioridad</strong></td>
    <td>Crítica — asegura la correcta gestión de pagos y suscripciones.</td>
  </tr>
  <tr>
    <td><strong>Mejoras</strong></td>
    <td>Agregar reintentos automáticos; notificaciones en tiempo real al usuario vía correo o app.</td>
  </tr>
  <tr>
    <td><strong>Otras secciones</strong></td>
    <td>Restricciones: solo se aceptan notificaciones autenticadas; cada pago debe tener un identificador único para evitar duplicados.</td>
  </tr>
</table>
