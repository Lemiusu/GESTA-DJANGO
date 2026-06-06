import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  C, S, Semaforo, Avatar, Sidebar, BottomNav,
  NAV_COORDINADOR, BOTTOM_NAV_COORDINADOR,
  isMobileWidth,
} from "../../context/shared";
// TODO: Descomentar cuando el módulo de servicios API esté disponible
// import { asistenciaAPI } from "../../services/api";

/* ─── TIPOS ──────────────────────────────────────────────────────── */
interface EstudianteAsistencia {
  id: number;
  nombre: string;
  estado: string;
}

interface CursoAsistencia {
  id: string;
  presentes: number;
  total: number;
  estudiantes: EstudianteAsistencia[];
}

interface GradoAsistencia {
  grado: string;
  cursos: CursoAsistencia[];
}

/* ─── COMPONENTE ──────────────────────────────────────────────── */
export default function AsistenciaCoordinador() {
  const navigate   = useNavigate();
  const isMobile   = isMobileWidth();

  /* ── Nombre del usuario (debe venir de la sesión / API) ── */
  // TODO: Reemplazar con datos del usuario autenticado cuando el backend esté conectado
  const nombreUsuario = "";
  const inicialesUsuario = "";

  const [navActivo,    setNavActivo]    = useState("asistencia");
  // TODO: Reemplazar con asistenciaAPI.getAsistenciaGrados() cuando el backend esté conectado
  const [gradosAsistencia] = useState<GradoAsistencia[]>([]);
  const [gradoAbierto, setGradoAbierto] = useState<string|null>(null);
  const [cursoActivo,  setCursoActivo]  = useState<string|null>(null);

  // TODO: Reemplazar con asistenciaAPI.getAsistenciaGrados() cuando el backend esté conectado
  useEffect(() => {
    try {
      // const data = await asistenciaAPI.getAsistenciaGrados();
      // setGradosAsistencia(data);
      console.warn("AsistenciaCoordinador: datos de asistencia no cargados — backend no conectado aún");
    } catch (error) {
      console.warn("Error cargando asistencia:", error);
    }
  }, []);

  const ir = (ruta:string, id:string) => { setNavActivo(id); navigate(`/dashboard/${ruta}`); };

  // Totales globales
  const totalPresentes = gradosAsistencia.flatMap(g => g.cursos).reduce((s,c) => s+c.presentes, 0);
  const totalEst       = gradosAsistencia.flatMap(g => g.cursos).reduce((s,c) => s+c.total, 0);
  const pctGlobal      = totalEst > 0 ? Math.round((totalPresentes/totalEst)*100) : 0;

  // Curso seleccionado
  const cursoData = gradosAsistencia
    .flatMap(g => g.cursos)
    .find(c => c.id === cursoActivo);

  const nivelPct = (pct:number) => pct>=90?"verde":pct>=80?"amarillo":"rojo";
  const barColor = (nivel:string) => nivel==="verde"?"#16a34a":nivel==="amarillo"?"#d97706":C.red;

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
        {/* Topbar */}
        <header style={{ ...S.topbar, padding:isMobile?"10px 16px":"12px 28px" }}>
          {isMobile ? (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={S.logoIcon}>G</div>
              <div>
                <p style={{ margin:0, fontSize:15, fontWeight:700, color:C.gray900 }}>Asistencia</p>
                <p style={{ margin:0, fontSize:12, color:C.gray500 }}>Todos los grados · Hoy</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin:0, fontSize:17, fontWeight:700, color:C.gray900 }}>Asistencia — Todos los grados</p>
              <p style={{ margin:"2px 0 0", fontSize:13, color:C.gray500 }}>Colegio Integrado de Fontibón IBEP · Jornada mañana · Hoy</p>
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ textAlign:"right" }}>
              <p style={{ margin:0, fontSize:isMobile?18:22, fontWeight:700, color:pctGlobal>=90?C.green:pctGlobal>=80?"#d97706":C.red }}>{pctGlobal}%</p>
              <p style={{ margin:0, fontSize:11, color:C.gray400 }}>{totalPresentes}/{totalEst} presentes</p>
            </div>
          </div>
        </header>

        <main style={{ ...S.content, padding:isMobile?"12px":"20px 28px", display:"flex", gap:16, overflow:"hidden" }}>

          {/* Panel izquierdo: árbol grados → cursos */}
          <div style={{ width:isMobile?"100%":280, flexShrink:0, overflowY:"auto" }}>
            {gradosAsistencia.length === 0 ? (
              <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, padding:32, textAlign:"center", color:C.gray400, fontSize:13 }}>
                No hay datos de asistencia disponibles.
              </div>
            ) : gradosAsistencia.map(g => {
              const totalG   = g.cursos.reduce((s,c)=>s+c.total,0);
              const presG    = g.cursos.reduce((s,c)=>s+c.presentes,0);
              const pctG     = totalG > 0 ? Math.round((presG/totalG)*100) : 0;
              const nivelG   = nivelPct(pctG);
              const abierto  = gradoAbierto === g.grado;

              return (
                <div key={g.grado} style={{ marginBottom:8 }}>
                  {/* Header del grado */}
                  <button
                    onClick={() => setGradoAbierto(abierto?null:g.grado)}
                    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:C.white, border:`1px solid ${C.gray200}`, borderRadius:abierto?"10px 10px 0 0":10, cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}
                  >
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:8, background:C.blueLight, color:C.blueText, fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {g.grado}
                      </div>
                      <div>
                        <p style={{ margin:0, fontSize:14, fontWeight:600, color:C.gray900 }}>Grado {g.grado}</p>
                        <p style={{ margin:0, fontSize:11, color:C.gray400 }}>{g.cursos.length} cursos · {presG}/{totalG}</p>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Semaforo nivel={nivelG} label={`${pctG}%`} />
                      <span style={{ fontSize:12, color:C.gray400 }}>{abierto?"▲":"▼"}</span>
                    </div>
                  </button>

                  {/* Cursos del grado */}
                  {abierto && (
                    <div style={{ border:`1px solid ${C.gray200}`, borderTop:"none", borderRadius:"0 0 10px 10px", overflow:"hidden" }}>
                      {g.cursos.map((curso, ci) => {
                        const pctC  = curso.total > 0 ? Math.round((curso.presentes/curso.total)*100) : 0;
                        const nivel = nivelPct(pctC);
                        const activo = cursoActivo === curso.id;
                        return (
                          <button
                            key={curso.id}
                            onClick={() => setCursoActivo(curso.id)}
                            style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 14px 9px 24px", background:activo?C.blueLight:C.white, border:"none", borderBottom:ci<g.cursos.length-1?`1px solid ${C.gray100}`:"none", cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}
                          >
                            <div>
                              <p style={{ margin:0, fontSize:13, fontWeight:activo?700:500, color:activo?C.blue:C.gray800 }}>Curso {curso.id}</p>
                              <p style={{ margin:0, fontSize:11, color:C.gray400 }}>{curso.presentes}/{curso.total} presentes</p>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <div style={{ width:48, height:5, background:C.gray200, borderRadius:3 }}>
                                <div style={{ width:`${pctC}%`, height:5, background:barColor(nivel), borderRadius:3 }} />
                              </div>
                              <span style={{ fontSize:11, fontWeight:600, color:barColor(nivel) }}>{pctC}%</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Panel derecho: lista estudiantes del curso */}
          {!isMobile && (
            <div style={{ flex:1, overflowY:"auto" }}>
              {cursoData ? (
                <div style={S.card}>
                  {/* Header */}
                  <div style={{ ...S.cardHead }}>
                    <div>
                      <span style={{ fontSize:15, fontWeight:700, color:C.gray900 }}>Curso {cursoData.id}</span>
                      <span style={{ fontSize:13, color:C.gray500, marginLeft:10 }}>{cursoData.presentes}/{cursoData.total} presentes hoy</span>
                    </div>
                    <Semaforo nivel={nivelPct(cursoData.total > 0 ? Math.round((cursoData.presentes/cursoData.total)*100) : 0)} label={`${cursoData.total > 0 ? Math.round((cursoData.presentes/cursoData.total)*100) : 0}%`} />
                  </div>

                  {/* Barra global del curso */}
                  <div style={{ padding:"10px 18px", borderBottom:`1px solid ${C.gray100}`, display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ flex:1, background:C.gray200, borderRadius:4, height:8 }}>
                      <div style={{ width:`${cursoData.total > 0 ? Math.round((cursoData.presentes/cursoData.total)*100) : 0}%`, height:8, borderRadius:4, background:barColor(nivelPct(cursoData.total > 0 ? Math.round((cursoData.presentes/cursoData.total)*100) : 0)), transition:"width 0.3s" }} />
                    </div>
                    <span style={{ fontSize:12, color:C.gray400, flexShrink:0 }}>
                      {cursoData.total - cursoData.presentes} ausente{cursoData.total-cursoData.presentes!==1?"s":""}
                    </span>
                  </div>

                  {/* Tabla estudiantes */}
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {["#","Estudiante","Estado del día"].map(h=>(
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cursoData.estudiantes.map((est, i) => (
                        <tr key={est.id} style={{ background:i%2===0?C.white:C.gray50 }}>
                          <td style={{ ...S.td, color:C.gray400, width:44 }}>{String(i+1).padStart(2,"0")}</td>
                          <td style={S.td}>
                            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                              <Avatar nombre={est.nombre} />
                              <span style={{ fontSize:13, fontWeight:500, color:C.gray800 }}>{est.nombre}</span>
                            </div>
                          </td>
                          <td style={S.td}>
                            <span style={{ fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:8, background:est.estado==="P"?C.greenLight:C.redLight, color:est.estado==="P"?C.green:C.red }}>
                              {est.estado==="P"?"Presente":"Ausente"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ ...S.card, display:"flex", alignItems:"center", justifyContent:"center", minHeight:300, color:C.gray400, fontSize:14 }}>
                  Selecciona un curso para ver la asistencia
                </div>
              )}
            </div>
          )}
        </main>

        {isMobile && (
          <BottomNav
            items={BOTTOM_NAV_COORDINADOR}
            navActivo={navActivo}
            onNav={ir}
            badges={{}}
          />
        )}
      </div>
    </div>
  );
}
