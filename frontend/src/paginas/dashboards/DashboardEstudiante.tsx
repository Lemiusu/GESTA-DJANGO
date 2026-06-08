import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGESTA } from "../../context/GESTAContext";
import {
  C, S, SM, Semaforo, Avatar, BottomNav,
  IcoHome, IcoBook, IcoCheck, IcoBell, IcoEye, IcoMsg,
  isMobileWidth, TIPO_OBS_META, TIPO_MSG_META,
} from "../../context/shared";
import { useAuth } from "../../context/AuthContext";
import { estudianteAPI, observacionesAPI, asistenciaAPI } from "../../services/api";

/* ─── TIPOS ────────────────────────────────────────────────────── */
type EstudiantePerfil = {
  id: string;
  nombre: string;
  grado: string;
  jornada: string;
  riesgo: string;
  promedio: number;
  asistencia: number;
  materiasPerdidas: number;
  materias: { nombre: string; promedio: number; perdida: boolean; notas: { desc: string; valor: number }[] }[];
};

/* ─── NAV ESTUDIANTE ──────────────────────────────────────────── */
const NAV_ESTUDIANTE = [
  { section: "Mi Perfil", items: [
    { id: "inicio", label: "Inicio", ruta: "estudiante" },
    { id: "notas", label: "Mis notas", ruta: "estudiante" },
    { id: "asistencia", label: "Asistencia", ruta: "estudiante" },
    { id: "observaciones", label: "Observaciones", ruta: "estudiante" },
  ]},
  { section: "Comunicación", items: [
    { id: "notificaciones", label: "Notificaciones", ruta: "estudiante", badge: 0 },
    { id: "mensajes", label: "Mensajes", ruta: "estudiante", badge: 0 },
  ]},
];

const BOTTOM_NAV_EST = [
  { id: "inicio", label: "Inicio", ruta: "estudiante", Ico: IcoHome },
  { id: "notas", label: "Notas", ruta: "estudiante", Ico: IcoBook },
  { id: "asistencia", label: "Asist.", ruta: "estudiante", Ico: IcoCheck },
  { id: "observaciones", label: "Observer", ruta: "estudiante", Ico: IcoEye },
  { id: "notificaciones", label: "Alertas", ruta: "estudiante", Ico: IcoBell },
];

/* ─── PANEL INICIO ────────────────────────────────────────────── */
function PanelInicio({ estudiante, isMobile }: { estudiante: EstudiantePerfil | null; isMobile: boolean }) {
  if (!estudiante) {
    return <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: C.gray400 }}>Sin datos del estudiante.</div>;
  }
  const s = SM[estudiante.riesgo] || SM.verde;
  return (
    <div>
      {/* Banner estado */}
      <div style={{ background: s.bg, border: `1px solid ${s.dot}40`, borderRadius: 12, padding: isMobile ? "14px" : "18px 24px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 11, color: s.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Estado académico actual — Periodo 2</p>
          <Semaforo nivel={estudiante.riesgo} grande />
          <p style={{ margin: "8px 0 0", fontSize: 12, color: s.color, opacity: 0.85 }}>
            {estudiante.riesgo === "rojo" ? "Requiere atención inmediata. Contacta a tu coordinador." : estudiante.riesgo === "amarillo" ? "Atención activa. Mantente al día." : "Vas muy bien. Sigue adelante."}
          </p>
        </div>
        <div style={{ width: isMobile ? 48 : 70, height: isMobile ? 48 : 70, borderRadius: "50%", background: s.dot, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "white", fontWeight: 700, fontSize: isMobile ? 20 : 26 }}>
            {estudiante.riesgo === "rojo" ? "!" : estudiante.riesgo === "amarillo" ? "~" : "✓"}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Promedio general", valor: estudiante.promedio.toFixed(1), color: estudiante.promedio < 3 ? C.red : C.green, sub: "periodo actual" },
          { label: "Asistencia", valor: `${estudiante.asistencia}%`, color: estudiante.asistencia < 80 ? C.red : C.green, sub: "a la fecha" },
          { label: "Materias perdidas", valor: estudiante.materiasPerdidas, color: estudiante.materiasPerdidas > 0 ? C.red : C.green, sub: "promedio menor a 3.0" },
          { label: "Total materias", valor: estudiante.materias?.length ?? 0, color: C.gray900, sub: "este periodo" },
        ].map(c => (
          <div key={c.label} style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 10, color: C.gray500 }}>{c.label}</p>
            <p style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: c.color }}>{c.valor}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: C.gray400 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Materias en riesgo */}
      {estudiante.materias && estudiante.materias.filter(m => m.perdida).length > 0 && (
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={S.cardHead}>
            <span>Materias en riesgo de pérdida</span>
            <span style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>{estudiante.materias.filter(m => m.perdida).length} materias</span>
          </div>
          {estudiante.materias.filter(m => m.perdida).map((m, i, arr) => (
            <div key={m.nombre} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.gray800 }}>{m.nombre}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 80, height: 6, background: C.gray200, borderRadius: 4 }}>
                  <div style={{ width: `${(m.promedio / 5) * 100}%`, height: 6, background: C.red, borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.red, minWidth: 28 }}>{m.promedio}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resumen todas las materias */}
      <div style={S.card}>
        <div style={S.cardHead}>Todas mis materias</div>
        {(!estudiante.materias || estudiante.materias.length === 0) ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.gray400 }}>Sin datos de materias.</div>
        ) : (
          estudiante.materias.map((m, i, arr) => (
            <div key={m.nombre} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.perdida ? C.red : "#16a34a", flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.gray800 }}>{m.nombre}</span>
              <div style={{ width: 80, height: 6, background: C.gray200, borderRadius: 4, flexShrink: 0 }}>
                <div style={{ width: `${(m.promedio / 5) * 100}%`, height: 6, borderRadius: 4, background: m.perdida ? C.red : "#16a34a" }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: m.perdida ? C.red : "#15803d", minWidth: 28, textAlign: "right" }}>{m.promedio}</span>
              {m.perdida && <span style={{ fontSize: 10, background: C.redLight, color: C.red, padding: "1px 6px", borderRadius: 8, fontWeight: 600 }}>Pérdida</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── PANEL NOTAS ─────────────────────────────────────────────── */
function PanelNotas({ estudiante, isMobile }: { estudiante: EstudiantePerfil | null; isMobile: boolean }) {
  const [materiaAbierta, setMateriaAbierta] = useState<number | null>(null);
  if (!estudiante || !estudiante.materias || estudiante.materias.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.gray900 }}>Mis calificaciones</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Periodo 2 · 2025 — Solo puedes ver notas publicadas</p>
        </div>
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: C.gray400 }}>Sin datos de calificaciones.</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.gray900 }}>Mis calificaciones</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Periodo 2 · 2025 — Solo puedes ver notas publicadas</p>
      </div>
      {estudiante.materias.map((m, i) => (
        <div key={m.nombre} style={{ ...S.card, marginBottom: 8 }}>
          <button onClick={() => setMateriaAbierta(materiaAbierta === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.perdida ? C.red : "#16a34a", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.gray800 }}>{m.nombre}</span>
              {m.perdida && <span style={{ fontSize: 10, background: C.redLight, color: C.red, padding: "2px 7px", borderRadius: 8, fontWeight: 600 }}>Pérdida</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: m.perdida ? C.red : "#15803d" }}>{m.promedio}</span>
              <span style={{ fontSize: 11, color: C.gray400 }}>{materiaAbierta === i ? "▲" : "▼"}</span>
            </div>
          </button>
          {materiaAbierta === i && (
            <div style={{ borderTop: `1px solid ${C.gray100}` }}>
              <div style={{ padding: "6px 16px 2px", display: "flex", gap: 8, borderBottom: `1px solid ${C.gray100}` }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.gray400, flex: 1, textTransform: "uppercase" }}>Actividad</p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.gray400, textTransform: "uppercase" }}>Nota</p>
              </div>
              {(m.notas || []).map((n, ni) => (
                <div key={ni} style={{ display: "flex", padding: "8px 16px", borderBottom: ni < (m.notas || []).length - 1 ? `1px solid ${C.gray100}` : "none" }}>
                  <span style={{ flex: 1, fontSize: 12, color: C.gray700 }}>{n.desc}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: n.valor < 3 ? C.red : C.gray800 }}>{n.valor}</span>
                </div>
              ))}
              <div style={{ display: "flex", padding: "10px 16px", background: C.gray50, borderTop: `1px solid ${C.gray100}` }}>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.gray700 }}>Promedio acumulado</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: m.perdida ? C.red : "#15803d" }}>{m.promedio}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── PANEL ASISTENCIA ────────────────────────────────────────── */
function PanelAsistencia({ estudianteId, isMobile }: { estudianteId: string | null; isMobile: boolean }) {
  const [registros, setRegistros] = useState<any[]>([]);

  useEffect(() => {
    if (!estudianteId) return;
    asistenciaAPI.getAsistenciaEstudiante(estudianteId)
      .then(data => setRegistros(data))
      .catch(err => console.warn("Error cargando asistencia:", err));
  }, [estudianteId]);

  const presentes = registros.filter(r => r.estado === "presente").length;
  const ausentes = registros.filter(r => r.estado === "ausente").length;
  const justificados = registros.filter(r => r.estado === "justificado").length;
  const pct = registros.length > 0 ? Math.round((presentes / registros.length) * 100) : 0;
  const nivel = pct >= 90 ? "verde" : pct >= 80 ? "amarillo" : "rojo";
  const barColor = nivel === "verde" ? "#16a34a" : nivel === "amarillo" ? "#d97706" : C.red;

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.gray900 }}>Mi asistencia</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Periodo 2 · 2025</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Asistencia acumulada", val: `${pct}%`, color: barColor },
          { label: "Días presentes", val: presentes, color: C.gray900 },
          { label: "Ausencias", val: ausentes, color: ausentes > 3 ? C.red : C.gray900 },
          { label: "Justificados", val: justificados, color: C.gray900 },
        ].map(st => (
          <div key={st.label} style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ margin: 0, fontSize: 10, color: C.gray500 }}>{st.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: isMobile ? 18 : 22, fontWeight: 700, color: st.color }}>{st.val}</p>
          </div>
        ))}
      </div>

      {/* Barra */}
      <div style={{ ...S.card, padding: "16px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.gray800 }}>Porcentaje de asistencia — Periodo 2</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{pct}%</span>
        </div>
        <div style={{ background: C.gray200, borderRadius: 6, height: 10, marginBottom: 8 }}>
          <div style={{ width: `${pct}%`, height: 10, borderRadius: 6, background: barColor, transition: "width 0.3s" }} />
        </div>
        <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>
          {pct < 80 ? "⚠ Asistencia por debajo del mínimo requerido (80%)" : pct < 90 ? "Asistencia en nivel de atención. Mantener el ritmo." : "Excelente asistencia. Sigue así."}
        </p>
      </div>

      {/* Historial */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <span>Historial de asistencia</span>
          <span style={{ fontSize: 11, color: C.gray400 }}>{registros.length} días registrados</span>
        </div>
        {registros.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.gray400 }}>Sin registros para este periodo.</div>
        ) : registros.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: i < registros.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: r.estado === "presente" ? "#16a34a" : r.estado === "justificado" ? "#d97706" : C.red }} />
            <span style={{ fontSize: 12, color: C.gray500, minWidth: 110 }}>{r.fecha}</span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: r.estado === "presente" ? C.greenLight : r.estado === "justificado" ? C.amberLight : C.redLight, color: r.estado === "presente" ? C.green : r.estado === "justificado" ? C.amber : C.red }}>
              {r.estado === "presente" ? "Presente" : r.estado === "justificado" ? "Justificado" : "Ausente"}
            </span>
            {r.motivo && <span style={{ fontSize: 11, color: C.gray400 }}>{r.motivo}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── PANEL OBSERVACIONES ─────────────────────────────────────── */
function PanelObservaciones({ estudianteId, isMobile }: { estudianteId: string | null; isMobile: boolean }) {
  const [obs, setObs] = useState<any[]>([]);
  useEffect(() => {
    if (!estudianteId) return;
    observacionesAPI.getObservacionesEstudiante(estudianteId)
      .then(data => {
        console.log("Observaciones recibidas:", data);  // ← agrega esta línea temporal
        setObs(data);
      })
      .catch(err => console.warn("Error cargando observaciones:", err));
  }, [estudianteId]);

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.gray900 }}>Mis observaciones</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Registradas por docentes y coordinación</p>
      </div>

      {/* Contadores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Disciplinarias", val: obs.filter(o => o.tipo === "Disciplinaria").length, color: C.red },
          { label: "Académicas",     val: obs.filter(o => o.tipo === "Académica").length,     color: "#1e40af" },  
          { label: "Logros",         val: obs.filter(o => o.tipo === "Logro").length,         color: C.green },
        ].map(st => (
          <div key={st.label} style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ margin: 0, fontSize: 10, color: C.gray500 }}>{st.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: isMobile ? 18 : 22, fontWeight: 700, color: st.color }}>{st.val}</p>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardHead}>
          <span>Todas las observaciones</span>
          <span style={{ fontSize: 11, color: C.gray400 }}>{obs.length} registradas</span>
        </div>
        {obs.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.gray400 }}>Sin observaciones registradas.</div>
        ) : obs.map((o, i) => {
          const meta = TIPO_OBS_META[o.tipo] || { bg: C.blueLight, color: C.blueText, label: o.tipo };
          return (
            <div key={o.id} style={{ padding: "10px 16px", borderBottom: i < obs.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: meta.bg, color: meta.color }}>{meta.label}</span>
                <span style={{ fontSize: 10, color: C.gray400 }}>{o.fecha}</span>
              </div>
              <p style={{ margin: "4px 0 2px", fontSize: 13, color: C.gray700 }}>{o.descripcion}</p>
              <p style={{ margin: 0, fontSize: 11, color: C.gray400 }}>{o.autor || "Docente"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── PANEL NOTIFICACIONES ────────────────────────────────────── */
function PanelNotificaciones({ isMobile }: { isMobile: boolean }) {
  const { getMensajesPara, marcarMensajeLeido } = useGESTA();
  const msgs = getMensajesPara("estudiante");
  const noLeidos = msgs.filter(m => !m.leido).length;

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.gray900 }}>Notificaciones</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>Comunicados y avisos del colegio</p>
      </div>
      <div style={S.card}>
        <div style={S.cardHead}>
          <span>Bandeja de notificaciones</span>
          {noLeidos > 0 && <span style={{ fontSize: 11, background: C.redLight, color: C.red, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{noLeidos} sin leer</span>}
        </div>
        {msgs.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.gray400 }}>Sin notificaciones.</div>
        ) : msgs.map((m, i) => {
          const meta = TIPO_MSG_META[m.tipo] || TIPO_MSG_META.notificacion;
          return (
            <div
              key={m.id}
              onClick={() => marcarMensajeLeido(m.id)}
              style={{ display: "flex", gap: 10, padding: "12px 16px", borderBottom: i < msgs.length - 1 ? `1px solid ${C.gray100}` : "none", background: m.leido ? C.white : C.blueLight + "40", cursor: "pointer" }}
            >
              {!m.leido && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue, flexShrink: 0, marginTop: 5 }} />}
              {m.leido && <div style={{ width: 6, flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: m.leido ? 500 : 700, color: C.gray800 }}>{m.asunto}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 8, background: meta.bg, color: meta.color }}>{meta.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: C.gray400, flexShrink: 0 }}>{m.fecha}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: C.gray500 }}>{m.contenido}</p>
                <p style={{ margin: "3px 0 0", fontSize: 10, color: C.gray400 }}>De: {m.de} ({m.rolDe})</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── PANEL MENSAJES ──────────────────────────────────────────── */
function PanelMensajes({ isMobile }: { isMobile: boolean }) {
  const { getMensajesPara } = useGESTA();
  const msgs = getMensajesPara("estudiante").filter(m => m.tipo === "mensaje");
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.gray900 }}>Mensajes</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>De docentes y coordinación</p>
      </div>
      <div style={S.card}>
        <div style={S.cardHead}>Mensajes recibidos</div>
        {msgs.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: C.gray400 }}>Sin mensajes.</div>
        ) : msgs.map((m, i) => (
          <div key={m.id} style={{ padding: "12px 16px", borderBottom: i < msgs.length - 1 ? `1px solid ${C.gray100}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.gray800 }}>{m.asunto}</span>
              <span style={{ fontSize: 10, color: C.gray400 }}>{m.fecha}</span>
            </div>
            <p style={{ margin: "0 0 4px", fontSize: 12, color: C.gray700 }}>{m.contenido}</p>
            <p style={{ margin: 0, fontSize: 10, color: C.gray400 }}>De: {m.de} ({m.rolDe})</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── COMPONENTE PRINCIPAL ────────────────────────────────────── */
export default function DashboardEstudiante() {
  const navigate = useNavigate();
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

  const ir = (ruta: string, id: string) => { setNavActivo(id); };

  const { user } = useAuth();
  const [estudiante, setEstudiante] = useState<EstudiantePerfil | null>(null);

  useEffect(() => {
    if (!user?.perfil_id) return;
    estudianteAPI.getPerfil(user.perfil_id)
      .then(perfil => setEstudiante({
        id: perfil.id,
        nombre: perfil.nombre,
        grado: perfil.grado,
        jornada: perfil.jornada,
        riesgo: perfil.riesgo,
        promedio: perfil.promedio,
        asistencia: perfil.asistencia,
        materiasPerdidas: perfil.materiasPerdidas,
        materias: (perfil.calificaciones || []).map((c: any) => ({
          nombre: c.asignatura,
          promedio: c.promedio ?? 0,
          perdida: (c.promedio ?? 0) < 3,
          notas: (c.notas || []).map((n: any) => ({
            desc: `${n.nombre} (${n.porcentaje}%)`,
            valor: n.valor,
          })),
        })),
      }))
      .catch(err => console.warn("No se pudo cargar el perfil del estudiante:", err));
  }, [user?.perfil_id]);

  const STAT_CARDS = estudiante ? [
    { label: "Promedio general", value: estudiante.promedio.toFixed(1), sub: "periodo actual", color: estudiante.promedio < 3 ? C.red : C.green },
    { label: "Asistencia", value: `${estudiante.asistencia}%`, sub: "a la fecha", color: estudiante.asistencia < 80 ? C.red : C.green },
    { label: "Materias perdidas", value: estudiante.materiasPerdidas, sub: "riesgo de pérdida", color: estudiante.materiasPerdidas > 0 ? C.red : C.green },
    { label: "Grado", value: estudiante.grado, sub: `Jornada ${estudiante.jornada}` },
  ] : [];

  /* ── SIDEBAR DESKTOP ── */
  const sidebar = (
    <aside style={S.sidebar}>
      <div style={S.logo}>
        <div style={S.logoIcon}>G</div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.gray900, lineHeight: 1.2 }}>GESTA</p>
          <p style={{ margin: 0, fontSize: 10, color: C.gray400, lineHeight: 1.3 }}>Gestión y Alertas Estudiantiles</p>
        </div>
      </div>

      {/* Info estudiante */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.gray200}` }}>
        {estudiante ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Avatar nombre={estudiante.nombre} size={36} />
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.gray900 }}>{estudiante.nombre}</p>
                <p style={{ margin: 0, fontSize: 10, color: C.gray400 }}>Grado {estudiante.grado} · {estudiante.jornada}</p>
              </div>
            </div>
            <Semaforo nivel={estudiante.riesgo} />
          </>
        ) : (
          <div style={{ padding: "8px 0", fontSize: 12, color: C.gray400 }}>Sin datos del estudiante</div>
        )}
      </div>

      <nav style={{ flex: 1, paddingTop: 4, overflowY: "auto" }}>
        {NAV_ESTUDIANTE.map(g => (
          <div key={g.section}>
            <p style={S.navSection}>{g.section}</p>
            {g.items.map(item => {
              const badgeCount = item.id === "notificaciones" ? noLeidos : item.id === "mensajes" ? getMensajesNoLeidos("estudiante") : 0;
              return (
                <button
                  key={item.id}
                  onClick={() => setNavActivo(item.id)}
                  style={{
                    ...S.navItem,
                    borderLeft: navActivo === item.id ? `3px solid ${C.blue}` : "3px solid transparent",
                    color: navActivo === item.id ? C.blue : C.gray500,
                    background: navActivo === item.id ? C.blueLight : "transparent",
                    fontWeight: navActivo === item.id ? 600 : 400,
                  }}
                >
                  {item.label}
                  {badgeCount > 0 && (
                    <span style={{ marginLeft: "auto", background: C.redLight, color: C.red, fontSize: 10, padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.gray200}` }}>
        <button onClick={() => navigate("/")} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.white, color: C.gray500, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <div style={S.app}>
      {!isMobile && sidebar}

      <div style={S.main}>
        {/* Topbar */}
        <header style={{ ...S.topbar, padding: isMobile ? "10px 16px" : "10px 24px" }}>
          {isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={S.logoIcon}>G</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.gray900 }}>Hola, {estudiante?.nombre?.split(" ")[0] ?? "—"}</p>
                <p style={{ margin: 0, fontSize: 11, color: C.gray500 }}>Grado {estudiante?.grado ?? "—"} · Periodo 2</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray900 }}>Hola, {estudiante?.nombre ?? "Sin nombre"}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray500 }}>
                {estudiante ? `Grado ${estudiante.grado} · Jornada ${estudiante.jornada} · Colegio Integrado de Fontibón IBEP` : ""}
              </p>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {noLeidos > 0 && (
              <span style={{ background: C.redLight, color: C.red, fontSize: isMobile ? 10 : 12, padding: isMobile ? "3px 8px" : "4px 12px", borderRadius: 12, fontWeight: 600 }}>
                {noLeidos} {isMobile ? "" : "notif."}
              </span>
            )}
            {estudiante && <Semaforo nivel={estudiante.riesgo} />}
          </div>
        </header>

        {/* Content */}
        <main style={{ ...S.content, padding: isMobile ? "12px" : "20px 24px" }}>

          {/* Stat cards — solo en inicio, siempre visibles */}
          {navActivo === "inicio" && STAT_CARDS.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
              {STAT_CARDS.map(c => (
                <div key={c.label} style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 10, padding: "12px 14px" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, color: C.gray500 }}>{c.label}</p>
                  <p style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: c.color ?? C.gray900 }}>{c.value}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 10, color: C.gray400 }}>{c.sub}</p>
                </div>
              ))}
            </div>
          )}

          {navActivo === "inicio" && <PanelInicio estudiante={estudiante} isMobile={isMobile} />}
          {navActivo === "notas" && <PanelNotas estudiante={estudiante} isMobile={isMobile} />}
          {navActivo === "asistencia" && <PanelAsistencia estudianteId={estudiante?.id ?? null} isMobile={isMobile} />}
          {navActivo === "observaciones" && <PanelObservaciones estudianteId={estudiante?.id ?? null} isMobile={isMobile} />}
          {navActivo === "notificaciones" && <PanelNotificaciones isMobile={isMobile} />}
          {navActivo === "mensajes" && <PanelMensajes isMobile={isMobile} />}
        </main>

        {isMobile && (
          <BottomNav
            items={BOTTOM_NAV_EST}
            navActivo={navActivo}
            onNav={(_, id) => setNavActivo(id)}
            badges={{ notificaciones: noLeidos }}
          />
        )}
      </div>
    </div>
  );
}
