import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  C, S, Semaforo, Avatar, Sidebar, BottomNav,
  NAV_COORDINADOR, BOTTOM_NAV_COORDINADOR,
} from "../../context/shared";
// TODO: Descomentar cuando el módulo de servicios API esté disponible
// import { calificacionesAPI } from "../../services/api";

/* ─── TIPOS ──────────────────────────────────────────────────────── */
interface Actividad { id: number; nombre: string; peso: number }
interface Estudiante { id: number; nombre: string; condicion?: string | null }
interface CursoData {
  abierto:     boolean;
  docente:     string;
  materia:     string;
  actividades: Actividad[];
  estudiantes: Estudiante[];
  notas:       Record<number, Record<number, string>>;
}

/* ─── MODAL NUEVA ACTIVIDAD ──────────────────────────────────────── */
function ModalNuevaActividad({ onConfirm, onClose }: {
  onConfirm: (act: { nombre: string; peso: number; tipo: string }) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [peso,   setPeso]   = useState("30");
  const [tipo,   setTipo]   = useState("Taller");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
      <div style={{ background: C.white, borderRadius: 16, padding: "28px", width: "100%", maxWidth: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <p style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: C.gray900 }}>Nueva actividad evaluativa</p>

        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Tipo de actividad</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ ...S.select, width: "100%", height: 36 }}>
            {["Taller", "Quiz", "Parcial", "Examen", "Proyecto", "Laboratorio", "Exposición"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Nombre de la actividad</label>
          <input type="text" placeholder="Ej: Taller 3 — Fracciones" value={nombre}
            onChange={e => setNombre(e.target.value)} style={{ ...S.input, padding: "8px 10px" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Peso en el promedio (%)</label>
          <input type="number" min="1" max="100" value={peso}
            onChange={e => setPeso(e.target.value)} style={{ ...S.input, padding: "8px 10px" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.white, color: C.gray700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          <button
            onClick={() => { if (nombre.trim()) onConfirm({ nombre: nombre.trim(), peso: parseInt(peso) || 30, tipo }); }}
            disabled={!nombre.trim()}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: nombre.trim() ? C.blue : C.gray200, color: nombre.trim() ? C.white : C.gray400, fontSize: 13, cursor: nombre.trim() ? "pointer" : "not-allowed", fontWeight: 600, fontFamily: "inherit" }}>
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

function BadgeCondicion({ tipo }: { tipo: string | null | undefined }) {
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

/* ─── TABLA DE CURSO ─────────────────────────────────────────────── */
function TablaCurso({ nombreCurso, cursoData, onUpdate, isMobile }: {
  nombreCurso: string;
  cursoData:   CursoData;
  onUpdate:    (nombre: string, estId: number | null, actId: number | null, val: string | null) => void;
  isMobile:    boolean;
}) {
  const { actividades, estudiantes, notas } = cursoData;
  const [publicado,  setPublicado]  = useState(false);
  const [modificado, setModificado] = useState(false);

  const calcProm = (estId: number) => {
    if (actividades.length === 0) return null;
    let suma = 0, pesoCont = 0;
    actividades.forEach(a => {
      const n = parseFloat(notas[estId]?.[a.id] || "");
      if (!isNaN(n)) { suma += n * a.peso; pesoCont += a.peso; }
    });
    return pesoCont === 0 ? null : (suma / pesoCont).toFixed(2);
  };

  const setNota = (estId: number, actId: number, val: string) => {
    if (val !== "" && (parseFloat(val) < 0 || parseFloat(val) > 5)) return;
    onUpdate(nombreCurso, estId, actId, val);
    if (publicado) setModificado(true);
  };

  const sinCalificar = estudiantes.filter(e =>
    actividades.some(a => !notas[e.id]?.[a.id])
  ).length;

  const puedePublicar = sinCalificar === 0 && actividades.length > 0 && (!publicado || modificado);

  return (
    <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>

      {/* Docente responsable */}
      <div style={{ padding: "8px 14px", background: C.gray50, borderBottom: `1px solid ${C.gray100}`, display: "flex", alignItems: "center", gap: 6 }}>
        <Avatar nombre={cursoData.docente} size={22} />
        <span style={{ fontSize: 11, color: C.gray500 }}>Docente responsable:</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.gray700 }}>{cursoData.docente}</span>
      </div>

      {/* Acciones */}
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.gray100}` }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            disabled={!puedePublicar}
            onClick={() => { setPublicado(true); setModificado(false); }}
            style={{
              width: "100%", padding: "8px", borderRadius: 8, border: "none",
              fontFamily: "inherit", fontWeight: 600, fontSize: 12,
              cursor: puedePublicar ? "pointer" : "not-allowed",
              background: publicado && !modificado
                ? C.greenLight
                : puedePublicar ? C.blue : C.gray200,
              color: publicado && !modificado
                ? C.green
                : puedePublicar ? C.white : C.gray400,
            }}>
            {publicado && !modificado ? "✓ Publicado" : "Publicar"}
          </button>
        </div>

        {/* Avisos debajo del botón */}
        {modificado && (
          <p style={{ margin: "8px 0 0", fontSize: 11, color: C.amber }}>
            ⚠ Notas modificadas — oprime "Publicar" para guardar los cambios.
          </p>
        )}
        {!modificado && sinCalificar > 0 && (
          <p style={{ margin: "8px 0 0", fontSize: 11, color: C.amber }}>
            ⚠ {sinCalificar} estudiante(s) sin calificar
          </p>
        )}
      </div>

      {/* Estudiantes */}
      {actividades.length === 0 ? (
        <div style={{ padding: "24px", textAlign: "center", color: C.gray400, fontSize: 13 }}>
          Sin actividades registradas.
        </div>
      ) : (
        estudiantes.map((est, i) => {
          const prom  = calcProm(est.id);
          const nivel = prom !== null
            ? (parseFloat(prom) >= 3 ? "verde" : parseFloat(prom) >= 2 ? "amarillo" : "rojo")
            : null;
          return (
            <div key={est.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i < estudiantes.length - 1 ? `1px solid ${C.gray100}` : "none" }}>

              {/* Nombre */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, width: isMobile ? 120 : 180, flexShrink: 0 }}>
                <Avatar nombre={est.nombre} size={28} />
                <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.gray800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {est.nombre}
                  </span>
                  <BadgeCondicion tipo={est.condicion} />
                </div>
              </div>

              {/* Inputs — siempre editables */}
              <div style={{ display: "flex", gap: 8, flex: 1, overflowX: "auto" }}>
                {actividades.map(act => (
                  <div key={act.id} style={{ flexShrink: 0, textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: C.gray700, marginBottom: 3, whiteSpace: "nowrap" }}>
                      {act.nombre} ({act.peso}%)
                    </div>
                    <input
                      type="number" min="0" max="5" step="0.1" placeholder="—"
                      value={notas[est.id]?.[act.id] || ""}
                      onChange={ev => setNota(est.id, act.id, ev.target.value)}
                      style={{
                        width: 52, textAlign: "center", borderRadius: 8,
                        padding: "6px 4px", fontSize: 13, fontFamily: "inherit",
                        border: `1px solid ${modificado ? C.amber : C.gray200}`,
                        background: modificado ? C.amberLight : C.white,
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Promedio y semáforo */}
              <div style={{ textAlign: "right", flexShrink: 0, minWidth: 70 }}>
                {prom && (
                  <div style={{ fontSize: 15, fontWeight: 700, color: nivel === "verde" ? C.green : nivel === "amarillo" ? "#d97706" : C.red }}>
                    {prom}
                  </div>
                )}
                {nivel && (
                  <Semaforo nivel={nivel} label={prom ? (parseFloat(prom) >= 3 ? "Aprobado" : "Reprobado") : ""} />
                )}
              </div>

            </div>
          );
        })
      )}
    </div>
  );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────────────────────── */
export default function CalificacionesCoordinador() {
  const navigate = useNavigate();

  /* ── Nombre del usuario (debe venir de la sesión / API) ── */
  // TODO: Reemplazar con datos del usuario autenticado cuando el backend esté conectado
  const nombreUsuario = "";

  const [navActivo,    setNavActivo]    = useState("calificaciones");
  // TODO: Reemplazar con calificacionesAPI.getCursosCoordinador() cuando el backend esté conectado
  const [cursos,       setCursos]       = useState<Record<string, CursoData>>({});
  const [filtroMateria, setFiltroMateria] = useState("Todas");
  const [filtroDocente, setFiltroDocente] = useState("Todos");
  // TODO: Reemplazar con datos del backend cuando esté conectado
  const [materias, setMaterias] = useState<string[]>(["Todas"]);
  const [docentes, setDocentes] = useState<string[]>(["Todos"]);
  const [isMobile,     setIsMobile]     = useState(false);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 1280);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // TODO: Reemplazar con calificacionesAPI.getCursosCoordinador() cuando el backend esté conectado
  useEffect(() => {
    try {
      // const data = await calificacionesAPI.getCursosCoordinador();
      // setCursos(data.cursos);
      // setMaterias(["Todas", ...data.materias]);
      // setDocentes(["Todos", ...data.docentes]);
      console.warn("CalificacionesCoordinador: datos de cursos no cargados — backend no conectado aún");
    } catch (error) {
      console.warn("Error cargando cursos:", error);
    }
  }, []);

  const ir = (ruta: string, id?: string) => { if (id) setNavActivo(id); navigate(`/dashboard/${ruta}`); };

  const toggleCurso = (nombre: string) => {
    setCursos(prev => ({ ...prev, [nombre]: { ...prev[nombre], abierto: !prev[nombre].abierto } }));
  };

  const handleUpdate = (
    nombreCurso: string,
    estId: number | null, actId: number | null, val: string | null,
  ) => {
    if (estId === null || actId === null || val === null) return;
    // TODO: Reemplazar con calificacionesAPI.guardarNota() para persistir en backend
    setCursos(prev => ({
      ...prev,
      [nombreCurso]: {
        ...prev[nombreCurso],
        notas: {
          ...prev[nombreCurso].notas,
          [estId]: { ...prev[nombreCurso].notas[estId], [actId]: val },
        },
      },
    }));
  };

  /* Filtrado */
  const cursosFiltrados = Object.entries(cursos).filter(([, data]) => {
    const okMateria = filtroMateria === "Todas" || data.materia === filtroMateria;
    const okDocente = filtroDocente === "Todos" || data.docente === filtroDocente;
    return okMateria && okDocente;
  });

  /* Mini estadísticas globales */
  const totalCursos    = cursosFiltrados.length;
  const totalEstudiantes = cursosFiltrados.reduce((s, [, d]) => s + d.estudiantes.length, 0);
  const cursosSinAct   = cursosFiltrados.filter(([, d]) => d.actividades.length === 0).length;

  return (
    <div style={{ display: "flex", height: "100vh", background: C.gray100, fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 14, overflow: "hidden" }}>

      {!isMobile && (
        <Sidebar navGroups={NAV_COORDINADOR} navActivo={navActivo} onNav={ir} usuario={nombreUsuario} subUsuario="Coordinador" />
      )}

      <div style={S.main}>

        {/* ── Topbar ── */}
        <header style={{ ...S.topbar, padding: isMobile ? "10px 16px" : "10px 24px" }}>
          {isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={S.logoIcon}>G</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.gray900 }}>Calificaciones</p>
                <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>Todos los cursos</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray900 }}>Calificaciones — Todos los cursos</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Colegio Integrado de Fontibón IBEP · Jornada mañana · Periodo 2</p>
            </div>
          )}
          <span style={{ background: C.redLight, color: C.red, fontSize: isMobile ? 11 : 12, padding: isMobile ? "3px 8px" : "4px 12px", borderRadius: 12, fontWeight: 600 }}>
            {isMobile ? "3 alertas" : "3 alertas activas"}
          </span>
        </header>

        {/* ── Contenido ── */}
        <main style={{ ...S.content, padding: isMobile ? "12px" : "20px 24px" }}>

          {/* Mini estadísticas */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 16 }}>
            {[
              { label: "Cursos",        val: totalCursos,       color: C.gray900 },
              { label: "Estudiantes",   val: totalEstudiantes,  color: C.gray900 },
              { label: "Sin actividades", val: cursosSinAct,    color: cursosSinAct > 0 ? C.amber : C.gray900 },
            ].map(stat => (
              <div key={stat.label} style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 10, padding: isMobile ? "9px 12px" : "10px 16px" }}>
                <div style={{ fontSize: 10, color: C.gray500, marginBottom: 2 }}>{stat.label}</div>
                <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: stat.color }}>{stat.val}</div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display: "flex", gap: 8, marginBottom: isMobile ? 10 : 14, flexWrap: isMobile ? "wrap" : "nowrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.gray500, flexShrink: 0 }}>Materia</label>
              <select
                value={filtroMateria}
                onChange={e => setFiltroMateria(e.target.value)}
                style={{ ...S.select, flex: 1, height: 30 }}>
                {materias.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.gray500, flexShrink: 0 }}>Docente</label>
              <select
                value={filtroDocente}
                onChange={e => setFiltroDocente(e.target.value)}
                style={{ ...S.select, flex: 1, height: 30 }}>
                {docentes.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Acordeón de cursos */}
          {cursosFiltrados.length === 0 ? (
            <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12, padding: 32, textAlign: "center", color: C.gray400, fontSize: 13 }}>
              No hay cursos que coincidan con los filtros seleccionados.
            </div>
          ) : (
            cursosFiltrados.map(([nombre, data]) => (
              <div key={nombre} style={{ marginBottom: 10 }}>
                <button
                  onClick={() => toggleCurso(nombre)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: C.white, border: `1px solid ${C.gray200}`, borderRadius: data.abierto ? "12px 12px 0 0" : 12, cursor: "pointer", borderBottom: data.abierto ? `1px solid ${C.gray100}` : `1px solid ${C.gray200}`, fontFamily: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.gray800 }}>{nombre}</span>
                    {/* Píldora de docente visible en desktop, compacta en mobile */}
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8, background: C.blueLight, color: C.blueText, fontWeight: 600 }}>
                      {isMobile ? data.docente.split(" ")[0] : data.docente}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {data.actividades.length === 0 && (
                      <span style={{ fontSize: 10, color: C.amber, fontWeight: 600 }}>Sin act.</span>
                    )}
                    <span style={{ fontSize: 11, color: C.gray400 }}>{data.estudiantes.length} est.</span>
                    <span style={{ fontSize: 12, color: C.gray400 }}>{data.abierto ? "▲" : "▼"}</span>
                  </div>
                </button>

                {data.abierto && (
                  <TablaCurso
                    nombreCurso={nombre}
                    cursoData={data}
                    onUpdate={handleUpdate}
                    isMobile={isMobile}
                  />
                )}
              </div>
            ))
          )}
        </main>

        {isMobile && (
          <BottomNav items={BOTTOM_NAV_COORDINADOR} navActivo={navActivo} onNav={ir} />
        )}
      </div>
    </div>
  );
}
