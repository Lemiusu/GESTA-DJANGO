import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  C, S, Semaforo, Avatar, Sidebar, BottomNav, TipoPill,
  NAV_COORDINADOR, BOTTOM_NAV_COORDINADOR,
  TIPO_OBS_META, TIPO_ICON_COLOR,
  isMobileWidth,
} from "../../context/shared";
// TODO: Descomentar cuando el backend esté conectado
// import { observacionesAPI, cursosAPI } from "../../services/api";

/* ─── TIPOS ──────────────────────────────────────────────────────── */
type Obs = { tipo: string; desc: string; fecha: string; autor: string };
type Estudiante = { id:number; nombre:string; riesgo:string; asistencia:number; promedio:number; obs:Obs[]; condicion?:string|null }
type Curso = { id: number; nombre: string; estudiantes: Estudiante[] };

/* ─── DATOS (reemplazados por estados vacíos, pendiente backend) ── */
// TODO: Reemplazar con cursosAPI.getCursosCoordinador() cuando el backend esté conectado
// TODO: Reemplazar con observacionesAPI.getObservacionesCurso(cursoId) cuando el backend esté conectado
const TIPOS = ["Disciplinaria", "Académica", "Seguimiento", "Logro", "Asistencia"];

function countByTipo(obs: { tipo: string }[]) {
  return obs.reduce((acc: Record<string, number>, o) => { acc[o.tipo] = (acc[o.tipo] || 0) + 1; return acc; }, {});
}

/* ─── FORMULARIO ─────────────────────────────────────────────────── */
function FormObservacion({ titulo, estudiantes, form, setForm, onGuardar, onCancelar }: {
  titulo: string;
  estudiantes?: { id: number; nombre: string }[];
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
              {TIPOS.map(t => <option key={t}>{t}</option>)}
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
  extraObs: Record<number, Obs[]>; onBack: () => void;
  onAddObs: (estId: number, obs: Obs) => void;
  isMobile: boolean;
  nombreUsuario: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ estId: "", tipo: "Académica", desc: "" });
  const allObs = [...estudiante.obs, ...(extraObs[estudiante.id] || [])];
  const counts = countByTipo(allObs);

  function guardar() {
    if (!form.desc.trim()) return;
    // TODO: Reemplazar con observacionesAPI.crearObservacion() para persistir en backend
    onAddObs(estudiante.id, { tipo: form.tipo, desc: form.desc.trim(), fecha: "Ahora", autor: nombreUsuario });
    setForm({ estId: "", tipo: "Académica", desc: "" });
    setShowForm(false);
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
                {cursoNombre} · Asistencia {estudiante.asistencia}% · Promedio {estudiante.promedio}
              </div>
            </div>
            <Semaforo nivel={estudiante.riesgo} />
          </div>
          <button style={{ ...S.btnPrimary, width: isMobile ? "100%" : "auto" }} onClick={() => setShowForm(v => !v)}>
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
              <p style={{ margin: "4px 0", fontSize: 12, color: C.gray700 }}>{o.desc}</p>
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
  extraObs: Record<number, Obs[]>;
  onSelectEst: (e: Estudiante) => void;
  isMobile: boolean;
}) {
  const totalObs = curso.estudiantes.reduce((s, e) => s + e.obs.length + (extraObs[e.id]?.length || 0), 0);
  const enRiesgo = curso.estudiantes.filter(e => e.riesgo === "rojo").length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Estudiantes",   val: curso.estudiantes.length, color: C.gray900 },
          { label: "Observaciones", val: totalObs,                  color: C.gray900 },
          { label: "En riesgo",     val: enRiesgo,                  color: enRiesgo > 0 ? C.red : C.gray900 },
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
          const allObs = [...e.obs, ...(extraObs[e.id] || [])];
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
                  <BadgeCondicion tipo={e.condicion} />
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
function ResumenGlobal({ cursos, extraObs, onSelectCurso, isMobile }: {
  cursos: Curso[];
  extraObs: Record<number, Obs[]>;
  onSelectCurso: (id: number) => void;
  isMobile: boolean;
}) {
  const totalEst  = cursos.reduce((s, c) => s + c.estudiantes.length, 0);
  const totalRojo = cursos.reduce((s, c) => s + c.estudiantes.filter(e => e.riesgo === "rojo").length, 0);
  const totalAmar = cursos.reduce((s, c) => s + c.estudiantes.filter(e => e.riesgo === "amarillo").length, 0);
  const totalObs  = cursos.reduce((s, c) => s + c.estudiantes.reduce((ss, e) => ss + e.obs.length + (extraObs[e.id]?.length || 0), 0), 0);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total estudiantes",      val: totalEst,  color: C.gray900 },
          { label: "Total observaciones",    val: totalObs,  color: C.gray900 },
          { label: "En riesgo (Rojo)",       val: totalRojo, color: totalRojo > 0 ? C.red : C.gray900 },
          { label: "En atención (Amarillo)", val: totalAmar, color: totalAmar > 0 ? "#92400e" : C.gray900 },
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
          const enRojo     = curso.estudiantes.filter(e => e.riesgo === "rojo").length;
          const enAmarillo = curso.estudiantes.filter(e => e.riesgo === "amarillo").length;
          const totalObsCurso = curso.estudiantes.reduce((s, e) => s + e.obs.length + (extraObs[e.id]?.length || 0), 0);
          return (
            <div key={curso.id} onClick={() => onSelectCurso(curso.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: isMobile ? "12px 14px" : "12px 16px", borderBottom: i < cursos.length - 1 ? `1px solid ${C.gray100}` : "none", cursor: "pointer" }}
              onMouseEnter={ev => ev.currentTarget.style.background = C.gray50}
              onMouseLeave={ev => ev.currentTarget.style.background = C.white}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: C.blueLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.blueText, flexShrink: 0 }}>
                {curso.estudiantes.length}
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
  const [cursoId,   setCursoId]         = useState<number | null>(null);
  const [estudianteSelec, setEstudianteSelec] = useState<Estudiante | null>(null);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState({ estId: "", tipo: "Académica", desc: "" });
  const [extraObs, setExtraObs]         = useState<Record<number, Obs[]>>({});
  const [isMobile, setIsMobile] = useState(false);

  // TODO: Reemplazar con datos del contexto de autenticación / login response
  const nombreUsuario = "";  // TODO: Reemplazar con authContext.usuario.nombre cuando el backend esté conectado
  const subUsuario = "";     // TODO: Reemplazar con authContext.usuario.sub cuando el backend esté conectado

  // ── Estado dinámico para datos de cursos ──
  // TODO: Reemplazar con cursosAPI.getCursosCoordinador() cuando el backend esté conectado
  const [cursos, setCursos] = useState<Curso[]>([]);

  useEffect(() => {
    // TODO: Reemplazar con cursosAPI.getCursosCoordinador() cuando el backend esté conectado
    try {
      // const data = await cursosAPI.getCursosCoordinador();
      // setCursos(data);
      console.warn("ObservadorCoordinador: cursosAPI.getCursosCoordinador() no implementado — usando estado vacío");
    } catch (err) {
      console.warn("ObservadorCoordinador: Error cargando cursos", err);
    }
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

  function addObs(estId: number, obs: Obs) {
    // TODO: Reemplazar con observacionesAPI.crearObservacion() para persistir en backend
    setExtraObs(prev => ({ ...prev, [estId]: [...(prev[estId] || []), obs] }));
  }

  function guardarForm() {
    if (!form.estId || !form.desc.trim()) return;
    // TODO: Reemplazar con observacionesAPI.crearObservacion() para persistir en backend
    addObs(parseInt(form.estId), { tipo: form.tipo, desc: form.desc.trim(), fecha: "Ahora", autor: nombreUsuario });
    setForm({ estId: "", tipo: "Académica", desc: "" });
    setShowForm(false);
  }

  function cambiarCurso(val: string) {
    setCursoId(val === "" ? null : parseInt(val));
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
                <ResumenGlobal cursos={cursos} extraObs={extraObs} onSelectCurso={id => setCursoId(id)} isMobile={isMobile} />
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
