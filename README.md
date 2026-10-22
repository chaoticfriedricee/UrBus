# UrBus
 
Plataforma de desarrollo colaborativo orientada a la integración de estudiantes en equipos de trabajo organizados por “buses”.
El proyecto busca simular un entorno de desarrollo profesional donde múltiples grupos trabajan sobre distintos módulos dentro de una arquitectura moderna basada en servicios.
 
Este proyecto forma parte del proceso de aprendizaje y práctica en desarrollo backend, arquitectura de software y trabajo en equipo.
 
---
 
## Arquitectura del Proyecto
 
UrBus está diseñado utilizando una arquitectura distribuida donde distintos servicios se encargan de responsabilidades específicas dentro del sistema.
 
Cada servicio puede ser desarrollado y mantenido por diferentes equipos de estudiantes, permitiendo una organización modular del proyecto.
 
El sistema está construido utilizando:
 
* **Node.js** para servicios backend y APIs
* **ASP.NET Core** para el servicio de autenticación
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
| ASP.NET Core   | Autenticación y persistencia de usuarios |
| PostgreSQL     | Base de datos relacional            |
| MongoDB        | Base de datos NoSQL por servicio    |
| Cloudinary     | Almacenamiento de imágenes          |
| Docker         | Contenedorización de base de datos  |
| Docker Compose | Orquestación de PostgreSQL          |
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
 
> El archivo de orquestación disponible es `pg_db/docker-compose.yml` para PostgreSQL. MongoDB debe estar disponible localmente o en una instancia externa.
 
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
* Renovación y revocación de refresh token
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
| POST   | /auth/logout                | Cerrar sesión (revocar refresh token)    | Sí (JWT) |
 
#### Gestión de Usuarios
 
| Método | Endpoint              | Descripción                     | Autenticación | Roles |
| ------ | --------------------- | ------------------------------- | -------------- | -------- |
| PUT    | /users/{userId}/role  | Actualizar rol de usuario       | Sí (JWT)      | ADMIN_ROLE |
| GET    | /users/{userId}/roles | Obtener roles de un usuario     | Sí (JWT)      | ADMIN_ROLE |
| GET    | /users/by-role        | Listar usuarios por rol         | Sí (JWT)      | ADMIN_ROLE |
 
---
 
## LocationService
 
Servicio encargado de la ubicación en tiempo real del bus.
 
### Funcionalidades
 
* Seguimiento de ubicación con Socket.IO
* Emisión del evento `updateBus`
* Detección de llegada a Kinal y emisión del evento `busArrived`
* Vista de seguimiento servida en `/urbus/v1/`
 
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
| PATCH  | /:id/status | Actualizar estado |
| DELETE | /:id        | Eliminar pasajero |
| GET    | /swagger    | Documentación de la API (Swagger UI) |
 
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
 
---
 
## Estructura del Proyecto
 
```
UrBus/
├── authentication-service/
├── client-admin/
├── location-service/
├── passenger-service/
├── post-service/
├── pg_db/
├── .gitignore
└── README.md
```
 
---
 
## Instalación y Ejecución
 
### Prerequisitos
 
* Node.js 18+
* pnpm
* .NET 8 SDK
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
 
### Ejecutar servicio ASP.NET Core
 
```bash
cd authentication-service/src/AuthenticationService.Api
dotnet restore
dotnet build
dotnet run
```
 
---
 
## Contribución
 
El desarrollo del proyecto se realiza de forma colaborativa entre distintos equipos de estudiantes.
 
Se recomienda:
 
* Crear ramas por funcionalidad
* Hacer commits descriptivos
* Usar Pull Requests
* Mantener la documentación actualizada