import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import {
  observacionesAPI,
  mensajesAPI,
  alertasAPI,
  estudiantesAPI,
} from "../services/api";

/* ─── TIPOS ─────────────────────────────────────────────────────── */
export type NivelRiesgo = "verde" | "amarillo" | "rojo";

export interface Curso {
  id: number;
  nombre: string;
  grado: string;
  estudiantes: Array<{
    id: number;
    nombre: string;
    condicion: string | null;
  }>;
}

export interface Observacion {
  id: string;
  estudianteId: string;
  tipo: string;
  desc: string;
  fecha: string;
  autor: string;
  rol: string;
}

export interface Mensaje {
  id: string | number;
  destinatarios?: string[];
  de: string;
  rolDe: string;
  para: string;
  asunto: string;
  contenido: string;
  fecha: string;
  leido: boolean;
  tipo: "mensaje" | "notificacion" | "alerta" | "inasistencia" | "notas";
}

export interface Alerta {
  id: number;
  estudianteId: number;
  nombreEstudiante: string;
  grado: string;
  tipo: string;
  motivo: string;
  fecha: string;
  estado: "activa" | "resuelta";
  responsable: string;
}

export interface CondicionEstudiante {
  estudianteId: string;
  condicionInclusion?: string;
  esRepitente: boolean;
  descripcionRepitente?: string;
}

export interface NotaActividad {
  id: number;
  nombre: string;
  peso: number;
  valor: string;
}

export interface NotasMateria {
  estudianteId: number;
  materia: string;
  actividades: NotaActividad[];
  publicada: boolean;
}

export interface AsistenciaRegistro {
  fecha: string;
  estudianteId: string;
  estado: "presente" | "ausente" | "justificado";
  motivo?: string;
}

/* ─── CONTEXT TYPE ───────────────────────────────────────────────── */
interface GESTAContextType {
  // Identidad del usuario actual
  perfilId: string | null;
  nombreCompleto: string;
  rol: string | null;

  // Observaciones
  observaciones: Observacion[];
  loadingObservaciones: boolean;
  agregarObservacion: (obs: Omit<Observacion, "id">) => Promise<void>;
  getObservacionesEstudiante: (estudianteId: string) => Observacion[];

  // Mensajes
  mensajes: Mensaje[];
  loadingMensajes: boolean;
  agregarMensaje: (msg: Omit<Mensaje, "id">) => Promise<void>;
  marcarMensajeLeido: (id: string | number) => Promise<void>;
  getMensajesPara: (rol: string) => Mensaje[];
  getMensajesNoLeidos: (rol: string) => number;

  // Alertas
  alertas: Alerta[];
  loadingAlertas: boolean;
  agregarAlerta: (alerta: Omit<Alerta, "id">) => Promise<void>;
  resolverAlerta: (id: number) => Promise<void>;
  getAlertasActivas: () => Alerta[];

  // Condiciones especiales
  condiciones: CondicionEstudiante[];
  setCondicionEstudiante: (est: CondicionEstudiante) => Promise<void>;
  getCondicion: (estudianteId: string) => CondicionEstudiante | undefined;

  // Asistencia
  asistencia: AsistenciaRegistro[];
  loadingAsistencia: boolean;
  getAsistenciaEstudiante: (estudianteId: string) => AsistenciaRegistro[];

  // Carga inicial
  cargarDatosIniciales: () => Promise<void>;
}

/* ─── CONTEXT ────────────────────────────────────────────────────── */
const GESTAContext = createContext<GESTAContextType | null>(null);

export function GESTAProvider({ children }: { children: ReactNode }) {
  // Lee el usuario autenticado directamente desde AuthContext
  const { user, nombreCompleto: getNombreCompleto } = useAuth();

  const perfilId = user?.perfil_id ?? null;
  const rol = user?.rol ?? null;
  const nombreCompleto = getNombreCompleto();

  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [condiciones, setCondiciones] = useState<CondicionEstudiante[]>([]);
  const [loadingCondiciones, setLoadingCondiciones] = useState(false);
  const [asistencia] = useState<AsistenciaRegistro[]>([]);

  const [loadingObservaciones, setLoadingObservaciones] = useState(false);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const [loadingAsistencia] = useState(false);

  /* ─── Carga inicial — ya no necesita recibir el rol como parámetro ─── */
  const cargarDatosIniciales = useCallback(async () => {
    if (!rol) return;

    try {
      setLoadingMensajes(true);
      const msgs = await mensajesAPI.getMensajesPara(rol);
      setMensajes(msgs);
    } catch (error) {
      console.error("Error cargando mensajes:", error);
      setMensajes([]);
    } finally {
      setLoadingMensajes(false);
    }

    try {
      setLoadingAlertas(true);
      const alertasData = await alertasAPI.getAlertasActivas();
      setAlertas(alertasData);
    } catch (error) {
      console.error("Error cargando alertas:", error);
      setAlertas([]);
    } finally {
      setLoadingAlertas(false);
    }

    try {
      setLoadingCondiciones(true);
      const estudiantesData = await estudiantesAPI.getEstudiantes();
      const nuevasCondiciones: CondicionEstudiante[] = [];
      estudiantesData.forEach(function(e: any) {
        if (e.esRepitente || e.tieneCondicionEspecial) {
          nuevasCondiciones.push({
            estudianteId: String(e.id),
            esRepitente: e.esRepitente || false,
            descripcionRepitente: e.esRepitente ? (e.descripcionCondicion || '') : undefined,
            condicionInclusion: e.tieneCondicionEspecial && !e.esRepitente ? (e.descripcionCondicion || '') : undefined,
          });
        }
      });
      setCondiciones(nuevasCondiciones);
    } catch (error) {
      console.error("Error cargando condiciones:", error);
      setCondiciones([]);
    } finally {
      setLoadingCondiciones(false);
    }

  }, [rol]);
  /* Observaciones */
  const agregarObservacion = useCallback(async (obs: Omit<Observacion, "id">) => {
    try {
      setLoadingObservaciones(true);
      await observacionesAPI.crearObservacion({
        estudianteId: obs.estudianteId,
        tipo: obs.tipo,
        desc: obs.desc,
        autor: obs.autor,
        rol: obs.rol,
      });
      // No intentamos agregar "nueva" al estado porque la API no devuelve
      // el objeto completo con el shape de Observacion
      setObservaciones(prev => [...prev, { id: Date.now().toString(), ...obs }]);
    } catch (error) {
      console.error("Error creando observación:", error);
      throw error;
    } finally {
      setLoadingObservaciones(false);
    }
  }, []);

  function getObservacionesEstudiante(estudianteId: string) {
    return observaciones.filter(o => o.estudianteId === estudianteId);
  }

  /* Mensajes */
  const agregarMensaje = useCallback(async (msg: Omit<Mensaje, "id">) => {
    try {
      // Enviar mensaje al backend usando rol
      await mensajesAPI.enviarMensajePorRol({
        destinatarios: msg.para, // "docente", "coordinador", "todos", etc.
        asunto: msg.asunto,
        contenido: msg.contenido,
      });
      
      // Agregar localmente con ID generado por el backend
      const mensajeConId: Mensaje = {
        id: Math.random(), // Temporal hasta que backend retorne el ID real
        ...msg,
      };
      setMensajes(prev => [mensajeConId, ...prev]);
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      throw error;
    }
  }, []);

  const marcarMensajeLeido = useCallback(async (id: string | number) => {
    try {
      await mensajesAPI.marcarLeido(id);
      setMensajes(prev => prev.map(m => m.id === id ? { ...m, leido: true } : m));
    } catch (error) {
      console.error("Error marcando mensaje como leído:", error);
    }
  }, []);

  function getMensajesPara(rol: string) {
    return mensajes.filter(m => m.para === "todos" || m.para === rol);
  }

  function getMensajesNoLeidos(rol: string) {
    return getMensajesPara(rol).filter(m => !m.leido).length;
  }

  /* Alertas */
  const agregarAlerta = useCallback(async (alerta: Omit<Alerta, "id">) => {
    try {
      const nueva = await alertasAPI.crearAlerta(alerta);
      setAlertas(prev => [nueva, ...prev]);
    } catch (error) {
      console.error("Error creando alerta:", error);
      throw error;
    }
  }, []);

  const resolverAlerta = useCallback(async (id: number) => {
    try {
      await alertasAPI.resolverAlerta(id);
      setAlertas(prev => prev.map(a => a.id === id ? { ...a, estado: "resuelta" } : a));
    } catch (error) {
      console.error("Error resolviendo alerta:", error);
      throw error;
    }
  }, []);

  function getAlertasActivas() {
    return alertas.filter(a => a.estado === "activa");
  }

  /* Condiciones */
  const setCondicionEstudiante = useCallback(async (est: CondicionEstudiante) => {
    try {
      await estudiantesAPI.setCondicion(est.estudianteId, est);
      setCondiciones(prev => {
        const exists = prev.findIndex(c => c.estudianteId === est.estudianteId);
        if (exists >= 0) {
          const updated = [...prev];
          updated[exists] = est;
          return updated;
        }
        // Solo agregar si tiene condición activa
        if (est.esRepitente || est.condicionInclusion) {
          return [...prev, est];
        }
        // Si quitó la condición, remover del arreglo
        return prev.filter(c => c.estudianteId !== est.estudianteId);
      });
    } catch (error) {
      console.error("Error actualizando condición:", error);
      throw error;
    }
  }, []);

  function getCondicion(estudianteId: string) {
    return condiciones.find(c => c.estudianteId === estudianteId);
  }

  /* Asistencia */
  function getAsistenciaEstudiante(estudianteId: string) {
    return asistencia.filter(a => a.estudianteId === estudianteId);
  }

  return (
    <GESTAContext.Provider value={{
      perfilId,
      nombreCompleto,
      rol,
      observaciones, loadingObservaciones, agregarObservacion, getObservacionesEstudiante,
      mensajes, loadingMensajes, agregarMensaje, marcarMensajeLeido, getMensajesPara, getMensajesNoLeidos,
      alertas, loadingAlertas, agregarAlerta, resolverAlerta, getAlertasActivas,
      condiciones, setCondicionEstudiante, getCondicion,
      asistencia, loadingAsistencia, getAsistenciaEstudiante,
      cargarDatosIniciales,
    }}>
      {children}
    </GESTAContext.Provider>
  );
}

export function useGESTA() {
  const ctx = useContext(GESTAContext);
  if (!ctx) throw new Error("useGESTA must be used within GESTAProvider");
  return ctx;
}