import uuid
from django.db import models

class Usuario(models.Model):
    ROL_CHOICES = [
        ('acudiente', 'Acudiente'),
        ('docente', 'Docente'),
        ('coordinador', 'Coordinador'),
        ('estudiante', 'Estudiante'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    rol = models.CharField(max_length=20, choices=ROL_CHOICES)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre} {self.apellido}"


class Acudiente(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='acudiente')
    telefono = models.CharField(max_length=20)

    def __str__(self):
        return str(self.usuario)


class Docente(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='docente')

    def __str__(self):
        return str(self.usuario)


class Coordinador(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='coordinador')

    def __str__(self):
        return str(self.usuario)


class Grado(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100)
    nivel = models.IntegerField()

    def __str__(self):
        return self.nombre


class Curso(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grado = models.ForeignKey(Grado, on_delete=models.CASCADE, related_name='cursos')
    docente_titular = models.ForeignKey(Docente, on_delete=models.SET_NULL, null=True, related_name='cursos_titular')
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre


class Estudiante(models.Model):
    RIESGO_CHOICES = [
        ('bajo', 'Bajo'),
        ('medio', 'Medio'),
        ('alto', 'Alto'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='estudiante')
    curso = models.ForeignKey(Curso, on_delete=models.SET_NULL, null=True, related_name='estudiantes')
    acudiente = models.ForeignKey(Acudiente, on_delete=models.SET_NULL, null=True, related_name='estudiantes')
    es_repitente = models.BooleanField(default=False)
    tiene_condicion_especial = models.BooleanField(default=False)
    descripcion_condicion = models.TextField(blank=True, null=True)
    riesgo = models.CharField(max_length=10, choices=RIESGO_CHOICES, blank=True, null=True)

    def __str__(self):
        return str(self.usuario)


class Asignatura(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    docente = models.ForeignKey(Docente, on_delete=models.SET_NULL, null=True, related_name='asignaturas')
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='asignaturas')
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre


class PeriodoAcademico(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    activo = models.BooleanField(default=False)

    def __str__(self):
        return self.nombre


class ActividadEvaluativa(models.Model):
    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('publicada', 'Publicada'),
        ('cerrada', 'Cerrada'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asignatura = models.ForeignKey(Asignatura, on_delete=models.CASCADE, related_name='actividades')
    periodo_academico = models.ForeignKey(PeriodoAcademico, on_delete=models.CASCADE, related_name='actividades')
    nombre = models.CharField(max_length=200)
    porcentaje = models.DecimalField(max_digits=5, decimal_places=2)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='borrador')
    fecha_publicacion = models.DateTimeField(null=True, blank=True)
    publicado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='actividades_publicadas')

    def __str__(self):
        return self.nombre


class Calificacion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actividad_evaluativa = models.ForeignKey(ActividadEvaluativa, on_delete=models.CASCADE, related_name='calificaciones')
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name='calificaciones')
    valor = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        unique_together = ('actividad_evaluativa', 'estudiante') # Evita duplicados combinando los dos campos

    def __str__(self):
        return f"{self.estudiante} - {self.actividad_evaluativa}: {self.valor}"


class RegistroAsistencia(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='registros_asistencia')
    fecha = models.DateField()
    cerrado = models.BooleanField(default=False)

    class Meta:
        unique_together = ('curso', 'fecha')

    def __str__(self):
        return f"{self.curso} - {self.fecha}"


class DetalleAsistencia(models.Model):
    ESTADO_CHOICES = [
        ('presente', 'Presente'),
        ('ausente', 'Ausente'),
        ('tardanza', 'Tardanza'),
        ('justificado', 'Justificado'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registro_asistencia = models.ForeignKey(RegistroAsistencia, on_delete=models.CASCADE, related_name='detalles')
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name='asistencias')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES)
    motivo_justificacion = models.TextField(blank=True, null=True)
    modificado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='asistencias_modificadas')
    modificado_en = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.estudiante} - {self.registro_asistencia}: {self.estado}"


class Observacion(models.Model):
    TIPO_CHOICES = [
        ('academica', 'Académica'),
        ('convivencia', 'Convivencia'),
        ('asistencia', 'Asistencia'),
        ('otro', 'Otro'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name='observaciones')
    autor = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='observaciones_registradas')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    descripcion = models.TextField()
    es_positiva = models.BooleanField(default=False)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.estudiante} - {self.tipo}"


class AlertaAcademica(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name='alertas')
    generada_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='alertas_generadas')
    es_automatica = models.BooleanField(default=False)
    titulo = models.CharField(max_length=200)
    contenido = models.TextField()
    indicador_tipo = models.CharField(max_length=100, blank=True, null=True)
    indicador_valor_anterior = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    indicador_valor_actual = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    activa = models.BooleanField(default=True)
    generada_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.estudiante} - {self.titulo}"


class AlertaLectura(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alerta = models.ForeignKey(AlertaAcademica, on_delete=models.CASCADE, related_name='lecturas')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='alertas_leidas')
    leido_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('alerta', 'usuario')


class Mensaje(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    remitente = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='mensajes_enviados')
    mensaje_padre = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='respuestas')
    asunto = models.CharField(max_length=200)
    contenido = models.TextField()
    enviado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.asunto


class DestinatarioMensaje(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mensaje = models.ForeignKey(Mensaje, on_delete=models.CASCADE, related_name='destinatarios')
    destinatario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='mensajes_recibidos')
    leido = models.BooleanField(default=False)
    leido_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('mensaje', 'destinatario')


class Notificacion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    autor = models.ForeignKey(Coordinador, on_delete=models.SET_NULL, null=True, related_name='notificaciones')
    asunto = models.CharField(max_length=200)
    contenido = models.TextField()
    enviada_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.asunto


class NotificacionLectura(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notificacion = models.ForeignKey(Notificacion, on_delete=models.CASCADE, related_name='lecturas')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='notificaciones_leidas')
    leido_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('notificacion', 'usuario')
