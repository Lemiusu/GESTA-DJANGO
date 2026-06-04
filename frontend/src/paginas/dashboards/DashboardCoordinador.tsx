import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGESTA } from "../../context/GESTAContext";
import {
  C, S, SM, Semaforo, Avatar, Sidebar, BottomNav, CardSeccion,
  IcoHome, IcoUsers, IcoBell, IcoEye, IcoMsg,
  NAV_COORDINADOR, BOTTOM_NAV_COORDINADOR,
  isMobileWidth,
} from "../../context/shared";
import { coordinadorAPI, asistenciaAPI, observacionesAPI, estudiantesAPI } from "../../services/api";

/* ─── TIPOS ─────────────────────────────────────────────────────── */
interface CursoGrado {
  nombre: string;
  total: number;
  verde: number;
  amarillo: number;
  rojo: number;
}

interface GradoStats {
  grado: string;
  total: number;
  verde: number;
  amarillo: number;
  rojo: number;
  cursos: CursoGrado[];
}

interface AsistenciaGrado {
  grado: string;
  presentes: number;
  total: number;
}

interface AsistenciaEstudiante {
  nombre: string;
  estado: "presente" | "ausente" | "justificado";
}

interface ObservacionReciente {
  nombre: string;
  grado: string;
  tipo: string;
  descripcion: string;
  fecha: string;
  autor: string;
}

interface EstudianteData {
  id: number;
  nombre: string;
  grado: string;
  riesgo: string;
}

// Mapa de grado → prefijo numérico para filtrar
const GRADO_PREFIJO: Record<string, string> = {
  "Grado 6": "6", "Grado 7": "7", "Grado 8": "8",
  "Grado 9": "9", "Grado 10": "10", "Grado 11": "11",
};

/* ─── SUBCOMPONENTES ─────────────────────────────────────────────── */
function BarraDistribucion({ verde, amarillo, rojo, total }: { verde: number; amarillo: number; rojo: number; total: number }) {
  return (
    <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", width: "100%", gap: 1 }}>
      <div style={{ width: `${Math.round((verde / total) * 100)}%`, background: "#16a34a" }} />
      <div style={{ width: `${Math.round((amarillo / total) * 100)}%`, background: "#d97706" }} />
      <div style={{ width: `${Math.round((rojo / total) * 100)}%`, background: "#dc2626" }} />
    </div>
  );
}

function ContenidoEstadoGrados({ isMobile, gradosStats, estudiantesData }: { isMobile: boolean; gradosStats: GradoStats[]; estudiantesData: EstudianteData[] }) {
  const navigate = useNavigate();
  const [gradoFiltro, setGradoFiltro] = useState("Todos los grados");
  const [periodo, setPeriodo] = useState("Periodo 2 · 2025");
  const [detalleGrado, setDetalleGrado] = useState<string | null>(null);

  const filtrado = gradoFiltro === "Todos los grados"
    ? gradosStats
    : gradosStats.filter(g => g.grado === gradoFiltro);

  function getEstudiantesGrado(gradoLabel: string) {
    const prefijo = GRADO_PREFIJO[gradoLabel];
    if (!prefijo) return [];
    return estudiantesData.filter(e => e.grado.startsWith(prefijo));
  }

  function irAPerfil(estudianteId: number) {
    navigate("/dashboard/estudiantes-coordinador", { state: { perfilId: estudianteId } });
  }

  const SEM_CONFIG = [
    { nivel: "rojo", label: "En riesgo", bg: "#fee2e2", color: "#b91c1c", dot: "#dc2626" },
    { nivel: "amarillo", label: "En seguimiento", bg: "#fef3c7", color: "#92400e", dot: "#d97706" },
    { nivel: "verde", label: "En regla", bg: "#dcfce7", color: "#15803d", dot: "#16a34a" },
  ];

  if (isMobile) return (
    <div style={{ padding: "10px 14px" }}>
      <select value={gradoFiltro} onChange={e => setGradoFiltro(e.target.value)} style={{ ...S.select, width: "100%", marginBottom: 10 }}>
        <option>Todos los grados</option>
        {gradosStats.map(g => <option key={g.grado}>{g.grado}</option>)}
      </select>
      {filtrado.map((g, i) => {
        const pV = Math.round((g.verde / g.total) * 100);
        const pA = Math.round((g.amarillo / g.total) * 100);
        const pR = Math.round((g.rojo / g.total) * 100);
        const abierto = detalleGrado === g.grado;
        const estudiantes = getEstudiantesGrado(g.grado);
        return (
          <div key={g.grado} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < filtrado.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.gray800 }}>{g.grado}</span>
              <span style={{ fontSize: 11, color: C.gray500 }}>{g.total} estudiantes</span>
            </div>
            <BarraDistribucion verde={g.verde} amarillo={g.amarillo} rojo={g.rojo} total={g.total} />
            <div style={{ display: "flex", gap: 12, marginTop: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>{g.verde} ({pV}%)</span>
              <span style={{ fontSize: 11, color: "#d97706", fontWeight: 600 }}>{g.amarillo} ({pA}%)</span>
              <span style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>{g.rojo} ({pR}%)</span>
            </div>

            {/* SECCIÓN DE CURSOS MÓVIL */}
            {g.cursos && (
              <div style={{ marginTop: 8, marginBottom: 10, padding: "10px", background: C.gray50, borderRadius: 8, border: `1px solid ${C.gray200}` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.gray700, marginBottom: 8, display: "block" }}>Detalle por cursos:</span>
                {g.cursos.map(c => (
                  <div key={c.nombre} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.gray700, marginBottom: 6, paddingBottom: 6, borderBottom: `1px dashed ${C.gray200}` }}>
                    <span style={{ fontWeight: 600 }}>Curso {c.nombre} <span style={{ fontWeight: 400, color: C.gray400 }}>({c.total} est.)</span></span>
                    <div style={{ display: "flex", gap: 8, fontWeight: 600 }}>
                      <span style={{ color: C.green }}>{c.verde}</span>
                      <span style={{ color: "#d97706" }}>{c.amarillo}</span>
                      <span style={{ color: C.red }}>{c.rojo}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setDetalleGrado(abierto ? null : g.grado)}
              style={{ width: "100%", padding: "6px", borderRadius: 6, border: `1px solid ${C.gray200}`, background: abierto ? C.blueLight : C.white, color: abierto ? C.blue : C.gray700, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
            >
              {abierto ? "Ocultar estudiantes ▲" : "Ver estudiantes ▼"}
            </button>
            {abierto && (
              <div style={{ marginTop: 8, border: `1px solid ${C.gray200}`, borderRadius: 8, overflow: "hidden" }}>
                {SEM_CONFIG.map(s => {
                  const grupo = estudiantes.filter(e => e.riesgo === s.nivel);
                  if (grupo.length === 0) return null;
                  return (
                    <div key={s.nivel}>
                      <div style={{ padding: "6px 12px", background: s.bg, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0, display: "inline-block" }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{s.label} ({grupo.length})</span>
                      </div>
                      {grupo.map((est, j) => (
                        <div key={est.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: j < grupo.length - 1 ? `1px solid ${C.gray100}` : "none", background: C.white }}>
                          <span style={{ fontSize: 12, color: C.gray800, fontWeight: 500 }}>{est.nombre}</span>
                          <button onClick={() => irAPerfil(est.id)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, border: `1px solid ${C.blue}`, background: C.blueLight, color: C.blue, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                            Ver perfil →
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // DESKTOP
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${C.gray100}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {[{ color: "#16a34a", label: "Verde — en regla" }, { color: "#d97706", label: "Amarillo — seguimiento" }, { color: "#dc2626", label: "Rojo — en riesgo" }].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: C.gray500 }}>{l.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={S.select}>
            <option>Periodo 2 · 2025</option><option>Periodo 1 · 2025</option>
          </select>
          <select value={gradoFiltro} onChange={e => setGradoFiltro(e.target.value)} style={S.select}>
            <option>Todos los grados</option>
            {gradosStats.map(g => <option key={g.grado}>{g.grado}</option>)}
          </select>
        </div>
      </div>

      <table style={S.table}>
        <thead>
          <tr>{["Grado", "Total", "Verde", "Amarillo", "Rojo", "Distribución", ""].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {filtrado.map((g, i) => {
            const pV = Math.round((g.verde / g.total) * 100);
            const pA = Math.round((g.amarillo / g.total) * 100);
            const pR = Math.round((g.rojo / g.total) * 100);
            const abierto = detalleGrado === g.grado;
            const estudiantes = getEstudiantesGrado(g.grado);
            return (
              <React.Fragment key={g.grado}>
                <tr style={{ background: i % 2 === 0 ? C.white : C.gray50 }}>
                  <td style={{ ...S.td, fontWeight: 600, color: C.gray800 }}>{g.grado}</td>
                  <td style={S.td}>{g.total}</td>
                  <td style={{ ...S.td, color: C.green, fontWeight: 600 }}>{g.verde} <span style={{ color: C.gray400, fontWeight: 400 }}>({pV}%)</span></td>
                  <td style={{ ...S.td, color: "#d97706", fontWeight: 600 }}>{g.amarillo} <span style={{ color: C.gray400, fontWeight: 400 }}>({pA}%)</span></td>
                  <td style={{ ...S.td, color: C.red, fontWeight: 600 }}>{g.rojo} <span style={{ color: C.gray400, fontWeight: 400 }}>({pR}%)</span></td>
                  <td style={{ ...S.td, minWidth: 160 }}><BarraDistribucion verde={g.verde} amarillo={g.amarillo} rojo={g.rojo} total={g.total} /></td>
                  <td style={S.td}>
                    <button
                      onClick={() => setDetalleGrado(abierto ? null : g.grado)}
                      style={{ ...S.btnSm, color: abierto ? C.blue : C.gray700, background: abierto ? C.blueLight : C.white, borderColor: abierto ? C.blue : C.gray200 }}
                    >
                      {abierto ? "Ocultar ▲" : "Ver detalle ▼"}
                    </button>
                  </td>
                </tr>

                {abierto && (
                  <tr key={`${g.grado}-detalle`}>
                    <td colSpan={7} style={{ padding: 0, background: C.gray50 }}>
                      <div style={{ padding: "16px", borderBottom: `1px solid ${C.gray200}` }}>

                        {/* SECCIÓN 1: DETALLE DE CURSOS DESKTOP */}
                        {g.cursos && (
                          <div style={{ marginBottom: 20 }}>
                            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: C.gray700 }}>Distribución por Cursos</p>
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                              {g.cursos.map(c => (
                                <div key={c.nombre} style={{ background: C.white, border: `1px solid ${C.gray200}`, padding: "10px 14px", borderRadius: 8, flex: "1 1 200px", minWidth: 200 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: C.gray800 }}>Curso {c.nombre}</span>
                                    <span style={{ fontSize: 11, color: C.gray500 }}>{c.total} est.</span>
                                  </div>
                                  <BarraDistribucion verde={c.verde} amarillo={c.amarillo} rojo={c.rojo} total={c.total} />
                                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, fontWeight: 600 }}>
                                    <span style={{ color: C.green }}>{c.verde}</span>
                                    <span style={{ color: "#d97706" }}>{c.amarillo}</span>
                                    <span style={{ color: C.red }}>{c.rojo}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* SECCIÓN 2: LISTA DE ESTUDIANTES DESKTOP */}
                        <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: C.gray700 }}>Estudiantes en Seguimiento</p>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {SEM_CONFIG.map(s => {
                            const grupo = estudiantes.filter(e => e.riesgo === s.nivel);
                            if (grupo.length === 0) return null;
                            return (
                              <div key={s.nivel} style={{ flex: "1 1 180px", border: `1px solid ${C.gray200}`, borderRadius: 8, overflow: "hidden", minWidth: 180 }}>
                                <div style={{ padding: "7px 12px", background: s.bg, display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0, display: "inline-block" }} />
                                  <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.label} — {grupo.length}</span>
                                </div>
                                {grupo.map((est, j) => (
                                  <div key={est.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: C.white, borderBottom: j < grupo.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
                                    <span style={{ fontSize: 12, color: C.gray800 }}>{est.nombre}</span>
                                    <button onClick={() => irAPerfil(est.id)} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, border: `1px solid ${C.blue}`, background: C.blueLight, color: C.blue, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, flexShrink: 0 }}>
                                      Ver perfil →
                                    </button>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
function ContenidoAsistencia({ isMobile, asistenciaGrados, asistenciaEstudiantes }: { isMobile: boolean; asistenciaGrados: AsistenciaGrado[]; asistenciaEstudiantes: Record<string, AsistenciaEstudiante[]> }) {
  const [detalleGrado, setDetalleGrado] = useState<string | null>(null);

  const EST_CONFIG = [
    { estado: "presente", label: "Presentes", bg: "#dcfce7", color: "#15803d", dot: "#16a34a" },
    { estado: "ausente", label: "Ausentes", bg: "#fee2e2", color: "#b91c1c", dot: "#dc2626" },
    { estado: "justificado", label: "Justificados", bg: "#fef3c7", color: "#92400e", dot: "#d97706" },
  ] as const;

  return (
    <div style={{ padding: isMobile ? "8px 14px" : "8px 16px" }}>
      {asistenciaGrados.map((g, i) => {
        const pct = Math.round((g.presentes / g.total) * 100);
        const nivel = pct >= 90 ? "verde" : pct >= 80 ? "amarillo" : "rojo";
        const barColor = nivel === "verde" ? C.green : nivel === "amarillo" ? "#d97706" : C.red;
        const abierto = detalleGrado === g.grado;
        const ests = asistenciaEstudiantes[g.grado] || [];

        return (
          <div key={g.grado} style={{ borderBottom: i < asistenciaGrados.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
            {/* Fila principal con barra */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0" }}>
              <div style={{ width: isMobile ? 60 : 70, fontSize: 13, fontWeight: 600, color: C.gray800, flexShrink: 0 }}>
                Grado {g.grado}
              </div>
              <div style={{ flex: 1, background: C.gray200, borderRadius: 4, height: 8 }}>
                <div style={{ width: `${pct}%`, background: barColor, height: 8, borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 12, color: C.gray700, minWidth: isMobile ? 70 : 110, textAlign: "right" }}>
                {g.presentes}/{g.total} pres.
              </div>
              <Semaforo nivel={nivel} label={`${pct}%`} />
              <button
                onClick={() => setDetalleGrado(abierto ? null : g.grado)}
                style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, border: `1px solid ${abierto ? C.blue : C.gray200}`, background: abierto ? C.blueLight : C.white, color: abierto ? C.blue : C.gray500, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, flexShrink: 0 }}
              >
                {abierto ? "▲" : "▼"}
              </button>
            </div>

            {/* Desplegable de estudiantes */}
            {abierto && (
              <div style={{ marginBottom: 12, border: `1px solid ${C.gray200}`, borderRadius: 8, overflow: "hidden" }}>
                {EST_CONFIG.map(s => {
                  const grupo = ests.filter(e => e.estado === s.estado);
                  if (grupo.length === 0) return null;
                  return (
                    <div key={s.estado}>
                      {/* Encabezado del grupo */}
                      <div style={{ padding: "6px 12px", background: s.bg, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0, display: "inline-block" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>
                          {s.label} — {grupo.length}
                        </span>
                      </div>
                      {/* Lista de estudiantes */}
                      {grupo.map((est, j) => (
                        <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "8px 12px" : "7px 12px", background: C.white, borderBottom: j < grupo.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.blueLight, color: C.blueText, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {est.nombre.split(" ").map(p => p[0]).join("").slice(0, 2)}
                          </div>
                          <span style={{ fontSize: 12, color: C.gray800, flex: 1 }}>{est.nombre}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: s.bg, color: s.color }}>
                            {s.label.slice(0, -1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ContenidoAlertas({ isMobile }: { isMobile: boolean }) {
  const { getAlertasActivas, resolverAlerta } = useGESTA();
  const alertas = getAlertasActivas();
  if (alertas.length === 0) return (
    <div style={{ padding: "24px", textAlign: "center", color: C.gray400, fontSize: 13 }}>No hay alertas activas.</div>
  );
  return (
    <div>
      {alertas.map((a, i) => (
        <div key={a.id} style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 10, padding: isMobile ? "12px 14px" : "12px 16px", borderBottom: i < alertas.length - 1 ? `1px solid ${C.gray100}` : "none", flexDirection: isMobile ? "column" : "row" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Semaforo nivel="rojo" label="Activa" />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.gray800 }}>{a.nombreEstudiante} · Grado {a.grado}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>{a.tipo} · {a.fecha}</p>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: C.gray400 }}>{a.motivo}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => resolverAlerta(a.id)} style={S.btnSm}>Resolver</button>
            <button style={S.btnPrimary}>Intervenir</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContenidoObservaciones({ isMobile, observacionesRecientes }: { isMobile: boolean; observacionesRecientes: ObservacionReciente[] }) {
  const tipoColor: Record<string, { bg: string; color: string }> = {
    Disciplinaria: { bg: C.redLight, color: C.red },
    Academica: { bg: C.amberLight, color: C.amber },
    Seguimiento: { bg: C.blueLight, color: C.blueText },
    Logro: { bg: C.greenLight, color: C.green },
  };
  return (
    <div>
      {observacionesRecientes.map((o, i) => {
        const c = tipoColor[o.tipo] || tipoColor.Seguimiento;
        return (
          <div key={i} style={{ padding: isMobile ? "12px 14px" : "12px 16px", borderBottom: i < observacionesRecientes.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.gray800 }}>{o.nombre} · Grado {o.grado}</p>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: c.bg, color: c.color, fontWeight: 600 }}>{o.tipo}</span>
              </div>
              <span style={{ fontSize: 11, color: C.gray400, flexShrink: 0, marginLeft: 8 }}>{o.fecha}</span>
            </div>
            <p style={{ margin: "0 0 2px", fontSize: 13, color: C.gray700 }}>{o.descripcion}</p>
            <p style={{ margin: 0, fontSize: 11, color: C.gray400 }}>{o.autor}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────────────────────── */
export default function DashboardCoordinador() {
  const navigate = useNavigate();
  const { getAlertasActivas, getMensajesNoLeidos } = useGESTA();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const breakpoint = 1280;

    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [navActivo, setNavActivo] = useState("inicio");
  const [secciones, setSecciones] = useState({ estado: true, asistencia: false, alertas: false, observaciones: false });

  // TODO: Reemplazar con datos del usuario autenticado (context/prop)
  const userName = "";
  const userRole = "Coordinador";

  // TODO: Reemplazar con coordinadorAPI.getEstadoGrados() cuando el backend esté conectado
  const [gradosStats, setGradosStats] = useState<GradoStats[]>([]);
  // TODO: Reemplazar con asistenciaAPI.getAsistenciaGrados() cuando el backend esté conectado
  const [asistenciaGrados, setAsistenciaGrados] = useState<AsistenciaGrado[]>([]);
  // TODO: Reemplazar con asistenciaAPI.getRegistroHoy(cursoId) cuando el backend esté conectado
  const [asistenciaEstudiantes, setAsistenciaEstudiantes] = useState<Record<string, AsistenciaEstudiante[]>>({});
  // TODO: Reemplazar con observacionesAPI.getObservacionesRecientes() cuando el backend esté conectado
  const [observacionesRecientes, setObservacionesRecientes] = useState<ObservacionReciente[]>([]);
  // TODO: Reemplazar con estudiantesAPI.getEstudiantes() cuando el backend esté conectado
  const [estudiantesData, setEstudiantesData] = useState<EstudianteData[]>([]);
  // TODO: Reemplazar con coordinadorAPI.getDashboard() cuando el backend esté conectado
  const [asistenciaPromedio, setAsistenciaPromedio] = useState("");

  useEffect(() => {
    async function fetchEstadoGrados() {
      try {
        const data = await coordinadorAPI.getEstadoGrados();
        setGradosStats(data as GradoStats[]);
      } catch (err) {
        console.warn("DashboardCoordinador: No se pudo cargar el estado de grados desde la API", err);
      }
    }
    fetchEstadoGrados();
  }, []);

  useEffect(() => {
    async function fetchAsistenciaGrados() {
      try {
        const data = await asistenciaAPI.getAsistenciaGrados();
        setAsistenciaGrados(data as AsistenciaGrado[]);
      } catch (err) {
        console.warn("DashboardCoordinador: No se pudo cargar la asistencia por grados desde la API", err);
      }
    }
    fetchAsistenciaGrados();
  }, []);

  useEffect(() => {
    async function fetchAsistenciaEstudiantes() {
      for (const g of asistenciaGrados) {
        try {
          const data = await asistenciaAPI.getRegistroHoy(parseInt(g.grado));
          setAsistenciaEstudiantes(prev => ({ ...prev, [g.grado]: data as AsistenciaEstudiante[] }));
        } catch (err) {
          console.warn(`DashboardCoordinador: No se pudo cargar la asistencia de estudiantes para el grado ${g.grado}`, err);
        }
      }
    }
    if (asistenciaGrados.length > 0) fetchAsistenciaEstudiantes();
  }, [asistenciaGrados]);

  useEffect(() => {
    async function fetchObservaciones() {
      try {
        const data = await observacionesAPI.getObservacionesRecientes();
        setObservacionesRecientes(data as ObservacionReciente[]);
      } catch (err) {
        console.warn("DashboardCoordinador: No se pudieron cargar las observaciones recientes desde la API", err);
      }
    }
    fetchObservaciones();
  }, []);

  useEffect(() => {
    async function fetchEstudiantes() {
      try {
        const data = await estudiantesAPI.getEstudiantes();
        setEstudiantesData(data as EstudianteData[]);
      } catch (err) {
        console.warn("DashboardCoordinador: No se pudieron cargar los estudiantes desde la API", err);
      }
    }
    fetchEstudiantes();
  }, []);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const data = await coordinadorAPI.getDashboard();
        // TODO: Extraer asistenciaPromedio y otros datos del dashboard
        // setAsistenciaPromedio(data.asistenciaPromedio);
      } catch (err) {
        console.warn("DashboardCoordinador: No se pudo cargar el dashboard desde la API", err);
      }
    }
    fetchDashboard();
  }, []);

  const alertasActivas = getAlertasActivas().length;
  const noLeidos = getMensajesNoLeidos("coordinador");
  const totalRojo = gradosStats.reduce((s, g) => s + g.rojo, 0);
  const totalEst = gradosStats.reduce((s, g) => s + g.total, 0);

  const ir = (ruta: string, id?: string) => { if (id) setNavActivo(id); navigate(`/dashboard/${ruta}`); };
  const toggle = (id: string) => setSecciones(prev => ({ ...prev, [id]: !prev[id as keyof typeof prev] }));

  const STAT_CARDS = [
    { label: "Grados activos", value: String(gradosStats.length), sub: "601 al 1101" },
    { label: "Estudiantes total", value: String(totalEst), sub: "activos este periodo" },
    { label: "En riesgo", value: String(totalRojo), sub: "requieren atención", color: C.red },
    { label: "Asistencia hoy", value: asistenciaPromedio || "—", sub: "en promedio hoy", color: C.green },
  ];

  return (
    <div style={S.app}>
      {!isMobile && (
        <Sidebar
          navGroups={NAV_COORDINADOR}
          navActivo={navActivo}
          onNav={ir}
          usuario={userName || "Coordinador"}
          subUsuario={userRole}
        />
      )}

      <div style={S.main}>
        <header style={{ ...S.topbar, padding: isMobile ? "10px 16px" : "10px 24px" }}>
          {isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={S.logoIcon}>G</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.gray900 }}>Panel coordinador</p>
                <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>{userName || "Coordinador"} · Jornada mañana</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray900 }}>Panel del coordinador</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Colegio Integrado de Fontibón IBEP · Jornada mañana · Periodo 2</p>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {noLeidos > 0 && (
              <button onClick={() => ir("mensajes-coordinador", "mensajes")} style={{ background: C.blueLight, color: C.blueText, fontSize: isMobile ? 10 : 12, padding: isMobile ? "3px 8px" : "4px 12px", borderRadius: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                {noLeidos} mensajes
              </button>
            )}
            {alertasActivas > 0 && (
              <span style={{ background: C.redLight, color: C.red, fontSize: isMobile ? 11 : 12, padding: isMobile ? "3px 8px" : "4px 12px", borderRadius: 12, fontWeight: 600 }}>
                {alertasActivas} alertas activas
              </span>
            )}
          </div>
        </header>

        <main style={{ ...S.content, padding: isMobile ? "12px" : "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
            {STAT_CARDS.map(c => (
              <div key={c.label} style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: C.gray500 }}>{c.label}</p>
                <p style={{ margin: 0, fontSize: isMobile ? 20 : 22, fontWeight: 700, color: c.color ?? C.gray900 }}>{c.value}</p>
                <p style={{ margin: "2px 0 0", fontSize: 10, color: C.gray400 }}>{c.sub}</p>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.gray900 }}>Resumen del día</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Todos los grados · Periodo 2 · 2025</p>
          </div>

          <CardSeccion titulo="Estado académico por grado" sub={`${totalRojo} estudiantes en riesgo rojo · ${totalEst} total`} badgeVal={totalRojo} badgeColor={C.red} abierto={secciones.estado} onToggle={() => toggle("estado")} isMobile={isMobile}>
            <ContenidoEstadoGrados isMobile={isMobile} gradosStats={gradosStats} estudiantesData={estudiantesData} />
          </CardSeccion>

          <CardSeccion titulo="Asistencia hoy" sub="Resumen por grado" badgeVal={asistenciaPromedio || "—"} badgeColor={C.green} abierto={secciones.asistencia} onToggle={() => toggle("asistencia")} irA={() => ir("coordinador")} labelIr="Registro completo →" isMobile={isMobile}>
            <ContenidoAsistencia isMobile={isMobile} asistenciaGrados={asistenciaGrados} asistenciaEstudiantes={asistenciaEstudiantes} />
          </CardSeccion>

          <CardSeccion titulo="Alertas activas" sub={alertasActivas > 0 ? `${alertasActivas} alertas requieren atención` : "Sin alertas activas"} badgeVal={alertasActivas} badgeColor={C.red} abierto={secciones.alertas} onToggle={() => toggle("alertas")} irA={() => ir("mensajes-coordinador")} labelIr="Ver todas →" isMobile={isMobile}>
            <ContenidoAlertas isMobile={isMobile} />
          </CardSeccion>

          <CardSeccion titulo="Observaciones recientes" sub={`${observacionesRecientes.length} nuevas observaciones`} badgeVal={observacionesRecientes.length} badgeColor={C.blueText} abierto={secciones.observaciones} onToggle={() => toggle("observaciones")} irA={() => ir("observador-coordinador")} labelIr="Ver observador →" isMobile={isMobile}>
            <ContenidoObservaciones isMobile={isMobile} observacionesRecientes={observacionesRecientes} />
          </CardSeccion>
        </main>

        {isMobile && (
          <BottomNav
            items={BOTTOM_NAV_COORDINADOR}
            navActivo={navActivo}
            onNav={ir}
            badges={{ mensajes: noLeidos, alertas: alertasActivas }}
          />
        )}
      </div>
    </div>
  );
}
