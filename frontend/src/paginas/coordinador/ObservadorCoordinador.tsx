import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  C, S, Semaforo, Avatar, Sidebar, BottomNav, TipoPill,
  NAV_COORDINADOR, BOTTOM_NAV_COORDINADOR,
  TIPO_OBS_META, TIPO_ICON_COLOR,
  isMobileWidth,
} from "../../context/shared";
import { observacionesAPI, coordinadorAPI } from "../../services/api";

/* ─── TIPOS ──────────────────────────────────────────────────────── */
type Obs = { id: string; tipo: string; descripcion: string; fecha: string; autor: string; es_positiva: boolean };
type Estudiante = { id: string; nombre: string; riesgo: string; num_observaciones: number; num_disciplinarias: number; num_seguimiento: number; num_logro: number; num_academica: number; observaciones: Obs[] };
type Curso = { id: string; nombre: string; num_estudiantes: number; num_observaciones: number; num_rojo: number; num_amarillo: number; estudiantes: Estudiante[] };
type ResumenObs = { total_estudiantes: number; total_observaciones: number; estudiantes_en_rojo: number; estudiantes_en_amarillo: number };

/* ─── CONSTANTES ──────────────────────────────────────────────────── */
const TIPOS = ["disciplinaria", "academica", "seguimiento", "logro", "asistencia"];
const TIPO_LABELS = {
  "disciplinaria": "Disciplinaria",
  "academica": "Académica",
  "seguimiento": "Seguimiento",
  "logro": "Logro",
  "asistencia": "Asistencia"
};

function countByTipo(obs: { tipo: string }[]) {
  return obs.reduce((acc: Record<string, number>, o) => { acc[o.tipo] = (acc[o.tipo] || 0) + 1; return acc; }, {});
}

/* ─── FORMULARIO ─────────────────────────────────────────────────── */
function FormObservacion({ titulo, estudiantes, form, setForm, onGuardar, onCancelar }: {
  titulo: string;
  estudiantes?: { id: string; nombre: string }[];
  form: { estId: string; tipo: string; desc: string };
  setForm: React.Dispatch<React.SetStateAction<{ estId: string; tipo: string; desc: string }>>;
  onGuardar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div style={{ ...S.card, background: C.gray50 }}>
      <div style={S.cardHead}>{titulo}</div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: estudiantes ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 12 }}>
          {estudiantes && (
            <div>
              <label style={S.label}>Estudiante</label>
              <select style={{ ...S.select, width: "100%", height: 32 }} value={form.estId} onChange={e => setForm(f => ({ ...f, estId: e.target.value }))}>
                <option value="">Selecciona un estudiante...</option>
                {estudiantes.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={S.label}>Tipo</label>
            <select style={{ ...S.select, width: "100%", height: 32 }} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t as keyof typeof TIPO_LABELS]}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Descripción</label>
          <textarea rows={3} placeholder="Describe la observación..." value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} style={{ ...S.input, resize: "vertical", padding: "6px 8px" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={{ ...S.btnPrimary, background: "transparent", color: C.gray500, border: `1px solid ${C.gray200}` }} onClick={onCancelar}>Cancelar</button>
          <button style={S.btnPrimary} onClick={onGuardar}>Guardar observación</button>
        </div>
      </div>
    </div>
  );
}

/* ─── DETALLE ESTUDIANTE ─────────────────────────────────────────── */
function DetalleEstudiante({ estudiante, cursoNombre, extraObs, onBack, onAddObs, isMobile, nombreUsuario }: {
  estudiante: Estudiante; cursoNombre: string;
  extraObs: Record<string, Obs[]>; onBack: () => void;
  onAddObs: (estId: string, obs: Obs) => void;
  isMobile: boolean;
  nombreUsuario: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ estId: "", tipo: "disciplinaria", desc: "" });
  const [isCreating, setIsCreating] = useState(false);
  const allObs = [...estudiante.observaciones, ...(extraObs[estudiante.id] || [])];
  const counts = countByTipo(allObs);

  async function guardar() {
    if (!form.desc.trim()) return;
    setIsCreating(true);
    try {
      await observacionesAPI.crearObservacion({
        estudianteId: estudiante.id,
        tipo: form.tipo,
        desc: form.desc.trim(),
        autor: nombreUsuario,
        rol: "coordinador"
      });
      // Agregar a estado local inmediatamente
      const newObs: Obs = {
        id: Date.now().toString(),
        tipo: form.tipo,
        descripcion: form.desc.trim(),
        fecha: new Date().toLocaleString('es-ES'),
        autor: nombreUsuario,
        es_positiva: false
      };
      onAddObs(estudiante.id, newObs);
      setForm({ estId: "", tipo: "Disciplinaria", desc: "" });
      setShowForm(false);
    } catch (err) {
      console.error("Error creando observación:", err);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, color: C.blue, background: "none", border: "none", padding: "0 0 12px", fontFamily: "inherit" }}>
        ← Volver a {cursoNombre}
      </button>

      <div style={S.card}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.gray100}`, display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 12, flexDirection: isMobile ? "column" : "row" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <Avatar nombre={estudiante.nombre} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.gray900 }}>{estudiante.nombre}</div>
              <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>
                {cursoNombre} · {estudiante.num_observaciones} observaciones
              </div>
            </div>
            <Semaforo nivel={estudiante.riesgo} />
          </div>
          <button style={{ ...S.btnPrimary, width: isMobile ? "100%" : "auto" }} onClick={() => setShowForm(v => !v)} disabled={isCreating}>
            {showForm ? "Cancelar" : "+ Nueva observación"}
          </button>
        </div>

        {/* Contadores */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3,1fr)" : `repeat(${TIPOS.length},1fr)` }}>
          {TIPOS.map((t, i) => (
            <div key={t} style={{ padding: "10px 14px", borderRight: i < TIPOS.length - 1 ? `1px solid ${C.gray100}` : "none", borderBottom: isMobile && i < 2 ? `1px solid ${C.gray100}` : "none" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: counts[t] ? TIPO_ICON_COLOR[t] : C.gray400 }}>{counts[t] || 0}</div>
              <div style={{ fontSize: 10, color: C.gray500, marginTop: 2 }}>{TIPO_OBS_META[t]?.label}</div>
            </div>
          ))}
        </div>
      </div>

      {showForm && <FormObservacion titulo="Nueva observación" form={form} setForm={setForm} onGuardar={guardar} onCancelar={() => setShowForm(false)} />}

      <div style={S.card}>
        <div style={S.cardHead}>
          <span>Todas las observaciones</span>
          <span style={{ fontSize: 11, color: C.gray400 }}>{allObs.length} registradas</span>
        </div>
        {allObs.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.gray400 }}>Sin observaciones registradas.</div>
        ) : (
          allObs.map((o, i) => (
            <div key={i} style={{ padding: "10px 16px", borderBottom: i < allObs.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <TipoPill tipo={o.tipo} />
                <span style={{ fontSize: 10, color: C.gray400 }}>{o.fecha}</span>
              </div>
              <p style={{ margin: "4px 0", fontSize: 12, color: C.gray700 }}>{o.descripcion}</p>
              <p style={{ margin: 0, fontSize: 10, color: o.autor.includes("Coordinador") ? C.blue : C.gray400, fontWeight: o.autor.includes("Coordinador") ? 600 : 400 }}>
                {o.autor}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BadgeCondicion({ tipo }: { tipo:string|null|undefined }) {
  if (!tipo) return null;
  const map: Record<string, { label:string; bg:string; color:string }> = {
    repitente: { label:"Rep", bg:"#fef3c7", color:"#92400e" },
    inclusion:  { label:"Inc", bg:"#ede9fe", color:"#5b21b6" },
  };
  const s = map[tipo];
  if (!s) return null;
  return (
    <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:4, background:s.bg, color:s.color, marginLeft:6, flexShrink:0 }}>
      {s.label}
    </span>
  );
}

/* ─── LISTA ESTUDIANTES ──────────────────────────────────────────── */
function ListaEstudiantes({ curso, extraObs, onSelectEst, isMobile }: {
  curso: Curso;
  extraObs: Record<string, Obs[]>;
  onSelectEst: (e: Estudiante) => void;
  isMobile: boolean;
}) {
  const totalObs = curso.estudiantes.reduce((s, e) => s + e.num_observaciones + (extraObs[e.id]?.length || 0), 0);
  const enRiesgo = curso.estudiantes.filter(e => e.riesgo === "alto").length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Estudiantes",   val: curso.num_estudiantes, color: C.gray900 },
          { label: "Observaciones", val: totalObs,              color: C.gray900 },
          { label: "En riesgo",     val: enRiesgo,              color: enRiesgo > 0 ? C.red : C.gray900 },
        ].map(st => (
          <div key={st.label} style={{ background: C.gray50, borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.gray200}` }}>
            <div style={{ fontSize: 11, color: C.gray500, marginBottom: 3 }}>{st.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: st.color }}>{st.val}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardHead}>Estudiantes — {curso.nombre}</div>
        {curso.estudiantes.map((e, i) => {
          const allObs = [...e.observaciones, ...(extraObs[e.id] || [])];
          const counts = countByTipo(allObs);
          const tipos  = Object.keys(counts).filter(t => counts[t] > 0);
          return (
            <div key={e.id} onClick={() => onSelectEst(e)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: isMobile ? "12px 14px" : "10px 16px", borderBottom: i < curso.estudiantes.length - 1 ? `1px solid ${C.gray100}` : "none", cursor: "pointer" }}
              onMouseEnter={ev => ev.currentTarget.style.background = C.gray50}
              onMouseLeave={ev => ev.currentTarget.style.background = C.white}>
              <Avatar nombre={e.nombre} />
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.gray800 }}>{e.nombre}</div>
                </div>
                <div style={{ display:"flex", gap:4, marginTop:3, flexWrap:"wrap" }}>
                  {tipos.length === 0
                    ? <span style={{ fontSize:10, color:C.gray400 }}>Sin observaciones</span>
                    : tipos.map(t => (
                        <span key={t} style={{ display:"inline-flex", padding:"1px 7px", borderRadius:9, fontSize:10, fontWeight:600, background:TIPO_OBS_META[t]?.bg, color:TIPO_OBS_META[t]?.color }}>
                          {TIPO_OBS_META[t]?.label} {counts[t]}
                        </span>
                      ))
                  }
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Semaforo nivel={e.riesgo} />
                <span style={{ fontSize: 11, color: C.gray400 }}>{allObs.length} obs.</span>
                <span style={{ color: C.gray400, fontSize: 14 }}>›</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── RESUMEN GLOBAL ─────────────────────────────────────────────── */
function ResumenGlobal({ cursos, resumen, extraObs, onSelectCurso, isMobile }: {
  cursos: Curso[];
  resumen: ResumenObs | null;
  extraObs: Record<string, Obs[]>;
  onSelectCurso: (id: string) => void;
  isMobile: boolean;
}) {
  const stats = resumen || {
    total_estudiantes: 0,
    total_observaciones: 0,
    estudiantes_en_rojo: 0,
    estudiantes_en_amarillo: 0,
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total estudiantes",      val: stats.total_estudiantes,      color: C.gray900 },
          { label: "Total observaciones",    val: stats.total_observaciones,    color: C.gray900 },
          { label: "En riesgo (Rojo)",       val: stats.estudiantes_en_rojo,    color: stats.estudiantes_en_rojo > 0 ? C.red : C.gray900 },
          { label: "En atención (Amarillo)", val: stats.estudiantes_en_amarillo, color: stats.estudiantes_en_amarillo > 0 ? "#92400e" : C.gray900 },
        ].map(st => (
          <div key={st.label} style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: C.gray500, marginBottom: 4 }}>{st.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: st.color }}>{st.val}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardHead}>
          <span>Todos los cursos</span>
          <span style={{ fontSize: 11, color: C.gray400 }}>{cursos.length} cursos</span>
        </div>
        {cursos.map((curso, i) => {
          const enRojo     = curso.estudiantes.filter(e => e.riesgo === "alto").length;
          const enAmarillo = curso.estudiantes.filter(e => e.riesgo === "medio").length;
          const totalObsCurso = curso.estudiantes.reduce((s, e) => s + e.num_observaciones + (extraObs[e.id]?.length || 0), 0);
          return (
            <div key={curso.id} onClick={() => onSelectCurso(curso.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: isMobile ? "12px 14px" : "12px 16px", borderBottom: i < cursos.length - 1 ? `1px solid ${C.gray100}` : "none", cursor: "pointer" }}
              onMouseEnter={ev => ev.currentTarget.style.background = C.gray50}
              onMouseLeave={ev => ev.currentTarget.style.background = C.white}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: C.blueLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.blueText, flexShrink: 0 }}>
                {curso.num_estudiantes}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.gray800 }}>{curso.nombre}</div>
                <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>
                  {curso.estudiantes.length} estudiantes · {totalObsCurso} observaciones
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {enRojo > 0 && (
                  <span style={{ fontSize: 11, background: "#fee2e2", color: C.red, padding: "2px 8px", borderRadius: 9, fontWeight: 600 }}>{enRojo} en riesgo</span>
                )}
                {enAmarillo > 0 && (
                  <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 9, fontWeight: 600 }}>{enAmarillo} en atención</span>
                )}
                <span style={{ color: C.gray400, fontSize: 14 }}>›</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────────────────────── */
export default function ObservadorCoordinador() {
  const navigate = useNavigate();
  const [navActivo, setNavActivo]       = useState("observador");
  const [cursoId,   setCursoId]         = useState<string | null>(null);
  const [estudianteSelec, setEstudianteSelec] = useState<Estudiante | null>(null);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState({ estId: "", tipo: "disciplinaria", desc: "" });
  const [extraObs, setExtraObs]         = useState<Record<string, Obs[]>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [resumen, setResumen] = useState<ResumenObs | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Datos del usuario autenticado
  const nombreUsuario = user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || "Usuario";
  const subUsuario = user?.rol ? user.rol.charAt(0).toUpperCase() + user.rol.slice(1) : "Usuario";

  // ── Estado dinámico para datos de cursos ──
  const [cursos, setCursos] = useState<Curso[]>([]);

  useEffect(() => {
    async function cargarDatos() {
      try {
        setLoading(true);
        const data = await coordinadorAPI.getObservador();
        setCursos(data.cursos || []);
        setResumen(data.resumen || null);
      } catch (err) {
        console.error("Error cargando datos del observador:", err);
      } finally {
        setLoading(false);
      }
    }
    cargarDatos();
  }, []);

  useEffect(() => {
    const breakpoint = 1280; 
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const curso = cursoId !== null ? cursos.find(c => c.id === cursoId) : null;
  const ir    = (ruta: string, id?: string) => { if (id) setNavActivo(id); navigate(`/dashboard/${ruta}`); };

  function addObs(estId: string, obs: Obs) {
    setExtraObs(prev => ({ ...prev, [estId]: [...(prev[estId] || []), obs] }));
  }

  async function guardarForm() {
    if (!form.estId || !form.desc.trim()) return;
    setShowForm(false); // Cerrar formulario mientras se envía
    const payload = {
      estudianteId: form.estId,
      tipo: form.tipo,
      desc: form.desc.trim(),
      autor: nombreUsuario,
      rol: "coordinador"
    };
    console.log("📝 Enviando observación:", payload);
    try {
      await observacionesAPI.crearObservacion(payload);
      // Agregar al estado local
      const newObs: Obs = {
        id: Date.now().toString(),
        tipo: form.tipo,
        descripcion: form.desc.trim(),
        fecha: new Date().toLocaleString('es-ES'),
        autor: nombreUsuario,
        es_positiva: false
      };
      addObs(form.estId, newObs);
      setForm({ estId: "", tipo: "disciplinaria", desc: "" });
      // Refrescar datos del backend
      try {
        const data = await coordinadorAPI.getObservador();
        setCursos(data.cursos || []);
        setExtraObs({}); // Limpiar observaciones locales ya que ahora están en el backend
      } catch (err) {
        console.warn("Error refrescando observaciones:", err);
      }
    } catch (err) {
      console.error("Error creando observación:", err);
      // Volver a mostrar form si hay error
      setShowForm(true);
    }
  }

  function cambiarCurso(val: string) {
    setCursoId(val === "" ? null : val);
    setEstudianteSelec(null);
    setShowForm(false);
  }

  return (
    <div style={S.app}>
      {!isMobile && (
        <Sidebar navGroups={NAV_COORDINADOR} navActivo={navActivo} onNav={ir} usuario={nombreUsuario} subUsuario={subUsuario} />
      )}

      <div style={S.main}>
        {/* Topbar */}
        <header style={{ ...S.topbar, padding: isMobile ? "10px 16px" : "10px 24px" }}>
          {isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={S.logoIcon}>G</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.gray900 }}>Observador</p>
                <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>{nombreUsuario} · {subUsuario}</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray900 }}>Observador estudiantil</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Colegio Integrado de Fontibón IBEP · Jornada mañana · Periodo 2</p>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ background: C.redLight, color: C.red, fontSize: isMobile ? 11 : 12, padding: isMobile ? "3px 8px" : "4px 12px", borderRadius: 12, fontWeight: 600 }}>
              0 alertas activas
            </span>
            {!isMobile && (
              <select style={S.select}><option>Periodo 2 · 2025</option><option>Periodo 1 · 2025</option></select>
            )}
          </div>
        </header>

        <main style={{ ...S.content, padding: isMobile ? "12px" : "18px 22px" }}>
          {estudianteSelec && curso ? (
            <DetalleEstudiante
              estudiante={estudianteSelec}
              cursoNombre={curso.nombre}
              extraObs={extraObs}
              onBack={() => { setEstudianteSelec(null); setShowForm(false); }}
              onAddObs={addObs}
              isMobile={isMobile}
              nombreUsuario={nombreUsuario}
            />
          ) : (
            <>
              {/* Controles */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.gray700 }}>Curso:</span>
                  <select style={{ ...S.select, height: 32, fontSize: 13 }} value={cursoId ?? ""} onChange={e => cambiarCurso(e.target.value)}>
                    <option value="">— Todos los cursos —</option>
                    {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                {curso && (
                  <button style={S.btnPrimary} onClick={() => setShowForm(v => !v)}>
                    {showForm ? "Cancelar" : "+ Nueva observación"}
                  </button>
                )}
              </div>

              {showForm && curso && (
                <FormObservacion
                  titulo={`Nueva observación — ${curso.nombre}`}
                  estudiantes={curso.estudiantes}
                  form={form}
                  setForm={setForm}
                  onGuardar={guardarForm}
                  onCancelar={() => setShowForm(false)}
                />
              )}

              {curso ? (
                <ListaEstudiantes
                  curso={curso}
                  extraObs={extraObs}
                  onSelectEst={e => { setEstudianteSelec(e); setShowForm(false); }}
                  isMobile={isMobile}
                />
              ) : (
                <ResumenGlobal cursos={cursos} resumen={resumen} extraObs={extraObs} onSelectCurso={id => setCursoId(id)} isMobile={isMobile} />
              )}
            </>
          )}
        </main>

        {isMobile && (
          <BottomNav items={BOTTOM_NAV_COORDINADOR} navActivo={navActivo} onNav={ir} />
        )}
      </div>
    </div>
  );
}
