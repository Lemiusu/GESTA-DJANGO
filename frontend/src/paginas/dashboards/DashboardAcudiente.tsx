import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGESTA } from "../../context/GESTAContext";
import {
  C, S, SM, Semaforo, Sidebar, BottomNav, CardSeccion,
  IcoHome, IcoBook, IcoBell, IcoEye, IcoMsg,
  NAV_ACUDIENTE, BOTTOM_NAV_ACUDIENTE,
  isMobileWidth,
} from "../../context/shared";
import { acudienteAPI, estudianteAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

/* ─── TIPOS ─────────────────────────────────────────────────────── */
type EstudianteVinculado = {
  id: number;
  nombre: string;
  grado: string;
  jornada: string;
};

type DatosEstudiante = {
  riesgo: string;
  promedio: number;
  asistencia: number;
  materiasPerdidas: number;
  observacionesNeg: number;
  observacionesPos: number;
  materias: { nombre: string; promedio: number; perdida: boolean; notas: { desc: string; valor: number }[] }[];
  observaciones: { fecha: string; tipo: string; contenido: string; autor: string; rol: string }[];
  notificaciones: { fecha: string; tipo: string; mensaje: string; leida: boolean }[];
};

/* ─── SUBCOMPONENTES ─────────────────────────────────────────────── */
function ContenidoMaterias({ datos, isMobile }: { datos: DatosEstudiante; isMobile: boolean }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  if (!datos.materias || datos.materias.length === 0) {
    return <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.gray400 }}>Sin datos de materias.</div>;
  }
  return (
    <div>
      {datos.materias.map((m, i) => (
        <div key={i}>
          <div onClick={() => setAbierta(abierta === i ? null : i)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "10px 14px" : "10px 16px", cursor: "pointer", borderBottom: `1px solid ${C.gray100}`, background: abierta === i ? C.gray50 : C.white }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.gray800 }}>{m.nombre}</span>
              {m.perdida && <Semaforo nivel="rojo" label="Reprobada" />}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: m.promedio < 3 ? C.red : C.gray800 }}>{m.promedio.toFixed(1)}</span>
              <span style={{ fontSize: 10, color: C.gray400 }}>{abierta === i ? "▲" : "▼"}</span>
            </div>
          </div>
          {abierta === i && (
            <div style={{ background: C.gray50, padding: "8px 16px 12px", borderBottom: `1px solid ${C.gray100}` }}>
              {m.notas.map((n, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: j < m.notas.length - 1 ? `1px solid ${C.gray200}` : "none" }}>
                  <span style={{ fontSize: 12, color: C.gray700 }}>{n.desc}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: n.valor < 3 ? C.red : C.gray800 }}>{n.valor.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ContenidoObsAcudiente({ datos, isMobile }: { datos: DatosEstudiante; isMobile: boolean }) {
  const tipoColor: Record<string, { bg: string; color: string }> = {
    Disciplinaria: { bg: C.redLight, color: C.red },
    "Académica":   { bg: C.amberLight, color: C.amber },
    Positiva: { bg: C.greenLight, color: C.green },
    Seguimiento: { bg: C.blueLight, color: C.blueText },
    Logro:         { bg: C.greenLight, color: C.green },
  };
  if (!datos.observaciones || datos.observaciones.length === 0) {
    return <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.gray400 }}>Sin observaciones.</div>;
  }
  return (
    <div>
      {datos.observaciones.slice(0, 3).map((o, i) => {
        const c = tipoColor[o.tipo] || tipoColor.Seguimiento;
        return (
          <div key={i} style={{ padding: isMobile ? "10px 14px" : "10px 16px", borderBottom: i < 2 ? `1px solid ${C.gray100}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: c.bg, color: c.color, fontWeight: 600 }}>{o.tipo}</span>
              <span style={{ fontSize: 11, color: C.gray400 }}>{o.fecha}</span>
            </div>
            <p style={{ margin: "4px 0 2px", fontSize: 13, color: C.gray700 }}>{o.contenido}</p>
            <p style={{ margin: 0, fontSize: 11, color: C.gray400 }}>{o.autor} · {o.rol}</p>
          </div>
        );
      })}
    </div>
  );
}

function ContenidoNotificaciones({ datos, isMobile }: { datos: DatosEstudiante; isMobile: boolean }) {
  const tipoIcon: Record<string, string> = { Inasistencia: "!", Alerta: "▲", Notas: "✎", Observación: "◉" };
  const tipoColor: Record<string, string> = { Inasistencia: C.red, Alerta: "#d97706", Notas: C.blue, Observación: C.gray500 };
  if (!datos.notificaciones || datos.notificaciones.length === 0) {
    return <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.gray400 }}>Sin notificaciones.</div>;
  }
  return (
    <div>
      {datos.notificaciones.slice(0, 3).map((n, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: isMobile ? "10px 14px" : "10px 16px", borderBottom: i < 2 ? `1px solid ${C.gray100}` : "none", background: n.leida ? C.white : C.blueLight + "30" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: tipoColor[n.tipo] + "20", color: tipoColor[n.tipo], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {tipoIcon[n.tipo]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: tipoColor[n.tipo] }}>{n.tipo}</span>
              <span style={{ fontSize: 11, color: C.gray400 }}>{n.fecha}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: C.gray700 }}>{n.mensaje}</p>
          </div>
          {!n.leida && <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.blue, flexShrink: 0, marginTop: 4 }} />}
        </div>
      ))}
    </div>
  );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────────────────────── */
export default function DashboardAcudiente() {
  const navigate = useNavigate();
  const { getMensajesNoLeidos } = useGESTA();
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
  const [estudianteActivo, setEstudianteActivo] = useState<number | null>(null);
  const [navActivo, setNavActivo] = useState("inicio");
  const [secciones, setSecciones] = useState({ notas: true, observaciones: false, notificaciones: false });

  const { user, nombreCompleto } = useAuth();
  const nombreAcudiente = nombreCompleto();
  const [estudiantesVinculados, setEstudiantesVinculados] = useState<EstudianteVinculado[]>([]);
  const [datosEstudiante, setDatosEstudiante] = useState<DatosEstudiante | null>(null);

  useEffect(() => {
    if (!user?.perfil_id) return;
    acudienteAPI.getEstudiantesVinculados(user.perfil_id)
      .then(data => setEstudiantesVinculados(data.map((e: any) => ({
        id: e.id,
        nombre: e.nombre,
        grado: e.grado || "",
        jornada: "Mañana",
      }))))
      .catch(err => console.warn("No se pudieron cargar los estudiantes vinculados:", err));
  }, [user?.perfil_id]);

  useEffect(() => {
    if (estudianteActivo === null) return;
    estudianteAPI.getPerfil(String(estudianteActivo))
      .then(perfil => setDatosEstudiante({
        riesgo: perfil.riesgo,
        promedio: perfil.promedio,
        asistencia: perfil.asistencia,
        materiasPerdidas: perfil.materiasPerdidas,
        observacionesNeg: (perfil.observaciones || []).filter((o: any) => !o.es_positiva).length,
        observacionesPos: (perfil.observaciones || []).filter((o: any) => o.es_positiva).length,
        materias: (perfil.calificaciones || []).map((c: any) => ({
          nombre: c.asignatura,
          promedio: c.promedio ?? 0,
          perdida: (c.promedio ?? 0) < 3,
          notas: [],
        })),
        observaciones: (perfil.observaciones || []).map((o: any) => ({  // ← cambia
          fecha: o.fecha,
          tipo: o.tipo,
          contenido: o.descripcion,
          autor: o.autor || "Docente",
          rol: "Docente",
        })),
        notificaciones: [],
      }))
      .catch(err => console.warn("No se pudieron cargar los datos del estudiante:", err));
  }, [estudianteActivo]);

  // Seleccionar primer estudiante automáticamente cuando se carguen
  useEffect(() => {
    if (estudiantesVinculados.length > 0 && estudianteActivo === null) {
      setEstudianteActivo(estudiantesVinculados[0].id);
    }
  }, [estudiantesVinculados, estudianteActivo]);

  const ir = (ruta: string, id?: string) => { if (id) setNavActivo(id); navigate(`/dashboard/${ruta}`); };
  const toggle = (id: string) => setSecciones(prev => ({ ...prev, [id]: !prev[id as keyof typeof prev] }));
  const msgNoLeidos = getMensajesNoLeidos("acudiente");

  const estudiante = estudiantesVinculados.find(e => e.id === estudianteActivo);
  const datos = datosEstudiante;
  const noLeidas = datos?.notificaciones?.filter(n => !n.leida).length ?? 0;
  const s = datos ? SM[datos.riesgo] || SM.verde : SM.verde;

  /* NAV_ACUDIENTE con badge dinámico en mensajes */
  const navConBadge = NAV_ACUDIENTE.map(g => ({
    ...g,
    items: g.items.map(item =>
      item.id === "mensajes" && msgNoLeidos > 0 ? { ...item, badge: msgNoLeidos } : item
    ),
  }));

  // Iniciales del acudiente para el avatar
  const inicialesAcudiente = nombreAcudiente
    ? nombreAcudiente.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "—";

  return (
    <div style={S.app}>
      {!isMobile && (
        <aside style={{ ...S.sidebar }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.gray200}` }}>
            <div style={S.logoIcon}>G</div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.gray900, lineHeight: 1.2 }}>GESTA</p>
              <p style={{ margin: 0, fontSize: 10, color: C.gray400, lineHeight: 1.3 }}>Gestión y Alertas Estudiantiles</p>
            </div>
          </div>
          {/* Selector de estudiante */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.gray200}` }}>
            <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 600, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.5px" }}>Estudiante</p>
            {estudiantesVinculados.length === 0 ? (
              <div style={{ padding: "10px 12px", fontSize: 12, color: C.gray400 }}>Sin estudiantes vinculados</div>
            ) : (
              estudiantesVinculados.map(e => (
                <button key={e.id} onClick={() => setEstudianteActivo(e.id)} style={{ ...S.navItem, borderLeft: estudianteActivo === e.id ? `3px solid ${C.blue}` : "3px solid transparent", color: estudianteActivo === e.id ? C.blue : C.gray500, background: estudianteActivo === e.id ? C.blueLight : "transparent", padding: "8px 12px", borderRadius: 6, marginBottom: 2, flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{e.nombre}</span>
                  <span style={{ fontSize: 11, color: C.gray400 }}>Grado {e.grado} · {e.jornada}</span>
                </button>
              ))
            )}
          </div>
          <nav style={{ flex: 1, paddingTop: 4 }}>
            {navConBadge.map(g => (
              <div key={g.section}>
                <p style={S.navSection}>{g.section}</p>
                {g.items.map(item => (
                  <button key={item.id} onClick={() => ir(item.ruta, item.id)} style={{ ...S.navItem, borderLeft: navActivo === item.id ? `3px solid ${C.blue}` : "3px solid transparent", color: navActivo === item.id ? C.blue : C.gray500, background: navActivo === item.id ? C.blueLight : "transparent", fontWeight: navActivo === item.id ? 600 : 400 }}>
                    {item.label}
                    {item.badge != null && <span style={{ marginLeft: "auto", background: C.redLight, color: C.red, fontSize: 10, padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>{item.badge}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.gray200}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={S.avatar}>{inicialesAcudiente}</div>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.gray800 }}>{nombreAcudiente || "Sin nombre"}</p>
                <p style={{ margin: 0, fontSize: 10, color: C.gray400 }}>Acudiente</p>
              </div>
            </div>
          </div>
        </aside>
      )}

      <div style={S.main}>
        <header style={{ ...S.topbar, padding: isMobile ? "10px 16px" : "10px 24px" }}>
          {isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={S.logoIcon}>G</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.gray900 }}>GESTA</p>
                <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>Acudiente · {nombreAcudiente || "Sin nombre"}</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray900 }}>{estudiante?.nombre ?? "Sin estudiante seleccionado"}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>
                {estudiante ? `Grado ${estudiante.grado} · Jornada ${estudiante.jornada} · Colegio Integrado de Fontibón IBEP` : ""}
              </p>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {datos && <Semaforo nivel={datos.riesgo} />}
            {!isMobile && <span style={{ background: C.gray100, color: C.gray700, fontSize: 12, padding: "4px 12px", borderRadius: 12 }}>Periodo 2 · 2025</span>}
          </div>
        </header>

        {/* Selector mobile */}
        {isMobile && (
          <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: C.white, borderBottom: `1px solid ${C.gray200}`, overflowX: "auto", scrollbarWidth: "none" }}>
            {estudiantesVinculados.length === 0 ? (
              <div style={{ padding: "7px 14px", fontSize: 12, color: C.gray400 }}>Sin estudiantes</div>
            ) : (
              estudiantesVinculados.map(e => (
                <button key={e.id} onClick={() => setEstudianteActivo(e.id)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: estudianteActivo === e.id ? 600 : 400, border: estudianteActivo === e.id ? `1.5px solid ${C.blue}` : `1px solid ${C.gray200}`, background: estudianteActivo === e.id ? C.blueLight : C.white, color: estudianteActivo === e.id ? C.blue : C.gray500 }}>
                  {e.nombre} · {e.grado}
                </button>
              ))
            )}
          </div>
        )}

        <main style={{ ...S.content, padding: isMobile ? "12px" : "20px 24px" }}>
          {!datos ? (
            <div style={{ padding: 40, textAlign: "center", color: C.gray400, fontSize: 14 }}>
              {estudiantesVinculados.length === 0
                ? "No hay estudiantes vinculados a este acudiente."
                : "Selecciona un estudiante para ver su información."}
            </div>
          ) : (
            <>
              {/* Banner semaforo */}
              <div style={{ background: s.bg, border: `1px solid ${s.dot}30`, borderRadius: 12, padding: isMobile ? "14px" : "18px 24px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <p style={{ margin: "0 0 6px", fontSize: 11, color: s.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Estado académico actual</p>
                  <Semaforo nivel={datos.riesgo} grande />
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: s.color, opacity: 0.85 }}>
                    {datos.riesgo === "rojo" ? "Requiere atención inmediata. Contacta a la institución." : datos.riesgo === "amarillo" ? "Seguimiento activo. Se recomienda monitoreo." : "El estudiante va muy bien. Sigue adelante."}
                  </p>
                </div>
                <div style={{ width: isMobile ? 48 : 70, height: isMobile ? 48 : 70, borderRadius: "50%", background: s.dot, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "white", fontWeight: 700, fontSize: isMobile ? 20 : 26 }}>
                    {datos.riesgo === "rojo" ? "!" : datos.riesgo === "amarillo" ? "~" : "✓"}
                  </span>
                </div>
              </div>

              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Promedio general", valor: datos.promedio.toFixed(1), color: datos.promedio < 3 ? C.red : C.gray900, sub: "periodo actual" },
                  { label: "Asistencia", valor: `${datos.asistencia}%`, color: datos.asistencia < 80 ? C.red : C.green, sub: "a la fecha" },
                  { label: "Materias perdidas", valor: datos.materiasPerdidas, color: datos.materiasPerdidas > 0 ? C.red : C.green, sub: "promedio menor a 3.0" },
                  { label: "Observaciones", valor: `${datos.observacionesNeg}n / ${datos.observacionesPos}p`, color: C.gray900, sub: "negativas / positivas" },
                ].map(c => (
                  <div key={c.label} style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 10, padding: isMobile ? "10px 12px" : "12px 14px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 10, color: C.gray500 }}>{c.label}</p>
                    <p style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 700, color: c.color }}>{c.valor}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: C.gray400 }}>{c.sub}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.gray900 }}>Detalle académico</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Periodo 2 · 2025</p>
              </div>

              <CardSeccion titulo="Notas por materia" sub={`${datos.materias?.length ?? 0} materias · ${datos.materiasPerdidas} reprobadas`} abierto={secciones.notas} onToggle={() => toggle("notas")} isMobile={isMobile}>
                <ContenidoMaterias datos={datos} isMobile={isMobile} />
              </CardSeccion>

              <CardSeccion titulo="Observaciones" sub={`${datos.observacionesNeg} negativas · ${datos.observacionesPos} positivas`} abierto={secciones.observaciones} onToggle={() => toggle("observaciones")} isMobile={isMobile}>
                <ContenidoObsAcudiente datos={datos} isMobile={isMobile} />
              </CardSeccion>

              <CardSeccion titulo="Notificaciones" sub={noLeidas > 0 ? `${noLeidas} sin leer` : "Todo al día"} abierto={secciones.notificaciones} onToggle={() => toggle("notificaciones")} isMobile={isMobile}>
                <ContenidoNotificaciones datos={datos} isMobile={isMobile} />
              </CardSeccion>
            </>
          )}
        </main>

        {isMobile && (
          <BottomNav
            items={BOTTOM_NAV_ACUDIENTE}
            navActivo={navActivo}
            onNav={ir}
            badges={{ notif: noLeidas, mensajes: msgNoLeidos }}
          />
        )}
      </div>
    </div>
  );
}
