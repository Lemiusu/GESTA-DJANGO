// ═══════════════════════════════════════════════════════════════
// api.ts — Capa de servicios API para GESTA Frontend
// Todos los llamados al backend deben pasar por este archivo.
// Reemplazar las URLs base y endpoints según la configuración del backend.
// ═══════════════════════════════════════════════════════════════

// TODO: Configurar la URL base del backend Django
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// TODO: Implementar manejo de token JWT/autenticación
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("gesta_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Error ${response.status}`);
  }

  return response.json();
}

// ─── AUTENTICACIÓN ──────────────────────────────────────────────
// TODO: Conectar con el endpoint de login del backend Django
export const authAPI = {
  login: async (usuario: string, password: string, rol: string) => {
    // TODO: Reemplazar con llamado real a la API
    // return request<{ token: string; user: User }>("/auth/login/", {
    //   method: "POST",
    //   body: JSON.stringify({ usuario, password, rol }),
    // });
    throw new Error("authAPI.login no implementado — conectar con backend Django");
  },
  logout: async () => {
    // TODO: Reemplazar con llamado real a la API
    // return request("/auth/logout/", { method: "POST" });
    localStorage.removeItem("gesta_token");
  },
  refreshToken: async () => {
    // TODO: Implementar refresh de token
    throw new Error("authAPI.refreshToken no implementado — conectar con backend Django");
  },
};

// ─── DOCENTE ────────────────────────────────────────────────────
// TODO: Conectar con endpoints del backend para docentes
export const docenteAPI = {
  getCursos: async (docenteId: number) => {
    // TODO: GET /docentes/{id}/cursos/
    throw new Error("docenteAPI.getCursos no implementado");
  },
  getEstudiantesPorCurso: async (cursoId: number) => {
    // TODO: GET /cursos/{id}/estudiantes/
    throw new Error("docenteAPI.getEstudiantesPorCurso no implementado");
  },
  getDashboard: async (docenteId: number) => {
    // TODO: GET /docentes/{id}/dashboard/
    throw new Error("docenteAPI.getDashboard no implementado");
  },
};

// ─── ASISTENCIA ─────────────────────────────────────────────────
// TODO: Conectar con endpoints del backend para asistencia
export const asistenciaAPI = {
  getRegistroHoy: async (cursoId: number) => {
    // TODO: GET /asistencia/?curso={cursoId}&fecha=hoy
    throw new Error("asistenciaAPI.getRegistroHoy no implementado");
  },
  guardarRegistro: async (cursoId: number, registros: Array<{ estudianteId: number; estado: string; motivo?: string }>) => {
    // TODO: POST /asistencia/
    throw new Error("asistenciaAPI.guardarRegistro no implementado");
  },
  getHistorial: async (cursoId: number, fechaInicio?: string, fechaFin?: string) => {
    // TODO: GET /asistencia/historial/?curso={cursoId}
    throw new Error("asistenciaAPI.getHistorial no implementado");
  },
  editarRegistro: async (registroId: number, estado: string, motivo?: string) => {
    // TODO: PATCH /asistencia/{id}/
    throw new Error("asistenciaAPI.editarRegistro no implementado");
  },
  getAsistenciaEstudiante: async (estudianteId: number) => {
    // TODO: GET /estudiantes/{id}/asistencia/
    throw new Error("asistenciaAPI.getAsistenciaEstudiante no implementado");
  },
  getAsistenciaGrados: async () => {
    // TODO: GET /asistencia/grados/
    throw new Error("asistenciaAPI.getAsistenciaGrados no implementado");
  },
};

// ─── CALIFICACIONES / NOTAS ────────────────────────────────────
// TODO: Conectar con endpoints del backend para calificaciones
export const calificacionesAPI = {
  getCursosConNotas: async (docenteId: number) => {
    // TODO: GET /calificaciones/?docente={docenteId}
    throw new Error("calificacionesAPI.getCursosConNotas no implementado");
  },
  guardarNota: async (cursoId: number, estudianteId: number, actividadId: number, valor: string) => {
    // TODO: POST/PUT /calificaciones/notas/
    throw new Error("calificacionesAPI.guardarNota no implementado");
  },
  crearActividad: async (cursoId: number, actividad: { nombre: string; peso: number; tipo: string }) => {
    // TODO: POST /calificaciones/actividades/
    throw new Error("calificacionesAPI.crearActividad no implementado");
  },
  publicarNotas: async (actividadId: number) => {
    // TODO: POST /calificaciones/actividades/{id}/publicar/
    throw new Error("calificacionesAPI.publicarNotas no implementado");
  },
  despublicarNotas: async (actividadId: number) => {
    // TODO: POST /calificaciones/actividades/{id}/despublicar/
    throw new Error("calificacionesAPI.despublicarNotas no implementado");
  },
  getCalificacionesEstudiante: async (estudianteId: number) => {
    // TODO: GET /estudiantes/{id}/calificaciones/
    throw new Error("calificacionesAPI.getCalificacionesEstudiante no implementado");
  },
  getCursosCoordinador: async () => {
    // TODO: GET /calificaciones/coordinador/cursos/
    throw new Error("calificacionesAPI.getCursosCoordinador no implementado");
  },
};

// ─── OBSERVACIONES / OBSERVADOR ─────────────────────────────────
// TODO: Conectar con endpoints del backend para observaciones
export const observacionesAPI = {
  getObservacionesEstudiante: async (estudianteId: number) => {
    // TODO: GET /observaciones/?estudiante={estudianteId}
    throw new Error("observacionesAPI.getObservacionesEstudiante no implementado");
  },
  crearObservacion: async (observacion: { estudianteId: number; tipo: string; desc: string; autor: string; rol: string }) => {
    // TODO: POST /observaciones/
    throw new Error("observacionesAPI.crearObservacion no implementado");
  },
  getObservacionesCurso: async (cursoId: number) => {
    // TODO: GET /observaciones/?curso={cursoId}
    throw new Error("observacionesAPI.getObservacionesCurso no implementado");
  },
  getObservacionesRecientes: async () => {
    // TODO: GET /observaciones/recientes/
    throw new Error("observacionesAPI.getObservacionesRecientes no implementado");
  },
};

// ─── MENSAJES Y NOTIFICACIONES ──────────────────────────────────
// TODO: Conectar con endpoints del backend para mensajes
export const mensajesAPI = {
  getMensajesPara: async (rol: string) => {
    // TODO: GET /mensajes/?para={rol}
    throw new Error("mensajesAPI.getMensajesPara no implementado");
  },
  marcarLeido: async (mensajeId: number) => {
    // TODO: PATCH /mensajes/{id}/leido/
    throw new Error("mensajesAPI.marcarLeido no implementado");
  },
  enviarMensaje: async (mensaje: { de: string; rolDe: string; para: string; asunto: string; contenido: string; tipo: string }) => {
    // TODO: POST /mensajes/
    throw new Error("mensajesAPI.enviarMensaje no implementado");
  },
  getNoLeidos: async (rol: string) => {
    // TODO: GET /mensajes/no-leidos/?rol={rol}
    throw new Error("mensajesAPI.getNoLeidos no implementado");
  },
};

// ─── ALERTAS ────────────────────────────────────────────────────
// TODO: Conectar con endpoints del backend para alertas
export const alertasAPI = {
  getAlertasActivas: async () => {
    // TODO: GET /alertas/?estado=activa
    throw new Error("alertasAPI.getAlertasActivas no implementado");
  },
  crearAlerta: async (alerta: { estudianteId: number; tipo: string; motivo: string; responsable: string }) => {
    // TODO: POST /alertas/
    throw new Error("alertasAPI.crearAlerta no implementado");
  },
  resolverAlerta: async (alertaId: number) => {
    // TODO: PATCH /alertas/{id}/resolver/
    throw new Error("alertasAPI.resolverAlerta no implementado");
  },
};

// ─── ESTUDIANTES ────────────────────────────────────────────────
// TODO: Conectar con endpoints del backend para estudiantes
export const estudiantesAPI = {
  getEstudiantes: async (filtros?: { grado?: string; riesgo?: string; condicion?: string; busqueda?: string }) => {
    // TODO: GET /estudiantes/ con query params
    throw new Error("estudiantesAPI.getEstudiantes no implementado");
  },
  getPerfilEstudiante: async (estudianteId: number) => {
    // TODO: GET /estudiantes/{id}/perfil/
    throw new Error("estudiantesAPI.getPerfilEstudiante no implementado");
  },
  getCondicion: async (estudianteId: number) => {
    // TODO: GET /estudiantes/{id}/condicion/
    throw new Error("estudiantesAPI.getCondicion no implementado");
  },
  setCondicion: async (estudianteId: number, condicion: { esRepitente: boolean; descripcionRepitente?: string; condicionInclusion?: string }) => {
    // TODO: PUT /estudiantes/{id}/condicion/
    throw new Error("estudiantesAPI.setCondicion no implementado");
  },
  crearEstudiante: async (estudiante: { nombre: string; grado: string; condicion?: string | null }) => {
    // TODO: POST /estudiantes/
    throw new Error("estudiantesAPI.crearEstudiante no implementado");
  },
  getEstudiantesAlerta: async () => {
    // TODO: GET /estudiantes/para-alertas/
    throw new Error("estudiantesAPI.getEstudiantesAlerta no implementado");
  },
};

// ─── COORDINADOR ────────────────────────────────────────────────
// TODO: Conectar con endpoints del backend para coordinador
export const coordinadorAPI = {
  getDashboard: async () => {
    // TODO: GET /coordinador/dashboard/
    throw new Error("coordinadorAPI.getDashboard no implementado");
  },
  getEstadoGrados: async () => {
    // TODO: GET /coordinador/estado-grados/
    throw new Error("coordinadorAPI.getEstadoGrados no implementado");
  },
};

// ─── ACUDIENTE ──────────────────────────────────────────────────
// TODO: Conectar con endpoints del backend para acudiente
export const acudienteAPI = {
  getEstudiantesVinculados: async (acudienteId: number) => {
    // TODO: GET /acudientes/{id}/estudiantes/
    throw new Error("acudienteAPI.getEstudiantesVinculados no implementado");
  },
  getDatosEstudiante: async (estudianteId: number) => {
    // TODO: GET /estudiantes/{id}/datos-acudiente/
    throw new Error("acudienteAPI.getDatosEstudiante no implementado");
  },
};

// ─── ESTUDIANTE (rol) ───────────────────────────────────────────
// TODO: Conectar con endpoints del backend para estudiante
export const estudianteAPI = {
  getPerfil: async (estudianteId: number) => {
    // TODO: GET /estudiantes/{id}/mi-perfil/
    throw new Error("estudianteAPI.getPerfil no implementado");
  },
};
