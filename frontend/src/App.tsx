import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { GESTAProvider } from "./context/GESTAContext";
import ProtectedRoute from "./components/ProtectedRoute";

import RoleSelection from "./paginas/RoleSelection";
import Login from "./paginas/Login";
import Mensajes from "./paginas/Mensajes";

import DashboardDocente from "./paginas/dashboards/DashboardDocente";
import DashboardCoordinador from "./paginas/dashboards/DashboardCoordinador";
import DashboardAcudiente from "./paginas/dashboards/DashboardAcudiente";
import DashboardEstudiante from "./paginas/dashboards/DashboardEstudiante";

import DashboardNotas from "./paginas/docente/Ingreso-notas";
import DashboardAsistencia from "./paginas/docente/registro-de-asistencia";
import ObservadorDocente from "./paginas/docente/ObservadorDocente";

import ObservadorCoordinador from "./paginas/coordinador/ObservadorCoordinador";
import EstudiantesCoordinador from "./paginas/coordinador/EstudiantesCoordinador";
import CalificacionesCoordinador from "./paginas/coordinador/CalificacionesCoordinador";
import AsistenciaCoordinador from "./paginas/coordinador/AsistenciaCoordinador";

function P({ children, rol }: { children: React.ReactNode; rol?: string }) {
  return <ProtectedRoute rol={rol}>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <GESTAProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RoleSelection />} />
            <Route path="/login/:rol" element={<Login />} />

            <Route path="/dashboard/docente" element={<P rol="docente"><DashboardDocente /></P>} />
            <Route path="/dashboard/coordinador" element={<P rol="coordinador"><DashboardCoordinador /></P>} />
            <Route path="/dashboard/acudiente" element={<P rol="acudiente"><DashboardAcudiente /></P>} />
            <Route path="/dashboard/estudiante" element={<P rol="estudiante"><DashboardEstudiante /></P>} />

            <Route path="/dashboard/calificaciones-docente" element={<P rol="docente"><DashboardNotas /></P>} />
            <Route path="/dashboard/asistencia-docente" element={<P rol="docente"><DashboardAsistencia /></P>} />
            <Route path="/dashboard/observador-docente" element={<P rol="docente"><ObservadorDocente /></P>} />

            <Route path="/dashboard/observador-coordinador" element={<P rol="coordinador"><ObservadorCoordinador /></P>} />
            <Route path="/dashboard/estudiantes-coordinador" element={<P rol="coordinador"><EstudiantesCoordinador /></P>} />
            <Route path="/dashboard/calificaciones-coordinador" element={<P rol="coordinador"><CalificacionesCoordinador /></P>} />
            <Route path="/dashboard/asistencia-coordinador" element={<P rol="coordinador"><AsistenciaCoordinador /></P>} />

            <Route path="/dashboard/mensajes-docente" element={<P rol="docente"><Mensajes /></P>} />
            <Route path="/dashboard/mensajes-coordinador" element={<P rol="coordinador"><Mensajes /></P>} />
            <Route path="/dashboard/mensajes-acudiente" element={<P rol="acudiente"><Mensajes /></P>} />
            <Route path="/dashboard/mensajes/:rol" element={<P><Mensajes /></P>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </GESTAProvider>
    </AuthProvider>
  );
}
