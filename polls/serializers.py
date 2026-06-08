from rest_framework import serializers
from .models import (
    Usuario, Grado, Curso, Estudiante, DetalleAsistencia,
    AlertaAcademica, Observacion, RegistroAsistencia,
    PeriodoAcademico, Asignatura, Calificacion,
    ActividadEvaluativa, Notificacion, Mensaje,
    DestinatarioMensaje,
)
from django.utils import timezone
from django.db.models import Sum, F, ExpressionWrapper, DecimalField, Q, Count
from datetime import date


# ─── HELPER ──────────────────────────────────────────────────────────────────

from django.db.models import Sum, F, ExpressionWrapper, DecimalField, Q

def calcular_promedio(e):
    if e.suma_porcentajes and e.suma_porcentajes > 0:
        return round(e.suma_ponderada / e.suma_porcentajes, 2)
    return None

def annotate_promedio(queryset, periodo_activo):
    filtro = Q(
        calificaciones__actividad_evaluativa__estado='publicada',
        calificaciones__actividad_evaluativa__periodo_academico=periodo_activo,
        calificaciones__valor__isnull=False
    )
    return queryset.annotate(
        suma_ponderada=Sum(
            ExpressionWrapper(
                F('calificaciones__valor') * F('calificaciones__actividad_evaluativa__porcentaje'),
                output_field=DecimalField()
            ),
            filter=filtro
        ),
        suma_porcentajes=Sum(
            F('calificaciones__actividad_evaluativa__porcentaje'),
            filter=filtro
        )
    )

def annotate_asistencia(queryset):
    return queryset.annotate(
        total_dias=Count('asistencias'),
        dias_presentes=Count(
            'asistencias',
            filter=Q(asistencias__estado__in=['presente', 'justificado'])
        )
    )


class UsuarioSerializer(serializers.ModelSerializer):
    perfil_id = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'rol', 'perfil_id']

    def get_perfil_id(self, user):
        perfil = getattr(user, user.rol, None)
        return str(perfil.id) if perfil else None


# ─── DASHBOARD COORDINADOR ───────────────────────────────────────────────────

class DashboardCoordinadorSerializer(serializers.Serializer):
    resumen = serializers.SerializerMethodField()
    cursos_por_grado = serializers.SerializerMethodField()
    asistencia_hoy = serializers.SerializerMethodField()
    alertas_activas = serializers.SerializerMethodField()
    observaciones_recientes = serializers.SerializerMethodField()

    def get_resumen(self, obj):
        total_estudiantes = Estudiante.objects.count()
        estudiantes_en_riesgo = Estudiante.objects.filter(
            riesgo__in=['medio', 'alto']
        ).count()

        hoy = timezone.now().date()
        detalles_hoy = DetalleAsistencia.objects.filter(
            registro_asistencia__fecha=hoy
        )
        total_hoy = detalles_hoy.count()
        presentes_hoy = detalles_hoy.filter(
            estado__in=['presente', 'justificado']
        ).count()
        porcentaje_asistencia = (
            round((presentes_hoy / total_hoy) * 100, 1)
            if total_hoy > 0 else 0
        )

        return {
            'grados_activos': Grado.objects.count(),
            'total_estudiantes': total_estudiantes,
            'estudiantes_en_riesgo': estudiantes_en_riesgo,
            'porcentaje_asistencia_hoy': porcentaje_asistencia,
        }

    def get_cursos_por_grado(self, obj):
        grados = Grado.objects.prefetch_related('cursos__estudiantes__usuario').all()
        resultado = []
        for grado in grados:
            cursos = []
            for curso in grado.cursos.all():
                estudiantes = curso.estudiantes.all()
                cursos.append({
                    'id': curso.id,
                    'nombre': curso.nombre,
                    'estudiantes': [
                        {
                            'id': e.id,
                            'nombre': f"{e.usuario.first_name} {e.usuario.last_name}",
                            'riesgo': e.riesgo,
                        }
                        for e in estudiantes
                    ]
                })
            resultado.append({
                'id': grado.id,
                'nombre': grado.nombre,
                'cursos': cursos,
            })
        return resultado

    def get_asistencia_hoy(self, obj):
        hoy = timezone.now().date()
        grados = Grado.objects.prefetch_related(
            'cursos__registros_asistencia__detalles__estudiante__usuario'
        ).all()
        resultado = []
        for grado in grados:
            cursos = []
            total_grado = 0
            presentes_grado = 0
            for curso in grado.cursos.all():
                registro = curso.registros_asistencia.filter(fecha=hoy).first()
                if not registro:
                    continue
                detalles = registro.detalles.all()
                total = detalles.count()
                presentes = detalles.filter(
                    estado__in=['presente', 'justificado']
                ).count()
                total_grado += total
                presentes_grado += presentes
                cursos.append({
                    'id': curso.id,
                    'nombre': curso.nombre,
                    'porcentaje_asistencia': (
                        round((presentes / total) * 100, 1) if total > 0 else 0
                    ),
                    'estudiantes': [
                        {
                            'id': d.estudiante.id,
                            'nombre': f"{d.estudiante.usuario.first_name} {d.estudiante.usuario.last_name}",
                            'estado': d.estado,
                        }
                        for d in detalles
                    ]
                })
            resultado.append({
                'id': grado.id,
                'nombre': grado.nombre,
                'porcentaje_asistencia': (
                    round((presentes_grado / total_grado) * 100, 1)
                    if total_grado > 0 else 0
                ),
                'cursos': cursos,
            })
        return resultado

    def get_alertas_activas(self, obj):
        alertas = AlertaAcademica.objects.filter(
            activa=True
        ).select_related(
            'estudiante__usuario'
        ).order_by('-generada_en')
        return [
            {
                'id': a.id,
                'estudiante': f"{a.estudiante.usuario.first_name} {a.estudiante.usuario.last_name}",
                'titulo': a.titulo,
                'indicador_tipo': a.indicador_tipo,
                'indicador_valor_anterior': a.indicador_valor_anterior,
                'indicador_valor_actual': a.indicador_valor_actual,
                'generada_en': a.generada_en.strftime('%d/%m/%Y %H:%M'),
            }
            for a in alertas
        ]

    def get_observaciones_recientes(self, obj):
        observaciones = Observacion.objects.select_related(
            'estudiante__usuario',
            'estudiante__curso__grado',
            'autor'
        ).order_by('-fecha_registro')[:20]
        return [
            {
                'id': o.id,
                'nombre': f"{o.estudiante.usuario.first_name} {o.estudiante.usuario.last_name}",
                'grado': o.estudiante.curso.grado.nombre if o.estudiante.curso and o.estudiante.curso.grado else None,
                'tipo': o.get_tipo_display(),
                'descripcion': o.descripcion,
                'es_positiva': o.es_positiva,
                'fecha': o.fecha_registro.strftime('%d/%m/%Y %H:%M'),
                'autor': f"{o.autor.first_name} {o.autor.last_name}" if o.autor else None,
            }
            for o in observaciones
        ]


# ─── LISTA DE ESTUDIANTES ────────────────────────────────────────────────────

class EstudiantesListaSerializer(serializers.Serializer):
    resumen = serializers.SerializerMethodField()
    estudiantes = serializers.SerializerMethodField()

    def get_resumen(self, obj):
        return {
            'total_estudiantes': Estudiante.objects.count(),
            'en_riesgo': Estudiante.objects.filter(riesgo='alto').count(),
            'en_seguimiento': Estudiante.objects.filter(riesgo='medio').count(),
            'sin_riesgo': Estudiante.objects.filter(riesgo='bajo').count(),
            'con_condicion': Estudiante.objects.filter(tiene_condicion_especial=True).count(),
        }

    def get_estudiantes(self, obj):
        periodo_activo = PeriodoAcademico.objects.filter(activo=True).first()

        estudiantes = Estudiante.objects.select_related(
            'usuario', 'curso__grado'
        ).prefetch_related('alertas')

        estudiantes = annotate_promedio(estudiantes, periodo_activo)
        estudiantes = annotate_asistencia(estudiantes)

        resultado = []
        for e in estudiantes:
            porcentaje_asistencia = (
                round((e.dias_presentes / e.total_dias) * 100, 1)
                if e.total_dias > 0 else 0
            )
            resultado.append({
                'id': e.id,
                'nombre': f"{e.usuario.first_name} {e.usuario.last_name}",
                'curso': e.curso.nombre if e.curso else None,
                'grado': e.curso.grado.nombre if e.curso and e.curso.grado else None,
                'tiene_condicion_especial': e.tiene_condicion_especial,
                'descripcion_condicion': e.descripcion_condicion,
                'alerta_activa': e.alertas.filter(activa=True).exists(),
                'promedio': round(calcular_promedio(e), 2) if calcular_promedio(e) else None,
                'porcentaje_asistencia': porcentaje_asistencia,
                'observaciones_negativas': e.observaciones.filter(es_positiva=False).count(),
                'riesgo': e.riesgo,
            })
        return resultado


# ─── PERFIL DEL ESTUDIANTE ───────────────────────────────────────────────────

class EstudiantePerfilSerializer(serializers.Serializer):
    info_general = serializers.SerializerMethodField()
    resumen = serializers.SerializerMethodField()
    observaciones = serializers.SerializerMethodField()
    asistencia = serializers.SerializerMethodField()
    calificaciones = serializers.SerializerMethodField()

    def get_info_general(self, estudiante):
        periodo_activo = PeriodoAcademico.objects.filter(activo=True).first()

        qs = annotate_promedio(
            Estudiante.objects.filter(pk=estudiante.pk), periodo_activo
        )
        qs = annotate_asistencia(qs)
        e = qs.first()

        porcentaje_asistencia = (
            round((e.dias_presentes / e.total_dias) * 100, 1)
            if e.total_dias > 0 else 0
        )

        return {
            'id': e.id,
            'nombre': f"{e.usuario.first_name} {e.usuario.last_name}",
            'curso': e.curso.nombre if e.curso else None,
            'grado': e.curso.grado.nombre if e.curso and e.curso.grado else None,
            'riesgo': e.riesgo,
            'tiene_condicion_especial': e.tiene_condicion_especial,
            'descripcion_condicion': e.descripcion_condicion,
            'promedio': round(calcular_promedio(e), 2) if calcular_promedio(e) else None,
            'porcentaje_asistencia': porcentaje_asistencia,
            'total_observaciones': estudiante.observaciones.count(),
            'alertas_activas': estudiante.alertas.filter(activa=True).count(),
        }

    def get_resumen(self, estudiante):
        alertas = estudiante.alertas.filter(activa=True).order_by('-generada_en')
        observaciones_recientes = estudiante.observaciones.select_related(
            'autor'
        ).order_by('-fecha_registro')[:5]

        return {
            'alertas': [
                {
                    'id': a.id,
                    'titulo': a.titulo,
                    'contenido': a.contenido,
                    'indicador_tipo': a.indicador_tipo,
                    'indicador_valor_anterior': a.indicador_valor_anterior,
                    'indicador_valor_actual': a.indicador_valor_actual,
                    'generada_en': a.generada_en.strftime('%d/%m/%Y %H:%M'),
                }
                for a in alertas
            ],
            'observaciones_recientes': [
                {
                    'id': o.id,
                    'tipo': o.get_tipo_display(),
                    'descripcion': o.descripcion,
                    'es_positiva': o.es_positiva,
                    'fecha': o.fecha_registro.strftime('%d/%m/%Y %H:%M'),
                    'autor': f"{o.autor.first_name} {o.autor.last_name}" if o.autor else None,
                }
                for o in observaciones_recientes
            ],
        }

    def get_observaciones(self, estudiante):
        observaciones = estudiante.observaciones.select_related(
            'autor'
        ).order_by('-fecha_registro')
        return [
            {
                'id': o.id,
                'tipo': o.get_tipo_display(),
                'descripcion': o.descripcion,
                'es_positiva': o.es_positiva,
                'fecha': o.fecha_registro.strftime('%d/%m/%Y %H:%M'),
                'autor': f"{o.autor.first_name} {o.autor.last_name}" if o.autor else None,
            }
            for o in observaciones
        ]

    def get_asistencia(self, estudiante):
        detalles = DetalleAsistencia.objects.filter(
            estudiante=estudiante
        ).select_related(
            'registro_asistencia', 'modificado_por'
        ).order_by('-registro_asistencia__fecha')
        return [
            {
                'id': d.id,
                'fecha': d.registro_asistencia.fecha.strftime('%d/%m/%Y'),
                'estado': d.get_estado_display(),
                'motivo_justificacion': d.motivo_justificacion,
                'modificado_por': (
                    f"{d.modificado_por.first_name} {d.modificado_por.last_name}"
                    if d.modificado_por else None
                ),
                'modificado_en': (
                    d.modificado_en.strftime('%d/%m/%Y %H:%M')
                    if d.modificado_en else None
                ),
            }
            for d in detalles
        ]

    def get_calificaciones(self, estudiante):
        periodo_activo = PeriodoAcademico.objects.filter(activo=True).first()
        if not periodo_activo:
            return []

        asignaturas = Asignatura.objects.filter(curso=estudiante.curso)

        resultado = []
        for asignatura in asignaturas:
            calificaciones = Calificacion.objects.filter(
                estudiante=estudiante,
                actividad_evaluativa__asignatura=asignatura,
                actividad_evaluativa__estado='publicada',
                actividad_evaluativa__periodo_academico=periodo_activo,
                valor__isnull=False
            ).select_related('actividad_evaluativa')

            promedio = None
            if calificaciones.exists():
                suma_ponderada = sum(
                    c.valor * c.actividad_evaluativa.porcentaje
                    for c in calificaciones
                )
                suma_porcentajes = sum(
                    c.actividad_evaluativa.porcentaje
                    for c in calificaciones
                )
                if suma_porcentajes > 0:
                    promedio = round(suma_ponderada / suma_porcentajes, 2)

            # ✅ Incluir notas individuales para mostrarlas en el frontend
            notas = [
                {
                    'nombre': c.actividad_evaluativa.nombre,
                    'porcentaje': float(c.actividad_evaluativa.porcentaje),
                    'valor': float(c.valor),
                }
                for c in calificaciones
            ]

            resultado.append({
                'asignatura_id': str(asignatura.id),
                'asignatura': asignatura.nombre,
                'promedio': float(promedio) if promedio is not None else None,
                'notas': notas,
            })
        return resultado


# ─── ESCRITURAS ──────────────────────────────────────────────────────────────

class EstudianteCondicionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estudiante
        fields = ['tiene_condicion_especial', 'descripcion_condicion']


class DetalleAsistenciaEditarSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleAsistencia
        fields = ['estado', 'motivo_justificacion']

    def validate(self, data):
        estado = data.get('estado')
        motivo = data.get('motivo_justificacion')
        if estado == 'justificado' and not motivo:
            raise serializers.ValidationError(
                'Se requiere motivo cuando el estado es justificado.'
            )
        return data
    
# ─── CALIFICACIONES COORDINADOR ──────────────────────────────────────────────

class CalificacionesCoordinadorSerializer(serializers.Serializer):
    resumen = serializers.SerializerMethodField()
    asignaturas = serializers.SerializerMethodField()

    def get_resumen(self, obj):
        total_asignaturas = Asignatura.objects.count()
        total_estudiantes = Estudiante.objects.count()
        sin_actividades = Asignatura.objects.filter(
            actividades__isnull=True
        ).count()

        return {
            'total_asignaturas': total_asignaturas,
            'total_estudiantes': total_estudiantes,
            'asignaturas_sin_actividades': sin_actividades,
        }

    def get_asignaturas(self, obj):
        # Filtro por docente opcional, viene desde la vista via context
        docente_id = self.context.get('docente_id')

        asignaturas = Asignatura.objects.select_related(
            'docente__usuario', 'curso__estudiantes'
        ).prefetch_related(
            'actividades__calificaciones__estudiante__usuario'
        ).annotate(
            num_estudiantes=Count('curso__estudiantes')
        )

        if docente_id:
            asignaturas = asignaturas.filter(docente__id=docente_id)

        resultado = []
        for asignatura in asignaturas:
            actividades = asignatura.actividades.all()
            estudiantes = Estudiante.objects.filter(curso=asignatura.curso)

            resultado.append({
                'id': asignatura.id,
                'nombre': asignatura.nombre,
                'docente': (
                    f"{asignatura.docente.usuario.first_name} {asignatura.docente.usuario.last_name}"
                    if asignatura.docente else None
                ),
                'num_estudiantes': asignatura.num_estudiantes,
                'actividades': [
                    {
                        'id': actividad.id,
                        'nombre': actividad.nombre,
                        'porcentaje': actividad.porcentaje,
                        'estado': actividad.get_estado_display(),
                        'calificaciones': [
                            {
                                'estudiante_id': e.id,
                                'estudiante': f"{e.usuario.first_name} {e.usuario.last_name}",
                                'valor': next(
                                    (
                                        c.valor for c in actividad.calificaciones.all()
                                        if c.estudiante_id == e.id
                                    ),
                                    None
                                ),
                            }
                            for e in estudiantes
                        ]
                    }
                    for actividad in actividades
                ]
            })
        return resultado


# ─── PUBLICAR ASIGNATURA COMPLETA ─────────────────────────────────────────────

class PublicarAsignaturaSerializer(serializers.Serializer):
    asignatura_id = serializers.UUIDField()

    def validate_asignatura_id(self, value):
        try:
            asignatura = Asignatura.objects.prefetch_related(
                'actividades__calificaciones'
            ).get(pk=value)
        except Asignatura.DoesNotExist:
            raise serializers.ValidationError('La asignatura no existe.')

        actividades = asignatura.actividades.all()

        if not actividades.exists():
            raise serializers.ValidationError(
                'La asignatura no tiene actividades registradas.'
            )

        estudiantes = Estudiante.objects.filter(curso=asignatura.curso)

        for actividad in actividades:
            for estudiante in estudiantes:
                tiene_nota = actividad.calificaciones.filter(
                    estudiante=estudiante,
                    valor__isnull=False
                ).exists()
                if not tiene_nota:
                    raise serializers.ValidationError(
                        f'El estudiante {estudiante} no tiene nota en la actividad "{actividad.nombre}".'
                    )

        self.context['asignatura'] = asignatura
        return value

    def save(self, **kwargs):
        from django.utils import timezone
        asignatura = self.context['asignatura']
        publicado_por = self.context['request'].user
        ahora = timezone.now()

        asignatura.actividades.filter(
            estado='borrador'
        ).update(
            estado='publicada',
            fecha_publicacion=ahora,
            publicado_por=publicado_por
        )

# ─── OBSERVADOR COORDINADOR ───────────────────────────────────────────────────

class ObservadorCoordinadorSerializer(serializers.Serializer):
    resumen = serializers.SerializerMethodField()
    cursos = serializers.SerializerMethodField()

    def get_resumen(self, obj):
        return {
            'total_estudiantes': Estudiante.objects.count(),
            'total_observaciones': Observacion.objects.count(),
            'estudiantes_en_rojo': Estudiante.objects.filter(riesgo='alto').count(),
            'estudiantes_en_amarillo': Estudiante.objects.filter(riesgo='medio').count(),
        }

    def get_cursos(self, obj):
        # Filtro por curso opcional, viene desde la vista via context
        curso_id = self.context.get('curso_id')

        cursos = Curso.objects.prefetch_related(
            'estudiantes__observaciones__autor',
            'estudiantes__usuario',
        ).annotate(
            num_estudiantes=Count('estudiantes', distinct=True),
            num_observaciones=Count('estudiantes__observaciones', distinct=True),
            num_rojo=Count(
                'estudiantes',
                filter=Q(estudiantes__riesgo='alto'),
                distinct=True
            ),
            num_amarillo=Count(
                'estudiantes',
                filter=Q(estudiantes__riesgo='medio'),
                distinct=True
            ),
        )

        if curso_id:
            cursos = cursos.filter(id=curso_id)

        resultado = []
        for curso in cursos:
            estudiantes = []
            for e in curso.estudiantes.all():
                observaciones = e.observaciones.all()
                estudiantes.append({
                    'id': e.id,
                    'nombre': f"{e.usuario.first_name} {e.usuario.last_name}",
                    'riesgo': e.riesgo,
                    'num_observaciones': observaciones.count(),
                    'num_disciplinarias': observaciones.filter(tipo='disciplinaria').count(),
                    'num_seguimiento': observaciones.filter(tipo='seguimiento').count(),
                    'num_logro': observaciones.filter(tipo='logro').count(),
                    'num_academica': observaciones.filter(tipo='academica').count(),
                    'observaciones': [
                        {
                            'id': o.id,
                            'tipo': o.get_tipo_display(),
                            'descripcion': o.descripcion,
                            'es_positiva': o.es_positiva,
                            'fecha': o.fecha_registro.strftime('%d/%m/%Y %H:%M'),
                            'autor': (
                                f"{o.autor.first_name} {o.autor.last_name}"
                                if o.autor else None
                            ),
                        }
                        for o in observaciones.order_by('-fecha_registro')
                    ]
                })

            resultado.append({
                'id': curso.id,
                'nombre': curso.nombre,
                'num_estudiantes': curso.num_estudiantes,
                'num_observaciones': curso.num_observaciones,
                'num_rojo': curso.num_rojo,
                'num_amarillo': curso.num_amarillo,
                'estudiantes': estudiantes,
            })
        return resultado


# ─── AGREGAR OBSERVACION ──────────────────────────────────────────────────────

class ObservacionCrearSerializer(serializers.ModelSerializer):
    class Meta:
        model = Observacion
        fields = ['estudiante', 'tipo', 'descripcion', 'es_positiva']

    def validate_estudiante(self, value):
        if not Estudiante.objects.filter(pk=value.pk).exists():
            raise serializers.ValidationError('El estudiante no existe.')
        return value

    def create(self, validated_data):
        validated_data['autor'] = self.context['request'].user
        validated_data['curso'] = validated_data['estudiante'].curso
        # ── Forzar es_positiva=True cuando el tipo es 'logro' ──
        if validated_data.get('tipo') == 'logro':
            validated_data['es_positiva'] = True
        return super().create(validated_data)

# ─── MENSAJES COORDINADOR ─────────────────────────────────────────────────────

class BandejaSerializer(serializers.Serializer):
    mensajes = serializers.SerializerMethodField()
    alertas = serializers.SerializerMethodField()
    notificaciones = serializers.SerializerMethodField()

    def get_mensajes(self, obj):
        usuario = self.context['request'].user

        # Mensajes recibidos
        recibidos = Mensaje.objects.filter(
            destinatarios__destinatario=usuario
        ).select_related('remitente').prefetch_related(
            'destinatarios__destinatario'
        ).order_by('-enviado_en')

        # Mensajes enviados
        enviados = Mensaje.objects.filter(
            remitente=usuario
        ).select_related('remitente').prefetch_related(
            'destinatarios__destinatario'
        ).order_by('-enviado_en')

        def serializar_mensaje(m, leido=None):
            return {
                'id': m.id,
                'asunto': m.asunto,
                'contenido': m.contenido,
                'autor': f"{m.remitente.first_name} {m.remitente.last_name}",
                'hora': m.enviado_en.strftime('%d/%m/%Y %H:%M'),
                'destinatarios': [
                    f"{d.destinatario.first_name} {d.destinatario.last_name}"
                    for d in m.destinatarios.all()
                ],
                'mensaje_padre_id': m.mensaje_padre_id,
                'leido': leido,
            }

        return {
            'recibidos': [
                serializar_mensaje(
                    m,
                    leido=m.destinatarios.filter(
                        destinatario=usuario
                    ).first().leido
                )
                for m in recibidos
            ],
            'enviados': [serializar_mensaje(m) for m in enviados],
        }

    def get_alertas(self, obj):
        usuario = self.context['request'].user

        alertas = AlertaAcademica.objects.select_related(
            'estudiante__usuario',
            'generada_por',
        ).prefetch_related('lecturas').order_by('-generada_en')

        return [
            {
                'id': a.id,
                'titulo': a.titulo,
                'contenido': a.contenido,
                'autor': (
                    f"{a.generada_por.first_name} {a.generada_por.last_name}"
                    if a.generada_por else 'Sistema'
                ),
                'hora': a.generada_en.strftime('%d/%m/%Y %H:%M'),
                'destinatarios': [
                    f"{a.estudiante.usuario.first_name} {a.estudiante.usuario.last_name}"
                ],
                'leido': a.lecturas.filter(usuario=usuario).exists(),
            }
            for a in alertas
        ]

    def get_notificaciones(self, obj):
        usuario = self.context['request'].user

        notificaciones = Notificacion.objects.select_related(
            'autor__usuario'
        ).prefetch_related('lecturas').order_by('-enviada_en')

        return [
            {
                'id': n.id,
                'asunto': n.asunto,
                'contenido': n.contenido,
                'autor': (
                    f"{n.autor.usuario.first_name} {n.autor.usuario.last_name}"
                    if n.autor else None
                ),
                'hora': n.enviada_en.strftime('%d/%m/%Y %H:%M'),
                'leido': n.lecturas.filter(usuario=usuario).exists(),
            }
            for n in notificaciones
        ]


# ─── CREAR MENSAJE ────────────────────────────────────────────────────────────

class MensajeCrearSerializer(serializers.Serializer):
    destinatarios = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1
    )
    asunto = serializers.CharField(max_length=200)
    contenido = serializers.CharField()

    def validate_destinatarios(self, value):
        from .models import Usuario
        usuarios = Usuario.objects.filter(id__in=value)
        if usuarios.count() != len(value):
            raise serializers.ValidationError(
                'Uno o más destinatarios no existen.'
            )
        self.context['destinatarios'] = usuarios
        return value

    def create(self, validated_data):
        from .models import Usuario
        mensaje = Mensaje.objects.create(
            remitente=self.context['request'].user,
            asunto=validated_data['asunto'],
            contenido=validated_data['contenido'],
        )
        DestinatarioMensaje.objects.bulk_create([
            DestinatarioMensaje(mensaje=mensaje, destinatario=d)
            for d in self.context['destinatarios']
        ])
        return mensaje


# ─── RESPONDER MENSAJE ────────────────────────────────────────────────────────

class MensajeResponderSerializer(serializers.Serializer):
    contenido = serializers.CharField()
    mensaje_padre_id = serializers.UUIDField()

    def validate_mensaje_padre_id(self, value):
        try:
            mensaje_padre = Mensaje.objects.prefetch_related(
                'destinatarios__destinatario'
            ).get(pk=value)
        except Mensaje.DoesNotExist:
            raise serializers.ValidationError('El mensaje no existe.')
        self.context['mensaje_padre'] = mensaje_padre
        return value

    def create(self, validated_data):
        usuario = self.context['request'].user
        mensaje_padre = self.context['mensaje_padre']

        # La respuesta va dirigida al remitente original
        respuesta = Mensaje.objects.create(
            remitente=usuario,
            mensaje_padre=mensaje_padre,
            asunto=f"Re: {mensaje_padre.asunto}",
            contenido=validated_data['contenido'],
        )
        DestinatarioMensaje.objects.create(
            mensaje=respuesta,
            destinatario=mensaje_padre.remitente,
        )
        return respuesta


# ─── CREAR ALERTA MANUAL ──────────────────────────────────────────────────────

class AlertaCrearSerializer(serializers.Serializer):
    estudiante_id = serializers.UUIDField()
    descripcion = serializers.CharField()

    def validate_estudiante_id(self, value):
        try:
            estudiante = Estudiante.objects.select_related('usuario').get(pk=value)
        except Estudiante.DoesNotExist:
            raise serializers.ValidationError('El estudiante no existe.')
        self.context['estudiante'] = estudiante
        return value

    def create(self, validated_data):
        estudiante = self.context['estudiante']
        usuario = self.context['request'].user
        nombre_estudiante = (
            f"{estudiante.usuario.first_name} {estudiante.usuario.last_name}"
        )
        return AlertaAcademica.objects.create(
            estudiante=estudiante,
            generada_por=usuario,
            es_automatica=False,
            titulo=f"Alerta manual: {nombre_estudiante}",
            contenido=validated_data['descripcion'],
            activa=True,
        )
    
# ─── DASHBOARD DOCENTE ────────────────────────────────────────────────────────

class DashboardDocenteSerializer(serializers.Serializer):
    resumen = serializers.SerializerMethodField()
    asignaturas = serializers.SerializerMethodField()

    def get_resumen(self, obj):
        docente = self.context['docente']
        hoy = hoy = date.today()

        # IDs de todos los cursos donde el docente tiene asignaturas
        curso_ids = Asignatura.objects.filter(
            docente=docente
        ).values_list('curso_id', flat=True).distinct()

        # Estudiantes únicos en esos cursos
        estudiantes = Estudiante.objects.filter(curso_id__in=curso_ids)
        total_estudiantes = estudiantes.count()
        estudiantes_en_riesgo = estudiantes.filter(
            riesgo__in=['medio', 'alto']
        ).count()

        # Asistencia hoy de esos cursos
        detalles_hoy = DetalleAsistencia.objects.filter(
            registro_asistencia__fecha=hoy,
            registro_asistencia__curso_id__in=curso_ids,
        )
        total_hoy = detalles_hoy.count()
        presentes_hoy = detalles_hoy.filter(
            estado__in=['presente', 'justificado']
        ).count()

        return {
            'total_asignaturas': Asignatura.objects.filter(docente=docente).count(),
            'total_estudiantes': total_estudiantes,
            'estudiantes_en_riesgo': estudiantes_en_riesgo,
            'porcentaje_asistencia_hoy': (
                round((presentes_hoy / total_hoy) * 100, 1)
                if total_hoy > 0 else None
            ),
        }

    def get_asignaturas(self, obj):
        docente = self.context['docente']
        hoy = date.today()  # ✅ usa date.today() en lugar de timezone.now().date()
        periodo_activo = PeriodoAcademico.objects.filter(activo=True).first()

        asignaturas = Asignatura.objects.filter(
            docente=docente
        ).select_related('curso__grado').prefetch_related(
            'curso__estudiantes__usuario',
            'curso__estudiantes__observaciones',
            'curso__estudiantes__alertas',
        )

        # ✅ Precarga los registros de HOY en un solo query antes del loop
        curso_ids = asignaturas.values_list('curso_id', flat=True).distinct()
        registros_hoy = {
            r.curso_id: r
            for r in RegistroAsistencia.objects.filter(
                curso_id__in=curso_ids,
                fecha=hoy,
            ).prefetch_related('detalles')
        }

        resultado = []
        for asignatura in asignaturas:
            curso = asignatura.curso

            # ✅ Lookup directo en el diccionario, sin filtrar sobre prefetch
            registro_hoy = registros_hoy.get(curso.id)
            detalles_hoy = registro_hoy.detalles.all() if registro_hoy else []
            total_hoy = len(detalles_hoy)
            presentes_hoy = sum(
                1 for d in detalles_hoy
                if d.estado in ['presente', 'justificado']
            )

            # Promedio de la asignatura
            qs_estudiantes = annotate_promedio(
                Estudiante.objects.filter(curso=curso),
                periodo_activo
            )
            qs_estudiantes = annotate_asistencia(qs_estudiantes).select_related(
                'usuario'
            ).prefetch_related('observaciones', 'alertas')

            promedio_asignatura = None
            promedios = [
                e.suma_ponderada / e.suma_porcentajes
                for e in qs_estudiantes
                if e.suma_porcentajes and e.suma_porcentajes > 0
            ]
            if promedios:
                promedio_asignatura = round(
                    sum(promedios) / len(promedios), 2
                )

            # Detalle por estudiante
            detalle_estudiantes = []
            for e in qs_estudiantes:
                promedio_estudiante = (
                    round(e.suma_ponderada / e.suma_porcentajes, 2)
                    if e.suma_porcentajes and e.suma_porcentajes > 0
                    else None
                )
                porcentaje_asistencia = (
                    round((e.dias_presentes / e.total_dias) * 100, 1)
                    if e.total_dias > 0 else None
                )
                detalle_estudiantes.append({
                    'id': e.id,
                    'nombre': f"{e.usuario.first_name} {e.usuario.last_name}",
                    'promedio': promedio_estudiante,
                    'porcentaje_asistencia': porcentaje_asistencia,
                    'num_observaciones': e.observaciones.count(),
                    'riesgo': e.riesgo,
                })

            resultado.append({
                'id': asignatura.id,
                'nombre': asignatura.nombre,
                'curso': curso.nombre,
                'num_estudiantes': curso.estudiantes.count(),  # ✅
                'porcentaje_asistencia_hoy': (
                    round((presentes_hoy / total_hoy) * 100, 1)
                    if total_hoy > 0 else None
                ),
                'promedio': promedio_asignatura,
                'estudiantes_en_riesgo': sum(
                    1 for e in qs_estudiantes
                    if e.riesgo in ['medio', 'alto']
                ),  # ✅
                'estudiantes': detalle_estudiantes,
            })

        return resultado
    
# ─── ASISTENCIA DOCENTE ───────────────────────────────────────────────────────

class AsistenciaRegistroHoySerializer(serializers.Serializer):
    cursos = serializers.SerializerMethodField()

    def get_cursos(self, obj):
        docente = self.context['docente']
        hoy = timezone.now().date()

        # Solo cursos donde el docente es titular
        cursos = Curso.objects.filter(
            docente_titular=docente
        ).prefetch_related(
            'estudiantes__usuario',
        )

        resultado = []
        for curso in cursos:
            estudiantes = curso.estudiantes.all()
            registro_hoy = RegistroAsistencia.objects.filter(
                curso=curso, fecha=hoy
            ).prefetch_related('detalles').first()

            # Mapeamos estudiante_id -> estado si ya existe registro
            estado_por_estudiante = {}
            if registro_hoy:
                for d in registro_hoy.detalles.all():
                    estado_por_estudiante[d.estudiante_id] = d.estado

            resultado.append({
                'id': curso.id,
                'nombre': curso.nombre,
                'num_estudiantes': estudiantes.count(),
                'registro_cerrado': registro_hoy.cerrado if registro_hoy else False,
                'estudiantes': [
                    {
                        'id': e.id,
                        'nombre': f"{e.usuario.first_name} {e.usuario.last_name}",
                        'tiene_condicion_especial': e.tiene_condicion_especial,
                        'descripcion_condicion': e.descripcion_condicion,
                        # None si aun no se ha tomado asistencia hoy
                        'estado_asistencia': estado_por_estudiante.get(e.id, None),
                    }
                    for e in estudiantes
                ]
            })
        return resultado


class AsistenciaHistorialSerializer(serializers.Serializer):
    cursos = serializers.SerializerMethodField()

    def get_cursos(self, obj):
        docente = self.context['docente']

        cursos = Curso.objects.filter(
            docente_titular=docente
        ).prefetch_related(
            'registros_asistencia__detalles'
        )

        resultado = []
        for curso in cursos:
            registros = curso.registros_asistencia.filter(
                cerrado=True
            ).order_by('-fecha')

            historial = []
            for registro in registros:
                detalles = registro.detalles.all()
                total = detalles.count()
                presentes = detalles.filter(
                    estado__in=['presente', 'justificado']
                ).count()
                ausentes = detalles.filter(estado='ausente').count()

                historial.append({
                    'id': registro.id,
                    'fecha': registro.fecha.strftime('%d/%m/%Y'),
                    'num_presentes': presentes,
                    'num_ausentes': ausentes,
                    'porcentaje_asistencia': (
                        round((presentes / total) * 100, 1)
                        if total > 0 else 0
                    ),
                })

            resultado.append({
                'id': curso.id,
                'nombre': curso.nombre,
                'historial': historial,
            })
        return resultado


# ─── PUBLICAR REGISTRO DE ASISTENCIA ─────────────────────────────────────────

class AsistenciaPublicarSerializer(serializers.Serializer):
    curso_id = serializers.UUIDField()
    asistencias = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )

    def validate_curso_id(self, value):
        docente = self.context['docente']
        try:
            curso = Curso.objects.get(pk=value, docente_titular=docente)
        except Curso.DoesNotExist:
            raise serializers.ValidationError(
                'El curso no existe o no eres titular de este curso.'
            )
        self.context['curso'] = curso
        return value

    def validate_asistencias(self, value):
        for item in value:
            if 'estudiante_id' not in item:
                raise serializers.ValidationError(
                    'Cada entrada debe incluir estudiante_id.'
                )
            if 'estado' not in item:
                raise serializers.ValidationError(
                    'Cada entrada debe incluir estado.'
                )
            estados_validos = ['presente', 'ausente', 'tardanza', 'justificado']
            if item['estado'] not in estados_validos:
                raise serializers.ValidationError(
                    f"Estado inválido: {item['estado']}. "
                    f"Debe ser uno de {estados_validos}."
                )
        return value

    def validate(self, data):
        hoy = timezone.now().date()
        curso = self.context.get('curso')

        if not curso:
            return data

        # Verificar que no exista ya un registro cerrado para hoy
        registro_existente = RegistroAsistencia.objects.filter(
            curso=curso, fecha=hoy, cerrado=True
        ).exists()
        if registro_existente:
            raise serializers.ValidationError(
                'Ya existe un registro de asistencia cerrado para hoy.'
            )

        # Verificar que los estudiantes pertenezcan al curso
        estudiante_ids = [item['estudiante_id'] for item in data['asistencias']]
        estudiantes_validos = Estudiante.objects.filter(
            curso=curso, id__in=estudiante_ids
        ).values_list('id', flat=True)
        estudiantes_validos_str = [str(e) for e in estudiantes_validos]

        invalidos = [
            eid for eid in estudiante_ids
            if str(eid) not in estudiantes_validos_str
        ]
        if invalidos:
            raise serializers.ValidationError(
                f'Los siguientes estudiantes no pertenecen al curso: {invalidos}'
            )

        # Verificar que estén todos los estudiantes del curso
        total_estudiantes = Estudiante.objects.filter(curso=curso).count()
        if len(data['asistencias']) != total_estudiantes:
            raise serializers.ValidationError(
                f'Faltan estudiantes. El curso tiene {total_estudiantes} '
                f'estudiantes y se enviaron {len(data["asistencias"])}.'
            )

        return data

    def create(self, validated_data):
        hoy = timezone.now().date()
        curso = self.context['curso']
        docente_usuario = self.context['request'].user  # remitente del mensaje

        registro, _ = RegistroAsistencia.objects.get_or_create(
            curso=curso,
            fecha=hoy,
        )

        DetalleAsistencia.objects.bulk_create([
            DetalleAsistencia(
                registro_asistencia=registro,
                estudiante_id=item['estudiante_id'],
                estado=item['estado'],
            )
            for item in validated_data['asistencias']
        ])

        registro.cerrado = True
        registro.save()

        # ── Mensajes automáticos a acudientes de estudiantes ausentes ──
        ausentes = [
            item for item in validated_data['asistencias']
            if item['estado'] == 'ausente'
        ]

        for item in ausentes:
            try:
                estudiante = Estudiante.objects.select_related(
                    'acudiente__usuario'
                ).get(pk=item['estudiante_id'])

                acudiente = estudiante.acudiente
                if not acudiente or not acudiente.usuario:
                    continue  # este estudiante no tiene acudiente registrado

                mensaje = Mensaje.objects.create(
                    remitente=docente_usuario,
                    asunto=f"Ausencia registrada – {curso.nombre} ({hoy.strftime('%d/%m/%Y')})",
                    contenido=(
                        f"Le informamos que su acudido/a "
                        f"{estudiante.usuario.first_name} {estudiante.usuario.last_name} "
                        f"fue registrado/a como AUSENTE el día {hoy.strftime('%d/%m/%Y')} "
                        f"en el curso {curso.nombre}."
                    ),
                )
                DestinatarioMensaje.objects.create(
                    mensaje=mensaje,
                    destinatario=acudiente.usuario,  # ← instancia de Usuario, no UUID
                )
            except Exception as e:
                # El error no detiene el registro; solo se reporta en consola
                print(f"[AVISO] No se pudo crear mensaje para estudiante {item['estudiante_id']}: {e}")

        return registro

# ─── CALIFICACIONES DOCENTE ───────────────────────────────────────────────────

class CalificacionesDocenteSerializer(serializers.Serializer):
    asignaturas = serializers.SerializerMethodField()

    def get_asignaturas(self, obj):
        docente = self.context['docente']
        periodo_activo = PeriodoAcademico.objects.filter(activo=True).first()

        asignaturas = Asignatura.objects.filter(
            docente=docente
        ).select_related('curso').prefetch_related(
            'actividades__calificaciones__estudiante__usuario',
            'curso__estudiantes__usuario',
        )

        resultado = []
        for asignatura in asignaturas:
            estudiantes = asignatura.curso.estudiantes.all()
            num_estudiantes = estudiantes.count()

            actividades = asignatura.actividades.filter(
                periodo_academico=periodo_activo
            ) if periodo_activo else asignatura.actividades.none()

            detalle_actividades = []
            for actividad in actividades:
                calificaciones = actividad.calificaciones.all()

                # Mapeamos estudiante_id -> valor para lookup eficiente
                notas_por_estudiante = {
                    c.estudiante_id: c.valor
                    for c in calificaciones
                }

                sin_calificar = sum(
                    1 for e in estudiantes
                    if notas_por_estudiante.get(e.id) is None
                )

                detalle_actividades.append({
                    'id': actividad.id,
                    'nombre': actividad.nombre,
                    'porcentaje': actividad.porcentaje,
                    'estado': actividad.get_estado_display(),
                    'num_sin_calificar': sin_calificar,
                    'calificaciones': [
                        {
                            'estudiante_id': e.id,
                            'estudiante': (
                                f"{e.usuario.first_name} {e.usuario.last_name}"
                            ),
                            'valor': notas_por_estudiante.get(e.id, None),
                        }
                        for e in estudiantes
                    ]
                })

            resultado.append({
                'id': asignatura.id,
                'nombre': asignatura.nombre,
                'curso': asignatura.curso.nombre,
                'num_estudiantes': num_estudiantes,
                'actividades': detalle_actividades,
            })

        return resultado


# ─── CREAR ACTIVIDAD CON CALIFICACIONES ───────────────────────────────────────

class ActividadCrearSerializer(serializers.Serializer):
    asignatura_id = serializers.UUIDField()
    nombre = serializers.CharField(max_length=200)
    porcentaje = serializers.DecimalField(max_digits=5, decimal_places=2)
    calificaciones = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )

    def validate_asignatura_id(self, value):
        docente = self.context['docente']
        try:
            asignatura = Asignatura.objects.select_related('curso').get(
                pk=value, docente=docente
            )
        except Asignatura.DoesNotExist:
            raise serializers.ValidationError(
                'La asignatura no existe o no te pertenece.'
            )
        self.context['asignatura'] = asignatura
        return value

    def validate_porcentaje(self, value):
        if value <= 0 or value > 100:
            raise serializers.ValidationError(
                'El porcentaje debe estar entre 0 y 100.'
            )
        return value

    def validate_calificaciones(self, value):
        for item in value:
            if 'estudiante_id' not in item:
                raise serializers.ValidationError(
                    'Cada entrada debe incluir estudiante_id.'
                )
            if 'valor' not in item:
                raise serializers.ValidationError(
                    'Cada entrada debe incluir valor.'
                )
            valor = item['valor']
            if valor is not None and not (0 <= float(valor) <= 5):
                raise serializers.ValidationError(
                    f"El valor {valor} está fuera del rango permitido (0.0 - 5.0)."
                )
        return value

    def validate(self, data):
        asignatura = self.context.get('asignatura')
        if not asignatura:
            return data

        periodo_activo = PeriodoAcademico.objects.filter(activo=True).first()
        if not periodo_activo:
            raise serializers.ValidationError(
                'No hay un periodo académico activo.'
            )
        self.context['periodo_activo'] = periodo_activo

        # Verificar que los estudiantes pertenezcan al curso
        estudiante_ids = [item['estudiante_id'] for item in data['calificaciones']]
        estudiantes_validos = Estudiante.objects.filter(
            curso=asignatura.curso, id__in=estudiante_ids
        ).values_list('id', flat=True)
        estudiantes_validos_str = [str(e) for e in estudiantes_validos]

        invalidos = [
            eid for eid in estudiante_ids
            if str(eid) not in estudiantes_validos_str
        ]
        if invalidos:
            raise serializers.ValidationError(
                f'Los siguientes estudiantes no pertenecen al curso: {invalidos}'
            )

        # Verificar que estén todos los estudiantes del curso
        total_estudiantes = Estudiante.objects.filter(
            curso=asignatura.curso
        ).count()
        if len(data['calificaciones']) != total_estudiantes:
            raise serializers.ValidationError(
                f'Faltan estudiantes. El curso tiene {total_estudiantes} '
                f'estudiantes y se enviaron {len(data["calificaciones"])}.'
            )

        return data

    def create(self, validated_data):
        asignatura = self.context['asignatura']
        periodo_activo = self.context['periodo_activo']

        actividad = ActividadEvaluativa.objects.create(
            asignatura=asignatura,
            periodo_academico=periodo_activo,
            nombre=validated_data['nombre'],
            porcentaje=validated_data['porcentaje'],
            estado='borrador',
        )

        Calificacion.objects.bulk_create([
            Calificacion(
                actividad_evaluativa=actividad,
                estudiante_id=item['estudiante_id'],
                valor=item.get('valor'),
            )
            for item in validated_data['calificaciones']
        ])

        return actividad


# ─── PUBLICAR ACTIVIDAD ───────────────────────────────────────────────────────

class ActividadPublicarSerializer(serializers.Serializer):
    actividad_id = serializers.UUIDField()

    def validate_actividad_id(self, value):
        docente = self.context['docente']
        try:
            actividad = ActividadEvaluativa.objects.prefetch_related(
                'calificaciones'
            ).get(
                pk=value,
                asignatura__docente=docente
            )
        except ActividadEvaluativa.DoesNotExist:
            raise serializers.ValidationError(
                'La actividad no existe o no te pertenece.'
            )

        if actividad.estado != 'borrador':
            raise serializers.ValidationError(
                'Solo se pueden publicar actividades en estado borrador.'
            )

        # Verificar que todos los estudiantes del curso tengan nota no nula
        estudiantes = Estudiante.objects.filter(
            curso=actividad.asignatura.curso
        )
        for estudiante in estudiantes:
            tiene_nota = actividad.calificaciones.filter(
                estudiante=estudiante,
                valor__isnull=False
            ).exists()
            if not tiene_nota:
                raise serializers.ValidationError(
                    f'El estudiante {estudiante} no tiene nota en esta actividad.'
                )

        self.context['actividad'] = actividad
        return value

    def save(self, **kwargs):
        actividad = self.context['actividad']
        ahora = timezone.now()
        actividad.estado = 'publicada'
        actividad.fecha_publicacion = ahora
        actividad.publicado_por = self.context['request'].user
        actividad.save()
        return actividad

# ─── OBSERVADOR DOCENTE ───────────────────────────────────────────────────────

class ObservadorDocenteSerializer(serializers.Serializer):
    cursos = serializers.SerializerMethodField()

    def get_cursos(self, obj):
        docente = self.context['docente']
        curso_id = self.context.get('curso_id')

        # Solo cursos donde el docente tiene asignaturas
        curso_ids = Asignatura.objects.filter(
            docente=docente
        ).values_list('curso_id', flat=True).distinct()

        cursos = Curso.objects.filter(
            id__in=curso_ids
        ).prefetch_related(
            'estudiantes__usuario',
            'estudiantes__observaciones__autor',
        ).annotate(
            num_estudiantes=Count('estudiantes', distinct=True),
            num_observaciones=Count('estudiantes__observaciones', distinct=True),
            num_rojo=Count(
                'estudiantes',
                filter=Q(estudiantes__riesgo='alto'),
                distinct=True
            ),
            num_amarillo=Count(
                'estudiantes',
                filter=Q(estudiantes__riesgo='medio'),
                distinct=True
            ),
        )

        if curso_id:
            cursos = cursos.filter(id=curso_id)

        resultado = []
        for curso in cursos:
            estudiantes = []
            for e in curso.estudiantes.all():
                observaciones = e.observaciones.all()
                estudiantes.append({
                    'id': e.id,
                    'nombre': f"{e.usuario.first_name} {e.usuario.last_name}",
                    'riesgo': e.riesgo,
                    'num_observaciones': observaciones.count(),
                    'num_disciplinarias': observaciones.filter(
                        tipo='disciplinaria'
                    ).count(),
                    'num_seguimiento': observaciones.filter(
                        tipo='seguimiento'
                    ).count(),
                    'num_logro': observaciones.filter(tipo='logro').count(),
                    'num_academica': observaciones.filter(
                        tipo='academica'
                    ).count(),
                    'observaciones': [
                        {
                            'id': o.id,
                            'tipo': o.get_tipo_display(),
                            'descripcion': o.descripcion,
                            'es_positiva': o.es_positiva,
                            'fecha': o.fecha_registro.strftime('%d/%m/%Y %H:%M'),
                            'autor': (
                                f"{o.autor.first_name} {o.autor.last_name}"
                                if o.autor else None
                            ),
                        }
                        for o in observaciones.order_by('-fecha_registro')
                    ]
                })

            resultado.append({
                'id': curso.id,
                'nombre': curso.nombre,
                'num_estudiantes': curso.num_estudiantes,
                'num_observaciones': curso.num_observaciones,
                'num_rojo': curso.num_rojo,
                'num_amarillo': curso.num_amarillo,
                'estudiantes': estudiantes,
            })
        return resultado


# ─── AGREGAR OBSERVACION DOCENTE ──────────────────────────────────────────────

class ObservacionDocenteCrearSerializer(serializers.ModelSerializer):
    class Meta:
        model = Observacion
        fields = ['estudiante', 'tipo', 'descripcion', 'es_positiva']

    def validate_estudiante(self, value):
        docente = self.context['docente']

        # Verificar que el estudiante pertenezca a un curso
        # donde el docente tiene asignaturas
        curso_ids = Asignatura.objects.filter(
            docente=docente
        ).values_list('curso_id', flat=True).distinct()

        if not Estudiante.objects.filter(
            pk=value.pk, curso_id__in=curso_ids
        ).exists():
            raise serializers.ValidationError(
                'El estudiante no pertenece a ninguno de tus cursos.'
            )
        return value

    def create(self, validated_data):
        validated_data['autor'] = self.context['request'].user
        validated_data['curso'] = validated_data['estudiante'].curso
        # ── Forzar es_positiva=True cuando el tipo es 'logro' ──
        if validated_data.get('tipo') == 'logro':
            validated_data['es_positiva'] = True
        return super().create(validated_data)


