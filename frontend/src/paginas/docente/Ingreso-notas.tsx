import { useState,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGESTA } from "../../context/GESTAContext";
import {
  C, S, Semaforo, Avatar, Sidebar, BottomNav,
  NAV_DOCENTE, BOTTOM_NAV_DOCENTE,
  isMobileWidth,
} from "../../context/shared";
import { calificacionesAPI } from "../../services/api";

/* ─── TIPOS ──────────────────────────────────────────────────────── */
interface Actividad { id: number; nombre: string; peso: number; publicada?: boolean }
interface Estudiante { id: number; nombre: string; condicion?: string | null }
interface CursoData {
  abierto: boolean;
  actividades: Actividad[];
  estudiantes: Estudiante[];
  notas: Record<number, Record<number, string>>;
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
          <input type="text" placeholder="Ej: Taller 3 — Fracciones" value={nombre} onChange={e => setNombre(e.target.value)}
            style={{ ...S.input, padding: "8px 10px" }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Peso en el promedio (%)</label>
          <input type="number" min="1" max="100" value={peso} onChange={e => setPeso(e.target.value)}
            style={{ ...S.input, padding: "8px 10px" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.white, color: C.gray700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={() => { if (nombre.trim()) onConfirm({ nombre: nombre.trim(), peso: parseInt(peso) || 30, tipo }); }}
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
function formatearNota(raw: string): string {
  if (!raw) return "";
  const limpio = raw.replace(",", ".");
  const num = parseFloat(limpio);
  if (isNaN(num)) return "";
  if (num < 0)   return "0,0";
  if (num > 5)   return "5,0";
  return num.toFixed(1).replace(".", ",");
}

function parsearNota(val: string): number | null {
  const num = parseFloat(val.replace(",", "."));
  return isNaN(num) ? null : num;
}
/* ─── TABLA DE CURSO ─────────────────────────────────────────────── */
function TablaCurso({ nombreCurso, cursoData, onUpdate, isMobile }: {
  nombreCurso: string; cursoData: CursoData;
  onUpdate: (nombre: string, estId: number | null, actId: number | null, val: string | null, nuevaAct?: Actividad, publicarActId?: number, despublicarActId?: number) => void;
  isMobile: boolean;
}) {
  const { agregarMensaje } = useGESTA();
  const { actividades, estudiantes, notas } = cursoData;
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mensajePublicacion, setMensajePublicacion] = useState<{actId: number; nombre: string} | null>(null);

  // TODO: Reemplazar con el nombre del docente obtenido del contexto de autenticación
  const nombreDocente = "Docente";

const calcProm = (estId: number) => {
  if (actividades.length === 0) return null;
  let suma = 0, pesoCont = 0;
  actividades.forEach(a => {
    const raw = notas[estId]?.[a.id] || "";
    const n   = parsearNota(raw);
    if (n !== null) { suma += n * a.peso; pesoCont += a.peso; }
  });
  if (pesoCont === 0) return null;
  return (suma / pesoCont).toFixed(1).replace(".", ",");
};

  const setNota = (estId: number, actId: number, val: string) => {
    if (val !== "" && (parseFloat(val) < 0 || parseFloat(val) > 5)) return;
    onUpdate(nombreCurso, estId, actId, val);
    // TODO: Reemplazar con calificacionesAPI.guardarNota() para persistir en backend
  };

  const agregarActividad = (act: { nombre: string; peso: number; tipo: string }) => {
    const newId = actividades.length > 0 ? Math.max(...actividades.map(a => a.id)) + 1 : 1;
    onUpdate(nombreCurso, null, null, null, { ...act, id: newId, publicada: false });
    setMostrarModal(false);
    // TODO: Reemplazar con calificacionesAPI.crearActividad() para crear en backend
  };

  const publicarActividad = (actId: number) => {
    const actividad = actividades.find(a => a.id === actId);
    if (!actividad) return;

    onUpdate(nombreCurso, null, null, null, undefined, actId);

    // TODO: Reemplazar con calificacionesAPI.publicarNotas() para publicar en backend
    // TODO: Reemplazar agregarMensaje con mensajesAPI.enviarMensaje() cuando el backend esté conectado
    const fecha = new Date();
    const fechaStr = `${fecha.getHours()}:${fecha.getMinutes().toString().padStart(2, '0')}`;
    agregarMensaje({
      de: nombreDocente,
      rolDe: "Docente",
      para: "acudiente",
      asunto: `Notas publicadas: ${actividad.nombre} - ${nombreCurso}`,
      contenido: `Se han publicado las calificaciones de la actividad "${actividad.nombre}" para el curso ${nombreCurso}. Ya puede revisar las notas de su acudido en la plataforma.`,
      fecha: `Hoy ${fechaStr}`,
      leido: false,
      tipo: "notas"
    });

    setMensajePublicacion({ actId, nombre: actividad.nombre });
    setTimeout(() => setMensajePublicacion(null), 4000);
  };

  const despublicarActividad = (actId: number) => {
    onUpdate(nombreCurso, null, null, null, undefined, undefined, actId);
    // TODO: Reemplazar con calificacionesAPI.despublicarNotas() cuando el backend esté conectado
  };

  const getSinCalificarPorActividad = (actId: number) => {
    return estudiantes.filter(e => !notas[e.id]?.[actId] || notas[e.id][actId] === "").length;
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
      {/* Acciones */}
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.gray100}` }}>
        <button onClick={() => setMostrarModal(true)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1px dashed ${C.blue}`, background: C.blueLight, color: C.blue, fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
          + Agregar actividad
        </button>
      </div>

      {/* Mensaje de confirmación */}
      {mensajePublicacion && (
        <div style={{ padding: "10px 14px", background: C.greenLight, borderBottom: `1px solid ${C.gray100}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>
              Notas de "{mensajePublicacion.nombre}" publicadas correctamente
            </span>
          </div>
          <div style={{ fontSize: 11, color: C.green, paddingLeft: 24 }}>
            Se notificó a los acudientes
          </div>
        </div>
      )}

      {/* Avisos y publicación por actividad */}
      {actividades.length > 0 && (
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.gray100}`, background: C.gray50 }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: C.gray700 }}>Estado de publicación por actividad:</p>
          {actividades.map(act => {
            const sinCalificar = getSinCalificarPorActividad(act.id);
            const publicada = act.publicada || false;

            return (
              <div key={act.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8, padding: "8px 10px", background: C.white, borderRadius: 8, border: `1px solid ${C.gray200}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.gray800, marginBottom: 2 }}>
                    {act.nombre} ({act.peso}%)
                  </div>
                  {sinCalificar > 0 && !publicada && (
                    <div style={{ fontSize: 11, color: C.amber, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>⚠</span>
                      <span>{sinCalificar} estudiante(s) sin calificar</span>
                    </div>
                  )}
                  {publicada && (
                    <div style={{ fontSize: 11, color: C.green, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>✓</span>
                      <span>Publicada</span>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {publicada ? (
                    <>
                      <button
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "none",
                          background: C.greenLight,
                          color: C.green,
                          fontSize: 11,
                          cursor: "not-allowed",
                          fontWeight: 600,
                          fontFamily: "inherit",
                          minWidth: 80
                        }}>
                        ✓ Publicada
                      </button>
                      <button
                        onClick={() => despublicarActividad(act.id)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: `1px solid ${C.blue}`,
                          background: C.white,
                          color: C.blue,
                          fontSize: 11,
                          cursor: "pointer",
                          fontWeight: 600,
                          fontFamily: "inherit"
                        }}>
                        Editar
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={sinCalificar > 0}
                      onClick={() => publicarActividad(act.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "none",
                        background: sinCalificar > 0 ? C.gray200 : C.blue,
                        color: sinCalificar > 0 ? C.gray400 : C.white,
                        fontSize: 11,
                        cursor: sinCalificar > 0 ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        fontFamily: "inherit",
                        minWidth: 80
                      }}>
                      Publicar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista */}
      {actividades.length === 0 ? (
        <div style={{ padding: "24px", textAlign: "center", color: C.gray400, fontSize: 13 }}>Sin actividades. Agrega una para empezar.</div>
      ) : (
        estudiantes.map((est, estIndex) => {
          const prom  = calcProm(est.id);
          const nivel = prom !== null ? (parseFloat(prom) >= 3 ? "verde" : parseFloat(prom) >= 2 ? "amarillo" : "rojo") : null;
          
          return (
            <div key={est.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: estIndex < estudiantes.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
              
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
        
              {/* Inputs de notas */}
              <div style={{ display: "flex", gap: 8, flex: 1, overflowX: "auto" }}>
                {actividades.map((act, actIndex) => { 
                  const estaPublicada = act.publicada || false 
                  
                  return (
                    <div key={act.id} style={{ flexShrink: 0, textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: C.gray700, marginBottom: 3, whiteSpace: "nowrap" }}>
                        {act.nombre} ({act.peso}%)
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="—"
                        value={notas[est.id]?.[act.id] || ""}
                        
                        // Coordenadas de la celda (Fila = estIndex, Columna = actIndex)
                        data-curso={nombreCurso}
                        data-est={estIndex}
                        data-act={actIndex}
                        
                        onChange={ev => {
                          let val = ev.target.value.replace(/[^0-9]/g, ""); 
                          
                          if (val.length >= 2) {
                            val = `${val.substring(0, 1)},${val.substring(1, 2)}`;
                          }
                          
                          if (parseFloat(val.replace(",", ".")) > 5.0) {
                            val = "5,0";
                          }
                          
                          setNota(est.id, act.id, val);
                        }}
                        
                        onBlur={ev => {
                          const formateado = formatearNota(ev.target.value);
                          setNota(est.id, act.id, formateado);
                        }}
                        
                        onKeyDown={ev => {
                          // Variables para calcular la próxima coordenada
                          let nextEst = estIndex;
                          let nextAct = actIndex;
                          let seMovio = false;
                      
                          // Detectar qué tecla se presionó
                          if (ev.key === "ArrowDown" || ev.key === "Enter") {
                            nextEst = estIndex + 1; // Baja una fila
                            seMovio = true;
                          } else if (ev.key === "ArrowUp") {
                            nextEst = estIndex - 1; // Sube una fila
                            seMovio = true;
                          } else if (ev.key === "ArrowRight") {
                            nextAct = actIndex + 1; // Mueve a la derecha
                            seMovio = true;
                          } else if (ev.key === "ArrowLeft") {
                            nextAct = actIndex - 1; // Mueve a la izquierda
                            seMovio = true;
                          }
                      
                          // Si detectó un movimiento con las flechas o Enter
                          if (seMovio) {
                            ev.preventDefault(); // Evita que la pantalla baje o el cursor de texto se mueva
                            
                            // Busca el input con la nueva coordenada exacta
                            const nextInput = document.querySelector(
                              `input[data-curso="${nombreCurso}"][data-est="${nextEst}"][data-act="${nextAct}"]`
                            ) as HTMLInputElement;
                      
                            if (nextInput) {
                              nextInput.focus();
                              // (Opcional) Selecciona el texto automáticamente para que al digitar se reemplace la nota vieja
                              setTimeout(() => nextInput.select(), 10);
                            }
                          }
                        }}
                        
                        disabled={estaPublicada}
                        style={{
                          width: 60, textAlign: "center",
                          border: `1px solid ${C.gray200}`, borderRadius: 8,
                          padding: "7px 4px", fontSize: 14,
                          background: estaPublicada ? C.gray50 : C.white,
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                  );
                })}
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
      {mostrarModal && <ModalNuevaActividad onConfirm={agregarActividad} onClose={() => setMostrarModal(false)} />}
    </div>
  );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────────────────────── */
export default function IngresoNotas() {
  const navigate  = useNavigate();
  const [navActivo, setNavActivo] = useState("calificaciones");

  // TODO: Reemplazar con calificacionesAPI.getCursosConNotas(docenteId) cuando el backend esté conectado
  const [cursos, setCursos] = useState<Record<string, CursoData>>({});

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

  // Cargar datos desde la API al montar el componente
  useEffect(() => {
    // TODO: Reemplazar con calificacionesAPI.getCursosConNotas(docenteId) cuando el backend esté conectado
    try {
      calificacionesAPI.getCursosConNotas().then((data) => {
        setCursos(data as Record<string, CursoData>);
      }).catch(() => {
        console.warn("No se pudieron cargar los cursos de calificaciones desde la API. Se mostrará estado vacío hasta que el backend esté conectado.");
      });
    } catch (e) {
      console.warn("No se pudieron cargar los cursos de calificaciones desde la API:", e);
    }
  }, []);

  // TODO: Reemplazar con el nombre del docente obtenido del contexto de autenticación
  const nombreDocente = "Docente";

  const ir = (ruta: string, id?: string) => { if (id) setNavActivo(id); navigate(`/dashboard/${ruta}`); };

  const toggleCurso = (nombre: string) => {
    setCursos(prev => {
      const updated = { ...prev, [nombre]: { ...prev[nombre], abierto: !prev[nombre].abierto } };
      return updated;
    });
  };

  const handleUpdate = (nombreCurso: string, estId: number | null, actId: number | null, val: string | null, nuevaAct?: Actividad, publicarActId?: number, despublicarActId?: number) => {
    setCursos(prev => {
      const curso = { ...prev[nombreCurso] };
      if (nuevaAct) {
        curso.actividades = [...curso.actividades, nuevaAct];
        curso.notas = { ...curso.notas };
        curso.estudiantes.forEach(e => {
          curso.notas[e.id] = { ...curso.notas[e.id], [nuevaAct.id]: "" };
        });
        // TODO: Reemplazar con calificacionesAPI.crearActividad() para crear en backend
      } else if (publicarActId !== undefined) {
        curso.actividades = curso.actividades.map(a =>
          a.id === publicarActId ? { ...a, publicada: true } : a
        );
        // TODO: Reemplazar con calificacionesAPI.publicarNotas() para publicar en backend
      } else if (despublicarActId !== undefined) {
        curso.actividades = curso.actividades.map(a =>
          a.id === despublicarActId ? { ...a, publicada: false } : a
        );
        // TODO: Reemplazar con calificacionesAPI.despublicarNotas() cuando el backend esté conectado
      } else if (estId !== null && actId !== null && val !== null) {
        curso.notas = { ...curso.notas, [estId]: { ...curso.notas[estId], [actId]: val } };
        // TODO: Reemplazar con calificacionesAPI.guardarNota() para persistir en backend
      }
      const updated = { ...prev, [nombreCurso]: curso };
      return updated;
    });
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: C.gray100, fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 14, overflow: "hidden" }}>
      {!isMobile && (
        <Sidebar navGroups={NAV_DOCENTE} navActivo={navActivo} onNav={ir} usuario={nombreDocente} subUsuario="Docente · Mat. 6-9" />
      )}

      <div style={S.main}>
        {/* Topbar */}
        <header style={{ ...S.topbar, padding: isMobile ? "10px 16px" : "10px 24px" }}>
          {isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={S.logoIcon}>G</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.gray900 }}>Calificaciones</p>
                <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>Ingreso de notas</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray900 }}>Calificaciones — Ingreso de notas</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Colegio Integrado de Fontibón IBEP · Jornada mañana · Periodo 2</p>
            </div>
          )}
          <span style={{ background: C.blueLight, color: C.blueText, fontSize: isMobile ? 11 : 12, padding: isMobile ? "3px 8px" : "4px 12px", borderRadius: 12, fontWeight: 600 }}>
            3 alertas activas
          </span>
        </header>

        {/* Content */}
        <main style={{ ...S.content, padding: isMobile ? "12px" : "20px 24px" }}>
          {Object.entries(cursos).map(([nombre, data]) => (
            <div key={nombre} style={{ marginBottom: 10 }}>
              <button onClick={() => toggleCurso(nombre)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: C.white, border: `1px solid ${C.gray200}`, borderRadius: data.abierto ? "12px 12px 0 0" : 12, cursor: "pointer", borderBottom: data.abierto ? `1px solid ${C.gray100}` : `1px solid ${C.gray200}`, fontFamily: "inherit" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.gray800 }}>{nombre}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: C.gray400 }}>{data.estudiantes.length} est.</span>
                  <span style={{ fontSize: 12, color: C.gray400 }}>{data.abierto ? "▲" : "▼"}</span>
                </div>
              </button>
              {data.abierto && (
                <TablaCurso nombreCurso={nombre} cursoData={data} onUpdate={handleUpdate} isMobile={isMobile} />
              )}
            </div>
          ))}
        </main>

        {isMobile && (
          <BottomNav items={BOTTOM_NAV_DOCENTE} navActivo={navActivo} onNav={ir} />
        )}
      </div>
    </div>
  );
}