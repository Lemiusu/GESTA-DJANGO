**GESTA**

Sistema de Gestión Escolar Académica

**DOCUMENTACIÓN TÉCNICA**

_Arquitectura · Código · Deuda Técnica_

| **Versión** | 1.0.0 - Prototipo |
| ----------- | ----------------- |
| **Fecha**   | Junio 2026        |
| **Estado**  | En desarrollo     |

# **1\. Resumen Ejecutivo**

GESTA es un sistema web de gestión escolar académica diseñado para instituciones educativas colombianas. Permite a coordinadores, docentes, acudientes y estudiantes gestionar en un solo lugar la asistencia, calificaciones, observaciones de convivencia, alertas académicas y mensajería interna.

## **1.1 Características Principales**

- Registro y visualización de asistencia diaria por curso
- Ingreso, publicación y seguimiento de calificaciones por actividad
- Observador del estudiante (seguimiento, logros, conducta, académico)
- Sistema de alertas académicas manuales y automáticas
- Mensajería interna entre roles con notificaciones automáticas
- Dashboards diferenciados por rol (coordinador, docente, acudiente, estudiante)
- Notificación automática a acudientes por ausencias y notas publicadas

## **1.2 Roles del Sistema**

| **Rol**         | **Responsabilidades**                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Coordinador** | Vista global del colegio: dashboards de asistencia, riesgo académico, observaciones, calificaciones y mensajería. |
| **Docente**     | Registro de asistencia de sus cursos, ingreso de calificaciones, creación de observaciones y consulta de alertas. |
| **Acudiente**   | Consulta del desempeño de sus estudiantes vinculados, recepción de notificaciones de ausencias y notas.           |
| **Estudiante**  | Consulta de su propio perfil académico: calificaciones, asistencia y observaciones.                               |

# **2\. Arquitectura del Sistema**

## **2.1 Stack Tecnológico**

| **Capa**                  | **Tecnología**                 | **Versión / Notas**                              |
| ------------------------- | ------------------------------ | ------------------------------------------------ |
| **Backend**               | Django + Django REST Framework | Django >=6.0, DRF >=3.15                         |
| **Autenticación**         | JWT (SimpleJWT)                | Access token 8h, Refresh 7 días                  |
| **Base de datos**         | SQLite 3                       | Archivo db.sqlite3 en raíz del proyecto          |
| **Servidor estático**     | WhiteNoise                     | Sirve el build de React desde staticfiles/       |
| **CORS**                  | django-cors-headers            | \>=4.0 - actualmente CORS_ALLOW_ALL_ORIGINS=True |
| **Frontend**              | React 18 + TypeScript          | Vite 8, React Router v6                          |
| **UI Components**         | shadcn/ui + Radix UI           | Tailwind CSS 3.4, lucide-react, recharts         |
| **Idioma / zona horaria** | es-co / America/Bogota         | Configurado en Django settings.py                |

## **2.2 Patrón de Despliegue**

El sistema utiliza un patrón de SPA servida por Django ("Decoupled Monolith"). Django actúa simultáneamente como servidor de API REST y como servidor de la aplicación React compilada.

**Flujo de un request entrante:**

- Rutas bajo /api/ → procesadas por Django REST Framework
- Ruta /admin/ → panel de administración de Django
- Cualquier otra ruta → Django devuelve index.html (build de React), que toma el control del routing

_El build de React (frontend/dist/) debe existir antes de levantar el servidor en producción. WhiteNoise sirve los assets compilados desde staticfiles/ sin necesidad de un servidor web separado como Nginx._

## **2.3 Estructura del Repositorio**

| **GESTA-DJANGO/**             | Raíz del monorepo                                                 |
| ----------------------------- | ----------------------------------------------------------------- |
| **├── gestaProyecto/**        | Configuración de Django (settings, urls raíz, wsgi, asgi)         |
| **├── polls/**                | Única app Django - modelos, vistas, serializers, URLs, migrations |
| **│ └── management/**         | Comandos personalizados: seed_demo.py, runfullstack.py            |
| **├── frontend/**             | Proyecto React + TypeScript (Vite)                                |
| **│ ├── src/paginas/**        | Páginas organizadas por rol (coordinador/, docente/, dashboards/) |
| **│ ├── src/components/ui/**  | Componentes shadcn/ui (>40 componentes Radix)                     |
| **│ ├── src/context/**        | Estado global: AuthContext, GESTAContext                          |
| **│ └── src/services/api.ts** | Capa centralizada de comunicación con el backend                  |
| **├── db.sqlite3**            | Base de datos SQLite (NO incluir en producción)                   |
| **└── requirements.txt**      | Dependencias Python                                               |

## **2.4 Flujo de Autenticación**

El sistema usa JWT Bearer tokens con refresh automático en el cliente:

- El usuario selecciona su rol en la pantalla inicial (RoleSelection)
- Ingresa credenciales en Login. El frontend llama a POST /api/auth/token/
- El backend responde con access (8h) y refresh (7 días). Ambos se guardan en localStorage
- Cada request HTTP incluye Authorization: Bearer {access_token}
- Si el backend responde 401, el cliente intenta refrescar con /api/auth/token/refresh/
- Si el refresh falla, se limpian los tokens y se redirige al login

_El token JWT incluye el campo 'rol' del usuario, añadido por CustomTokenObtainPairSerializer. La respuesta de login también incluye el objeto 'user' completo con perfil_id, evitando un segundo request a /auth/me/ en el flujo normal._

# **3\. Modelo de Datos**

El modelo está definido en polls/models.py. Todos los modelos usan UUID como clave primaria. El modelo Usuario extiende AbstractUser de Django para añadir el campo de rol.

## **3.1 Dominio de Usuarios e Identidad**

| **Modelo**      | **Campos Clave**                                        | **Descripción**                                                               |
| --------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Usuario**     | id (UUID), rol, first_name, last_name, email, is_active | Extiende AbstractUser. Rol: acudiente \| docente \| coordinador \| estudiante |
| **Acudiente**   | id (UUID), usuario (1:1), telefono                      | Perfil del acudiente vinculado a uno o más estudiantes                        |
| **Docente**     | id (UUID), usuario (1:1)                                | Perfil del docente. Puede ser titular de un curso o solo dictar asignaturas   |
| **Coordinador** | id (UUID), usuario (1:1)                                | Perfil del coordinador. Tiene acceso de solo lectura a toda la institución    |

## **3.2 Dominio Académico**

| **Modelo**           | **Campos Clave**                                                                                      | **Descripción**                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Grado**            | id (UUID), nombre, nivel                                                                              | Nivel académico (ej: Grado 6). Agrupa múltiples cursos                                       |
| **Curso**            | id (UUID), grado (FK), docente_titular (FK→Docente, null), nombre                                     | Grupo específico (ej: 601). Tiene un docente titular y múltiples asignaturas                 |
| **Estudiante**       | usuario (1:1), curso (FK, null), acudiente (FK, null), riesgo, es_repitente, tiene_condicion_especial | Riesgo: bajo \| medio \| alto. Vinculado a un curso y opcionalmente a un acudiente           |
| **Asignatura**       | id (UUID), docente (FK→Docente, null), curso (FK), nombre                                             | Materia impartida en un curso. Un docente puede tener varias asignaturas en distintos cursos |
| **PeriodoAcademico** | id (UUID), nombre, fecha_inicio, fecha_fin, activo                                                    | Solo un periodo puede estar activo a la vez. Las calificaciones se agrupan por periodo       |

## **3.3 Dominio de Evaluación y Asistencia**

| **Modelo**              | **Campos Clave**                                                                                          | **Descripción**                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **ActividadEvaluativa** | asignatura (FK), periodo (FK), nombre, porcentaje, estado \[borrador\|publicada\|cerrada\]                | Actividad con peso porcentual. El estado controla la visibilidad a acudientes          |
| **Calificacion**        | actividad (FK), estudiante (FK), valor (Decimal, null)                                                    | Nota de 0.0 a 5.0. unique_together(actividad, estudiante). Null indica 'sin calificar' |
| **RegistroAsistencia**  | curso (FK), fecha, cerrado                                                                                | Registro diario por curso. unique_together(curso, fecha). cerrado=True es inmutable    |
| **DetalleAsistencia**   | registro (FK), estudiante (FK), estado \[presente\|ausente\|tardanza\|justificado\], motivo_justificacion | Fila por estudiante por día. Registra quién hizo la última modificación y cuándo       |

## **3.4 Dominio de Comunicación y Seguimiento**

| **Modelo**              | **Campos Clave**                                                                                           | **Descripción**                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Observacion**         | estudiante (FK), autor (FK→Usuario), tipo \[academica\|disciplinaria\|seguimiento\|logro\], es_positiva    | Registro del observador del estudiante. El tipo 'logro' fuerza es_positiva=True         |
| **AlertaAcademica**     | estudiante (FK), titulo, contenido, es_automatica, activa, indicador_tipo, indicador_valor_anterior/actual | Alerta activa o resuelta. Puede ser manual (docente/coordinador) o automática (sistema) |
| **AlertaLectura**       | alerta (FK), usuario (FK), leido_en                                                                        | Registro de quién ha leído cada alerta. unique_together(alerta, usuario)                |
| **Mensaje**             | remitente (FK), mensaje_padre (self FK, null), asunto, contenido                                           | Soporte de hilos (replies). Los destinatarios se gestionan en DestinatarioMensaje       |
| **DestinatarioMensaje** | mensaje (FK), destinatario (FK→Usuario), leido, leido_en                                                   | Permite mensajes a múltiples destinatarios. unique_together(mensaje, destinatario)      |
| **Notificacion**        | autor (FK→Coordinador), asunto, contenido                                                                  | Anuncios institucionales creados por coordinadores. Sin destinatarios explícitos        |
| **NotificacionLectura** | notificacion (FK), usuario (FK), leido_en                                                                  | Registro de lectura de notificaciones. unique_together(notificacion, usuario)           |

## **3.5 Relaciones Clave del Modelo**

_Usuario → Acudiente / Docente / Coordinador / Estudiante: relación OneToOne. Cada usuario tiene exactamente un perfil de rol. El campo perfil_id en el token JWT permite al frontend identificar el perfil sin consultas adicionales._

_Estudiante → Curso → Asignatura → ActividadEvaluativa → Calificacion: cadena principal de evaluación. El cálculo del promedio usa una suma ponderada (valor × porcentaje / suma_porcentajes) solo sobre actividades publicadas del periodo activo._

_El modelo Mensaje soporta hilos mediante mensaje_padre (auto-referencia). DestinatarioMensaje desacopla los destinatarios, permitiendo mensajes broadcast a múltiples usuarios con estado de lectura independiente._

# **4\. API REST**

Base URL: /api/ - Todos los endpoints (excepto autenticación) requieren Authorization: Bearer {token}.

## **4.1 Autenticación**

| **Método** | **Endpoint**         | **Auth** | **Descripción**                                                      |
| ---------- | -------------------- | -------- | -------------------------------------------------------------------- |
| **POST**   | /auth/token/         | No       | Login. Body: {username, password}. Responde: {access, refresh, user} |
| **POST**   | /auth/token/refresh/ | No       | Renueva el access token. Body: {refresh}                             |
| **GET**    | /auth/me/            | Bearer   | Retorna el usuario autenticado actual con perfil_id                  |

## **4.2 Coordinador**

| **Método** | **Endpoint**                 | **Descripción**                                                                     |
| ---------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| **GET**    | /coordinador/dashboard/      | Resumen, cursos por grado, asistencia hoy, alertas activas, observaciones recientes |
| **GET**    | /coordinador/estado-grados/  | Estado de riesgo por grado/curso (verde/amarillo/rojo)                              |
| **GET**    | /coordinador/observador/     | Resumen del observador: todos los cursos con estudiantes y observaciones detalladas |
| **GET**    | /coordinador/calificaciones/ | Vista de calificaciones desde el rol coordinador (todas las asignaturas)            |

## **4.3 Docentes**

| **Método** | **Endpoint**                | **Descripción**                                                                   |
| ---------- | --------------------------- | --------------------------------------------------------------------------------- |
| **GET**    | /docentes/cursos/           | Cursos donde el docente autenticado dicta alguna asignatura                       |
| **GET**    | /docentes/dashboard/        | Dashboard del docente autenticado: resumen + detalle de asignaturas y estudiantes |
| **GET**    | /docentes/{uuid}/cursos/    | Variante por ID explícito de docente (para uso coordinador)                       |
| **GET**    | /docentes/{uuid}/dashboard/ | Dashboard de un docente específico por ID                                         |

## **4.4 Estudiantes**

| **Método**  | **Endpoint**                    | **Descripción**                                                                   |
| ----------- | ------------------------------- | --------------------------------------------------------------------------------- |
| **GET**     | /estudiantes/                   | Lista completa con resumen (promedio, asistencia, riesgo, condición especial)     |
| **POST**    | /estudiantes/crear/             | Crea un estudiante. Body: {nombre, curso_id, condicion}. Sin contraseña activa    |
| **GET**     | /estudiantes/{uuid}/perfil/     | Perfil completo: info_general, resumen, observaciones, asistencia, calificaciones |
| **GET/PUT** | /estudiantes/{uuid}/condicion/  | Lee o actualiza condición especial e indicador de repitente                       |
| **GET**     | /estudiantes/{uuid}/asistencia/ | Historial de asistencia del estudiante                                            |
| **GET**     | /estudiantes/para-alertas/      | Lista simplificada (id, nombre, curso, grado) para el formulario de alertas       |

## **4.5 Asistencia**

| **Método** | **Endpoint**               | **Descripción**                                                                     |
| ---------- | -------------------------- | ----------------------------------------------------------------------------------- |
| **GET**    | /asistencia/?curso=&fecha= | Estado de asistencia por curso para una fecha (default: hoy)                        |
| **POST**   | /asistencia/               | Guarda o actualiza el registro de asistencia. Body: {curso_id, detalles\[\], fecha} |
| **PATCH**  | /asistencia/{uuid}/        | Edita un detalle de asistencia individual (estado, motivo_justificacion)            |
| **GET**    | /asistencia/historial/     | Historial de registros pasados con conteos de presentes/ausentes                    |
| **GET**    | /asistencia/grados/        | Vista de asistencia del día agrupada por grado y curso (para coordinador)           |

## **4.6 Calificaciones**

| **Método** | **Endpoint**                                    | **Descripción**                                                               |
| ---------- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| **GET**    | /calificaciones/                                | Cursos con actividades y notas. Filtra por docente o trae todos (coordinador) |
| **POST**   | /calificaciones/notas/                          | Guarda una nota individual. Body: {estudianteId, actividadId, valor}          |
| **POST**   | /calificaciones/actividades/                    | Crea una actividad evaluativa en borrador. Body: {cursoId, nombre, peso}      |
| **POST**   | /calificaciones/actividades/{uuid}/publicar/    | Publica la actividad. Envía mensaje automático a acudientes del curso         |
| **POST**   | /calificaciones/actividades/{uuid}/despublicar/ | Revierte la actividad a borrador                                              |

## **4.7 Observaciones, Mensajes y Alertas**

| **Método** | **Endpoint**                       | **Descripción**                                                                    |
| ---------- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| **GET**    | /observaciones/?estudiante=&curso= | Observaciones filtradas por estudiante o curso                                     |
| **POST**   | /observaciones/                    | Crea una observación. Body: {estudiante, tipo, descripcion, es_positiva}           |
| **GET**    | /mensajes/                         | Mensajes recibidos por el usuario autenticado                                      |
| **POST**   | /mensajes/                         | Envía un mensaje. Body: {destinatarios: \[uuid\], asunto, contenido}               |
| **PATCH**  | /mensajes/{uuid}/leido/            | Marca un mensaje como leído para el usuario autenticado                            |
| **POST**   | /mensajes/responder/               | Responde a un mensaje existente. Body: {contenido, mensaje_padre_id}               |
| **GET**    | /alertas/?estado=activa            | Lista de alertas académicas, opcionalmente filtradas por estado                    |
| **POST**   | /alertas/                          | Crea una alerta manual. Body: {estudianteId, titulo, contenido}                    |
| **PATCH**  | /alertas/{uuid}/resolver/          | Resuelve (desactiva) una alerta                                                    |
| **GET**    | /usuarios/?rol=                    | Lista de usuarios filtrados por rol. Usado para resolver destinatarios de mensajes |

# **5\. Arquitectura Frontend**

## **5.1 Estructura de Páginas y Rutas**

| **Ruta**                              | **Rol requerido** | **Componente**                                     |
| ------------------------------------- | ----------------- | -------------------------------------------------- |
| /                                     | Ninguno           | RoleSelection - selección de rol inicial           |
| /login/:rol                           | Ninguno           | Login con credenciales                             |
| /dashboard/docente                    | docente           | DashboardDocente - resumen de asignaturas          |
| /dashboard/calificaciones-docente     | docente           | Ingreso-notas - planilla de notas editable         |
| /dashboard/asistencia-docente         | docente           | registro-de-asistencia - toma de asistencia diaria |
| /dashboard/observador-docente         | docente           | ObservadorDocente - gestión del observador         |
| /dashboard/coordinador                | coordinador       | DashboardCoordinador - vista institucional         |
| /dashboard/estudiantes-coordinador    | coordinador       | EstudiantesCoordinador - gestión de estudiantes    |
| /dashboard/calificaciones-coordinador | coordinador       | CalificacionesCoordinador - vista global de notas  |
| /dashboard/asistencia-coordinador     | coordinador       | AsistenciaCoordinador - asistencia por grado       |
| /dashboard/observador-coordinador     | coordinador       | ObservadorCoordinador - observador institucional   |
| /dashboard/acudiente                  | acudiente         | DashboardAcudiente - info de sus estudiantes       |
| /dashboard/estudiante                 | estudiante        | DashboardEstudiante - perfil propio                |
| /dashboard/mensajes-\*                | Variable          | Mensajes - bandeja compartida por roles            |

## **5.2 Gestión de Estado Global**

El frontend usa React Context API con dos proveedores anidados:

### **AuthContext**

Responsable exclusivo de la identidad del usuario autenticado. Persiste el estado leyendo el token de localStorage al montar la aplicación. Expone: user (objeto AuthUser), login(), logout(), loading, nombreCompleto().

El objeto AuthUser contiene: id, username, first_name, last_name, email, rol y perfil_id. Este último es el UUID del perfil de rol (Docente, Acudiente, etc.) usado en endpoints que requieren el ID del perfil.

### **GESTAContext**

Centraliza los datos de negocio que se comparten entre páginas: observaciones, mensajes, alertas, condiciones de estudiantes y asistencia. Expone funciones CRUD que llaman a api.ts y sincronizan el estado local.

cargarDatosIniciales() se llama al montar la aplicación y carga mensajes y alertas del usuario autenticado según su rol.

## **5.3 Capa de Servicios API (api.ts)**

Toda comunicación con el backend pasa por src/services/api.ts. Implementa:

- Inyección automática de Authorization: Bearer en cada request
- Refresh automático del access token cuando el backend devuelve 401
- Limpieza de tokens y error informativo si el refresh falla
- Helper buildQuery() para construir query strings tipados

**Los servicios están organizados por dominio:**

| **Namespace**         | **Responsabilidad**                                                                |
| --------------------- | ---------------------------------------------------------------------------------- |
| **authAPI**           | login, logout, refreshToken, me                                                    |
| **docenteAPI**        | getCursos, getDashboard, getEstudiantesPorCurso                                    |
| **asistenciaAPI**     | getRegistroHoy, guardarRegistro, getHistorial, editarRegistro, getAsistenciaGrados |
| **calificacionesAPI** | getCursosConNotas, guardarNota, crearActividad, publicarNotas, despublicarNotas    |
| **observacionesAPI**  | getObservacionesEstudiante, crearObservacion, getObservacionesCurso                |
| **mensajesAPI**       | getMensajesPara, marcarLeido, enviarMensaje, enviarMensajePorRol, getNoLeidos      |
| **alertasAPI**        | getAlertasActivas, crearAlerta, resolverAlerta                                     |
| **estudiantesAPI**    | getEstudiantes, getPerfilEstudiante, setCondicion, crearEstudiante                 |
| **coordinadorAPI**    | getDashboard, getEstadoGrados, getObservador                                       |
| **acudienteAPI**      | getEstudiantesVinculados, getDatosEstudiante                                       |

# **6\. Seguridad**

## **6.1 Implementado**

- Autenticación JWT con expiración corta (8h access / 7 días refresh)
- Hash automático de contraseñas mediante AbstractUser de Django
- IsAuthenticated como permiso por defecto en todos los endpoints
- Validadores de contraseña de Django (longitud, similitud, palabras comunes)
- CSRF middleware activo para rutas no-API

## **6.2 Vulnerabilidades Actuales**

_Las siguientes configuraciones son aceptables en desarrollo pero bloquean el paso a producción._

| **Problema**                        | **Configuración actual**                                  | **Solución recomendada**                                              |
| ----------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| **SECRET_KEY expuesta**             | Hardcodeada en settings.py con prefijo 'django-insecure-' | Leer de variable de entorno: SECRET_KEY = os.environ\['SECRET_KEY'\]  |
| **DEBUG en producción**             | DEBUG = True hardcodeado                                  | DEBUG = os.environ.get('DEBUG', 'False') == 'True'                    |
| **ALLOWED_HOSTS abierto**           | ALLOWED_HOSTS = \['\*'\]                                  | Listar dominios explícitos en producción                              |
| **CORS sin restricción**            | CORS_ALLOW_ALL_ORIGINS = True                             | CORS_ALLOWED_ORIGINS = \['<https://dominio.com'\>]                    |
| **Tokens en localStorage**          | localStorage.setItem('gesta_access_token', ...)           | Preferir cookies HttpOnly para el refresh token                       |
| **Sin autorización por rol en API** | Cualquier usuario autenticado accede a cualquier endpoint | Implementar permission classes por rol o decoradores de permiso       |
| **Estudiante sin contraseña**       | EstudiantesCreateView usa create_user sin password        | Generar y retornar contraseña temporal o usar set_unusable_password() |

# **7\. Configuración y Despliegue**

## **7.1 Variables de Entorno Necesarias**

El proyecto actualmente no usa variables de entorno. Las siguientes son las que deberían existir:

| **Variable**             | **Ejemplo**                 | **Descripción**                                       |
| ------------------------ | --------------------------- | ----------------------------------------------------- |
| **SECRET_KEY**           | (generada)                  | Clave secreta de Django. Requerida. Nunca hardcodear. |
| **DEBUG**                | False                       | True solo en desarrollo local                         |
| **ALLOWED_HOSTS**        | mi-dominio.com              | Dominio(s) del servidor de producción                 |
| **CORS_ALLOWED_ORIGINS** | <https://app.com>           | Orígenes permitidos para CORS                         |
| **VITE_API_URL**         | <http://localhost:8000/api> | URL base del API para el frontend (variable Vite)     |

## **7.2 Inicialización del Proyecto (Desarrollo)**

\# 1. Instalar dependencias Python

pip install -r requirements.txt

\# 2. Aplicar migraciones

python manage.py migrate

\# 3. Cargar datos de demo

python manage.py seed_demo

\# 4. Instalar dependencias del frontend

cd frontend && npm install

\# 5. Levantar ambos servidores simultáneamente

python manage.py runfullstack # comando personalizado

## **7.3 Build de Producción**

\# Compilar el frontend

cd frontend && npm run build

\# Recolectar archivos estáticos de Django

python manage.py collectstatic --noinput

\# Levantar con Gunicorn (no incluido en requirements.txt)

gunicorn gestaProyecto.wsgi:application --bind 0.0.0.0:8000

## **7.4 Datos de Demostración (seed_demo)**

El comando seed_demo crea un conjunto mínimo de datos para probar el sistema. Contraseña de todos los usuarios de demo: demo1234

| **Usuario**    | **Rol**     | **Email**                    | **Datos asociados**                                  |
| -------------- | ----------- | ---------------------------- | ---------------------------------------------------- |
| coord.fontibon | coordinador | <coord.fontibon@ibep.edu.co> | Perfil Coordinador                                   |
| doc.garcia     | docente     | <doc.garcia@ibep.edu.co>     | Titular de cursos 601 y 701. Asignatura: Matemáticas |
| acu.lopez      | acudiente   | <acu.lopez@email.com>        | Acudiente de Sofía Martínez (est.sofia)              |
| est.sofia      | estudiante  | <est.sofia@ibep.edu.co>      | Curso 601, riesgo bajo, acudiente vinculado          |
| est.tomas      | estudiante  | <est.tomas@ibep.edu.co>      | Curso 601, riesgo medio, condición especial: TDAH    |
| est.valentina  | estudiante  | <est.valentina@ibep.edu.co>  | Curso 601, riesgo alto, alerta académica activa      |
| est.diego      | estudiante  | <est.diego@ibep.edu.co>      | Curso 701, riesgo bajo                               |

# **8\. Deuda Técnica**

Se identificaron 3 niveles de deuda técnica según su impacto y urgencia de resolución.

## **8.1 Crítica - Bloquea el paso a producción**

_Los siguientes puntos representan riesgos de seguridad o integridad de datos que deben resolverse antes de cualquier despliegue productivo._

### **DT-C1: Configuración de seguridad hardcodeada en settings.py**

SECRET_KEY, DEBUG=True, ALLOWED_HOSTS=\['\*'\] y CORS_ALLOW_ALL_ORIGINS=True están fijados directamente en el archivo de configuración. En producción esto expone la aplicación a ataques de host header injection, activa las páginas de debug de Django con información sensible, y permite cualquier origen en CORS.

Solución: adoptar python-decouple o django-environ para leer toda la configuración sensible desde variables de entorno o un archivo .env no versionado.

### **DT-C2: Sin autorización basada en roles en los endpoints**

Todos los endpoints verifican IsAuthenticated, pero ninguno verifica que el rol del usuario sea el correcto. Un estudiante autenticado puede consultar /coordinador/dashboard/ o crear alertas sin restricción alguna. Las comprobaciones de rol existentes en algunos views son ad hoc y no sistemáticas.

Solución: implementar permission classes de DRF (ej: IsCoordinador, IsDocente) o usar un decorador @require_rol(). Aplicar en la capa de urls.py para máxima visibilidad.

### **DT-C3: Tokens JWT almacenados en localStorage**

localStorage es accesible desde cualquier script JavaScript en la página, haciéndolo vulnerable a ataques XSS. Si un atacante inyecta código JavaScript, puede extraer el access token y el refresh token.

Solución: almacenar el refresh token en una cookie HttpOnly (no accesible desde JS) y el access token en memoria (variable de estado React). Requiere cambios tanto en el backend (endpoint de refresh como cookie) como en el frontend.

### **DT-C4: SQLite no es adecuado para producción**

SQLite no soporta escrituras concurrentes y no está diseñado para múltiples usuarios simultáneos. En un entorno escolar real con varios docentes registrando asistencia simultáneamente, esto puede causar bloqueos y corrupción de datos.

Solución: migrar a PostgreSQL. Django soporta la migración sin cambios en el código de modelos, solo modificando DATABASES en settings.py.

## **8.2 Alta Prioridad - Afecta mantenibilidad o correctitud**

### **DT-A1: App Django llamada 'polls'**

El nombre de la única app Django es 'polls', heredado del tutorial oficial de Django y nunca renombrado. Esto confunde a cualquier desarrollador que revise el código y contamina el prefijo de las tablas en la base de datos (polls_usuario, polls_estudiante, etc.).

Solución: renombrar la app a 'gesta' o 'academia'. Requiere actualizar INSTALLED_APPS, AUTH_USER_MODEL, todas las importaciones, los archivos de migración y el contenido de la tabla django_content_type.

### **DT-A2: Función index() en views.py no es una APIView**

La función index al final de views.py usa Response de DRF pero está definida como una función plana sin el decorador @api_view. Esto lanza un error AttributeError en runtime si se accede a /api/.

Solución: agregar @api_view(\['GET'\]) o convertirla en una clase APIView. Alternativamente, eliminarla si no tiene uso real.

### **DT-A3: WHITENOISE_ROOT declarado dos veces en settings.py**

La variable WHITENOISE_ROOT aparece dos veces consecutivas con el mismo valor. No causa errores funcionales pero indica falta de revisión del archivo de configuración.

Solución: eliminar la línea duplicada.

### **DT-A4: Doble importación en serializers.py**

Las funciones Sum, F, ExpressionWrapper, DecimalField y Q de django.db.models se importan dos veces al principio de serializers.py. Python no falla, pero ensucia el archivo.

Solución: consolidar en una sola línea de importación.

### **DT-A5: Creación de Asignatura y PeriodoAcademico como side-effect en CrearActividadView**

Si un curso no tiene asignatura o no hay un periodo activo, CrearActividadView los crea automáticamente como efecto secundario. Esto genera datos inconsistentes (ej: asignaturas con nombre genérico 'Asignatura 601') y oculta la ausencia de configuración correcta del sistema.

Solución: eliminar el fallback automático y retornar un error 400 claro si faltan pre-condiciones. La creación de asignaturas y periodos debería hacerse desde un endpoint dedicado.

### **DT-A6: EstudiantesCreateView crea usuarios sin contraseña activa**

Al crear un estudiante, se llama a Usuario.objects.create() directamente sin set_password() ni create_user(). El campo password queda vacío y el estudiante no puede iniciar sesión.

Solución: usar create_user() con una contraseña temporal generada aleatoriamente, o establecer is_active=False hasta que el admin asigne credenciales.

## **8.3 Media Prioridad - Calidad del código y rendimiento**

### **DT-M1: Detección de tipo de mensaje por string matching**

En MensajesView.get(), el tipo de mensaje se detecta con condiciones como 'Alerta' in mensaje.asunto. Este enfoque es frágil: falla si el asunto tiene una capitalización diferente o si el texto cambia.

Solución: agregar un campo tipo al modelo Mensaje (CharField con choices) o derivarlo del modelo fuente (AlertaAcademica vs Mensaje normal).

### **DT-M2: para = 'todos' como placeholder en MensajesView**

La respuesta de /mensajes/ siempre incluye para: 'todos' en lugar de resolver dinámicamente los destinatarios reales del mensaje. El frontend filtra por este campo para determinar qué mensajes mostrar a cada rol, lo cual puede no funcionar correctamente.

Solución: construir la lista de destinatarios real desde DestinatarioMensaje y serializar sus roles.

### **DT-M3: try/except Exception genérico con traceback en CalificacionesCursosView**

Esta vista atrapa cualquier excepción con traceback.print_exc() y la retorna como HTTP 500. En producción esto expone información de la pila de llamadas en los logs del servidor y puede filtrar detalles de la implementación.

Solución: usar el manejador de excepciones de DRF, eliminar el try/except amplio y dejar que las excepciones se propaguen normalmente. Django REST Framework ya maneja los errores comunes.

### **DT-M4: Creación de mensajes en loop en PublicarActividadView (N+1 de escrituras)**

Al publicar una actividad, se crea un Mensaje y un DestinatarioMensaje por cada estudiante del curso en un loop Python. Para un curso de 40 estudiantes, esto genera 80 queries de escritura secuenciales.

Solución: usar Mensaje.objects.bulk_create() para crear todos los mensajes en una sola query, y DestinatarioMensaje.objects.bulk_create() para los destinatarios.

### **DT-M5: ID temporal con Math.random() en GESTAContext**

En agregarMensaje(), el mensaje se agrega al estado local con id: Math.random() mientras espera la respuesta del servidor. Si el usuario interactúa con el mensaje antes de que el estado se sincronice, puede causar inconsistencias.

Solución: usar el ID retornado por el backend en la respuesta POST, o implementar un estado 'pendiente' que se reemplaza cuando llega el ID real.

### **DT-M6: Estado de asistencia en GESTAContext nunca se carga del backend**

GESTAContext declara const \[asistencia\] = useState&lt;AsistenciaRegistro\[\]&gt;(\[\]) pero nunca hace fetch al backend. getAsistenciaEstudiante() siempre devuelve un array vacío, lo que indica que esta funcionalidad del contexto está incompleta.

Solución: integrar la carga de asistencia en cargarDatosIniciales() o eliminar del contexto y que cada página haga su propio fetch directo.

### **DT-M7: enviarMensajePorRol hace N requests HTTP secuenciales**

Cuando el destinatario es 'todos', enviarMensajePorRol itera sobre todos los roles y hace una llamada a /usuarios/?rol= por cada uno. Para 4 roles, son 4 requests secuenciales antes de enviar el mensaje.

Solución: implementar un endpoint backend que resuelva los destinatarios por rol y devuelva los UUIDs en un solo request, o aceptar roles directamente en el endpoint de envío de mensajes.

## **8.4 Baja Prioridad - Limpieza y mejoras futuras**

| **ID**     | **Problema**                                                    | **Recomendación**                                                                                                                                                                |
| ---------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DT-B1**  | Sin paginación en ningún endpoint                               | Agregar PageNumberPagination de DRF. Crítico para /estudiantes/ y /observaciones/ en instituciones grandes.                                                                      |
| **DT-B2**  | Sin tests automatizados                                         | tests.py está vacío. Priorizar tests de integración para los endpoints críticos (login, guardar nota, asistencia).                                                               |
| **DT-B3**  | Sin documentación de API (OpenAPI/Swagger)                      | Agregar drf-spectacular o drf-yasg para auto-generar documentación interactiva de la API.                                                                                        |
| **DT-B4**  | Sin versionado de API                                           | Adoptar /api/v1/ como prefijo para facilitar cambios futuros sin romper clientes existentes.                                                                                     |
| **DT-B5**  | Nombres de archivo inconsistentes en frontend                   | Ingreso-notas.tsx y registro-de-asistencia.tsx usan kebab-case. Renombrar a IngresoNotas.tsx y RegistroAsistencia.tsx (PascalCase).                                              |
| **DT-B6**  | Uso extensivo de any en api.ts                                  | Definir interfaces TypeScript para todas las respuestas del backend. Eliminar request&lt;any&gt;.                                                                                |
| **DT-B7**  | Sin manejo centralizado de errores en frontend                  | Agregar un interceptor global o un boundary de error en React. Actualmente los errores solo van a console.error.                                                                 |
| **DT-B8**  | Sin rate limiting en la API                                     | Configurar DEFAULT_THROTTLE_CLASSES en DRF para proteger el endpoint de login y otros endpoints públicos.                                                                        |
| **DT-B9**  | AsistenciaGradosView retorna ausentes si no hay registro        | Si no hay RegistroAsistencia para hoy, mostrar estado 'sin registro' en lugar de asumir ausencia total, que puede ser información engañosa.                                      |
| **DT-B10** | GESTAContext mezcla estado local con backend inconsistentemente | Estandarizar: usar React Query o SWR para el estado del servidor, y useState solo para estado de UI local. Eliminar la duplicación entre contexto y fetching directo en páginas. |

# **9\. Resumen Ejecutivo de Deuda Técnica**

| **Nivel**   | **Cantidad** | **Impacto**                                                            |
| ----------- | ------------ | ---------------------------------------------------------------------- |
| **Crítica** | 4 puntos     | Bloquean producción: seguridad, autenticación de roles, BD concurrente |
| **Alta**    | 6 puntos     | Afectan mantenibilidad y correctitud del código base                   |
| **Media**   | 7 puntos     | Afectan rendimiento, experiencia de usuario y calidad del código       |
| **Baja**    | 10 puntos    | Mejoras de código, tipado, tests y documentación                       |

## **Plan de Acción Recomendado**

**Fase 1 (antes de producción):**

- Externalizar configuración sensible a variables de entorno (DT-C1)
- Implementar permission classes por rol en DRF (DT-C2)
- Migrar de SQLite a PostgreSQL (DT-C4)
- Corregir manejo de tokens (cookies HttpOnly para refresh) (DT-C3)
- Corregir función index() y creación de estudiantes sin contraseña (DT-A2, DT-A6)

**Fase 2 (sprint de calidad):**

- Renombrar app 'polls' a 'gesta' (DT-A1)
- Eliminar side-effects de CrearActividadView (DT-A5)
- Agregar campo 'tipo' al modelo Mensaje (DT-M1)
- Reemplazar loop de mensajes con bulk_create en PublicarActividadView (DT-M4)
- Implementar paginación en todos los endpoints de lista (DT-B1)

**Fase 3 (deuda técnica menor):**

- Agregar tests automatizados (DT-B2)
- Configurar drf-spectacular para documentación OpenAPI (DT-B3)
- Eliminar any de api.ts y definir interfaces TypeScript (DT-B6)
- Normalizar nombres de archivos en frontend (DT-B5)
- Evaluar adopción de React Query para manejo de estado del servidor (DT-B10)

_GESTA · Documentación Técnica v1.0.0 · Junio 2026_
