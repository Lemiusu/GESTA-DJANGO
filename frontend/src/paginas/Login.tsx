import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IcoBookWhite, IcoBellWhite, IcoChartWhite, IcoClipboardWhite,
  IcoEyeOpen, IcoEyeOff,
} from "../context/shared";

const ROLE_LABELS: Record<string, string> = {
  docente:      "Docente",
  coordinador:  "Coordinador",
  acudiente:    "Acudiente",
  estudiante:   "Estudiante",
};

/* ─── POPUP DE ERROR ─────────────────────────────────────────────── */
function PopupError({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
      <div style={{ background: "white", borderRadius: 16, padding: "28px", width: "100%", maxWidth: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
            Credenciales incorrectas
          </p>
        </div>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
          {message || "El usuario o la contraseña que ingresaste no son válidos. Verifica tus datos e intenta de nuevo."}
        </p>
        <p style={{ margin: "0 0 24px", fontSize: 12, color: "#9CA3AF" }}>
          Si olvidaste tu contraseña, contacta al administrador del sistema.
        </p>
        <button
          onClick={onClose}
          style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "#2563EB", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}

/* ─── LOGIN ──────────────────────────────────────────────────────── */
export default function Login() {
  const { rol }      = useParams();
  const navigate     = useNavigate();
  const { login }    = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [usuario,      setUsuario]      = useState("");
  const [password,     setPassword]     = useState("");
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading,      setLoading]      = useState(false);

  const puedeIngresar = usuario.trim().length > 0 && password.trim().length > 0;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1280);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const features = [
    { icon: <IcoBellWhite />,      texto: "Alertas tempranas de deserción" },
    { icon: <IcoChartWhite />,     texto: "Dashboard por rol (docente, coordinador, acudiente)" },
    { icon: <IcoClipboardWhite />, texto: "Seguimiento de asistencia y notas en tiempo real" },
  ];

  const handleLogin = async () => {
    if (!puedeIngresar || !rol) return;

    setLoading(true);
    try {
      const authUser = await login(usuario.trim(), password);
      const userRol = authUser?.rol;

      if (rol && userRol && userRol !== rol) {
        setErrorMessage(`El usuario no tiene permisos de ${rol}. Inicia sesión con el rol correcto.`);
        setErrorVisible(true);
        return;
      }

      localStorage.setItem("gesta_rol", rol);
      navigate(`/dashboard/${rol}`);
    } catch (error: any) {
      setErrorMessage(error.message || "Error al intentar iniciar sesión");
      setErrorVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: isMobile ? "column" : "row", fontFamily: "Inter, sans-serif", backgroundColor: "#F4F6FA" }}>

      {/* Panel izquierdo / banner mobile */}
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
            <p style={{ fontSize: 17, opacity: 0.75, margin: 0 }}>Sistema de Gestión y Alertas Estudiantiles — Colegio Fontibón IBEP</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {features.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.12)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</div>
                <span style={{ fontSize: 14, opacity: 0.9 }}>{item.texto}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel del formulario */}
      <div style={{ flex: 1, display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center", padding: isMobile ? "24px 16px 40px" : "40px" }}>
        <div style={{ background: "white", borderRadius: isMobile ? 16 : 20, padding: isMobile ? "28px 20px" : "48px 40px", width: "100%", maxWidth: isMobile ? "100%" : 420, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>

          <h2 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: "#1A3C6E", margin: "0 0 4px" }}>Iniciar sesion</h2>
          <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 24px" }}>Ingresa con tus credenciales institucionales</p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Rol</label>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", margin: 0 }}>{rol ? ROLE_LABELS[rol] : ""}</p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Usuario</label>
            <input
              type="text"
              placeholder="Ej: doc.garcia"
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ width: "100%", padding: "11px 42px 11px 14px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
              <button onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                {showPassword ? <IcoEyeOff /> : <IcoEyeOpen />}
              </button>
            </div>
          </div>

          <div style={{ textAlign: "right", marginBottom: 24 }}>
            <span style={{ fontSize: 13, color: "#2563EB", cursor: "pointer" }}>¿Olvidaste tu contraseña?</span>
          </div>

          <button
            disabled={!puedeIngresar || loading}
            onClick={handleLogin}
            style={{
              width: "100%", padding: "13px",
              background: puedeIngresar && !loading ? "#2563EB" : "#D1D5DB",
              color: puedeIngresar && !loading ? "white" : "#9CA3AF",
              border: "none", borderRadius: 10,
              fontSize: 15, fontWeight: 600,
              cursor: puedeIngresar && !loading ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            {loading ? "Ingresando..." : "Ingresar al sistema"}
          </button>

        </div>
      </div>

      {errorVisible && (
        <PopupError message={errorMessage} onClose={() => {
          setErrorVisible(false);
          setPassword("");
        }} />
      )}
    </div>
  );
}
