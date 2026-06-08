import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  C, S, SM, Semaforo, Avatar, Sidebar, BottomNav,
  IcoHome, IcoCheck, IcoEdit, IcoBell, IcoEye, IcoMsg,
  NAV_DOCENTE, BOTTOM_NAV_DOCENTE,
  isMobileWidth,
} from "../../context/shared";
import { docenteAPI, mapRiesgo } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

/* ─── TIPOS ─────────────────────────────────────────────────────── */
interface Curso {
  id: string;
  nombre: string;
  estudiantes: number;
  presentes: number;
  promedio: number;
  enRiesgo: number;
  estado: string;
}

interface EstudianteCurso {
  id: string;
  nombre: string;
  promedio: number;
  asistencia: number;
  obs: number;
  riesgo: string;
}

/* ─── DETALLE CURSO ──────────────────────────────────────────────── */
function DetalleCurso({ cursoId, isMobile, estudiantesPorCurso }: { 
  cursoId: string; 
  isMobile: boolean; 
  estudiantesPorCurso: Record<string, EstudianteCurso[]>  // ← string
}) {
  const estudiantes = estudiantesPorCurso[cursoId] || [];
  const riesgoLabel: Record<string, string> = { verde: "Verde", amarillo: "Amarillo", rojo: "Rojo" };

  if (isMobile) {
    return (
      <div style={{ borderTop: `1px solid ${C.gray100}` }}>
        {estudiantes.map((e, i) => (
          <div key={e.id} style={{ padding: "12px 14px", borderBottom: i < estudiantes.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar nombre={e.nombre} size={28} />
                <span style={{ fontSize: 13, fontWeight: 500, color: C.gray800 }}>{e.nombre}</span>
              </div>
              <Semaforo nivel={e.riesgo} label={riesgoLabel[e.riesgo]} />
            </div>
            <div style={{ display: "flex", gap: 12, paddingLeft: 36 }}>
              <span style={{ fontSize: 11, color: C.gray500 }}>Prom: <strong style={{ color: e.promedio < 3 ? C.red : C.gray800 }}>{e.promedio}</strong></span>
              <span style={{ fontSize: 11, color: C.gray500 }}>Asist: <strong>{e.asistencia}%</strong></span>
              <span style={{ fontSize: 11, color: C.gray500 }}>Obs: <strong>{e.obs}</strong></span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ borderTop: `1px solid ${C.gray100}` }}>
      <table style={S.table}>
        <thead>
          <tr>
            {["#", "Estudiante", "Promedio", "Asistencia", "Observaciones", "Riesgo", ""].map(h => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {estudiantes.map((e, i) => (
            <tr key={e.id} style={{ background: i % 2 === 0 ? C.white : C.gray50 }}>
              <td style={{ ...S.td, color: C.gray400, width: 40 }}>{String(i + 1).padStart(2, "0")}</td>
              <td style={S.td}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar nombre={e.nombre} size={28} />
                  <span style={{ fontWeight: 500, color: C.gray800 }}>{e.nombre}</span>
                </div>
              </td>
              <td style={{ ...S.td, fontWeight: 600, color: e.promedio < 3 ? C.red : C.gray800 }}>{e.promedio}</td>
              <td style={S.td}>{e.asistencia}%</td>
              <td style={S.td}>{e.obs} neg.</td>
              <td style={S.td}><Semaforo nivel={e.riesgo} label={riesgoLabel[e.riesgo]} /></td>
              <td style={S.td}>
                <button style={S.btnSm}>Ver perfil</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── CARD CURSO ─────────────────────────────────────────────────── */
function CardCurso({ curso, abierto, onToggle, isMobile, estudiantesPorCurso }: {
  curso: Curso; abierto: boolean; onToggle: () => void; isMobile: boolean; estudiantesPorCurso: Record<string, EstudianteCurso[]>;
}) {
  const estadoLabel: Record<string, string> = { verde: "Normal", amarillo: "Atención", rojo: "Crítico" };
  const riesgoNivel = curso.enRiesgo > 3 ? "rojo" : curso.enRiesgo > 1 ? "amarillo" : "verde";

  if (isMobile) {
    return (
      <div style={{ ...S.card, marginBottom: 10 }}>
        <div style={{ padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.gray900 }}>{curso.nombre}</span>
            <Semaforo nivel={curso.estado} label={estadoLabel[curso.estado]} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            {([["Estudiantes", curso.estudiantes], ["Asistencia", `${curso.presentes}/${curso.estudiantes}`], ["Promedio", curso.promedio]] as [string, string | number][]).map(([l, v]) => (
              <div key={l} style={{ background: C.gray50, borderRadius: 8, padding: "8px 10px" }}>
                <p style={{ margin: 0, fontSize: 10, color: C.gray400 }}>{l}</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray900 }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Semaforo nivel={riesgoNivel} label={`${curso.enRiesgo} en riesgo`} />
            <button onClick={onToggle} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, border: `1px solid ${abierto ? C.blue : C.gray200}`, background: abierto ? C.blueLight : C.white, color: abierto ? C.blue : C.gray700, cursor: "pointer", fontWeight: abierto ? 600 : 400 }}>
              {abierto ? "Ocultar lista" : "Ver detalle"}
            </button>
          </div>
        </div>
        {abierto && <DetalleCurso cursoId={curso.id} isMobile={true} estudiantesPorCurso={estudiantesPorCurso} />}
      </div>
    );
  }

  return (
    <div style={{ ...S.card, marginBottom: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 120px 90px 110px 120px 120px", alignItems: "center", padding: "14px 16px", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.gray900 }}>{curso.nombre}</p>
          <p style={{ margin: 0, fontSize: 11, color: C.gray400 }}>Docente titular · Jornada mañana</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, color: C.gray400 }}>Estudiantes</p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray900 }}>{curso.estudiantes}</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, color: C.gray400 }}>Asistencia hoy</p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray900 }}>{curso.presentes}/{curso.estudiantes}</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, color: C.gray400 }}>Promedio</p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray900 }}>{curso.promedio}</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, color: C.gray400, marginBottom: 4 }}>En riesgo</p>
          <Semaforo nivel={riesgoNivel} label={String(curso.enRiesgo)} />
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, color: C.gray400, marginBottom: 4 }}>Estado</p>
          <Semaforo nivel={curso.estado} label={estadoLabel[curso.estado]} />
        </div>
        <div style={{ textAlign: "right" }}>
          <button onClick={onToggle} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: `1px solid ${abierto ? C.blue : C.gray200}`, background: abierto ? C.blueLight : C.white, color: abierto ? C.blue : C.gray700, cursor: "pointer", fontWeight: abierto ? 600 : 400, display: "inline-flex", alignItems: "center", gap: 6 }}>
            {abierto ? "Ocultar" : "Ver detalle"}
            <span style={{ fontSize: 10 }}>{abierto ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>
      {abierto && <DetalleCurso cursoId={curso.id} isMobile={false} estudiantesPorCurso={estudiantesPorCurso} />}
    </div>
  );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────────────────────── */
export default function DashboardDocente() {
  const navigate = useNavigate();
  const [navActivo, setNavActivo] = useState("inicio");
  const [cursosAbiertos, setCursosAbiertos] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1280);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Nombre real desde AuthContext
  const { nombreCompleto } = useAuth();
  const userName = nombreCompleto() || "Docente";
  const userRole = "";

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [estudiantesPorCurso, setEstudiantesPorCurso] = useState<Record<string, EstudianteCurso[]>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        // ✅ getDashboard ya devuelve todo lo necesario: asignaturas con promedio,
        // asistencia y estudiantes con riesgo real
        const data = await docenteAPI.getDashboard();

        const cursosData = (data.asignaturas || []).map((a: any) => ({
          id: a.id,
          nombre: a.nombre,
          estudiantes: a.num_estudiantes ?? 0,
          // presentes se calcula desde porcentaje_asistencia_hoy
          presentes: a.porcentaje_asistencia_hoy != null
            ? Math.round((a.porcentaje_asistencia_hoy / 100) * (a.num_estudiantes ?? 0))
            : 0,
          promedio: a.promedio ?? 0,
          enRiesgo: a.estudiantes_en_riesgo ?? 0,
          estado: (a.estudiantes_en_riesgo ?? 0) > 3 ? "rojo"
                : (a.estudiantes_en_riesgo ?? 0) > 1 ? "amarillo"
                : "verde",
        }));
        setCursos(cursosData);

        // ✅ Estudiantes con datos reales de promedio, asistencia y riesgo
        const porCurso: Record<number, EstudianteCurso[]> = {};
        for (const a of data.asignaturas || []) {
          porCurso[a.id] = (a.estudiantes || []).map((e: any) => ({
            id: e.id,
            nombre: e.nombre,
            promedio: e.promedio ?? 0,
            asistencia: e.porcentaje_asistencia ?? 0,
            obs: e.num_observaciones ?? 0,
            riesgo: mapRiesgo(e.riesgo),
          }));
        }
        setEstudiantesPorCurso(porCurso);
      } catch (err) {
        console.warn("DashboardDocente: No se pudo cargar el dashboard", err);
      }
    }
    fetchData();
  }, []);

  const ir = (ruta: string, id?: string) => { if (id) setNavActivo(id); navigate(`/dashboard/${ruta}`); };
  const tog = (id: string) => setCursosAbiertos(prev => ({ ...prev, [id]: !prev[id] }));

  const totalEstudiantes = cursos.reduce((s, c) => s + c.estudiantes, 0);
  const totalPresentes = cursos.reduce((s, c) => s + c.presentes, 0);
  const totalEnRiesgo = cursos.reduce((s, c) => s + c.enRiesgo, 0);
  const pctAsistencia = totalEstudiantes > 0 ? Math.round((totalPresentes / totalEstudiantes) * 100) : 0;

  const STAT_CARDS = [
    { label: "Mis cursos", value: String(cursos.length), sub: cursos.map(c => c.nombre.replace("Matemáticas ", "")).join(", ") || "sin cursos" },
    { label: "Estudiantes total", value: String(totalEstudiantes), sub: "activos este periodo" },
    { label: "En riesgo", value: String(totalEnRiesgo), sub: "requieren atención", color: C.red },
    { label: "Asistencia hoy", value: `${pctAsistencia}%`, sub: `${totalPresentes} / ${totalEstudiantes} presentes`, color: C.green },
  ];

  return (
    <div style={S.app}>
      {!isMobile && (
        <Sidebar
          navGroups={NAV_DOCENTE}
          navActivo={navActivo}
          onNav={ir}
          usuario={userName || "Docente"}
          subUsuario={userRole}
        />
      )}

      <div style={S.main}>
        <header style={{ ...S.topbar, padding: isMobile ? "10px 16px" : "10px 24px" }}>
          {isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={S.logoIcon}>G</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.gray900 }}>Panel docente</p>
                <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>{userName || "Docente"} · Jornada mañana</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray900 }}>Panel del docente</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Colegio Integrado de Fontibón IBEP · Jornada mañana · Periodo 2</p>
            </div>
          )}
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.gray900 }}>Mis cursos</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Matemáticas · Periodo 2 · 2025</p>
            </div>
            <span style={{ fontSize: 12, color: C.gray500, background: C.gray100, padding: "4px 10px", borderRadius: 8 }}>
              {cursos.length} cursos asignados
            </span>
          </div>

          {cursos.map(c => (
            <CardCurso key={c.id} curso={c} abierto={!!cursosAbiertos[c.id]} onToggle={() => tog(c.id)} isMobile={isMobile} estudiantesPorCurso={estudiantesPorCurso} />
          ))}
        </main>

        {isMobile && (
          <BottomNav items={BOTTOM_NAV_DOCENTE} navActivo={navActivo} onNav={ir} />
        )}
      </div>
    </div>
  );
}
