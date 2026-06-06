import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  rol,
}: {
  children: React.ReactNode;
  rol?: string;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Inter, sans-serif", color: "#6B7280" }}>
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (rol && user.rol !== rol) {
    return <Navigate to={`/dashboard/${user.rol}`} replace />;
  }

  return <>{children}</>;
}
