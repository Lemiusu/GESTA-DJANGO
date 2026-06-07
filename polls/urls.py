from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path('', views.index, name='api-index'),
    path('auth/token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', views.CurrentUserView.as_view(), name='current_user'),

    path('coordinador/dashboard/', views.DashboardCoordinadorView.as_view(), name='coordinador-dashboard'),
    path('coordinador/estado-grados/', views.CoordinadorEstadoGradosView.as_view(), name='coordinador-estado-grados'),
    path('coordinador/observador/', views.ObservadorCoordinadorView.as_view(), name='coordinador-observador'),
    path('coordinador/calificaciones/', views.CalificacionesCoordinadorView.as_view(), name='coordinador-calificaciones'),

    path('docentes/cursos/', views.DocenteCursosView.as_view(), name='docente-cursos-self'),
    path('docentes/dashboard/', views.DocenteDashboardView.as_view(), name='docente-dashboard-self'),
    path('docentes/<uuid:docente_id>/cursos/', views.DocenteCursosView.as_view(), name='docente-cursos'),
    path('docentes/<uuid:docente_id>/dashboard/', views.DocenteDashboardView.as_view(), name='docente-dashboard'),

    path('cursos/<uuid:pk>/estudiantes/', views.CursoEstudiantesView.as_view(), name='curso-estudiantes'),

    path('estudiantes/', views.EstudiantesListView.as_view(), name='estudiantes-list'),
    path('estudiantes/para-alertas/', views.EstudiantesParaAlertasView.as_view(), name='estudiantes-alertas'),
    path('estudiantes/crear/', views.EstudiantesCreateView.as_view(), name='estudiantes-crear'),
    path('estudiantes/<uuid:pk>/perfil/', views.EstudiantePerfilView.as_view(), name='estudiante-perfil'),
    path('estudiantes/<uuid:pk>/condicion/', views.EstudianteCondicionView.as_view(), name='estudiante-condicion'),
    path('estudiantes/<uuid:pk>/calificaciones/', views.EstudianteCalificacionesView.as_view(), name='estudiante-calificaciones'),
    path('estudiantes/<uuid:pk>/asistencia/', views.EstudianteAsistenciaView.as_view(), name='estudiante-asistencia'),
    path('estudiantes/<uuid:pk>/datos-acudiente/', views.EstudianteDatosAcudienteView.as_view(), name='estudiante-datos-acudiente'),

    path('asistencia/', views.AsistenciaRegistroView.as_view(), name='asistencia-registro'),
    path('asistencia/historial/', views.AsistenciaHistorialView.as_view(), name='asistencia-historial'),
    path('asistencia/<uuid:pk>/', views.AsistenciaDetalleUpdateView.as_view(), name='asistencia-detalle-edit'),
    path('asistencia/grados/', views.AsistenciaGradosView.as_view(), name='asistencia-grados'),

    path('calificaciones/', views.CalificacionesCursosView.as_view(), name='calificaciones-cursos'),
    path('calificaciones/notas/', views.GuardarNotaView.as_view(), name='calificaciones-guardar-nota'),
    path('calificaciones/actividades/', views.CrearActividadView.as_view(), name='calificaciones-crear-actividad'),
    path('calificaciones/actividades/<uuid:pk>/publicar/', views.PublicarActividadView.as_view(), name='calificaciones-publicar-actividad'),
    path('calificaciones/actividades/<uuid:pk>/despublicar/', views.DespublicarActividadView.as_view(), name='calificaciones-despublicar-actividad'),

    path('observaciones/', views.ObservacionesView.as_view(), name='observaciones'),
    path('observaciones/recientes/', views.ObservacionesRecientesView.as_view(), name='observaciones-recientes'),

    path('mensajes/', views.MensajesView.as_view(), name='mensajes'),
    path('mensajes/<uuid:pk>/leido/', views.MensajeLeidoView.as_view(), name='mensaje-leido'),
    path('mensajes/no-leidos/', views.MensajesNoLeidosView.as_view(), name='mensajes-no-leidos'),
    path('mensajes/responder/', views.MensajeResponderView.as_view(), name='mensajes-responder'),
    path('mensajes/bandeja/', views.BandejaView.as_view(), name='mensajes-bandeja'),

    path('alertas/', views.AlertasView.as_view(), name='alertas'),
    path('alertas/<uuid:pk>/resolver/', views.AlertasResolverView.as_view(), name='alertas-resolver'),

    path('acudientes/<uuid:pk>/estudiantes/', views.AcudienteEstudiantesView.as_view(), name='acudiente-estudiantes'),
    
    path('usuarios/', views.UsuariosView.as_view(), name='usuarios'),
]