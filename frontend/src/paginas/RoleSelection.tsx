import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  C,
  IcoBookWhite, IcoBellWhite, IcoChartWhite, IcoClipboardWhite,
} from "../context/shared";

const ROLES = [
  { id: "docente",      label: "Docente",      desc: "Ingreso de notas y asistencia",    emoji: "👨‍🏫" },
  { id: "coordinador",  label: "Coordinador",  desc: "Dashboard y alertas generales",    emoji: "🗂️" },
  { id: "acudiente",    label: "Acudiente",    desc: "Seguimiento de tu estudiante",     emoji: "👨‍👧" },
  { id: "estudiante",   label: "Estudiante",   desc: "Consulta tus notas y asistencia",  emoji: "🎒" },
];

const FEATURES = [
  { Ico: IcoBellWhite,      texto: "Alertas tempranas de deserción" },
  { Ico: IcoChartWhite,     texto: "Dashboard por rol (docente, coordinador, acudiente)" },
  { Ico: IcoClipboardWhite, texto: "Seguimiento de asistencia y notas en tiempo real" },
];

export default function RoleSelection() {
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
  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      flexDirection: isMobile ? "column" : "row",
      fontFamily: "'Inter','Segoe UI',sans-serif",
      backgroundColor: "#F4F6FA",
    }}>
      {/* Panel izquierdo azul */}
      {isMobile ? (
        <div style={{ background: "linear-gradient(135deg, #1A3C6E 0%, #2563EB 100%)", padding: "32px 24px 28px", color: "white", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, background: "rgba(255,255,255,0.15)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IcoBookWhite />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 2px" }}>GESTA</h1>
            <p style={{ fontSize: 12, opacity: 0.75, margin: 0, lineHeight: 1.4 }}>Sistema de Gestión y Alertas Estudiantiles</p>
          </div>
        </div>
      ) : (
        <div style={{ width: "45%", background: "linear-gradient(160deg, #1A3C6E 0%, #2563EB 100%)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 48px", color: "white" }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ width: 56, height: 56, background: "rgba(255,255,255,0.15)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <IcoBookWhite />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 8px" }}>GESTA</h1>
            <p style={{ fontSize: 17, opacity: 0.75, margin: 0 }}>
              Sistema de Gestión y Alertas Estudiantiles — Colegio Fontibón IBEP
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {FEATURES.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.12)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <item.Ico />
                </div>
                <span style={{ fontSize: 14, opacity: 0.9 }}>{item.texto}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel derecho — selección de rol */}
      <div style={{ flex: 1, display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center", padding: isMobile ? "24px 16px 40px" : "40px" }}>
        <div style={{
          background: "white", borderRadius: isMobile ? 16 : 20,
          padding: isMobile ? "28px 20px" : "48px 40px",
          width: "100%", maxWidth: isMobile ? "100%" : 420,
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
        }}>
          <h2 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: "#1A3C6E", margin: "0 0 4px" }}>
            Bienvenido
          </h2>
          <p style={{ fontSize: 13, color: C.gray500, margin: "0 0 28px" }}>
            Selecciona tu rol para continuar
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {ROLES.map(rol => (
              <button
                key={rol.id}
                onClick={() => navigate(`/login/${rol.id}`)}
                style={{
                  padding: "20px 14px", borderRadius: 14,
                  border: `1.5px solid ${C.gray200}`,
                  background: "white", cursor: "pointer",
                  textAlign: "center", display: "flex",
                  flexDirection: "column", alignItems: "center", gap: 8,
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = C.blue;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${C.blueLight}`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = C.gray200;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span style={{ fontSize: 32 }}>{rol.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1A3C6E" }}>{rol.label}</span>
                <span style={{ fontSize: 11, color: C.gray400, lineHeight: 1.4 }}>{rol.desc}</span>
              </button>
            ))}
          </div>

          <p style={{ fontSize: 11, color: C.gray400, textAlign: "center", marginTop: 24, marginBottom: 0 }}>
            Colegio Integrado de Fontibón IBEP · Jornada mañana
          </p>
        </div>
      </div>
    </div>
  );
}