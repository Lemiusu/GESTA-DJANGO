import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GESTAProvider } from "./context/GESTAContext";

// Páginas compartidas
import RoleSelection from "./paginas/RoleSelection";
import Login from "./paginas/Login";
import Mensajes from "./paginas/Mensajes";

// Dashboards
import DashboardDocente from "./paginas/dashboards/DashboardDocente";
import DashboardCoordinador from "./paginas/dashboards/DashboardCoordinador";
import DashboardAcudiente from "./paginas/dashboards/DashboardAcudiente";
import DashboardEstudiante from "./paginas/dashboards/DashboardEstudiante";

// Módulos Docente
import DashboardNotas from "./paginas/docente/Ingreso-notas";
import DashboardAsistencia from "./paginas/docente/registro-de-asistencia";
import ObservadorDocente from "./paginas/docente/ObservadorDocente";

// Módulos Coordinador
import ObservadorCoordinador from "./paginas/coordinador/ObservadorCoordinador";
import EstudiantesCoordinador from "./paginas/coordinador/EstudiantesCoordinador";
import CalificacionesCoordinador from "./paginas/coordinador/CalificacionesCoordinador";
import AsistenciaCoordinador from "./paginas/coordinador/AsistenciaCoordinador";

// TODO: Agregar ProtectedRoute component que verifique autenticación con el backend
// Ejemplo:
// function ProtectedRoute({ children, rol }: { children: React.ReactNode; rol?: string }) {
//   const token = localStorage.getItem("gesta_token");
//   if (!token) return <Navigate to="/" replace />;
//   // TODO: Verificar que el token sea válido y el rol coincida
//   return <>{children}</>;
// }

export default function App() {
  return (
    <GESTAProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleSelection />} />
          <Route path="/login/:rol" element={<Login />} />

          {/* TODO: Envolver cada ruta protegida con <ProtectedRoute> cuando el backend esté conectado */}

          {/* Dashboards por rol */}
          <Route path="/dashboard/docente" element={<DashboardDocente />} />
          <Route path="/dashboard/coordinador" element={<DashboardCoordinador />} />
          <Route path="/dashboard/acudiente" element={<DashboardAcudiente />} />
          <Route path="/dashboard/estudiante" element={<DashboardEstudiante />} />

          {/* Módulos Docente */}
          <Route path="/dashboard/calificaciones-docente" element={<DashboardNotas />} />
          <Route path="/dashboard/asistencia-docente" element={<DashboardAsistencia />} />
          <Route path="/dashboard/observador-docente" element={<ObservadorDocente />} />

          {/* Módulos Coordinador */}
          <Route path="/dashboard/observador-coordinador" element={<ObservadorCoordinador />} />
          <Route path="/dashboard/estudiantes-coordinador" element={<EstudiantesCoordinador />} />
          <Route path="/dashboard/calificaciones-coordinador" element={<CalificacionesCoordinador />} />
          <Route path="/dashboard/asistencia-coordinador" element={<AsistenciaCoordinador />} />

          {/* Mensajes — accesible por todos los roles */}
          <Route path="/dashboard/mensajes-docente" element={<Mensajes />} />
          <Route path="/dashboard/mensajes-coordinador" element={<Mensajes />} />
          <Route path="/dashboard/mensajes-acudiente" element={<Mensajes />} />
          <Route path="/dashboard/mensajes/:rol" element={<Mensajes />} />

          {/* Ruta por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GESTAProvider>
  );
}
