// ═══════════════════════════════════════════════════════════════
// api.ts — Capa de servicios API para GESTA Frontend
// Todos los llamados al backend deben pasar por este archivo.
// Reemplazar las URLs base y endpoints según la configuración del backend.
// ═══════════════════════════════════════════════════════════════

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const ACCESS_TOKEN_KEY = "gesta_access_token";
const REFRESH_TOKEN_KEY = "gesta_refresh_token";

export function mapRiesgo(riesgo?: string | null): string {
  const m: Record<string, string> = { bajo: "verde", medio: "amarillo", alto: "rojo" };
  return riesgo ? (m[riesgo] ?? "verde") : "verde";
}

function getStoredToken(key: string): string | null {
  return localStorage.getItem(key);
}

function setStoredToken(key: string, value: string) {
  localStorage.setItem(key, value);
}

function clearStoredTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken(ACCESS_TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function refreshAccessToken(): Promise<string> {
  const refresh = getStoredToken(REFRESH_TOKEN_KEY);
  if (!refresh) {
    throw new Error("No refresh token available.");
  }

  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearStoredTokens();
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Error ${response.status}`);
  }

  const data = await response.json();
  if (!data.access) {
    throw new Error("Refresh token failed.");
  }

  setStoredToken(ACCESS_TOKEN_KEY, data.access);
  if (data.refresh) {
    setStoredToken(REFRESH_TOKEN_KEY, data.refresh);
  }
  return data.access;
}

async function request<T>(endpoint: string, options: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (response.status === 401 && retry) {
    try {
      await refreshAccessToken();
      return request<T>(endpoint, options, false);
    } catch (refreshError) {
      clearStoredTokens();
      throw new Error("Unauthorized. Por favor inicia sesión de nuevo.");
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Error ${response.status}`);
  }

  return response.json();
}

function buildQuery(params: Record<string, any>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export const authAPI = {
  login: async (usuario: string, password: string) => {
    const data = await request<{ access: string; refresh: string; user: any }>(
      "/auth/token/",
      {
        method: "POST",
        body: JSON.stringify({ username: usuario, password }),
      }
    );

    if (data.access) {
      setStoredToken(ACCESS_TOKEN_KEY, data.access);
    }
    if (data.refresh) {
      setStoredToken(REFRESH_TOKEN_KEY, data.refresh);
    }

    return data;
  },
  logout: async () => {
    clearStoredTokens();
  },
  refreshToken: async () => {
    return refreshAccessToken();
  },
  me: async () => {
    return request<any>("/auth/me/");
  },
};

export const docenteAPI = {
  getCursos: async (docenteId?: number) => {
    const endpoint = docenteId ? `/docentes/${docenteId}/cursos/` : "/docentes/cursos/";
    const data = await request<{ cursos: any[] }>(endpoint);
    return data.cursos;
  },
  getEstudiantesPorCurso: async (cursoId: number) => {
    return request<any[]>(`/cursos/${cursoId}/estudiantes/`);
  },
  getDashboard: async (docenteId?: number) => {
    const endpoint = docenteId ? `/docentes/${docenteId}/dashboard/` : "/docentes/dashboard/";
    return request<any>(endpoint);
  },
};

export const asistenciaAPI = {
  getRegistroHoy: async (cursoId: string | number) => {
    return request<Record<string, { abierto: boolean; estudiantes: any[] }>>(
      `/asistencia/${buildQuery({ curso: cursoId, fecha: "hoy" })}`
    );
  },
  guardarRegistro: async (
    cursoId: string,
    registros: Array<{ estudianteId: string; estado: string; motivo?: string }>,
    fecha?: string
  ) => {
    return request<any>("/asistencia/", {
      method: "POST",
      body: JSON.stringify({
        curso_id: cursoId,
        detalles: registros.map(r => ({
          estudiante_id: r.estudianteId,
          estado: r.estado,
          motivo: r.motivo,
        })),
        fecha,
      }),
    });
  },
  getHistorial: async (cursoId: string | number) => {
    return request<any[]>(`/asistencia/historial/${buildQuery({ curso: cursoId })}`);
  },
  editarRegistro: async (registroId: string, estado: string, motivo?: string) => {
    return request<any>(`/asistencia/${registroId}/`, {
      method: "PATCH",
      body: JSON.stringify({ estado, motivo }),
    });
  },
  getAsistenciaEstudiante: async (estudianteId: string) => {
    return request<any[]>(`/estudiantes/${estudianteId}/asistencia/`);
  },
  getAsistenciaGrados: async () => {
    return request<any[]>("/asistencia/grados/");
  },
};

export const calificacionesAPI = {
  getCursosConNotas: async () => {
    const data = await request<{ cursos: any[] }>("/calificaciones/");
    const result: Record<string, any> = {};
    for (const c of data.cursos || []) {
      result[c.curso] = {
        id: c.curso_id,
        abierto: false,
        docente: c.docente || 'Sin docente',
        materia: c.materia || 'Todas',
        actividades: (c.actividades || []).map((a: any) => ({
          id: a.id,
          nombre: a.nombre,
          peso: a.peso,
          publicada: a.publicada,
        })),
        estudiantes: (c.estudiantes || []).map((e: any) => ({
          id: e.id,
          nombre: e.nombre,
          condicion: e.condicion,
        })),
        notas: c.notas || {},
      };
    }
    return result;
  },
  guardarNota: async (_cursoId: string, estudianteId: string, actividadId: string, valor: string) => {
    return request<any>("/calificaciones/notas/", {
      method: "POST",
      body: JSON.stringify({ estudianteId, actividadId, valor }),
    });
  },
  crearActividad: async (cursoId: string, actividad: { nombre: string; peso: number; tipo: string }) => {
    return request<any>("/calificaciones/actividades/", {
      method: "POST",
      body: JSON.stringify({ cursoId, nombre: actividad.nombre, peso: actividad.peso }),
    });
  },
  publicarNotas: async (actividadId: number | string) => {
    return request<any>(`/calificaciones/actividades/${actividadId}/publicar/`, {
      method: "POST",
    });
  },
  despublicarNotas: async (actividadId: number | string) => {
    return request<any>(`/calificaciones/actividades/${actividadId}/despublicar/`, {
      method: "POST",
    });
  },
  getCalificacionesEstudiante: async (estudianteId: number) => {
    return request<any>(`/estudiantes/${estudianteId}/calificaciones/`);
  },
  getCursosCoordinador: async () => {
    return request<any>("/coordinador/calificaciones/");
  },
};

export const observacionesAPI = {
  getObservacionesEstudiante: async (estudianteId: string) => {
    return request<any[]>(`/observaciones/${buildQuery({ estudiante: estudianteId })}`);
  },
  crearObservacion: async (observacion: { estudianteId: string; tipo: string; desc: string; autor: string; rol: string }) => {
    return request<any>("/observaciones/", {
      method: "POST",
      body: JSON.stringify({
        estudiante: observacion.estudianteId,
        tipo: observacion.tipo.toLowerCase(),  // ✅ convierte a minúscula
        descripcion: observacion.desc,
        es_positiva: false,
      }),
    });
  },
  getObservacionesCurso: async (cursoId: string) => {
    return request<any[]>(`/observaciones/${buildQuery({ curso: cursoId })}`);
  },
  getObservacionesRecientes: async () => {
    return request<any[]>("/observaciones/recientes/");
  },
};

export const mensajesAPI = {
  getMensajesPara: async (rol: string) => {
    return request<any[]>(`/mensajes/${buildQuery({ para: rol })}`);
  },
  marcarLeido: async (mensajeId: string | number) => {
    return request<any>(`/mensajes/${mensajeId}/leido/`, {
      method: "PATCH",
    });
  },
  getUsuariosPorRol: async (rol: string) => {
    return request<Array<{ id: string; nombre: string }>>(`/usuarios/${buildQuery({ rol })}`);
  },
  enviarMensaje: async (mensaje: { destinatarios: string[]; asunto: string; contenido: string }) => {
    return request<any>("/mensajes/", {
      method: "POST",
      body: JSON.stringify(mensaje),
    });
  },
  enviarMensajePorRol: async (mensaje: { destinatarios: string | string[]; asunto: string; contenido: string }) => {
    // Si destinatarios es un string, lo convierte a array
    const roles = Array.isArray(mensaje.destinatarios) ? mensaje.destinatarios : [mensaje.destinatarios];
    
    // Obtener UUIDs para cada rol
    const allUUIDs: Set<string> = new Set();
    
    for (const rol of roles) {
      if (rol === 'todos') {
        // Para 'todos', obtener todos los roles excepto el usuario actual
        const rolesParaTodos = ['docente', 'coordinador', 'acudiente', 'estudiante'];
        for (const r of rolesParaTodos) {
          try {
            const usuarios = await mensajesAPI.getUsuariosPorRol(r);
            usuarios?.forEach((u: { id: string; nombre: string }) => allUUIDs.add(u.id));
          } catch (err) {
            console.warn(`Error obteniendo usuarios con rol ${r}:`, err);
          }
        }
      } else {
        try {
          const usuarios = await mensajesAPI.getUsuariosPorRol(rol);
          usuarios?.forEach((u: { id: string; nombre: string }) => allUUIDs.add(u.id));
        } catch (err) {
          console.warn(`Error obteniendo usuarios con rol ${rol}:`, err);
        }
      }
    }

    if (allUUIDs.size === 0) {
      throw new Error('No hay destinatarios para enviar el mensaje.');
    }

    return mensajesAPI.enviarMensaje({
      ...mensaje,
      destinatarios: Array.from(allUUIDs),
    }) as any;
  },
  getNoLeidos: async (rol: string) => {
    return request<{ total: number }>(`/mensajes/no-leidos/${buildQuery({ rol })}`);
  },
};

export const alertasAPI = {
  getAlertasActivas: async () => {
    return request<any[]>("/alertas/?estado=activa");
  },
  crearAlerta: async (alerta: { estudianteId: number; tipo: string; motivo: string; responsable: string }) => {
    return request<any>("/alertas/", {
      method: "POST",
      body: JSON.stringify({ estudianteId: alerta.estudianteId, titulo: alerta.tipo, contenido: alerta.motivo }),
    });
  },
  resolverAlerta: async (alertaId: number) => {
    return request<any>(`/alertas/${alertaId}/resolver/`, {
      method: "PATCH",
    });
  },
};

export const estudiantesAPI = {
  getEstudiantes: async (filtros?: { grado?: string; riesgo?: string; condicion?: string; busqueda?: string }) => {
    const data = await request<{ estudiantes: any[] }>(`/estudiantes/${buildQuery(filtros || {})}`);
    return (data.estudiantes || []).map((e: any) => ({
      id: e.id,
      nombre: e.nombre,
      grado: e.grado || e.curso,
      promedio: e.promedio ?? 0,
      asistencia: e.porcentaje_asistencia ?? 0,
      obs: e.observaciones_negativas ?? 0,
      riesgo: mapRiesgo(e.riesgo),
      condicion: e.descripcion_condicion || null,
    }));
  },
  getPerfilEstudiante: async (estudianteId: string) => {
    return request<any>(`/estudiantes/${estudianteId}/perfil/`);
  },
  getCondicion: async (estudianteId: string) => {
    return request<any>(`/estudiantes/${estudianteId}/condicion/`);
  },
  setCondicion: async (estudianteId: string, condicion: { esRepitente: boolean; descripcionRepitente?: string; condicionInclusion?: string }) => {
    return request<any>(`/estudiantes/${estudianteId}/condicion/`, {
      method: "PUT",
      body: JSON.stringify(condicion),
    });
  },
  crearEstudiante: async (estudiante: { nombre: string; grado: string; condicion?: string | null }) => {
    return request<any>("/estudiantes/crear/", {
      method: "POST",
      body: JSON.stringify({ nombre: estudiante.nombre, curso_id: estudiante.grado, condicion: estudiante.condicion }),
    });
  },
  getEstudiantesAlerta: async () => {
    return request<any[]>("/estudiantes/para-alertas/");
  },
};

export const coordinadorAPI = {
  getDashboard: async () => {
    return request<any>("/coordinador/dashboard/");
  },
  getEstadoGrados: async () => {
    const data = await request<{ cursos_por_grado: any[] }>("/coordinador/estado-grados/");
    return (data.cursos_por_grado || []).map((g: any) => {
      const cursos = (g.cursos || []).map((c: any) => {
        const ests = c.estudiantes || [];
        return {
          nombre: c.nombre,
          total: ests.length,
          verde: ests.filter((e: any) => e.riesgo === "bajo").length,
          amarillo: ests.filter((e: any) => e.riesgo === "medio").length,
          rojo: ests.filter((e: any) => e.riesgo === "alto").length,
        };
      });
      const total = cursos.reduce((s: number, c: any) => s + c.total, 0);
      const verde = cursos.reduce((s: number, c: any) => s + c.verde, 0);
      const amarillo = cursos.reduce((s: number, c: any) => s + c.amarillo, 0);
      const rojo = cursos.reduce((s: number, c: any) => s + c.rojo, 0);
      return { grado: g.nombre, total, verde, amarillo, rojo, cursos };
    });
  },
  getObservador: async () => {
    return request<any>("/coordinador/observador/");
  },
};

export const acudienteAPI = {
  getEstudiantesVinculados: async (acudienteId: string) => {
    const data = await request<any[]>(`/acudientes/${acudienteId}/estudiantes/`);
    return data.map((e: any) => ({
      id: e.id,
      nombre: e.nombre,
      grado: e.grado || e.curso,
      curso: e.curso,
    }));
  },
  getDatosEstudiante: async (estudianteId: string) => {
    return request<any>(`/estudiantes/${estudianteId}/datos-acudiente/`);
  },
};

export const estudianteAPI = {
  getPerfil: async (estudianteId: string) => {
    const data = await request<any>(`/estudiantes/${estudianteId}/perfil/`);
    const info = data.info_general || {};
    return {
      id: info.id,
      nombre: info.nombre,
      grado: (info.grado || info.curso || "").replace("Grado ", ""),
      riesgo: mapRiesgo(info.riesgo),
      promedio: info.promedio ?? 0,
      asistencia: info.porcentaje_asistencia ?? 0,
      materiasPerdidas: 0,
      jornada: "Mañana",
      calificaciones: data.calificaciones || [],
      observaciones: data.observaciones || [],
    };
  },
};
