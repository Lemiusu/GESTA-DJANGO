import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import {
  observacionesAPI,
  mensajesAPI,
  alertasAPI,
  estudiantesAPI,
} from "../services/api";

/* ─── TIPOS ─────────────────────────────────────────────────────── */
export type NivelRiesgo = "verde" | "amarillo" | "rojo";

export interface Observacion {
  id: number;
  estudianteId: number;
  tipo: string;
  desc: string;
  fecha: string;
  autor: string;
  rol: string;
}

export interface Mensaje {
  id: number;
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
  estudianteId: number;
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
  estudianteId: number;
  estado: "presente" | "ausente" | "justificado";
  motivo?: string;
}

/* ─── CONTEXT TYPE ───────────────────────────────────────────────── */
interface GESTAContextType {
  // Observaciones
  observaciones: Observacion[];
  loadingObservaciones: boolean;
  agregarObservacion: (obs: Omit<Observacion, "id">) => Promise<void>;
  getObservacionesEstudiante: (estudianteId: number) => Observacion[];

  // Mensajes
  mensajes: Mensaje[];
  loadingMensajes: boolean;
  agregarMensaje: (msg: Omit<Mensaje, "id">) => Promise<void>;
  marcarMensajeLeido: (id: number) => Promise<void>;
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
  getCondicion: (estudianteId: number) => CondicionEstudiante | undefined;

  // Asistencia
  asistencia: AsistenciaRegistro[];
  loadingAsistencia: boolean;
  getAsistenciaEstudiante: (estudianteId: number) => AsistenciaRegistro[];

  // Carga inicial
  cargarDatosIniciales: (rol: string) => Promise<void>;
}

/* ─── CONTEXT ────────────────────────────────────────────────────── */
const GESTAContext = createContext<GESTAContextType | null>(null);

export function GESTAProvider({ children }: { children: ReactNode }) {
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [condiciones, setCondiciones] = useState<CondicionEstudiante[]>([]);
  const [asistencia] = useState<AsistenciaRegistro[]>([]);

  // Estados de carga
  const [loadingObservaciones, setLoadingObservaciones] = useState(false);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const [loadingAsistencia] = useState(false);

  /* ─── Carga inicial de datos desde el backend ─── */
  const cargarDatosIniciales = useCallback(async (rol: string) => {
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
  }, []);

  /* Observaciones */
  const agregarObservacion = useCallback(async (obs: Omit<Observacion, "id">) => {
    try {
      setLoadingObservaciones(true);
      const nueva = await observacionesAPI.crearObservacion(obs);
      setObservaciones(prev => [...prev, nueva]);
    } catch (error) {
      console.error("Error creando observación:", error);
      throw error;
    } finally {
      setLoadingObservaciones(false);
    }
  }, []);

  function getObservacionesEstudiante(estudianteId: number) {
    return observaciones.filter(o => o.estudianteId === estudianteId);
  }

  /* Mensajes */
  const agregarMensaje = useCallback(async (msg: Omit<Mensaje, "id">) => {
    try {
      const nuevo = await mensajesAPI.enviarMensaje({
        destinatarios: msg.destinatarios ?? [msg.para],
        asunto: msg.asunto,
        contenido: msg.contenido,
      });
      setMensajes(prev => [nuevo, ...prev]);
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      throw error;
    }
  }, []);

  const marcarMensajeLeido = useCallback(async (id: number) => {
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
        return [...prev, est];
      });
    } catch (error) {
      console.error("Error actualizando condición:", error);
      throw error;
    }
  }, []);

  function getCondicion(estudianteId: number) {
    return condiciones.find(c => c.estudianteId === estudianteId);
  }

  /* Asistencia */
  function getAsistenciaEstudiante(estudianteId: number) {
    return asistencia.filter(a => a.estudianteId === estudianteId);
  }

  return (
    <GESTAContext.Provider value={{
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
