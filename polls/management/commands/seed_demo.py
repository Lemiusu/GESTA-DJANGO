from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from polls.models import (
    Acudiente, ActividadEvaluativa, AlertaAcademica, Asignatura,
    Calificacion, Coordinador, Curso, DetalleAsistencia, Docente,
    Estudiante, Grado, Observacion, PeriodoAcademico, RegistroAsistencia,
    Usuario,
)

PASSWORD = "demo1234"


class Command(BaseCommand):
    help = "Carga datos de demostración para el prototipo GESTA"

    def handle(self, *args, **options):
        if Usuario.objects.exists():
            self.stdout.write(self.style.WARNING("Ya hay datos. Usa --force para recargar."))
            if not options.get("force"):
                return

        if options.get("force"):
            self._clear()

        periodo = PeriodoAcademico.objects.create(
            nombre="Periodo 2 · 2025",
            fecha_inicio=date(2025, 1, 15),
            fecha_fin=date(2025, 6, 15),
            activo=True,
        )

        grado6 = Grado.objects.create(nombre="Grado 6", nivel=6)
        grado7 = Grado.objects.create(nombre="Grado 7", nivel=7)

        coord_user = self._user("coord.fontibon", "María", "Rodríguez", "coordinador", "coord.fontibon@ibep.edu.co")
        Coordinador.objects.create(usuario=coord_user)

        doc_user = self._user("doc.garcia", "Carlos", "García", "docente", "doc.garcia@ibep.edu.co")
        docente = Docente.objects.create(usuario=doc_user)

        acu_user = self._user("acu.lopez", "Ana", "López", "acudiente", "acu.lopez@email.com")
        acudiente = Acudiente.objects.create(usuario=acu_user, telefono="3001234567")

        curso601 = Curso.objects.create(grado=grado6, docente_titular=docente, nombre="601")
        curso701 = Curso.objects.create(grado=grado7, docente_titular=docente, nombre="701")

        asig601 = Asignatura.objects.create(curso=curso601, docente=docente, nombre="Matemáticas")
        Asignatura.objects.create(curso=curso701, docente=docente, nombre="Matemáticas")

        estudiantes_data = [
            ("est.sofia", "Sofía", "Martínez", curso601, "bajo"),
            ("est.tomas", "Tomás", "Herrera", curso601, "medio"),
            ("est.valentina", "Valentina", "Ruiz", curso601, "alto"),
            ("est.diego", "Diego", "Castro", curso701, "bajo"),
        ]

        estudiantes = []
        for username, first, last, curso, riesgo in estudiantes_data:
            u = self._user(username, first, last, "estudiante", f"{username}@ibep.edu.co")
            est = Estudiante.objects.create(
                usuario=u,
                curso=curso,
                acudiente=acudiente if username == "est.sofia" else None,
                riesgo=riesgo,
                tiene_condicion_especial=(username == "est.tomas"),
                descripcion_condicion="TDAH" if username == "est.tomas" else None,
            )
            estudiantes.append(est)

        actividad = ActividadEvaluativa.objects.create(
            asignatura=asig601,
            periodo_academico=periodo,
            nombre="Quiz 1",
            porcentaje=Decimal("30"),
            estado="publicada",
            fecha_publicacion=timezone.now(),
            publicado_por=doc_user,
        )
        for est in estudiantes[:3]:
            Calificacion.objects.create(
                actividad_evaluativa=actividad,
                estudiante=est,
                valor=Decimal("4.2") if est.riesgo == "bajo" else Decimal("2.8"),
            )

        hoy = date.today()
        registro = RegistroAsistencia.objects.create(curso=curso601, fecha=hoy)
        for i, est in enumerate(estudiantes[:3]):
            DetalleAsistencia.objects.create(
                registro_asistencia=registro,
                estudiante=est,
                estado="presente" if i < 2 else "ausente",
                modificado_por=doc_user,
            )

        Observacion.objects.create(
            estudiante=estudiantes[2],
            autor=doc_user,
            tipo="academica",
            descripcion="Bajo rendimiento en evaluaciones recientes.",
            es_positiva=False,
            curso=curso601,
        )

        AlertaAcademica.objects.create(
            estudiante=estudiantes[2],
            generada_por=coord_user,
            titulo="Riesgo académico",
            contenido="Promedio por debajo del mínimo en Matemáticas.",
            activa=True,
        )

        self.stdout.write(self.style.SUCCESS("Datos de demo cargados."))
        self.stdout.write("")
        self.stdout.write("Usuarios (contraseña: demo1234):")
        for u in Usuario.objects.all().order_by("rol", "username"):
            self.stdout.write(f"  {u.username:20} → {u.rol}")

    def _user(self, username, first_name, last_name, rol, email):
        user = Usuario.objects.create_user(
            username=username,
            email=email,
            password=PASSWORD,
            first_name=first_name,
            last_name=last_name,
            rol=rol,
        )
        return user

    def _clear(self):
        from polls.models import (
            AlertaLectura, DestinatarioMensaje, Mensaje, Notificacion,
            NotificacionLectura,
        )
        for model in [
            AlertaLectura, Calificacion, DetalleAsistencia, RegistroAsistencia,
            Observacion, AlertaAcademica, ActividadEvaluativa, Asignatura,
            Estudiante, Curso, Grado, PeriodoAcademico, Acudiente, Docente,
            Coordinador, DestinatarioMensaje, Mensaje, Notificacion,
            NotificacionLectura, Usuario,
        ]:
            model.objects.all().delete()
