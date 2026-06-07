import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  C, S, Semaforo, Sidebar, BottomNav,
  NAV_DOCENTE, BOTTOM_NAV_DOCENTE,
  isMobileWidth,
} from "../../context/shared";
import { useAuth } from "../../context/AuthContext";
import { useGESTA } from "../../context/GESTAContext";
import { asistenciaAPI, mensajesAPI, docenteAPI } from "../../services/api";

/* ─── TIPOS ──────────────────────────────────────────────────────── */
interface EstudianteAsistencia {
  id: number;
  nombre: string;
  condicion: string | null;
}
interface CursoAsistencia {
  abierto: boolean;
  estudiantes: EstudianteAsistencia[];
}
interface HistorialEntry {
  fecha: string;
  curso: string;
  presentes: number;
  ausentes: number;
}

/* ─── BADGE CONDICIÓN ────────────────────────────────────────────── */
function BadgeCondicion({ tipo }: { tipo: string | null }) {
  if (!tipo) return null;
  const map: Record<string, { label: string; bg: string; color: string }> = {
    repitente: { label: "Rep", bg: "#fef3c7", color: "#92400e" },
    inclusion:  { label: "Inc", bg: "#ede9fe", color: "#5b21b6" },
  };
  const s = map[tipo];
  if (!s) return null;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: s.bg, color: s.color, marginLeft: 6, flexShrink: 0 }}>
      {s.label}
    </span>
  );
}

/* ─── BOTÓN P/A ──────────────────────────────────────────────────── */
function BtnEstado({ actual, valor, onClick, isMobile }: { actual: string; valor: string; onClick: () => void; isMobile: boolean }) {
  const map: Record<string, { activo: { bg: string; color: string; border: string }; label: string; full: string }> = {
    P: { activo: { bg: C.greenLight, color: C.green, border: "#86efac" }, label: "P", full: "Presente" },
    A: { activo: { bg: C.redLight,   color: C.red,   border: "#fca5a5" }, label: "A", full: "Ausente" },
  };
  const s = map[valor];
  const isActivo = actual === valor;
  return (
    <button onClick={onClick} style={{
      padding: isMobile ? "8px 0" : "4px 12px",
      borderRadius: 6, fontSize: isMobile ? 13 : 11,
      cursor: "pointer", fontWeight: 700,
      border: isActivo ? `1.5px solid ${s.activo.border}` : `1px solid ${C.gray200}`,
      background: isActivo ? s.activo.bg : C.white,
      color: isActivo ? s.activo.color : C.gray400,
      flex: isMobile ? 1 : "none",
      minWidth: isMobile ? 0 : 36,
      fontFamily: "inherit",
    }}>
      {isMobile ? s.full : s.label}
    </button>
  );
}

/* ─── MODAL CONFIRMAR ────────────────────────────────────────────── */
function ModalConfirmar({ curso, ausentes, onConfirm, onClose }: { curso: string; ausentes: number; onConfirm: () => void; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
      <div style={{ background: C.white, borderRadius: 16, padding: "28px", width: "100%", maxWidth: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: C.gray900 }}>Confirmar registro de asistencia</p>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: C.gray500 }}>
          Estás a punto de guardar la asistencia de <strong>{curso}</strong> para hoy.
        </p>
        {ausentes > 0 && (
          <div style={{ background: C.redLight, border: `1px solid #fca5a5`, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: C.red, fontWeight: 600 }}>
              Se notificará automáticamente a {ausentes} acudiente{ausentes > 1 ? "s" : ""} por inasistencia.
            </p>
          </div>
        )}
        <p style={{ margin: "0 0 20px", fontSize: 12, color: C.gray400 }}>
          Podrás modificar este registro solo dentro de las próximas 24 horas.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.white, color: C.gray700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: C.blue, color: C.white, fontSize: 13, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Guardar registro</button>
        </div>
      </div>
    </div>
  );
}

/* ─── STATS BAR ──────────────────────────────────────────────────── */
function StatsBar({ presentes, total, filtro, setFiltro, isMobile }: {
  presentes: number; total: number;
  filtro: string; setFiltro: (v: string) => void;
  isMobile: boolean;
}) {
  const ausentes = total - presentes;
  const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;
  const barColor = pct >= 90 ? "#16a34a" : pct >= 75 ? "#d97706" : C.red;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 20, flexWrap: "wrap" }}>
      {[
        { label: "Presentes", val: presentes, color: C.green },
        { label: "Ausentes",  val: ausentes,  color: C.red },
      ].map(s => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</span>
          <span style={{ fontSize: 12, color: C.gray500 }}>{s.label}</span>
        </div>
      ))}
      <div style={{ flex: 1, minWidth: 100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: C.gray400 }}>Asistencia hoy</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: C.gray200, borderRadius: 4 }}>
          <div style={{ height: 6, width: `${pct}%`, background: barColor, borderRadius: 4, transition: "width 0.3s" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[{ v: "todos", label: "Todos" }, { v: "P", label: "Presentes" }, { v: "A", label: "Ausentes" }].map(f => (
          <button key={f.v} onClick={() => setFiltro(f.v)} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${filtro === f.v ? C.blue : C.gray200}`, background: filtro === f.v ? C.blueLight : C.white, color: filtro === f.v ? C.blue : C.gray500, fontSize: 11, cursor: "pointer", fontWeight: filtro === f.v ? 600 : 400, fontFamily: "inherit" }}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── CONTENIDO CURSO ────────────────────────────────────────────── */
function ContenidoCurso({ cursoId, nombreCurso, data, isMobile, onError, onSuccess }: {
  cursoId: number;
  nombreCurso: string;
  data: CursoAsistencia;
  isMobile: boolean;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [estados, setEstados] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    data.estudiantes.forEach(e => { init[e.id] = "P"; });
    return init;
  });
  const [guardado, setGuardado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [modal,    setModal]    = useState(false);
  const [filtro,   setFiltro]   = useState("todos");
  const [guardando, setGuardando] = useState(false); // ← nuevo: estado de carga

  const setEstado   = (id: number, val: string) => { if (!guardado) setEstados(prev => ({ ...prev, [id]: val })); };
  const marcarTodos = (val: string) => {
    if (guardado) return;
    const nuevo: Record<number, string> = {};
    data.estudiantes.forEach(e => { nuevo[e.id] = val; });
    setEstados(nuevo);
  };

  const presentes  = Object.values(estados).filter(v => v === "P").length;
  const ausentes   = Object.values(estados).filter(v => v === "A").length;
  const filtrados  = data.estudiantes.filter(e => filtro === "todos" || estados[e.id] === filtro);

  const guardarRegistro = async () => {
    setCargando(true);
    try {
      const registros = Object.entries(estados).map(([estudianteId, estado]) => ({
        estudianteId,
        estado: estado === "P" ? "presente" : "ausente",
      }));

      await asistenciaAPI.guardarRegistro(String(cursoId), registros);
      
      // Enviar notificaciones a acudientes de estudiantes ausentes
      const estudiantesAusentes = Object.entries(estados)
        .filter(([_, estado]) => estado === "A")
        .map(([estudianteId]) => {
          const est = data.estudiantes.find(e => String(e.id) === estudianteId);
          return est;
        })
        .filter(Boolean);

      if (estudiantesAusentes.length > 0) {
        const nombresAusentes = estudiantesAusentes.map(e => e!.nombre).join(", ");
        try {
          await mensajesAPI.enviarMensaje({
            destinatarios: ["acudiente"], // Se enviará a acudientes de los estudiantes
            asunto: `Notificación de inasistencia - ${nombreCurso}`,
            contenido: `Se registró inasistencia para los siguientes estudiantes el ${new Date().toLocaleDateString('es-CO')}: ${nombresAusentes}. Por favor, contacte al docente si tiene alguna inquietud.`,
          });
        } catch (notifError) {
          console.warn("No se pudieron enviar notificaciones a acudientes:", notifError);
          // No lanzar error aquí para no afectar el guardado exitoso de asistencia
        }
      }

      setGuardado(true);
      setModal(false);
      onSuccess(`Asistencia de ${nombreCurso} guardada exitosamente`);
    } catch (error: any) {
      const errorMsg = error?.message || "Error al guardar asistencia";
      onError(errorMsg);
      console.error("Error guardando asistencia:", error);
    } finally {
      setCargando(false);
    }
  };

  if (isMobile) {
    return (
      <div style={{ borderTop: `1px solid ${C.gray100}` }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.gray100}` }}>
          <StatsBar presentes={presentes} total={data.estudiantes.length} filtro={filtro} setFiltro={setFiltro} isMobile={true} />
          {!guardado ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => marcarTodos("P")} disabled={cargando} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.greenLight, color: C.green, fontSize: 12, cursor: cargando ? "not-allowed" : "pointer", fontWeight: 600, fontFamily: "inherit", opacity: cargando ? 0.6 : 1 }}>
                Todos presentes
              </button>
              <button onClick={() => setModal(true)} disabled={cargando} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: C.blue, color: C.white, fontSize: 12, cursor: cargando ? "not-allowed" : "pointer", fontWeight: 600, fontFamily: "inherit", opacity: cargando ? 0.6 : 1 }}>
                {cargando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <span style={{ fontSize: 12, background: C.greenLight, color: C.green, padding: "5px 16px", borderRadius: 20, fontWeight: 600 }}>✓ Registro guardado</span>
            </div>
          )}
        </div>

        {filtrados.map((est, i) => (
          <div key={est.id} style={{ padding: "12px 14px", borderBottom: i < filtrados.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.blueLight, color: C.blueText, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {est.nombre.split(" ").map(p => p[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.gray800 }}>{est.nombre}</span>
                  <BadgeCondicion tipo={est.condicion} />
                </div>
                <span style={{ fontSize: 11, color: estados[est.id] === "P" ? C.green : C.red }}>
                  {estados[est.id] === "P" ? "Presente" : "Ausente"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["P", "A"].map(v => (
                <BtnEstado key={v} actual={estados[est.id]} valor={v} onClick={() => setEstado(est.id, v)} isMobile={true} />
              ))}
            </div>
          </div>
        ))}
        {modal && <ModalConfirmar curso={nombreCurso} ausentes={ausentes} onConfirm={guardarRegistro} onClose={() => !cargando && setModal(false)} />}
      </div>
    );
  }

  /* DESKTOP */
  return (
    <div style={{ borderTop: `1px solid ${C.gray100}` }}>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.gray100}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <StatsBar presentes={presentes} total={data.estudiantes.length} filtro={filtro} setFiltro={setFiltro} isMobile={false} />
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {guardado ? (
            <span style={{ fontSize: 12, background: C.greenLight, color: C.green, padding: "5px 14px", borderRadius: 20, fontWeight: 600 }}>✓ Registro guardado</span>
          ) : (
            <>
              <button onClick={() => marcarTodos("P")} disabled={cargando} style={{ ...S.btnSm, opacity: cargando ? 0.6 : 1, cursor: cargando ? "not-allowed" : "pointer" }}>Todos presentes</button>
              <button onClick={() => marcarTodos("A")} disabled={cargando} style={{ ...S.btnSm, opacity: cargando ? 0.6 : 1, cursor: cargando ? "not-allowed" : "pointer" }}>Todos ausentes</button>
              <button onClick={() => setModal(true)} disabled={cargando} style={{ ...S.btnPrimary, opacity: cargando ? 0.6 : 1, cursor: cargando ? "not-allowed" : "pointer" }}>{cargando ? "Guardando..." : "Guardar registro"}</button>
            </>
          )}
        </div>
      </div>

      <table style={S.table}>
        <thead>
          <tr>
            {["#", "Estudiante", "Estado", "Resultado"].map(h => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtrados.map((est, i) => (
            <tr key={est.id} style={{ borderBottom: `1px solid ${C.gray100}`, background: i % 2 === 0 ? C.white : C.gray50 }}>
              <td style={{ ...S.td, color: C.gray400, width: 40 }}>{String(est.id).padStart(2, "0")}</td>
              <td style={S.td}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.blueLight, color: C.blueText, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {est.nombre.split(" ").map(p => p[0]).join("").slice(0, 2)}
                  </div>
                  <span style={{ fontWeight: 500, color: C.gray800 }}>{est.nombre}</span>
                  <BadgeCondicion tipo={est.condicion} />
                </div>
              </td>
              <td style={S.td}>
                <div style={{ display: "flex", gap: 6 }}>
                  {["P", "A"].map(v => (
                    <BtnEstado key={v} actual={estados[est.id]} valor={v} onClick={() => setEstado(est.id, v)} isMobile={false} />
                  ))}
                </div>
              </td>
              <td style={S.td}>
                <span style={{ fontSize: 12, fontWeight: 600, color: estados[est.id] === "P" ? C.green : C.red }}>
                  {estados[est.id] === "P" ? "Presente" : "Ausente — Se notificará al acudiente"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && <ModalConfirmar curso={nombreCurso} ausentes={ausentes} onConfirm={guardarRegistro} onClose={() => !cargando && setModal(false)} />}
    </div>
  );
}

/* ─── ACORDEÓN CURSO ─────────────────────────────────────────────── */
function AcordeonCurso({ cursoId, nombre, data, onToggle, isMobile, onError, onSuccess }: {
  cursoId: number;
  nombre: string;
  data: CursoAsistencia;
  onToggle: () => void;
  isMobile: boolean;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12, overflow: "hidden", marginBottom: isMobile ? 10 : 12 }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 14px" : "14px 20px", background: C.white, border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: C.blueLight, color: C.blueText, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {nombre.replace("Grado ", "G")}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, fontWeight: 600, color: C.gray800 }}>{nombre}</p>
            <p style={{ margin: 0, fontSize: 11, color: C.gray400 }}>{data.estudiantes.length} estudiantes matriculados</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!data.abierto && !isMobile && (
            <span style={{ fontSize: 11, color: C.gray400 }}>Clic para registrar asistencia</span>
          )}
          <div style={{ width: 28, height: 28, borderRadius: 6, background: C.gray100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.gray500, flexShrink: 0 }}>
            {data.abierto ? "▲" : "▼"}
          </div>
        </div>
      </button>
      {data.abierto && <ContenidoCurso cursoId={cursoId} nombreCurso={nombre} data={data} isMobile={isMobile} onError={onError} onSuccess={onSuccess} />}
    </div>
  );
}

/* ─── PANEL HISTORIAL ────────────────────────────────────────────── */
function PanelHistorial({ historial, isMobile, nombreCurso }: { historial: HistorialEntry[]; isMobile: boolean; nombreCurso?: string }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.gray100}` }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.gray800 }}>Historial reciente {nombreCurso ? `— ${nombreCurso}` : ""}</p>
      </div>
      {historial.length === 0 ? (
        <div style={{ padding: "24px", textAlign: "center", color: C.gray400, fontSize: 13 }}>Sin historial de asistencia disponible.</div>
      ) : isMobile ? (
        <div>
          {historial.map((h, i) => {
            const total = h.presentes + h.ausentes;
            const pct   = total > 0 ? Math.round((h.presentes / total) * 100) : 0;
            const color = pct >= 90 ? C.green : pct >= 75 ? "#d97706" : C.red;
            return (
              <div key={i} style={{ padding: "12px 14px", borderBottom: i < historial.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.gray800 }}>{h.fecha}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{pct}%</span>
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: C.green,  fontWeight: 600 }}>{h.presentes} presentes</span>
                  <span style={{ fontSize: 12, color: C.red,    fontWeight: 600 }}>{h.ausentes} ausentes</span>
                </div>
                <div style={{ height: 6, background: C.gray200, borderRadius: 4 }}>
                  <div style={{ width: `${pct}%`, height: 6, background: color, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              {["Fecha", "Presentes", "Ausentes", "Asistencia"].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {historial.map((h, i) => {
              const total = h.presentes + h.ausentes;
              const pct   = total > 0 ? Math.round((h.presentes / total) * 100) : 0;
              const color = pct >= 90 ? C.green : pct >= 75 ? "#d97706" : C.red;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                  <td style={{ ...S.td, color: C.gray700 }}>{h.fecha}</td>
                  <td style={{ ...S.td, color: C.green,  fontWeight: 600 }}>{h.presentes}</td>
                  <td style={{ ...S.td, color: C.red,    fontWeight: 600 }}>{h.ausentes}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 80, height: 6, background: C.gray200, borderRadius: 4 }}>
                        <div style={{ width: `${pct}%`, height: 6, background: color, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────────────────────── */
export default function RegistroAsistencia() {
  const navigate  = useNavigate();
  const auth = useAuth();
  const gesta = useGESTA();
  const [navActivo, setNavActivo] = useState("asistencia");

  // Estado local para la UI
  const [cursos, setCursos] = useState<Record<string, CursoAsistencia>>({});
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [tab, setTab] = useState("hoy");
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const breakpoint = 1280; 
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        // ✅ Primero obtenemos los cursos del docente para tener los IDs reales
        const cursosData = await docenteAPI.getCursos();
        if (!cursosData || cursosData.length === 0) return;

        // ✅ Cargamos asistencia de hoy para cada curso
        const cursosAsistencia: Record<string, CursoAsistencia & { id: number }> = {};
        for (const curso of cursosData) {
          try {
            const data = await asistenciaAPI.getRegistroHoy(curso.id);
            // El backend devuelve { [nombreCurso]: { abierto, estudiantes } }
            const entry = data[curso.nombre];
            if (entry) {
              cursosAsistencia[curso.nombre] = {
                id: curso.id,
                abierto: false,
                estudiantes: entry.estudiantes || [],
              };
            }
          } catch {
            cursosAsistencia[curso.nombre] = {
              id: curso.id,
              abierto: false,
              estudiantes: curso.estudiantes || [],
            };
          }
        }
        setCursos(cursosAsistencia);

        const historialPromises = cursosData.map((curso: any) =>
          asistenciaAPI.getHistorial(curso.id).catch(() => [])
        );
        const historialPorCurso = await Promise.all(historialPromises);
        const historialData = historialPorCurso
          .flat()
          .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        setHistorial(historialData as HistorialEntry[]);
      } catch (err) {
        console.warn("No se pudieron cargar los datos de asistencia:", err);
      }
    }
    fetchData();
  }, []);

  const ir = (ruta: string, id?: string) => { if (id) setNavActivo(id); navigate(`/dashboard/${ruta}`); };

  const toggleCurso = (nombre: string) => {
    setCursos(prev => ({ ...prev, [nombre]: { ...prev[nombre], abierto: !prev[nombre].abierto } }));
  };

  const handleError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  const handleSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 5000);
  };

  const nombreDocente = auth.nombreCompleto();
  const primerCurso = Object.keys(cursos)[0];

  return (
    <div style={{ display: "flex", height: "100vh", background: C.gray100, fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 14, overflow: "hidden" }}>
      {!isMobile && (
        <Sidebar navGroups={NAV_DOCENTE} navActivo={navActivo} onNav={ir} usuario={nombreDocente} subUsuario="Docente Titular · 6-9" />
      )}

      <div style={S.main}>
        {/* Topbar */}
        <header style={{ ...S.topbar, padding: isMobile ? "10px 16px" : "10px 24px" }}>
          {isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={S.logoIcon}>G</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.gray900 }}>Asistencia</p>
                <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>Registro del día</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray900 }}>Registro de asistencia</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Colegio Integrado de Fontibón IBEP · Jornada mañana · Periodo 2</p>
            </div>
          )}
          <span style={{ background: C.blueLight, color: C.blueText, fontSize: isMobile ? 11 : 12, padding: isMobile ? "3px 8px" : "4px 12px", borderRadius: 12, fontWeight: 600 }}>
            3 alertas activas
          </span>
        </header>

        {/* Content */}
        <main style={{ ...S.content, padding: isMobile ? "12px" : "20px 24px" }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.gray200}`, marginBottom: 16 }}>
            {[{ id: "hoy", label: "Registro de hoy" }, { id: "historial", label: "Historial" }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 18px", fontSize: 13, cursor: "pointer", background: "transparent", border: "none", borderBottom: tab === t.id ? `2px solid ${C.blue}` : "2px solid transparent", color: tab === t.id ? C.blue : C.gray500, fontWeight: tab === t.id ? 600 : 400, marginBottom: -1, fontFamily: "inherit" }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "hoy" && (
            <div>
              {error && (
                <div style={{ background: C.redLight, border: `1px solid #fca5a5`, borderRadius: 8, padding: "12px 14px", marginBottom: 16, color: C.red, fontSize: 13 }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ background: C.greenLight, border: `1px solid #86efac`, borderRadius: 8, padding: "12px 14px", marginBottom: 16, color: C.green, fontSize: 13 }}>
                  {success}
                </div>
              )}
              {Object.entries(cursos).map(([nombre, data]) => (
                <AcordeonCurso
                  key={nombre}
                  cursoId={(data as any).id}
                  nombre={nombre}
                  data={data}
                  onToggle={() => toggleCurso(nombre)}
                  isMobile={isMobile}
                  onError={setError}
                  onSuccess={setSuccess}
                />
              ))}
              {Object.keys(cursos).length === 0 && (
                <div style={{ padding: "24px", textAlign: "center", color: C.gray400, fontSize: 13 }}>Sin cursos disponibles hasta que el backend esté conectado.</div>
              )}
            </div>
          )}
          {tab === "historial" && <PanelHistorial historial={historial} isMobile={isMobile} nombreCurso={primerCurso} />}
        </main>

        {isMobile && (
          <BottomNav items={BOTTOM_NAV_DOCENTE} navActivo={navActivo} onNav={ir} />
        )}
      </div>
    </div>
  );
}