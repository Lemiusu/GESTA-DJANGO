from datetime import date
from decimal import Decimal, InvalidOperation
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    Usuario, Curso, Estudiante, RegistroAsistencia, DetalleAsistencia,
    Asignatura, Calificacion, ActividadEvaluativa, PeriodoAcademico,
    Observacion, Mensaje, DestinatarioMensaje, AlertaAcademica,
    Acudiente,
)
from .serializers import (
    UsuarioSerializer, EstudiantesListaSerializer, EstudiantePerfilSerializer,
    EstudianteCondicionSerializer, DetalleAsistenciaEditarSerializer,
    CalificacionesCoordinadorSerializer, ObservadorCoordinadorSerializer,
    ObservacionCrearSerializer, BandejaSerializer, MensajeCrearSerializer,
    MensajeResponderSerializer, DashboardCoordinadorSerializer,
)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['rol'] = user.rol
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UsuarioSerializer(self.user).data
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UsuarioSerializer(request.user).data)


class DashboardCoordinadorView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = DashboardCoordinadorSerializer({})
        return Response(serializer.data)


class CoordinadorEstadoGradosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = DashboardCoordinadorSerializer({})
        return Response({'cursos_por_grado': serializer.data.get('cursos_por_grado', [])})


class DocenteCursosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, docente_id=None):
        docente = getattr(request.user, 'docente', None)
        if docente_id:
            docente = get_object_or_404(Usuario, pk=docente_id).docente
        if not docente:
            return Response({'detail': 'Docente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        cursos = Curso.objects.filter(docente_titular=docente).select_related('grado').prefetch_related('estudiantes__usuario')
        resultado = []
        for curso in cursos:
            resultado.append({
                'id': curso.id,
                'nombre': curso.nombre,
                'grado': curso.grado.nombre if curso.grado else None,
                'estudiantes': [
                    {
                        'id': e.id,
                        'nombre': f'{e.usuario.first_name} {e.usuario.last_name}',
                        'condicion': 'repitente' if e.es_repitente else e.descripcion_condicion or None,
                    }
                    for e in curso.estudiantes.all()
                ]
            })
        return Response({'cursos': resultado})


class DocenteDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, docente_id=None):
        docente = getattr(request.user, 'docente', None)
        if docente_id:
            docente = get_object_or_404(Usuario, pk=docente_id).docente
        if not docente:
            return Response({'detail': 'Docente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        cursos = Curso.objects.filter(docente_titular=docente).select_related('grado').prefetch_related('estudiantes__usuario')
        return Response({
            'docente': UsuarioSerializer(docente.usuario).data,
            'cursos': [
                {
                    'id': curso.id,
                    'nombre': curso.nombre,
                    'grado': curso.grado.nombre if curso.grado else None,
                    'numero_estudiantes': curso.estudiantes.count(),
                }
                for curso in cursos
            ],
            'total_estudiantes': sum(curso.estudiantes.count() for curso in cursos),
        })


class CursoEstudiantesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        curso = get_object_or_404(Curso, pk=pk)
        estudiantes = curso.estudiantes.select_related('usuario').all()
        return Response([
            {
                'id': estudiante.id,
                'nombre': f'{estudiante.usuario.first_name} {estudiante.usuario.last_name}',
                'curso': curso.nombre,
                'grado': curso.grado.nombre if curso.grado else None,
                'condicion': estudiante.descripcion_condicion if estudiante.tiene_condicion_especial else None,
                'riesgo': estudiante.riesgo,
            }
            for estudiante in estudiantes
        ])


class EstudiantesListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = EstudiantesListaSerializer({})
        return Response(serializer.data)


class EstudiantePerfilView(RetrieveAPIView):
    queryset = Estudiante.objects.all()
    serializer_class = EstudiantePerfilSerializer
    permission_classes = [IsAuthenticated]


class EstudianteCondicionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        estudiante = get_object_or_404(Estudiante, pk=pk)
        return Response(EstudianteCondicionSerializer(estudiante).data)

    def put(self, request, pk):
        estudiante = get_object_or_404(Estudiante, pk=pk)
        serializer = EstudianteCondicionSerializer(estudiante, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class EstudianteCalificacionesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        estudiante = get_object_or_404(Estudiante, pk=pk)
        serializer = EstudiantePerfilSerializer(estudiante)
        return Response(serializer.data.get('calificaciones', []))


class AsistenciaRegistroView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        curso_id = request.query_params.get('curso')
        fecha_param = request.query_params.get('fecha')

        if fecha_param == 'hoy' or not fecha_param:
            fecha_obj = date.today()
        else:
            try:
                fecha_obj = date.fromisoformat(fecha_param)
            except ValueError:
                return Response({'detail': 'Fecha inválida.'}, status=status.HTTP_400_BAD_REQUEST)

        cursos = Curso.objects.all().prefetch_related('estudiantes__usuario', 'registros_asistencia__detalles__estudiante__usuario')
        if curso_id:
            cursos = cursos.filter(pk=curso_id)

        resultado = {}
        for curso in cursos:
            registro = curso.registros_asistencia.filter(fecha=fecha_obj).prefetch_related('detalles__estudiante__usuario').first()
            estudiantes = []
            for e in curso.estudiantes.all():
                detalle = None
                if registro:
                    detalle = registro.detalles.filter(estudiante=e).first()
                estudiantes.append({
                    'id': e.id,
                    'nombre': f'{e.usuario.first_name} {e.usuario.last_name}',
                    'condicion': 'repitente' if e.es_repitente else e.descripcion_condicion or None,
                    'estado': detalle.estado if detalle else 'presente',
                    'motivo': detalle.motivo_justificacion if detalle else None,
                })
            resultado[curso.nombre] = {
                'abierto': True,
                'estudiantes': estudiantes,
            }
        return Response(resultado)

    def post(self, request):
        curso_id = request.data.get('curso_id')
        detalles = request.data.get('detalles', [])
        fecha_str = request.data.get('fecha')

        if not curso_id or not isinstance(detalles, list):
            return Response({'detail': 'curso_id y detalles son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

        curso = get_object_or_404(Curso, pk=curso_id)
        fecha_obj = date.today()
        if fecha_str:
            try:
                fecha_obj = date.fromisoformat(fecha_str)
            except ValueError:
                return Response({'detail': 'Fecha inválida.'}, status=status.HTTP_400_BAD_REQUEST)

        registro, _ = RegistroAsistencia.objects.get_or_create(curso=curso, fecha=fecha_obj)
        for item in detalles:
            estudiante_id = item.get('estudiante_id')
            estado_raw = item.get('estado')
            motivo = item.get('motivo')
            estudiante = get_object_or_404(Estudiante, pk=estudiante_id)
            estado = 'presente' if estado_raw in ('P', 'presente') else 'ausente'
            detalle, created = DetalleAsistencia.objects.get_or_create(
                registro_asistencia=registro,
                estudiante=estudiante,
                defaults={'estado': estado, 'motivo_justificacion': motivo, 'modificado_por': request.user}
            )
            if not created:
                detalle.estado = estado
                detalle.motivo_justificacion = motivo
                detalle.modificado_por = request.user
                detalle.save()

        return Response({'detail': 'Registro de asistencia guardado.'}, status=status.HTTP_201_CREATED)


class AsistenciaGradosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoy = date.today()
        grados = Curso.objects.select_related('grado').prefetch_related(
            'registros_asistencia__detalles__estudiante__usuario',
            'estudiantes__usuario'
        ).all()

        grados_map = {}
        for curso in grados:
            grado_nombre = curso.grado.nombre if curso.grado else 'Sin grado'
            if grado_nombre not in grados_map:
                grados_map[grado_nombre] = {
                    'grado': grado_nombre,
                    'cursos': []
                }

            registro = curso.registros_asistencia.filter(fecha=hoy).first()
            presentes = 0
            ausentes = 0
            total = 0
            estudiantes_list = []
            
            if registro:
                detalles = registro.detalles.all()
                total = detalles.count()
                presentes = detalles.filter(estado__in=['presente', 'justificado']).count()
                ausentes = detalles.filter(estado='ausente').count()
                
                # Construir lista de estudiantes con su estado
                for detalle in detalles:
                    est = detalle.estudiante
                    estudiantes_list.append({
                        'id': est.id,
                        'nombre': f'{est.usuario.first_name} {est.usuario.last_name}' if est.usuario else 'Sin nombre',
                        'estado': 'P' if detalle.estado in ['presente', 'justificado'] else 'A'
                    })
            else:
                # Si no hay registro hoy, listar todos los estudiantes del curso como ausentes
                for est in curso.estudiantes.all():
                    total += 1
                    estudiantes_list.append({
                        'id': est.id,
                        'nombre': f'{est.usuario.first_name} {est.usuario.last_name}' if est.usuario else 'Sin nombre',
                        'estado': 'A'
                    })

            grados_map[grado_nombre]['cursos'].append({
                'id': curso.id,
                'curso': curso.nombre,
                'presentes': presentes,
                'ausentes': ausentes,
                'total': total,
                'porcentaje_asistencia': round((presentes / total) * 100, 1) if total > 0 else 0,
                'estudiantes': estudiantes_list,
            })

        return Response(list(grados_map.values()))


class AsistenciaHistorialView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        curso_id = request.query_params.get('curso')
        registros = RegistroAsistencia.objects.all().select_related('curso').order_by('-fecha')
        if curso_id:
            registros = registros.filter(curso__id=curso_id)

        resultado = [
            {
                'id': r.id,
                'fecha': r.fecha.isoformat(),
                'curso': r.curso.nombre,
                'presentes': r.detalles.filter(estado='presente').count(),
                'ausentes': r.detalles.filter(estado='ausente').count(),
            }
            for r in registros
        ]
        return Response(resultado)


class AsistenciaDetalleUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        detalle = get_object_or_404(DetalleAsistencia, pk=pk)
        serializer = DetalleAsistenciaEditarSerializer(detalle, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(modificado_por=request.user)
        return Response(serializer.data)


class CalificacionesCursosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            docente = getattr(request.user, 'docente', None)
            coordinador = getattr(request.user, 'coordinador', None)
            
            if not docente and not coordinador:
                return Response({'detail': 'Usuario no es docente ni coordinador.'}, status=status.HTTP_403_FORBIDDEN)

            # Si es docente, filtrar solo sus cursos; si es coordinador, traer todos
            if docente:
                cursos = Curso.objects.filter(docente_titular=docente).prefetch_related('estudiantes__usuario', 'asignaturas__actividades__calificaciones__estudiante')
            else:
                cursos = Curso.objects.all().prefetch_related('estudiantes__usuario', 'asignaturas__actividades__calificaciones__estudiante')
            
            resultado = []
            for curso in cursos:
                estudiantes = list(curso.estudiantes.all())
                notas = {str(est.id): {} for est in estudiantes}
                actividades = []
                for asignatura in curso.asignaturas.all():
                    for actividad in asignatura.actividades.all():
                        actividades.append({
                            'id': str(actividad.id),
                            'nombre': actividad.nombre,
                            'peso': float(actividad.porcentaje),
                            'publicada': actividad.estado == 'publicada',
                        })
                        for estudiante in estudiantes:
                            calificacion = actividad.calificaciones.filter(estudiante=estudiante).first()
                            valor = '' if not calificacion or calificacion.valor is None else str(calificacion.valor)
                            notas[str(estudiante.id)][str(actividad.id)] = valor

                docente_nombre = 'Sin docente'
                if curso.docente_titular and hasattr(curso.docente_titular, 'usuario'):
                    docente_nombre = f'{curso.docente_titular.usuario.first_name} {curso.docente_titular.usuario.last_name}'

                resultado.append({
                    'curso_id': str(curso.id),
                    'curso': curso.nombre,
                    'docente': docente_nombre,
                    'materia': 'Todas',
                    'actividades': actividades,
                    'estudiantes': [
                        {'id': str(e.id), 'nombre': f'{e.usuario.first_name} {e.usuario.last_name}', 'condicion': e.descripcion_condicion if e.tiene_condicion_especial else None}
                        for e in estudiantes
                    ],
                    'notas': notas,
                })
            return Response({'cursos': resultado})
        except Exception as e:
            import traceback
            print(f"Error en CalificacionesCursosView: {str(e)}")
            traceback.print_exc()
            return Response({'detail': f'Error cargando calificaciones: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GuardarNotaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        estudiante_id = request.data.get('estudianteId') or request.data.get('estudiante_id')
        actividad_id = request.data.get('actividadId') or request.data.get('actividad_id')
        valor_raw = request.data.get('valor')
        if not estudiante_id or not actividad_id or valor_raw is None:
            return Response({'detail': 'estudiante_id, actividad_id y valor son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

        estudiante = get_object_or_404(Estudiante, pk=estudiante_id)
        actividad = get_object_or_404(ActividadEvaluativa, pk=actividad_id)
        try:
            valor = Decimal(str(valor_raw).replace(',', '.'))
        except (InvalidOperation, TypeError):
            return Response({'detail': 'Valor de nota inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        calificacion, _ = Calificacion.objects.get_or_create(
            actividad_evaluativa=actividad,
            estudiante=estudiante,
            defaults={'valor': valor}
        )
        if calificacion.valor != valor:
            calificacion.valor = valor
            calificacion.save()

        return Response({'detail': 'Nota guardada.', 'valor': str(calificacion.valor)})


class CrearActividadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        curso_id = request.data.get('cursoId') or request.data.get('curso_id')
        nombre = request.data.get('nombre')
        peso = request.data.get('peso')
        if not curso_id or not nombre or peso is None:
            return Response({'detail': 'curso_id, nombre y peso son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            curso = Curso.objects.get(pk=curso_id)
        except Curso.DoesNotExist:
            return Response({'detail': f'Curso con ID {curso_id} no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'detail': f'Error buscando curso: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        asignatura = curso.asignaturas.first()
        if not asignatura:
            asignatura = Asignatura.objects.create(curso=curso, docente=curso.docente_titular, nombre=f'Asignatura {curso.nombre}')

        periodo_activo = PeriodoAcademico.objects.filter(activo=True).first()
        if not periodo_activo:
            periodo_activo = PeriodoAcademico.objects.create(nombre='Periodo activo', fecha_inicio=date.today(), fecha_fin=date.today(), activo=True)

        actividad = ActividadEvaluativa.objects.create(
            asignatura=asignatura,
            periodo_academico=periodo_activo,
            nombre=nombre,
            porcentaje=Decimal(str(peso)),
            estado='borrador',
            publicado_por=request.user,
        )
        return Response({'id': str(actividad.id), 'nombre': actividad.nombre, 'peso': float(actividad.porcentaje), 'estado': actividad.estado})


class PublicarActividadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        actividad = get_object_or_404(ActividadEvaluativa, pk=pk)
        actividad.estado = 'publicada'
        actividad.fecha_publicacion = timezone.now()
        actividad.publicado_por = request.user
        actividad.save()
        return Response({'detail': 'Actividad publicada.'})


class DespublicarActividadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        actividad = get_object_or_404(ActividadEvaluativa, pk=pk)
        actividad.estado = 'borrador'
        actividad.save()
        return Response({'detail': 'Actividad despublicada.'})


class CalificacionesCoordinadorView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = CalificacionesCoordinadorSerializer({}, context={'request': request})
        return Response(serializer.data)


class ObservacionesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        estudiante_id = request.query_params.get('estudiante')
        curso_id = request.query_params.get('curso')
        observaciones = Observacion.objects.select_related('estudiante__usuario', 'autor').order_by('-fecha_registro')
        if estudiante_id:
            observaciones = observaciones.filter(estudiante__id=estudiante_id)
        if curso_id:
            observaciones = observaciones.filter(curso__id=curso_id)

        return Response([
            {
                'id': o.id,
                'estudiante': f'{o.estudiante.usuario.first_name} {o.estudiante.usuario.last_name}',
                'tipo': o.get_tipo_display(),
                'descripcion': o.descripcion,
                'es_positiva': o.es_positiva,
                'fecha': o.fecha_registro.isoformat(),
                'autor': f'{o.autor.first_name} {o.autor.last_name}' if o.autor else None,
            }
            for o in observaciones
        ])

    def post(self, request):
        serializer = ObservacionCrearSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        observacion = serializer.save()
        return Response({'id': observacion.id, 'detail': 'Observación creada.'}, status=status.HTTP_201_CREATED)


class ObservacionesRecientesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        resultados = Observacion.objects.select_related('estudiante__usuario', 'autor').order_by('-fecha_registro')[:30]
        return Response([
            {
                'id': o.id,
                'estudiante': f'{o.estudiante.usuario.first_name} {o.estudiante.usuario.last_name}',
                'tipo': o.get_tipo_display(),
                'descripcion': o.descripcion,
                'es_positiva': o.es_positiva,
                'fecha': o.fecha_registro.isoformat(),
                'autor': f'{o.autor.first_name} {o.autor.last_name}' if o.autor else None,
            }
            for o in resultados
        ])


class MensajesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        para = request.query_params.get('para')
        queryset = Mensaje.objects.select_related('remitente').prefetch_related('destinatarios__destinatario').order_by('-enviado_en')
        
        # Filtrar solo mensajes del usuario actual como destinatario
        queryset = queryset.filter(destinatarios__destinatario=request.user)
        
        # Opcionalmente filtrar por rol del usuario
        if para:
            queryset = queryset.filter(destinatarios__destinatario__rol=para)

        mensajes = []
        # Usar set para evitar duplicados
        mensaje_ids = set()
        
        for mensaje in queryset.distinct():
            if mensaje.id in mensaje_ids:
                continue  # Skip duplicates
            mensaje_ids.add(mensaje.id)
            
            destinatario_rel = mensaje.destinatarios.filter(destinatario=request.user).first()
            # Detectar tipo de mensaje basado en el asunto
            msg_type = 'mensaje'
            if 'Alerta' in mensaje.asunto or '⚠' in mensaje.asunto:
                msg_type = 'alerta'
            elif 'Noticia' in mensaje.asunto or 'notificación' in mensaje.asunto.lower():
                msg_type = 'notificacion'
            
            mensajes.append({
                'id': mensaje.id,
                'asunto': mensaje.asunto,
                'contenido': mensaje.contenido,
                'de': f'{mensaje.remitente.first_name} {mensaje.remitente.last_name}',
                'rolDe': mensaje.remitente.rol or 'usuario',
                'para': 'todos',  # Placeholder - ideally should be determined from destinatarios
                'fecha': mensaje.enviado_en.isoformat(),
                'leido': destinatario_rel.leido if destinatario_rel else False,
                'tipo': msg_type,
            })
        return Response(mensajes)

    def post(self, request):
        serializer = MensajeCrearSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        mensaje = serializer.save()
        return Response({'id': mensaje.id, 'detail': 'Mensaje enviado.'}, status=status.HTTP_201_CREATED)


class MensajeLeidoView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        destinatario = get_object_or_404(DestinatarioMensaje, mensaje__pk=pk, destinatario=request.user)
        destinatario.leido = True
        destinatario.leido_en = timezone.now()
        destinatario.save()
        return Response({'detail': 'Mensaje marcado como leído.'})


class MensajesNoLeidosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rol = request.query_params.get('rol')
        if not rol:
            return Response({'total': 0})
        usuarios = Usuario.objects.filter(rol=rol)
        total = DestinatarioMensaje.objects.filter(destinatario__in=usuarios, leido=False).count()
        return Response({'total': total})


class AlertasView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        estado = request.query_params.get('estado')
        alertas = AlertaAcademica.objects.select_related('estudiante__usuario', 'generada_por').order_by('-generada_en')
        if estado == 'activa':
            alertas = alertas.filter(activa=True)
        return Response([
            {
                'id': alerta.id,
                'titulo': alerta.titulo,
                'contenido': alerta.contenido,
                'estudiante': f'{alerta.estudiante.usuario.first_name} {alerta.estudiante.usuario.last_name}',
                'activo': alerta.activa,
                'fecha': alerta.generada_en.isoformat(),
            }
            for alerta in alertas
        ])

    def post(self, request):
        estudiante_id = request.data.get('estudianteId') or request.data.get('estudiante_id')
        titulo = request.data.get('titulo')
        contenido = request.data.get('contenido')
        if not estudiante_id or not titulo or not contenido:
            return Response({'detail': 'estudiante_id, titulo y contenido son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

        estudiante = get_object_or_404(Estudiante, pk=estudiante_id)
        alerta = AlertaAcademica.objects.create(
            estudiante=estudiante,
            generada_por=request.user,
            titulo=titulo,
            contenido=contenido,
            activa=True,
        )
        return Response({'id': alerta.id, 'detail': 'Alerta creada.'}, status=status.HTTP_201_CREATED)


class AlertasResolverView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        alerta = get_object_or_404(AlertaAcademica, pk=pk)
        alerta.activa = False
        alerta.save()
        return Response({'detail': 'Alerta resuelta.'})


class EstudiantesParaAlertasView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        estudiantes = Estudiante.objects.select_related('usuario', 'curso__grado').all()
        return Response([
            {
                'id': e.id,
                'nombre': f'{e.usuario.first_name} {e.usuario.last_name}',
                'curso': e.curso.nombre if e.curso else None,
                'grado': e.curso.grado.nombre if e.curso and e.curso.grado else None,
            }
            for e in estudiantes
        ])


class EstudiantesCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        nombre = request.data.get('nombre')
        curso_id = request.data.get('curso_id') or request.data.get('grado')
        condicion = request.data.get('condicion')
        if not nombre or not curso_id:
            return Response({'detail': 'nombre y grado son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

        curso = get_object_or_404(Curso, pk=curso_id)
        nombres = nombre.split(' ', 1)
        first_name = nombres[0]
        last_name = nombres[1] if len(nombres) > 1 else ''
        usuario = Usuario.objects.create(username=nombre.replace(' ', '.').lower(), first_name=first_name, last_name=last_name, rol='estudiante')
        estudiante = Estudiante.objects.create(usuario=usuario, curso=curso, riesgo='bajo', descripcion_condicion=condicion)
        return Response({'id': estudiante.id, 'detail': 'Estudiante creado.'}, status=status.HTTP_201_CREATED)


class AcudienteEstudiantesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        acudiente = get_object_or_404(Acudiente, pk=pk)
        return Response([
            {
                'id': e.id,
                'nombre': f'{e.usuario.first_name} {e.usuario.last_name}',
                'curso': e.curso.nombre if e.curso else None,
                'grado': e.curso.grado.nombre if e.curso and e.curso.grado else None,
            }
            for e in acudiente.estudiantes.select_related('usuario', 'curso__grado').all()
        ])


class EstudianteDatosAcudienteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        estudiante = get_object_or_404(Estudiante, pk=pk)
        acudiente = estudiante.acudiente
        return Response({
            'estudiante': f'{estudiante.usuario.first_name} {estudiante.usuario.last_name}',
            'acudiente': f'{acudiente.usuario.first_name} {acudiente.usuario.last_name}' if acudiente else None,
            'telefono': acudiente.telefono if acudiente else None,
        })


class EstudianteAsistenciaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        estudiante = get_object_or_404(Estudiante, pk=pk)
        return Response([
            {
                'id': d.id,
                'fecha': d.registro_asistencia.fecha.isoformat(),
                'estado': d.estado,
                'motivo': d.motivo_justificacion,
            }
            for d in DetalleAsistencia.objects.filter(estudiante=estudiante).select_related('registro_asistencia').order_by('-registro_asistencia__fecha')
        ])


class MensajeResponderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MensajeResponderSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        mensaje = serializer.save()
        return Response({'id': mensaje.id, 'detail': 'Respuesta enviada.'}, status=status.HTTP_201_CREATED)


class BandejaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = BandejaSerializer({}, context={'request': request})
        return Response(serializer.data)


class ObservadorCoordinadorView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ObservadorCoordinadorSerializer({}, context={'request': request})
        return Response(serializer.data)


class UsuariosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rol = request.query_params.get('rol')
        if not rol:
            return Response({'detail': 'Parámetro rol requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        
        usuarios = Usuario.objects.filter(rol=rol).values('id', 'first_name', 'last_name')
        return Response([
            {
                'id': str(u['id']),
                'nombre': f'{u["first_name"]} {u["last_name"]}'
            }
            for u in usuarios
        ])


def index(request):
    return Response({'detail': "API raíz del módulo polls."})

