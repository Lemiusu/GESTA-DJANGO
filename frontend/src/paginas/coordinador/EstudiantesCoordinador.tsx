import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useGESTA } from "../../context/GESTAContext";
import {
  C, S, SM, Semaforo, Avatar, Sidebar, BottomNav,
  NAV_COORDINADOR, BOTTOM_NAV_COORDINADOR,
} from "../../context/shared";
import { estudiantesAPI } from "../../services/api";

/* ─── TIPOS ──────────────────────────────────────────────────────── */
interface Estudiante {
  id: string;
  nombre: string;
  grado: string;
  promedio: number;
  asistencia: number;
  obs: number;
  riesgo: string;
  condicion: string | null;
  esRepitente: boolean;
  tieneCondicionEspecial: boolean;
  descripcionCondicion: string | null;
}

interface CalificacionMateria {
  materia: string;
  promedio: number;
}

/* ─── TIPO DE ORDENAMIENTO ────────────────────────────────────── */
type OrdenCol = "nombre"|"grado"|"promedio"|"asistencia"|"obs"|"riesgo";
type OrdenDir = "asc"|"desc";

const RIESGO_ORDEN: Record<string,number> = { rojo:0, amarillo:1, verde:2 };

const TIPO_OBS_META: Record<string, { bg: string; color: string; label: string }> = {
  "disciplina": { bg: "#fee2e2", color: "#dc2626", label: "Disciplina" },
  "academica": { bg: "#fef3c7", color: "#d97706", label: "Académica" },
  "comportamiento": { bg: "#e0e7ff", color: "#4f46e5", label: "Comportamiento" },
};

/* ─── PERFIL DEL ESTUDIANTE ───────────────────────────────────── */
function PerfilEstudiante({
  est, onVolver, isMobile, calificaciones: calificacionesProp,
}: {
  est: Estudiante;
  onVolver: () => void;
  isMobile: boolean;
  calificaciones: CalificacionMateria[];
}) {
  const { getObservacionesEstudiante, getAsistenciaEstudiante, getCondicion, getAlertasActivas } = useGESTA();
  const obs            = getObservacionesEstudiante(est.id);
  const asistencia     = getAsistenciaEstudiante(est.id);
  const condicion      = getCondicion(est.id);
  const alertas        = getAlertasActivas().filter(a => a.estudianteId === est.id);
  const calificaciones = calificacionesProp;
  const s              = SM[est.riesgo] || SM.verde;

  const [tabPerfil,      setTabPerfil]      = useState<"resumen"|"observaciones"|"asistencia"|"calificaciones">("resumen");
  const [asistenciaLocal, setAsistenciaLocal] = useState(() => asistencia.map(r => ({ ...r })));
  const [editandoIdx,    setEditandoIdx]    = useState<number | null>(null);
  const [editForm,       setEditForm]       = useState<{ estado: "presente"|"ausente"|"justificado"; motivo: string }>({ estado: "presente", motivo: "" });

  const TABS_PERFIL = [
    { id:"resumen",        label:"Resumen" },
    { id:"observaciones",  label:`Observaciones (${obs.length})` },
    { id:"asistencia",     label:`Asistencia (${asistenciaLocal.length})` },
    { id:"calificaciones", label:`Calificaciones (${calificaciones.length})` },
  ];

  return (
    <div>
      {/* Breadcrumb volver */}
      <button onClick={onVolver} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:12, color:C.blue, background:"none", border:"none", padding:"0 0 14px", fontFamily:"inherit" }}>
        ← Volver a lista de estudiantes
      </button>

      {/* Header del perfil */}
      <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>

        {/* Banner riesgo */}
        <div style={{ background:s.bg, padding:isMobile?"14px":"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, borderBottom:`1px solid ${s.dot}20` }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <Avatar nombre={est.nombre} size={isMobile?44:52} />
            <div>
              <p style={{ margin:0, fontSize:isMobile?15:18, fontWeight:700, color:C.gray900 }}>{est.nombre}</p>
              <p style={{ margin:"2px 0 0", fontSize:12, color:C.gray500 }}>Grado {est.grado} · Jornada Manana · Colegio Fontibon IBEP</p>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
                <Semaforo nivel={est.riesgo} />
                {condicion?.esRepitente       && <span style={{ fontSize:10, fontWeight:600, background:C.amberLight, color:C.amber, padding:"2px 7px", borderRadius:8 }}>Repitente</span>}
                {condicion?.condicionInclusion && <span style={{ fontSize:10, fontWeight:600, background:"#dbeafe", color:"#1e40af", padding:"2px 7px", borderRadius:8 }}>Cond. Inclusión</span>}
                {alertas.length > 0            && <span style={{ fontSize:10, fontWeight:600, background:C.redLight, color:C.red, padding:"2px 7px", borderRadius:8 }}>⚠ {alertas.length} alerta{alertas.length>1?"s":""} activa{alertas.length>1?"s":""}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Stat cards dentro del perfil */}
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", borderBottom:`1px solid ${C.gray100}` }}>
          {[
            { label:"Promedio",        val:est.promedio.toFixed(1), color:est.promedio<3?C.red:C.green,        sub:"periodo actual" },
            { label:"Asistencia",      val:`${est.asistencia}%`,    color:est.asistencia<80?C.red:C.green,     sub:"acumulada" },
            { label:"Observaciones",   val:est.obs,                  color:est.obs>2?C.red:est.obs>0?C.amber:C.green, sub:"negativas" },
            { label:"Alertas activas", val:alertas.length,           color:alertas.length>0?C.red:C.green,     sub:"este periodo" },
          ].map((c,i) => (
            <div key={c.label} style={{ padding:"14px 16px", borderRight:i<3?`1px solid ${C.gray100}`:"none" }}>
              <p style={{ margin:"0 0 2px", fontSize:10, color:C.gray500 }}>{c.label}</p>
              <p style={{ margin:0, fontSize:isMobile?18:22, fontWeight:700, color:c.color }}>{c.val}</p>
              <p style={{ margin:"2px 0 0", fontSize:10, color:C.gray400 }}>{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Sub-tabs del perfil */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.gray100}`, overflowX:"auto" }}>
          {TABS_PERFIL.map(t => (
            <button key={t.id} onClick={() => setTabPerfil(t.id as any)} style={{ padding:"10px 16px", fontSize:12, cursor:"pointer", background:"transparent", border:"none", borderBottom:tabPerfil===t.id?`2px solid ${C.blue}`:"2px solid transparent", color:tabPerfil===t.id?C.blue:C.gray500, fontWeight:tabPerfil===t.id?600:400, marginBottom:-1, fontFamily:"inherit", whiteSpace:"nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: RESUMEN ── */}
        {tabPerfil==="resumen" && (
          <div style={{ padding:"14px 16px" }}>
            {alertas.length > 0 && (
              <div style={{ background:C.redLight, border:`1px solid #fca5a5`, borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
                <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:700, color:C.red }}>⚠ Alertas activas</p>
                {alertas.map((a,i) => (
                  <div key={a.id} style={{ fontSize:12, color:C.red, marginBottom:i<alertas.length-1?4:0 }}>
                    <strong>{a.tipo}</strong> · {a.motivo}
                  </div>
                ))}
              </div>
            )}
            {(condicion?.condicionInclusion || condicion?.esRepitente) && (
              <div style={{ background:"#dbeafe", border:"1px solid #93c5fd", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
                <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:700, color:"#1e40af" }}>Condiciones de inclusión registradas</p>
                {condicion.esRepitente       && <p style={{ margin:"0 0 4px", fontSize:12, color:"#1e40af" }}><strong>Repitente:</strong> {condicion.descripcionRepitente || "Sin descripcion adicional"}</p>}
                {condicion.condicionInclusion && <p style={{ margin:0,        fontSize:12, color:"#1e40af" }}><strong>Condición:</strong> {condicion.condicionInclusion}</p>}
              </div>
            )}
            <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:600, color:C.gray700 }}>Observaciones recientes</p>
            {obs.length===0 ? (
              <p style={{ margin:0, fontSize:12, color:C.gray400 }}>Sin observaciones registradas.</p>
            ) : obs.slice(0,3).map((o,i) => {
              const meta = TIPO_OBS_META[o.tipo] || { bg:C.blueLight, color:C.blueText, label:o.tipo };
              return (
                <div key={o.id} style={{ padding:"8px 0", borderBottom:i<Math.min(obs.length,3)-1?`1px solid ${C.gray100}`:"none" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:10, fontWeight:600, padding:"1px 7px", borderRadius:8, background:meta.bg, color:meta.color }}>{meta.label}</span>
                    <span style={{ fontSize:10, color:C.gray400 }}>{o.fecha}</span>
                  </div>
                  <p style={{ margin:"3px 0 1px", fontSize:12, color:C.gray700 }}>{o.desc}</p>
                  <p style={{ margin:0, fontSize:10, color:C.gray400 }}>{o.autor}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB: OBSERVACIONES ── */}
        {tabPerfil==="observaciones" && (
          <div>
            {obs.length===0 ? (
              <div style={{ padding:24, textAlign:"center", fontSize:12, color:C.gray400 }}>Sin observaciones registradas.</div>
            ) : obs.map((o,i) => {
              const meta = TIPO_OBS_META[o.tipo] || { bg:C.blueLight, color:C.blueText, label:o.tipo };
              return (
                <div key={o.id} style={{ padding:"12px 16px", borderBottom:i<obs.length-1?`1px solid ${C.gray100}`:"none" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                    <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:8, background:meta.bg, color:meta.color }}>{meta.label}</span>
                    <span style={{ fontSize:10, color:C.gray400 }}>{o.fecha}</span>
                  </div>
                  <p style={{ margin:"4px 0 2px", fontSize:13, color:C.gray700 }}>{o.desc}</p>
                  <p style={{ margin:0, fontSize:11, color:C.gray400 }}>{o.autor} · {o.rol}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB: ASISTENCIA ── */}
        {tabPerfil==="asistencia" && (
          <div>
            {asistenciaLocal.length === 0 ? (
              <div style={{ padding:24, textAlign:"center", fontSize:12, color:C.gray400 }}>
                Sin registros de asistencia.
              </div>
            ) : asistenciaLocal.map((r, i) => {
              const isEditing  = editandoIdx === i;
              const dotColor   = r.estado==="presente" ? "#16a34a" : r.estado==="justificado" ? "#d97706" : C.red;
              const estadoColor = r.estado==="presente" ? C.green   : r.estado==="justificado" ? C.amber   : C.red;
              const estadoBg    = r.estado==="presente" ? C.greenLight : r.estado==="justificado" ? C.amberLight : C.redLight;
              const estadoLabel = r.estado==="presente" ? "Presente"   : r.estado==="justificado" ? "Justificado" : "Ausente";

              return (
                <div key={i} style={{ borderBottom: i < asistenciaLocal.length-1 ? `1px solid ${C.gray100}` : "none" }}>
                  {/* Fila principal */}
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px" }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background:dotColor }} />
                    <span style={{ fontSize:12, color:C.gray500, minWidth:110 }}>{r.fecha}</span>
                    <span style={{ fontSize:12, fontWeight:600, padding:"2px 8px", borderRadius:8, background:estadoBg, color:estadoColor }}>
                      {estadoLabel}
                    </span>
                    {r.motivo && !isEditing && (
                      <span style={{ fontSize:11, color:C.gray400, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {r.motivo}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        if (isEditing) {
                          setEditandoIdx(null);
                        } else {
                          setEditandoIdx(i);
                          setEditForm({ estado: r.estado, motivo: r.motivo || "" });
                        }
                      }}
                      style={{
                        marginLeft:"auto", flexShrink:0,
                        fontSize:11, padding:"3px 10px", borderRadius:6, cursor:"pointer",
                        border:`1px solid ${isEditing ? C.gray300 : C.blue}`,
                        background: isEditing ? C.gray50 : C.blueLight,
                        color: isEditing ? C.gray500 : C.blue,
                        fontFamily:"inherit", fontWeight:600,
                      }}
                    >
                      {isEditing ? "Cancelar" : "Editar"}
                    </button>
                  </div>

                  {/* Panel de edición inline */}
                  {isEditing && (
                    <div style={{ margin:"0 16px 12px", background:C.gray50, border:`1px solid ${C.gray200}`, borderRadius:10, padding:"12px 14px" }}>
                      <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:600, color:C.gray700 }}>
                        Editar registro · {r.fecha}
                      </p>

                      {/* Selector de estado */}
                      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                        {([
                          { val:"presente"    as const, label:"Presente",    bg:C.greenLight,  color:C.green },
                          { val:"ausente"     as const, label:"Ausente",     bg:C.redLight,    color:C.red   },
                          { val:"justificado" as const, label:"Justificado", bg:C.amberLight,  color:C.amber },
                        ]).map(op => (
                          <button
                            key={op.val}
                            onClick={() => setEditForm(f => ({ ...f, estado: op.val, motivo: op.val !== "justificado" ? "" : f.motivo }))}
                            style={{
                              flex:1, padding:"7px 4px", borderRadius:8, cursor:"pointer",
                              fontFamily:"inherit", fontSize:12, fontWeight:600,
                              border:`2px solid ${editForm.estado===op.val ? op.color : C.gray200}`,
                              background: editForm.estado===op.val ? op.bg : C.white,
                              color: editForm.estado===op.val ? op.color : C.gray400,
                              transition:"all 0.15s",
                            }}
                          >
                            {op.label}
                          </button>
                        ))}
                      </div>

                      {/* Campo de descripción — solo visible para justificado */}
                      {editForm.estado === "justificado" && (
                        <div style={{ marginBottom:10 }}>
                          <label style={{ display:"block", fontSize:11, color:C.gray500, marginBottom:4 }}>
                            Descripción de la justificación
                          </label>
                          <textarea
                            value={editForm.motivo}
                            onChange={e => setEditForm(f => ({ ...f, motivo: e.target.value }))}
                            placeholder="Ej: Cita médica con soporte, calamidad doméstica..."
                            rows={2}
                            style={{
                              width:"100%", boxSizing:"border-box",
                              fontSize:12, padding:"8px 10px", borderRadius:7,
                              border:`1px solid ${C.gray200}`, background:C.white,
                              color:C.gray700, fontFamily:"inherit", resize:"vertical", outline:"none",
                            }}
                          />
                        </div>
                      )}

                      {/* Botones guardar / cancelar */}
                      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                        <button
                          onClick={() => setEditandoIdx(null)}
                          style={{ fontSize:12, padding:"6px 14px", borderRadius:7, cursor:"pointer", border:`1px solid ${C.gray200}`, background:C.white, color:C.gray500, fontFamily:"inherit" }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => {
                            setAsistenciaLocal(prev =>
                              prev.map((rec, idx) =>
                                idx === i
                                  ? { ...rec, estado: editForm.estado, motivo: editForm.estado==="justificado" ? editForm.motivo : "" }
                                  : rec
                              )
                            );
                            setEditandoIdx(null);
                          }}
                          style={{ fontSize:12, padding:"6px 14px", borderRadius:7, cursor:"pointer", border:`1px solid ${C.blue}`, background:C.blue, color:C.white, fontFamily:"inherit", fontWeight:600 }}
                        >
                      {`Guardar`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB: CALIFICACIONES ── */}
        {tabPerfil==="calificaciones" && (
          <div>
            {calificaciones.length===0 ? (
              <div style={{ padding:24, textAlign:"center", fontSize:12, color:C.gray400 }}>Sin calificaciones registradas.</div>
            ) : (
              <div style={{ padding:"14px 16px" }}>
                <p style={{ margin:"0 0 12px", fontSize:12, fontWeight:600, color:C.gray700 }}>Promedio por materia</p>
                <div style={{ display:"grid", gap:8 }}>
                  {calificaciones.map((cal, i) => {
                    const color   = cal.promedio < 3 ? C.red   : cal.promedio < 4 ? C.amber   : C.green;
                    const bgColor = cal.promedio < 3 ? C.redLight : cal.promedio < 4 ? C.amberLight : C.greenLight;
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:C.gray50, borderRadius:8, border:`1px solid ${C.gray100}` }}>
                        <span style={{ fontSize:13, fontWeight:500, color:C.gray700 }}>{cal.materia}</span>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:isMobile?80:120, height:6, background:C.gray200, borderRadius:3, overflow:"hidden" }}>
                            <div style={{ width:`${(cal.promedio/5)*100}%`, height:6, background:color, borderRadius:3 }} />
                          </div>
                          <span style={{ fontSize:15, fontWeight:700, color, minWidth:32, textAlign:"right", background:bgColor, padding:"2px 8px", borderRadius:6 }}>
                            {cal.promedio.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── COMPONENTE PRINCIPAL ────────────────────────────────────── */
export default function EstudiantesCoordinador() {
  const navigate = useNavigate();
  const { getAlertasActivas, getMensajesNoLeidos, setCondicionEstudiante } = useGESTA();

  /* ── Responsive ── */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const breakpoint = 1280;
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ── Estado de estudiantes (desde API) ── */
  // TODO: Reemplazar con estudiantesAPI.getEstudiantes(filtros) cuando el backend esté conectado
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [grados, setGrados] = useState<string[]>([]);
  // TODO: Reemplazar con estudiantesAPI.getPerfilEstudiante(id) cuando el backend esté conectado
  const [calificaciones] = useState<Record<number, CalificacionMateria[]>>({});

  useEffect(() => {
    estudiantesAPI.getEstudiantes()
      .then(data => {
        setEstudiantes(data);
        setGrados([...new Set(data.map((e: Estudiante) => e.grado).filter(Boolean))] as string[]);
        // Cargar condiciones de los estudiantes al contexto
        data.forEach((e: any) => {
          if (e.esRepitente || e.tieneCondicionEspecial) {
            setCondicionEstudiante({
              estudianteId: String(e.id),
              esRepitente: e.esRepitente || false,
              descripcionRepitente: e.esRepitente ? (e.descripcionCondicion || '') : undefined,
              condicionInclusion: e.tieneCondicionEspecial && !e.esRepitente ? (e.descripcionCondicion || '') : undefined,
            });
          }
        });
      })
      .catch(error => console.warn("Error cargando estudiantes:", error));
  }, []);

  /* ── Nombre del usuario (debe venir de la sesión / API) ── */
  const { user } = useAuth();
  const nombreUsuario = user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || "Usuario";

  /* ── Estados de navegación y filtros ── */
  const [navActivo,    setNavActivo]    = useState("estudiantes");
  const [busqueda,     setBusqueda]     = useState("");
  const [filtroGrado,  setFiltroGrado]  = useState("Todos");
  const [filtroRiesgo, setFiltroRiesgo] = useState("Todos");
  const [filtroCond,   setFiltroCond]   = useState("Todos");
  const [ordenCol,     setOrdenCol]     = useState<OrdenCol>("riesgo");
  const [ordenDir,     setOrdenDir]     = useState<OrdenDir>("asc");
  const [perfilId, setPerfilId] = useState<string|null>(null);
  
  const location = useLocation();
  useEffect(() => {
    const state = location.state as { perfilId?: string } | null;
    if (state?.perfilId) {
      setPerfilId(state.perfilId);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  /* ── Estados del modal "Agregar estudiante" ── */
  const [modalAgregar, setModalAgregar] = useState(false);
  const [nuevoNombre,  setNuevoNombre]  = useState("");
  const [nuevoGrado,   setNuevoGrado]   = useState("601");
  const [nuevaCond,    setNuevaCond]    = useState<"repitente"|"inclusion"|null>(null);
  const [errNombre,    setErrNombre]    = useState(false);

  const [modalCondicion,  setModalCondicion]  = useState(false);
  const [condEstId,       setCondEstId]       = useState<string|null>(null);
  const [condBusqueda,    setCondBusqueda]    = useState("");
  const [condNueva,       setCondNueva]       = useState<"repitente"|"inclusion"|null>(null);
  const [condDescripcion, setCondDescripcion] = useState("");
  const [condGuardando,   setCondGuardando]   = useState(false);

  const alertasActivas = getAlertasActivas().length;
  const noLeidos       = getMensajesNoLeidos("coordinador");
  const ir = (ruta: string, id: string) => { setNavActivo(id); navigate(`/dashboard/${ruta}`); };

  /* ── Helper para abrir el modal limpio ── */
  const abrirModalAgregar = () => {
    setNuevoNombre("");
    setNuevoGrado("601");
    setNuevaCond(null);
    setErrNombre(false);
    setModalAgregar(true);
  };

  /* ── Helper para abrir condicion de estudiante ── */
  const abrirModalCondicion = () => {
    setCondEstId(null);
    setCondBusqueda("");
    setCondNueva(null);
    setCondDescripcion("");
    setModalCondicion(true);
  };

  /* ── Editar condicion de estudiante ── */
  const guardarCondicion = async () => {
    if (condEstId === null) return;
    setCondGuardando(true);
    try {
      const esRepitente = condNueva === "repitente";
      const esInclusion = condNueva === "inclusion";
      const desc = condDescripcion.trim();

      // setCondicionEstudiante ya llama al API internamente
      await setCondicionEstudiante({
        estudianteId: String(condEstId),
        esRepitente,
        descripcionRepitente: esRepitente && desc ? desc : undefined,
        condicionInclusion: esInclusion && desc ? desc : undefined,
      });

      // Actualizar lista local
      setEstudiantes(prev =>
        prev.map(e => String(e.id) === String(condEstId) ? {
          ...e,
          condicion: condNueva,
          esRepitente,
          tieneCondicionEspecial: esInclusion,
          descripcionCondicion: desc || null,
        } : e)
      );
      setModalCondicion(false);
    } catch (error) {
      console.error("Error guardando condición:", error);
      alert("Error al guardar la condición. Intenta de nuevo.");
    } finally {
      setCondGuardando(false);
    }
  };

  /* ── Guardar nuevo estudiante ── */
  const guardarNuevoEstudiante = () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) { setErrNombre(true); return; }
    // TODO: Reemplazar con estudiantesAPI.crearEstudiante() para crear en backend
    const nuevoId = estudiantes.length > 0 ? Math.max(...estudiantes.map(e => e.id)) + 1 : 1;
    setEstudiantes(prev => [...prev, {
      id:         nuevoId,
      nombre,
      grado:      nuevoGrado,
      promedio:   3.0,
      asistencia: 100,
      obs:        0,
      riesgo:     "verde",
      condicion:  nuevaCond,
    }]);
    setModalAgregar(false);
  };

  /* ── Filtrado + ordenamiento ── */
  const estudiantesFiltrados = useMemo(() => {
    let lista = [...estudiantes];

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(e => e.nombre.toLowerCase().includes(q) || e.grado.includes(q));
    }
    if (filtroGrado  !== "Todos") lista = lista.filter(e => e.grado  === filtroGrado);
    if (filtroRiesgo !== "Todos") lista = lista.filter(e => e.riesgo === filtroRiesgo.toLowerCase());
    if (filtroCond   !== "Todos") {
      if (filtroCond==="Repitente")     lista = lista.filter(e => e.esRepitente);
      if (filtroCond==="Inclusion")     lista = lista.filter(e => e.tieneCondicionEspecial);
      if (filtroCond==="Sin condicion") lista = lista.filter(e => !e.esRepitente && !e.tieneCondicionEspecial);
    }

    lista.sort((a, b) => {
      let va: any, vb: any;
      if      (ordenCol==="nombre")     { va=a.nombre;     vb=b.nombre; }
      else if (ordenCol==="grado")      { va=a.grado;      vb=b.grado; }
      else if (ordenCol==="promedio")   { va=a.promedio;   vb=b.promedio; }
      else if (ordenCol==="asistencia") { va=a.asistencia; vb=b.asistencia; }
      else if (ordenCol==="obs")        { va=a.obs;        vb=b.obs; }
      else if (ordenCol==="riesgo")     { va=RIESGO_ORDEN[a.riesgo]; vb=RIESGO_ORDEN[b.riesgo]; }
      if (va < vb) return ordenDir==="asc" ? -1 : 1;
      if (va > vb) return ordenDir==="asc" ?  1 : -1;
      return 0;
    });

    return lista;
  }, [estudiantes, busqueda, filtroGrado, filtroRiesgo, filtroCond, ordenCol, ordenDir]);

  const toggleOrden = (col: OrdenCol) => {
    if (ordenCol===col) setOrdenDir(d => d==="asc" ? "desc" : "asc");
    else { setOrdenCol(col); setOrdenDir("asc"); }
  };

  const HeaderCol = ({ col, label }: { col: OrdenCol; label: string }) => (
    <th onClick={() => toggleOrden(col)} style={{ ...S.th, cursor:"pointer", userSelect:"none", whiteSpace:"nowrap" }}>
      {label} {ordenCol===col ? (ordenDir==="asc" ? "↑" : "↓") : <span style={{ color:C.gray300 }}>↕</span>}
    </th>
  );

  /* ── Stats resumen (reactivos al estado) ── */
  const totalEst     = estudiantes.length;
  const enRojo       = estudiantes.filter(e => e.riesgo==="rojo").length;
  const enAmarillo   = estudiantes.filter(e => e.riesgo==="amarillo").length;
  const enVerde      = estudiantes.filter(e => e.riesgo==="verde").length;
  const conCondicion = estudiantes.filter(e => e.esRepitente || e.tieneCondicionEspecial).length;

  /* ── Estudiante en perfil ── */
  const estPerfil = perfilId ? estudiantes.find(e => e.id===perfilId) : null;

  return (
    <div style={S.app}>
      {!isMobile && (
        <Sidebar
          navGroups={NAV_COORDINADOR}
          navActivo={navActivo}
          onNav={ir}
          usuario={nombreUsuario}
          subUsuario="Coordinador"
        />
      )}

      <div style={S.main}>
        {/* ── Topbar ── */}
        <header style={{ ...S.topbar, padding:isMobile?"10px 16px":"10px 24px" }}>
          {isMobile ? (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={S.logoIcon}>G</div>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.gray900 }}>Estudiantes</p>
                <p style={{ margin:0, fontSize:11, color:C.gray500 }}>{nombreUsuario} · Coordinador</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin:0, fontSize:16, fontWeight:700, color:C.gray900 }}>Estudiantes</p>
              <p style={{ margin:"2px 0 0", fontSize:12, color:C.gray500 }}>Colegio Integrado de Fontibon IBEP · Todos los grados · Periodo 2</p>
            </div>
          )}
		  {noLeidos>0 && (
            <button onClick={() => ir("mensajes-coordinador","mensajes")} style={{ background:C.blueLight, color:C.blueText, fontSize:isMobile?10:12, padding:isMobile?"3px 8px":"4px 12px", borderRadius:12, fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" }}>
              {noLeidos} mensajes
            </button>
          )}
        </header>

        <main style={{ ...S.content, padding:isMobile?"12px":"20px 24px" }}>

          {/* ── VISTA PERFIL ── */}
          {estPerfil ? (
            <PerfilEstudiante
              est={estPerfil}
              onVolver={() => setPerfilId(null)}
              isMobile={isMobile}
              calificaciones={calificaciones[estPerfil.id] || []}
            />
          ) : (
            <>
              {/* Stat cards resumen */}
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(5,1fr)", gap:10, marginBottom:20 }}>
                {[
                  { label:"Total estudiantes", value:totalEst,     sub:"matriculados",           color:C.gray900   },
                  { label:"En riesgo rojo",     value:enRojo,       sub:"requieren accion",       color:C.red       },
                  { label:"En seguimiento",     value:enAmarillo,   sub:"nivel amarillo",         color:"#d97706"   },
                  { label:"Sin riesgo",         value:enVerde,      sub:"nivel verde",            color:C.green     },
                  { label:"Cond. inclusión",    value:conCondicion, sub:"repitentes + inclusión", color:"#1e40af"   },
                ].map(c => (
                  <div key={c.label} style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:10, padding:"12px 14px" }}>
                    <p style={{ margin:"0 0 4px", fontSize:11, color:C.gray500 }}>{c.label}</p>
                    <p style={{ margin:0, fontSize:isMobile?18:22, fontWeight:700, color:c.color }}>{c.value}</p>
                    <p style={{ margin:"2px 0 0", fontSize:10, color:C.gray400 }}>{c.sub}</p>
                  </div>
                ))}
              </div>

              {/* Filtros y búsqueda */}
              <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, padding:"12px 16px", marginBottom:12 }}>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                  {/* Buscador */}
                  <div style={{ position:"relative", flex:isMobile?1:"auto", minWidth:180 }}>
                    <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.gray400, fontSize:14 }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o grado..."
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                      style={{ ...S.input, paddingLeft:30, height:34, fontSize:12 }}
                    />
                  </div>

                  {/* Filtro grado */}
                  <select value={filtroGrado} onChange={e => setFiltroGrado(e.target.value)} style={S.select}>
                    <option value="Todos">Todos los grados</option>
                    {grados.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>

                  {/* Filtro riesgo */}
                  <select value={filtroRiesgo} onChange={e => setFiltroRiesgo(e.target.value)} style={S.select}>
                    <option value="Todos">Todos los riesgos</option>
                    <option value="Rojo">🔴 Rojo</option>
                    <option value="Amarillo">🟡 Amarillo</option>
                    <option value="Verde">🟢 Verde</option>
                  </select>

                  {/* Filtro condicion */}
                  <select value={filtroCond} onChange={e => setFiltroCond(e.target.value)} style={S.select}>
                    <option value="Todos">Todas las condiciones</option>
                    <option value="Repitente">Solo repitentes</option>
                    <option value="Inclusion">Solo cond. inclusión</option>
                    <option value="Sin condicion">Sin condición</option>
                  </select>

                  {/* Reset filtros */}
                  {(busqueda||filtroGrado!=="Todos"||filtroRiesgo!=="Todos"||filtroCond!=="Todos") && (
                    <button
                      onClick={() => { setBusqueda(""); setFiltroGrado("Todos"); setFiltroRiesgo("Todos"); setFiltroCond("Todos"); }}
                      style={{ ...S.btnSm, color:C.red, borderColor:C.redLight }}
                    >
                      Limpiar
                    </button>
                  )}

                  {/* Contador + botón agregar */}
                  <span style={{ marginLeft:"auto", fontSize:12, color:C.gray400 }}>
                    {estudiantesFiltrados.length} de {totalEst} estudiantes
                  </span>

                  <button
                    onClick={abrirModalAgregar}
                    style={{
                      display:"flex", alignItems:"center", gap:6,
                      fontSize:12, padding:"6px 14px", borderRadius:8, cursor:"pointer",
                      border:`1px solid ${C.blue}`, background:C.blue,
                      color:C.white, fontFamily:"inherit", fontWeight:600, flexShrink:0,
                    }}
                  >
                    + Agregar estudiante
                  </button>
                  <button
                    onClick={abrirModalCondicion}
                    style={{
                      display:"flex", alignItems:"center", gap:6,
                      fontSize:12, padding:"6px 14px", borderRadius:8, cursor:"pointer",
                      border:`1px solid ${C.gray400}`, background:C.white,
                      color:C.gray700, fontFamily:"inherit", fontWeight:600, flexShrink:0,
                    }}
                  >
                    Editar Condición
                  </button>
                </div>
              </div>

              {/* ── TABLA DESKTOP ── */}
              {!isMobile && (
                <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, overflow:"hidden" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>#</th>
                        <HeaderCol col="nombre"     label="Estudiante" />
                        <th style={S.th}>Condición</th>
                        <HeaderCol col="grado"      label="Grado" />
                        <HeaderCol col="promedio"   label="Promedio" />
                        <HeaderCol col="asistencia" label="Asistencia" />
                        <HeaderCol col="obs"        label="Obs. neg." />
                        <HeaderCol col="riesgo"     label="Riesgo" />
                        <th style={S.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudiantesFiltrados.length===0 ? (
                        <tr>
                          <td colSpan={9} style={{ ...S.td, textAlign:"center", color:C.gray400, padding:"32px 16px" }}>
                            No se encontraron estudiantes con estos filtros.
                          </td>
                        </tr>
                      ) : estudiantesFiltrados.map((e, i) => {
                        const alerta = getAlertasActivas().some(a => a.estudianteId===e.id);
                        return (
                          <tr
                            key={e.id}
                            style={{ background:i%2===0?C.white:C.gray50, cursor:"pointer" }}
                            onClick={() => setPerfilId(e.id)}
                            onMouseEnter={ev => (ev.currentTarget.style.background = C.blueLight+"50")}
                            onMouseLeave={ev => (ev.currentTarget.style.background = i%2===0?C.white:C.gray50)}
                          >
                            <td style={{ ...S.td, color:C.gray400, width:40 }}>{String(i+1).padStart(2,"0")}</td>
                            <td style={S.td}>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <Avatar nombre={e.nombre} />
                                <div>
                                  <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.gray800 }}>{e.nombre}</p>
                                  {alerta && <p style={{ margin:0, fontSize:10, color:C.red, fontWeight:600 }}>⚠ Alerta activa</p>}
                                </div>
                              </div>
                            </td>
                            
                            <td style={S.td}>
                              {e.esRepitente && <span style={{ fontSize:10, fontWeight:600, background:C.amberLight, color:C.amber, padding:"2px 7px", borderRadius:8, marginRight:4 }}>Repitente</span>}
                              {e.tieneCondicionEspecial && <span style={{ fontSize:10, fontWeight:600, background:"#dbeafe", color:"#1e40af", padding:"2px 7px", borderRadius:8 }}>Inclusión</span>}
                              {!e.esRepitente && !e.tieneCondicionEspecial && <span style={{ fontSize:11, color:C.gray300 }}>—</span>}
                            </td>
                            <td style={{ ...S.td, fontWeight:600, color:C.gray800 }}>{e.grado}</td>
                            <td style={{ ...S.td, fontWeight:700, color:e.promedio<3?C.red:C.green }}>{e.promedio.toFixed(1)}</td>
                            <td style={S.td}>
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <div style={{ width:50, height:5, background:C.gray200, borderRadius:3 }}>
                                  <div style={{ width:`${e.asistencia}%`, height:5, background:e.asistencia<80?C.red:e.asistencia<90?"#d97706":"#16a34a", borderRadius:3 }} />
                                </div>
                                <span style={{ fontSize:12, color:e.asistencia<80?C.red:C.gray700 }}>{e.asistencia}%</span>
                              </div>
                            </td>
                            <td style={{ ...S.td, color:e.obs>2?C.red:e.obs>0?C.amber:C.gray400, fontWeight:e.obs>0?600:400 }}>
                              {e.obs > 0 ? `${e.obs} neg.` : "—"}
                            </td>
                            <td style={S.td}><Semaforo nivel={e.riesgo} label={{ verde:"Verde", amarillo:"Amarillo", rojo:"Rojo" }[e.riesgo]} /></td>
                            <td style={S.td}>
                              <button
                                onClick={ev => { ev.stopPropagation(); setPerfilId(e.id); }}
                                style={{ ...S.btnSm, color:C.blue, borderColor:C.blue, background:C.blueLight }}
                              >
                                Ver perfil →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── LISTA MOBILE ── */}
              {isMobile && (
                <div>
                  {estudiantesFiltrados.length===0 ? (
                    <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, padding:"32px 16px", textAlign:"center", fontSize:12, color:C.gray400 }}>
                      No se encontraron estudiantes con estos filtros.
                    </div>
                  ) : estudiantesFiltrados.map((e, i) => {
                    const alerta = getAlertasActivas().some(a => a.estudianteId===e.id);
                    return (
                      <div
                        key={e.id}
                        onClick={() => setPerfilId(e.id)}
                        style={{ background:C.white, border:`1px solid ${alerta?C.red:C.gray200}`, borderRadius:12, padding:"12px 14px", marginBottom:8, cursor:"pointer" }}
                      >
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <Avatar nombre={e.nombre} />
                            <div>
                              <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.gray900 }}>{e.nombre}</p>
                              <p style={{ margin:0, fontSize:11, color:C.gray400 }}>Grado {e.grado}</p>
                            </div>
                          </div>
                          <Semaforo nivel={e.riesgo} label={{ verde:"Verde", amarillo:"Amarillo", rojo:"Rojo" }[e.riesgo]} />
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:8 }}>
                          {[["Promedio",e.promedio.toFixed(1)],["Asistencia",`${e.asistencia}%`],["Obs",`${e.obs} neg.`]].map(([l,v]) => (
                            <div key={String(l)} style={{ background:C.gray50, borderRadius:6, padding:"6px 8px" }}>
                              <p style={{ margin:0, fontSize:9, color:C.gray400 }}>{l}</p>
                              <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.gray900 }}>{v}</p>
                            </div>
                          ))}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          {e.condicion==="repitente" && <span style={{ fontSize:10, fontWeight:600, background:C.amberLight, color:C.amber, padding:"1px 6px", borderRadius:6 }}>Repitente</span>}
                          {e.condicion==="inclusion"  && <span style={{ fontSize:10, fontWeight:600, background:"#dbeafe", color:"#1e40af", padding:"1px 6px", borderRadius:6 }}>Inclusión</span>}
                          {alerta && <span style={{ fontSize:10, fontWeight:600, background:C.redLight, color:C.red, padding:"1px 6px", borderRadius:6 }}>⚠ Alerta activa</span>}
                          <span style={{ marginLeft:"auto", fontSize:11, color:C.blue, fontWeight:600 }}>Ver perfil →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── MODAL: AGREGAR ESTUDIANTE ── */}
          {modalAgregar && (
            <div
              onClick={() => setModalAgregar(false)}
              style={{
                position:"fixed", inset:0, background:"rgba(0,0,0,0.35)",
                zIndex:100, display:"flex", alignItems:"center", justifyContent:"center",
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background:C.white, borderRadius:14, padding:24,
                  width:"100%", maxWidth:420, margin:"0 16px",
                  boxShadow:"0 20px 60px rgba(0,0,0,0.18)",
                }}
              >
                <p style={{ margin:"0 0 18px", fontSize:16, fontWeight:700, color:C.gray900 }}>
                  Agregar estudiante
                </p>

                {/* Nombre */}
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray700, marginBottom:5 }}>
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={nuevoNombre}
                    onChange={e => { setNuevoNombre(e.target.value); setErrNombre(false); }}
                    style={{
                      ...S.input, width:"100%", boxSizing:"border-box",
                      border:`1px solid ${errNombre ? C.red : C.gray200}`,
                      fontSize:13,
                    }}
                  />
                  {errNombre && (
                    <p style={{ margin:"4px 0 0", fontSize:11, color:C.red }}>El nombre es obligatorio.</p>
                  )}
                </div>

                {/* Grado */}
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray700, marginBottom:5 }}>
                    Grado
                  </label>
                  <select
                    value={nuevoGrado}
                    onChange={e => setNuevoGrado(e.target.value)}
                    style={{ ...S.select, width:"100%", fontSize:13 }}
                  >
                    {grados.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                {/* Condición */}
                <div style={{ marginBottom:22 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray700, marginBottom:8 }}>
                    Condición especial
                  </label>
                  <div style={{ display:"flex", gap:8 }}>
                    {([
                      { val:null,         label:"Ninguna",   bg:C.gray100,    color:C.gray500  },
                      { val:"repitente",  label:"Repitente", bg:C.amberLight, color:C.amber    },
                      { val:"inclusion",  label:"Inclusión", bg:"#dbeafe",    color:"#1e40af"  },
                    ] as const).map(op => (
                      <button
                        key={String(op.val)}
                        onClick={() => setNuevaCond(op.val)}
                        style={{
                          flex:1, padding:"8px 4px", borderRadius:8, cursor:"pointer",
                          fontFamily:"inherit", fontSize:12, fontWeight:600,
                          border:`2px solid ${nuevaCond===op.val ? op.color : C.gray200}`,
                          background: nuevaCond===op.val ? op.bg : C.white,
                          color: nuevaCond===op.val ? op.color : C.gray400,
                        }}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                  <button
                    onClick={() => setModalAgregar(false)}
                    style={{ fontSize:13, padding:"8px 18px", borderRadius:8, cursor:"pointer", border:`1px solid ${C.gray200}`, background:C.white, color:C.gray500, fontFamily:"inherit" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={guardarNuevoEstudiante}
                    style={{ fontSize:13, padding:"8px 18px", borderRadius:8, cursor:"pointer", border:`1px solid ${C.blue}`, background:C.blue, color:C.white, fontFamily:"inherit", fontWeight:700 }}
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          )}
          {modalCondicion && (
            <div
              onClick={() => setModalCondicion(false)}
              style={{
                position:"fixed", inset:0, background:"rgba(0,0,0,0.35)",
                zIndex:100, display:"flex", alignItems:"center", justifyContent:"center",
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background:C.white, borderRadius:14, padding:24,
                  width:"100%", maxWidth:440, margin:"0 16px",
                  boxShadow:"0 20px 60px rgba(0,0,0,0.18)",
                }}
              >
                <p style={{ margin:"0 0 4px", fontSize:16, fontWeight:700, color:C.gray900 }}>
                  Cambiar condición
                </p>
                <p style={{ margin:"0 0 18px", fontSize:12, color:C.gray400 }}>
                  Busca un estudiante y selecciona su nueva condición.
                </p>
          
                {/* Buscador de estudiante */}
                <div style={{ marginBottom:10 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray700, marginBottom:5 }}>
                    Estudiante
                  </label>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o grado..."
                    value={condBusqueda}
                    onChange={e => { setCondBusqueda(e.target.value); setCondEstId(null); }}
                    style={{ ...S.input, width:"100%", boxSizing:"border-box", fontSize:13 }}
                  />
                </div>
          
                {/* Lista filtrada de estudiantes */}
                {condBusqueda.trim() && (
                  <div style={{
                    border:`1px solid ${C.gray200}`, borderRadius:8, overflow:"hidden",
                    maxHeight:180, overflowY:"auto", marginBottom:16,
                  }}>
                    {estudiantes
                      .filter(e => {
                        const q = condBusqueda.toLowerCase();
                        return e.nombre.toLowerCase().includes(q) || e.grado.includes(q);
                      })
                      .slice(0, 8)
                      .map((e, i, arr) => {
                        const seleccionado = condEstId === e.id;
                        return (
                          <div
                            key={e.id}
                            onClick={() => {
                              setCondEstId(String(e.id));
                              // Detectar condición actual correctamente
                              const condActual: "repitente"|"inclusion"|null =
                                e.esRepitente ? "repitente"
                                : e.tieneCondicionEspecial ? "inclusion"
                                : null;
                              setCondNueva(condActual);
                              setCondDescripcion(e.descripcionCondicion || "");
                              setCondBusqueda(e.nombre);
                            }}
                            style={{
                              display:"flex", alignItems:"center", justifyContent:"space-between",
                              padding:"9px 12px", cursor:"pointer",
                              borderBottom: i < arr.length-1 ? `1px solid ${C.gray100}` : "none",
                              background: seleccionado ? C.blueLight : C.white,
                            }}
                          >
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <Avatar nombre={e.nombre} />
                              <div>
                                <p style={{ margin:0, fontSize:13, fontWeight:600, color: seleccionado ? C.blue : C.gray800 }}>{e.nombre}</p>
                                <p style={{ margin:0, fontSize:11, color:C.gray400 }}>Grado {e.grado}</p>
                              </div>
                            </div>
                            {e.condicion && (
                              <span style={{
                                fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:6,
                                background: e.condicion==="repitente" ? C.amberLight : "#dbeafe",
                                color:      e.condicion==="repitente" ? C.amber       : "#1e40af",
                              }}>
                                {e.condicion==="repitente" ? "Repitente" : "Inclusión"}
                              </span>
                            )}
                          </div>
                        );
                      })
                    }
                    {estudiantes.filter(e => {
                      const q = condBusqueda.toLowerCase();
                      return e.nombre.toLowerCase().includes(q) || e.grado.includes(q);
                    }).length === 0 && (
                      <div style={{ padding:"14px", textAlign:"center", fontSize:12, color:C.gray400 }}>
                        Sin resultados.
                      </div>
                    )}
                  </div>
                )}
          
                {/* Chips de condición — solo visibles si hay estudiante seleccionado */}
                {condEstId !== null && (
                  <div style={{ marginBottom: condNueva ? 14 : 22 }}>
                    <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray700, marginBottom:8 }}>
                      Nueva condición
                    </label>
                    <div style={{ display:"flex", gap:8 }}>
                      {([
                        { val:null,         label:"Ninguna",   bg:C.gray100,    color:C.gray500 },
                        { val:"repitente",  label:"Repitente", bg:C.amberLight, color:C.amber   },
                        { val:"inclusion",  label:"Inclusión", bg:"#dbeafe",    color:"#1e40af" },
                      ] as const).map(op => (
                        <button
                          key={String(op.val)}
                          onClick={() => { setCondNueva(op.val); if (!op.val) setCondDescripcion(""); }}
                          style={{
                            flex:1, padding:"8px 4px", borderRadius:8, cursor:"pointer",
                            fontFamily:"inherit", fontSize:12, fontWeight:600,
                            border:`2px solid ${condNueva===op.val ? op.color : C.gray200}`,
                            background: condNueva===op.val ? op.bg : C.white,
                            color: condNueva===op.val ? op.color : C.gray400,
                          }}
                        >
                          {op.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campo descripción — solo visible si hay condición seleccionada */}
                {condEstId !== null && condNueva && (
                  <div style={{ marginBottom:22 }}>
                    <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray700, marginBottom:5 }}>
                      Descripción {condNueva === "repitente" ? "del repitente" : "de la condición de inclusión"}
                    </label>
                    <textarea
                      value={condDescripcion}
                      onChange={e => setCondDescripcion(e.target.value)}
                      placeholder={condNueva === "repitente" ? "Ej: Repite por bajo rendimiento en matemáticas..." : "Ej: Discapacidad visual, requiere materiales ampliados..."}
                      rows={3}
                      style={{
                        width:"100%", boxSizing:"border-box",
                        fontSize:12, padding:"8px 10px", borderRadius:7,
                        border:`1px solid ${C.gray200}`, background:C.white,
                        color:C.gray700, fontFamily:"inherit", resize:"vertical", outline:"none",
                      }}
                    />
                  </div>
                )}
          
                {/* Acciones */}
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                  <button
                    onClick={() => setModalCondicion(false)}
                    style={{ fontSize:13, padding:"8px 18px", borderRadius:8, cursor:"pointer", border:`1px solid ${C.gray200}`, background:C.white, color:C.gray500, fontFamily:"inherit" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={guardarCondicion}
                    disabled={condEstId === null || condGuardando}
                    style={{
                      fontSize:13, padding:"8px 18px", borderRadius:8, cursor: condEstId===null ? "not-allowed" : "pointer",
                      border:`1px solid ${condEstId===null || condGuardando ? C.gray200 : C.blue}`,
                      background: condEstId===null || condGuardando ? C.gray100 : C.blue,
                      color: condEstId===null || condGuardando ? C.gray400 : C.white,
                      fontFamily:"inherit", fontWeight:700,
                    }}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>

        {isMobile && (
          <BottomNav
            items={BOTTOM_NAV_COORDINADOR}
            navActivo={navActivo}
            onNav={ir}
            badges={{ alertas:alertasActivas, mensajes:noLeidos }}
          />
        )}
      </div>
    </div>
  );
}
