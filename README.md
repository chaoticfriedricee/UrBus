# UrBus
 
Plataforma de desarrollo colaborativo orientada a la integración de estudiantes en equipos de trabajo organizados por “buses”.
El proyecto busca simular un entorno de desarrollo profesional donde múltiples grupos trabajan sobre distintos módulos dentro de una arquitectura moderna basada en servicios.
 
Este proyecto forma parte del proceso de aprendizaje y práctica en desarrollo backend, arquitectura de software y trabajo en equipo.
 
---
 
## Arquitectura del Proyecto
 
UrBus está diseñado utilizando una arquitectura distribuida donde distintos servicios se encargan de responsabilidades específicas dentro del sistema.
 
Cada servicio puede ser desarrollado y mantenido por diferentes equipos de estudiantes, permitiendo una organización modular del proyecto.
 
El sistema está construido utilizando:
 
* **Node.js** (Express) para todos los servicios backend y APIs
* **Sequelize** como ORM de PostgreSQL en el servicio de autenticación
* **PostgreSQL** como base de datos relacional para usuarios
* **MongoDB** como base de datos NoSQL para microservicios
* **Cloudinary** para almacenamiento de imágenes
* **Docker** para facilitar el despliegue del servicio de base de datos
* Comunicación entre servicios mediante **HTTP APIs** y **Socket.IO**
 
---
 
## Organización por Equipos
 
El proyecto está estructurado de manera que distintos grupos de estudiantes trabajen en módulos independientes del sistema.
 
Cada **bus** representa un conjunto de equipos responsables de implementar y mantener uno o varios servicios dentro del ecosistema.
 
Esto permite:
 
* Trabajo paralelo entre equipos
* Simulación de entornos reales de desarrollo
* Separación clara de responsabilidades
* Integración continua entre módulos
 
---
 
## Tecnologías Utilizadas
 
| Tecnología     | Uso en el proyecto                  |
| -------------- | ----------------------------------- |
| Node.js        | Desarrollo de microservicios        |
| Sequelize      | ORM de PostgreSQL en la autenticación |
| PostgreSQL     | Base de datos relacional            |
| MongoDB        | Base de datos NoSQL por servicio    |
| Cloudinary     | Almacenamiento de imágenes          |
| Docker         | Contenedorización de base de datos  |
| Docker Compose | Orquestación de todo el proyecto    |
| Git / GitHub   | Control de versiones y colaboración |
 
---
 
## Estado del Proyecto
 
El proyecto se encuentra en desarrollo activo.
 
Actualmente se está trabajando en:
 
* Autenticación con JWT, refresh token, verificación de correo y recuperación de contraseña
* Registro con imagen opcional de perfil en AuthenticationService
* Servicio de localización en tiempo real con Socket.IO
* Gestión de pasajeros con rutas protegidas por JWT
* Publicaciones con carga de imágenes y soft delete
* Interfaz administrativa React/Vite en `client-admin`
 
---
 
## Servicios del Sistema
 
La plataforma está diseñada para crecer mediante servicios independientes.
 
* **AuthenticationService**
  Gestión de autenticación, usuarios, control de acceso y roles.
 
* **Client-admin**
  Interfaz administrativa React/Vite para consumir las APIs del sistema.
 
* **LocationService**
  Gestión de ubicación en tiempo real del bus y emisión de eventos de llegada.
 
* **PassengerService**
  Gestión de pasajeros y estados de viaje.
 
* **PostService**
  Publicación de avisos con carga de imágenes y reactivación de publicaciones.
 
---
 
## Base de Datos
 
Cada microservicio utiliza su propia base de datos siguiendo buenas prácticas de arquitectura de microservicios.
 
| Servicio              | Base de Datos | Motor      |
| --------------------- | ------------- | ---------- |
| AuthenticationService | urbus_users   | PostgreSQL |
| LocationService       | UrBus         | MongoDB    |
| PassengerService      | passenger     | MongoDB    |
| PostService           | urbus_posts   | MongoDB    |
 
> `docker-compose.yml` (en la raíz) levanta PostgreSQL, MongoDB y todos los servicios. `pg_db/docker-compose.yml` levanta solo PostgreSQL.
 
---
 
## Puertos de los Servicios
 
| Servicio              | Puerto |
| --------------------- | ------ |
| AuthenticationService | 5166   |
| LocationService       | 3033   |
| PassengerService      | 3011   |
| PostService           | 5001   |
 
---
 
## AuthenticationService
 
Microservicio encargado de la autenticación y gestión de usuarios.
 
### Funcionalidades
 
* Registro de usuarios
* Inicio de sesión
* Verificación de correo electrónico
* Reenvío de verificación
* Recuperación y restablecimiento de contraseña
* Control de acceso mediante JWT
* Renovación del access token con refresh token
* Gestión de roles y rutas administrativas
* Carga opcional de imagen de perfil con multipart/form-data
 
### Endpoints
 
**Base URL:**
 
```
http://localhost:5166/api/v1
```
 
#### Health Check
 
| Método | Endpoint | Descripción                                 | Autenticación |
| ------ | -------- | ------------------------------------------- | -------------- |
| GET    | /health  | Verificar estado del servicio               | No |
| GET    | /api/v1/health | Verificar estado del servicio         | No |
| GET    | /swagger | Documentación de la API (Swagger UI)        | No |
 
#### Autenticación (Auth)
 
| Método | Endpoint                    | Descripción                              | Autenticación |
| ------ | ----------------------------- | ---------------------------------------- | -------------- |
| POST   | /auth/login                 | Iniciar sesión de usuario                | No |
| POST   | /auth/register              | Registrar nuevo usuario                  | No |
| POST   | /auth/verify-email          | Verificar correo electrónico             | No |
| POST   | /auth/resend-verification   | Reenviar correo de verificación          | No |
| POST   | /auth/forgot-password       | Solicitar recuperación de contraseña     | No |
| POST   | /auth/reset-password        | Restablecer contraseña                   | No |
| POST   | /auth/refresh               | Renovar access token usando refresh token | No |
| GET    | /auth/me                    | Perfil completo del usuario autenticado  | Sí (JWT) |
 
#### Gestión de Usuarios
 
| Método | Endpoint              | Descripción                     | Autenticación | Roles |
| ------ | --------------------- | ------------------------------- | -------------- | -------- |
| GET    | /users                | Listar todos los usuarios       | Sí (JWT)      | ADMIN_ROLE |
| GET    | /users/{userId}       | Datos de contacto de una cuenta | Sí (JWT)      | ADMIN_ROLE, DRIVER_ROLE |
| PUT    | /users/{userId}/profile | Editar nombre, apellido, teléfono y foto | Sí (JWT) | El propio usuario o ADMIN_ROLE |
| PUT    | /users/{userId}/role  | Actualizar rol de usuario       | Sí (JWT)      | ADMIN_ROLE |
| PUT    | /users/{userId}/verify-email | Verificar el correo manualmente | Sí (JWT) | ADMIN_ROLE |
| GET    | /users/{userId}/roles | Obtener roles de un usuario     | Sí (JWT)      | ADMIN_ROLE |
| GET    | /users/by-role        | Listar usuarios por rol         | Sí (JWT)      | ADMIN_ROLE |
 
---
 
## LocationService
 
Servicio encargado de la ubicación en tiempo real del bus.
 
### Funcionalidades
 
* Seguimiento de ubicación con Socket.IO, autenticado con el access token (`io(url, { auth: { token } })`)
* El conductor comparte su ubicación solo cuando lo decide (`startSharing` / `stopSharing`)
* Si el conductor pierde la conexión sin finalizar la ruta, esta queda en pausa (`paused: true`, solo la última posición conocida) durante `LOCATION_SHARING_GRACE_MS` (5 min por defecto) y termina sola si no vuelve
* Las posiciones llevan el `timestamp` del GPS: se descartan las repetidas o más viejas que la última
* La ubicación solo llega al conductor y a los pasajeros de sus grupos activos (`locationStatus`, `updateBus`, `busArrived`)
* Solo se guarda en memoria la última posición de quien comparte; no hay historial
* Detección de llegada a Kinal por conductor y emisión del evento `busArrived`
* Vista pública en `/urbus/v1/` (sin sesión: muestra el mapa pero no transmite ni recibe ubicaciones)

Requiere `PASSENGER_SERVICE_URL` (por defecto `http://localhost:3011/urbus/v1`) para validar a qué conductor puede seguir cada usuario.

### Ubicación con la app en segundo plano

El conductor comparte desde el navegador (`client-admin`) o desde la app Expo (`client-user`), y en ambos casos **solo mientras UrBus está en pantalla**:

* Al cambiar a otra app (p. ej. WhatsApp) o bloquear la pantalla, el navegador o el sistema dejan de entregar el GPS y suspenden la página/app; después se corta la conexión y el servidor pone la ruta en pausa. Ningún código web puede evitarlo, y un service worker tampoco tiene acceso al GPS.
* Al volver, se reconecta solo (renovando el token si venció), reanuda la ruta y pide una posición nueva, sin pulsar "Iniciar Ruta" otra vez. Si el permiso de ubicación se retiró, deja de compartir y lo avisa.
* Si la página se recargó o la app se reinició, el conductor ve "Tu ruta quedó en pausa" y decide si reanudarla o finalizarla.
* En el navegador se pide un *wake lock* de pantalla mientras la ruta está activa, para que el bloqueo automático no la suspenda (no impide bloquearla a mano).
* Los pasajeros ven la antigüedad de la posición: "En vivo", "Ubicación no actualizada · última hace X min" (más de 45 s sin posiciones) o "Conexión con el conductor perdida"; el marcador se atenúa cuando no es en vivo.

Seguir enviando la ubicación con la app en segundo plano requiere una app nativa con seguimiento en segundo plano (servicio en primer plano con notificación en Android, modo `location` en iOS), que aún no está implementada.
 
### Endpoints
 
**Base URL:**
 
```
http://localhost:3033/urbus/v1
```
 
| Método | Endpoint | Descripción         |
| ------ | -------- | ------------------- |
| GET    | /health  | Estado del servicio |
| GET    | /        | Vista de ubicación  |
| GET    | /swagger | Documentación de la API (Swagger UI) |
 
---
 
## PassengerService
 
Servicio encargado de la gestión de pasajeros.
 
### Funcionalidades
 
* Registro de estudiantes
* Listado de pasajeros
* Control de asistencia
* Actualización de estado de pasajero
* Eliminación de pasajeros
 
### Endpoints
 
**Base URL:**
 
```
http://localhost:3011/urbus/v1/passengers
```
 
| Método | Endpoint    | Descripción       |
| ------ | ----------- | ----------------- |
| POST   | /           | Crear pasajero    |
| GET    | /           | Listar pasajeros  |
| PUT    | /:id        | Editar nombre     |
| PATCH  | /:id/status | Actualizar estado |
| DELETE | /:id        | Eliminar pasajero |
| GET    | /swagger    | Documentación de la API (Swagger UI) |

`GET /` devuelve todos los pasajeros a `ADMIN_ROLE` y `DRIVER_ROLE`; a un pasajero (`USER_ROLE` / `PASSENGER_ROLE`) solo le devuelve el nombre de los compañeros de su grupo activo.

#### Grupos

**Base URL:** `http://localhost:3011/urbus/v1/groups`

| Método | Endpoint | Descripción | Roles |
| ------ | -------- | ----------- | ----- |
| POST   | /        | Crear grupo (genera un código único de 6 caracteres) | DRIVER_ROLE (según su límite) |
| GET    | /        | Listar grupos | ADMIN_ROLE (todos), DRIVER_ROLE (los suyos) |
| GET    | /:id     | Detalle con pasajeros | ADMIN_ROLE, DRIVER_ROLE dueño |
| PATCH  | /:id     | Renombrar / activar / desactivar | ADMIN_ROLE, DRIVER_ROLE dueño |
| DELETE | /:id     | Eliminar (soft delete; libera a sus pasajeros) | ADMIN_ROLE, DRIVER_ROLE dueño |
| POST   | /join    | Unirse con `{ code }` | USER_ROLE, PASSENGER_ROLE con perfil vinculado |
| GET    | /access  | Grupos a los que tiene acceso el usuario del token (uso interno de post y location) | Cualquiera autenticado |
| GET    | /limit/me | Límite efectivo y grupos activos del conductor del token | DRIVER_ROLE |
| GET    | /limit/:driverId | Límite efectivo de un conductor | ADMIN_ROLE / el propio conductor |
| PUT    | /limit/:driverId | Asignar un límite propio `{ maxGroups }` | ADMIN_ROLE |
| DELETE | /limit/:driverId | Quitar el límite propio (vuelve al general) | ADMIN_ROLE |
| GET/PUT | /settings | Límite general por conductor `{ maxGroupsPerDriver }` (por defecto 2) | ADMIN_ROLE |

Reglas:

* El conductor de un grupo siempre es el usuario del token; no se puede asignar a otro.
* El código se valida en el servidor y se resuelve al grupo y su conductor; los grupos inactivos o eliminados no aceptan pasajeros.
* Un pasajero pertenece a **un solo grupo** a la vez (`Passenger.groupId`, tal como ya estaba en el esquema). Unirse de nuevo al mismo grupo responde 409; unirse a otro grupo lo cambia de grupo.
* Si la cuenta aún no tiene perfil de pasajero, unirse con un código válido lo crea (para la cuenta del token, con el `name` enviado o «Pasajero»): el código que comparte el conductor sirve como autorización. Un administrador o conductor también puede seguir creando perfiles desde `POST /passengers`.
* Al arrancar se crean los índices únicos `groups.code`, `settings.key` y "un perfil de pasajero activo por `userId`" (`ensureIndexes` en `configs/db.js`).
* **Límite de grupos:** cada conductor puede tener como máximo N grupos **activos** (los desactivados o eliminados no cuentan; reactivar uno vuelve a pasar por el límite). N es su límite propio si un administrador se lo asignó o, si no, el límite general guardado en la colección `settings` (2 si nunca se cambió). Se configura en client-admin → Grupos → «Límites por conductor».
* Bajar un límite no elimina ni desactiva grupos ni membresías: solo impide crear o reactivar grupos hasta que el conductor tenga menos grupos activos que el límite.
* MongoDB corre sin réplica, así que no hay transacciones: tras crear o reactivar un grupo se vuelve a contar y, si una petición simultánea hizo que se excediera el límite, se deshace el cambio. Unirse a un grupo es una actualización atómica condicionada, por lo que dos peticiones simultáneas no duplican la membresía.
 
---
 
## PostService
 
Servicio encargado de las publicaciones del sistema.
 
### Funcionalidades
 
* Crear avisos
* Publicaciones con imagen
* Consultar publicaciones
* Actualizar publicaciones
* Eliminación con soft delete
* Reactivación de publicaciones eliminadas
 
### Endpoints
 
**Base URL:**
 
```
http://localhost:5001/urbus/v1/posts
```
 
| Método | Endpoint        | Descripción           |
| ------ | --------------- | --------------------- |
| POST   | /               | Crear publicación     |
| GET    | /               | Obtener publicaciones |
| GET    | /my-posts       | Publicaciones propias |
| GET    | /:id            | Obtener por ID        |
| PUT    | /:id            | Actualizar            |
| DELETE | /:id            | Eliminar              |
| PATCH  | /:id/reactivate | Reactivar             |
| GET    | /swagger        | Documentación de la API (Swagger UI) |

Avisos por grupo: un post con `groupId` solo lo ven el administrador, el conductor dueño del grupo y sus pasajeros; sin `groupId` es un aviso general para todos (así quedan los posts existentes). Un conductor solo puede publicar en sus propios grupos. `GET /?groupId=...` filtra por grupo y responde 403 si el usuario no pertenece a él. Requiere `PASSENGER_SERVICE_URL`.
 
---
 
## Estructura del Proyecto
 
```
UrBus/
├── authentication-service/
├── client-admin/
├── client-user/
├── dockerfiles/
├── location-service/
├── passenger-service/
├── post-service/
├── pg_db/
├── docker-compose.yml
├── .env.docker.example
├── .gitignore
└── README.md
```
 
---
 
## Instalación y Ejecución
 
### Prerequisitos
 
* Node.js 18+
* pnpm
* Docker
* PostgreSQL
* MongoDB
* Git
 
---
 
### Clonar repositorio
 
```bash
git clone <url-del-repositorio>
cd UrBus
```
 
---
 
### Todo el proyecto con Docker
 
```bash
cp .env.docker.example .env.docker   # completar los valores "change-me"
docker compose --env-file .env.docker up -d --build
```
 
Panel admin en http://localhost:5173.
 
---
 
### Base de datos PostgreSQL con Docker
 
```bash
cd pg_db
docker compose down -v
docker compose up -d
```
 
---
 
### Ejecutar servicios Node
 
```bash
cd client-admin
pnpm install
pnpm run dev
```
 
```bash
cd ../location-service
pnpm install
pnpm run dev
```
 
```bash
cd ../passenger-service
pnpm install
pnpm run dev
```
 
```bash
cd ../post-service
pnpm install
pnpm run dev
```
 
---
 
### Ejecutar servicio de autenticación
 
```bash
cd authentication-service
pnpm install
pnpm run dev
```

---

### Pruebas automatizadas

Cada servicio backend tiene pruebas con el runner nativo de Node (`node --test`):

```bash
cd authentication-service && pnpm test   # necesita PostgreSQL (crea y borra urbus_users_test)
cd passenger-service && pnpm test        # necesita MongoDB (usa urbus_passenger_test)
cd post-service && pnpm test             # necesita MongoDB (usa urbus_posts_test)
cd location-service && pnpm test         # sin base de datos
cd client-admin && pnpm test             # ciclo de vida de la ubicación compartida en el navegador
cd client-user && pnpm test              # antigüedad de la ubicación en la app móvil
```

Con `docker compose` levantado, PostgreSQL y MongoDB ya están disponibles en los puertos por defecto. `TEST_DB_NAME` y `TEST_URI_MONGODB` permiten cambiar las bases de prueba.
 
---
 
## Contribución
 
El desarrollo del proyecto se realiza de forma colaborativa entre distintos equipos de estudiantes.
 
Se recomienda:
 
* Crear ramas por funcionalidad
* Hacer commits descriptivos
* Usar Pull Requests
* Mantener la documentación actualizada