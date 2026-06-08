import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGESTA, type Mensaje } from "../context/GESTAContext";
import { useAuth } from "../context/AuthContext";
import {
  C, S, Avatar, Sidebar,
  NAV_DOCENTE, NAV_COORDINADOR, NAV_ACUDIENTE,
  TIPO_MSG_META,
  IcoHome, IcoCheck, IcoEdit, IcoEye, IcoMsg, IcoUsers,
} from "../context/shared";
import { mensajesAPI, estudiantesAPI, alertasAPI } from "../services/api";

/* ─── CONFIG POR ROL ─────────────────────────────────────────────── */
// CONFIG LEGACY - Ahora se construye dinámicamente desde AuthContext
// Kept for reference but no longer used
/*
type RolConfig = {
  nombre: string; sub: string;
  navGroups: typeof NAV_DOCENTE;
  rolFiltro: string;
  puedeEnviar: boolean;
  puedeCrearAlertas: boolean;
  destinatarios: string[];
};

const ROL_CONFIG_DEFAULTS: Record<string, Omit<RolConfig, "nombre" | "sub">> = {
  docente: {
    navGroups: NAV_DOCENTE,
    rolFiltro: "docente",
    puedeEnviar: true,
    puedeCrearAlertas: false,
    destinatarios: ["coordinador", "acudiente", "estudiante", "todos"],
  },
  coordinador: {
    navGroups: NAV_COORDINADOR,
    rolFiltro: "coordinador",
    puedeEnviar: true,
    puedeCrearAlertas: true,
    destinatarios: ["todos", "docente", "acudiente", "estudiante"],
  },
  acudiente: {
    navGroups: NAV_ACUDIENTE,
    rolFiltro: "acudiente",
    puedeEnviar: false,
    puedeCrearAlertas: false,
    destinatarios: [],
  },
};

const ROL_CONFIG: Record<string, RolConfig> = {
  docente: {
    ...ROL_CONFIG_DEFAULTS.docente,
    nombre: "",
    sub: "",
  },
  coordinador: {
    ...ROL_CONFIG_DEFAULTS.coordinador,
    nombre: "",
    sub: "",
  },
  acudiente: {
    ...ROL_CONFIG_DEFAULTS.acudiente,
    nombre: "",
    sub: "",
  },
};
*/

const DEST_LABEL: Record<string, string> = {
  todos: "Toda la comunidad", docente: "Todos los docentes",
  coordinador: "Coordinación", acudiente: "Acudientes", estudiante: "Estudiantes",
};

const FILTROS = [
  { id: "todos",        label: "Todos" },
  { id: "noLeidos",     label: "Sin leer" },
  { id: "mensaje",      label: "Mensajes" },
  { id: "alerta",       label: "Alertas" },
  { id: "notificacion", label: "Noticias" },
];

/* ─── DATOS DE ESTUDIANTES PARA ALERTAS (reemplazados por estado vacío) ── */
// TODO: Reemplazar con estudiantesAPI.getEstudiantesAlerta() para obtener catálogo de estudiantes

/* ─── BOTTOM NAV POR ROL ─────────────────────────────────────────── */
const BOTTOM_ITEMS: Record<string, { id:string; label:string; ruta:string; Ico:React.ComponentType<{color:string}> }[]> = {
  docente: [
    { id:"inicio",         label:"Inicio",     ruta:"docente",                Ico:IcoHome  },
    { id:"asistencia",     label:"Asistencia", ruta:"asistencia-docente",     Ico:IcoCheck },
    { id:"calificaciones", label:"Notas",      ruta:"calificaciones-docente", Ico:IcoEdit  },
    { id:"observador",     label:"Observador", ruta:"observador-docente",     Ico:IcoEye   },
    { id:"mensajes",       label:"Mensajes",   ruta:"mensajes-docente",       Ico:IcoMsg   },
  ],
  coordinador: [
  { id:"inicio",         label:"Inicio",         ruta:"coordinador",                Ico:IcoHome },
  { id:"estudiantes",    label:"Estudiantes",    ruta:"estudiantes-coordinador",    Ico:IcoUsers },
  { id:"calificaciones", label:"Notas",          ruta:"calificaciones-coordinador", Ico:IcoEdit },
  { id:"observador",     label:"Observador",     ruta:"observador-coordinador",     Ico:IcoEye },
  { id:"mensajes",       label:"Mensajes",       ruta:"mensajes-coordinador",       Ico:IcoMsg },
  ],
  acudiente: [
    { id:"inicio",   label:"Inicio",   ruta:"acudiente",          Ico:IcoHome },
    { id:"mensajes", label:"Mensajes", ruta:"mensajes-acudiente", Ico:IcoMsg  },
  ],
};

/* ─── MODAL CREAR ALERTA ─────────────────────────────────────────── */
function ModalCrearAlerta({
  onEnviar,
  onClose,
  isMobile,
  nombreUsuario,
  estudiantesAlerta,
  enviando = false,
}: {
  onEnviar: (mensajes: Omit<Mensaje, "id">[]) => void;
  onClose: () => void;
  isMobile: boolean;
  nombreUsuario: string;
  estudiantesAlerta: { id:number; nombre:string; grado:string; docente:string; acudiente:string }[];
  enviando?: boolean;
}) {
  const [busqueda,     setBusqueda]     = useState("");
  const [estudianteId, setEstudianteId] = useState<number | null>(null);
  const [descripcion,  setDescripcion]  = useState("");
  const [paso,         setPaso]         = useState<1 | 2>(1);   // 1: formulario, 2: confirmación

  const estudianteFiltrado = useMemo(() => {
    if (!busqueda.trim()) return estudiantesAlerta;
    const q = busqueda.toLowerCase();
    return estudiantesAlerta.filter(e =>
      e.nombre.toLowerCase().includes(q) || e.grado.includes(q)
    );
  }, [busqueda, estudiantesAlerta]);

  const est    = estudiantesAlerta.find(e => e.id === estudianteId);
  const puedeContinuar = estudianteId !== null && descripcion.trim().length > 0;

  // Construye los mensajes que se enviarán: uno para docente, uno para acudiente
  function construirMensajes(): (Omit<Mensaje, "id"> & { estudianteId?: number })[] {
    if (!est) return [];
    // TODO: Reemplazar con alertasAPI.crearAlerta() para crear alerta en backend
    const asunto  = `⚠ Alerta ${est.nombre} (Grado ${est.grado})`;
    const cuerpo  = `Nivel: \nEstudiante: ${est.nombre} · Grado ${est.grado}\n\n${descripcion.trim()}\n\nGenerada por: ${nombreUsuario}`;

    return [
      // Notificación al docente del estudiante
      {
        de: nombreUsuario, rolDe: "coordinador",
        para: "docente",
        asunto,
        contenido: cuerpo,
        fecha: "Ahora",
        leido: false,
        tipo: "alerta",
        estudianteId: est.id,
      },
      // Notificación al acudiente
      {
        de: nombreUsuario, rolDe: "coordinador",
        para: "acudiente",
        asunto,
        contenido: cuerpo,
        fecha: "Ahora",
        leido: false,
        tipo: "alerta",
        estudianteId: est.id,
      },
    ];
  }

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"16px" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:C.white, borderRadius:16, width:"100%", maxWidth: isMobile ? "100%" : 480, maxHeight:"90vh", overflow:"auto", boxShadow:"0 8px 32px rgba(0,0,0,0.18)", display:"flex", flexDirection:"column" }}
      >
        {/* Cabecera del modal */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 22px 14px", borderBottom:`1px solid ${C.gray100}` }}>
          <div>
            <p style={{ margin:0, fontSize:16, fontWeight:700, color:C.gray900 }}>
              {paso === 1 ? "Crear alerta académica" : "Confirmar y enviar alerta"}
            </p>
            <p style={{ margin:"2px 0 0", fontSize:12, color:C.gray400 }}>
              {paso === 1 ? "Se notificará automáticamente al docente y acudiente del estudiante" : "Revisa los destinatarios antes de enviar"}
            </p>
          </div>
          <button onClick={onClose} style={{ fontSize:16, color:C.gray400, background:"none", border:"none", cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>

        {/* ── PASO 1: Formulario ── */}
        {paso === 1 && (
          <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:16 }}>

            {/* Buscar estudiante */}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.gray700, display:"block", marginBottom:6 }}>
                Estudiante *
              </label>
              <input
                type="text"
                placeholder="Buscar por nombre o grado..."
                value={est ? est.nombre : busqueda}
                onChange={e => { setBusqueda(e.target.value); setEstudianteId(null); }}
                onFocus={() => { if (est) { setBusqueda(""); setEstudianteId(null); } }}
                style={{ ...S.input, fontSize:13, height:38 }}
              />
              {/* Dropdown de resultados */}
              {!estudianteId && busqueda.trim() && (
                <div style={{ border:`1px solid ${C.gray200}`, borderTop:"none", borderRadius:"0 0 8px 8px", maxHeight:180, overflowY:"auto", background:C.white }}>
                  {estudianteFiltrado.length === 0 ? (
                    <p style={{ margin:0, padding:"12px 14px", fontSize:12, color:C.gray400 }}>Sin resultados.</p>
                  ) : estudianteFiltrado.slice(0, 8).map((e, i, arr) => (
                    <div
                      key={e.id}
                      onClick={() => { setEstudianteId(e.id); setBusqueda(e.nombre); }}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", cursor:"pointer", borderBottom: i < arr.length - 1 ? `1px solid ${C.gray100}` : "none" }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = C.gray50)}
                      onMouseLeave={ev => (ev.currentTarget.style.background = C.white)}
                    >
                      <Avatar nombre={e.nombre} size={28} />
                      <div>
                        <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.gray800 }}>{e.nombre}</p>
                        <p style={{ margin:0, fontSize:11, color:C.gray400 }}>Grado {e.grado} · {e.docente}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Chip del estudiante seleccionado */}
              {est && (
                <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:C.blueLight, borderRadius:8 }}>
                  <Avatar nombre={est.nombre} size={26} />
                  <div style={{ flex:1 }}>
                    <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.blueText }}>{est.nombre}</p>
                    <p style={{ margin:0, fontSize:11, color:C.blueText, opacity:0.8 }}>
                      Grado {est.grado} · Docente: {est.docente} · Acudiente: {est.acudiente}
                    </p>
                  </div>
                  <button onClick={() => { setEstudianteId(null); setBusqueda(""); }}
                    style={{ fontSize:14, color:C.blueText, background:"none", border:"none", cursor:"pointer", lineHeight:1 }}>✕</button>
                </div>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.gray700, display:"block", marginBottom:6 }}>
                Descripción *
              </label>
              <textarea
                rows={4}
                placeholder="Describe el motivo de la alerta, antecedentes relevantes y acciones recomendadas..."
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                style={{ ...S.input, resize:"vertical" as const, padding:"8px 12px", fontSize:13 }}
              />
              <p style={{ margin:"4px 0 0", fontSize:11, color:C.gray400 }}>
                {descripcion.trim().length}/500 caracteres
              </p>
            </div>

            {/* Destinatarios automáticos (informativo) */}
            {est && (
              <div style={{ background:C.gray50, border:`1px solid ${C.gray200}`, borderRadius:10, padding:"12px 14px" }}>
                <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:600, color:C.gray700 }}>
                  Se notificará automáticamente a:
                </p>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {[
                    { rol:"Docente",   nombre:est.docente,    bg:"#dbeafe", color:"#1e40af" },
                    { rol:"Acudiente", nombre:est.acudiente,  bg:C.amberLight, color:C.amber },
                  ].map(d => (
                    <div key={d.rol} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:8, background:d.bg, color:d.color, flexShrink:0 }}>
                        {d.rol}
                      </span>
                      <span style={{ fontSize:12, color:C.gray700 }}>{d.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botones */}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:4 }}>
              <button onClick={onClose}
                style={{ fontSize:13, padding:"9px 18px", borderRadius:8, border:`1px solid ${C.gray200}`, background:C.white, color:C.gray500, cursor:"pointer", fontFamily:"inherit" }}>
                Cancelar
              </button>
              <button
                disabled={!puedeContinuar}
                onClick={() => setPaso(2)}
                style={{ fontSize:13, padding:"9px 18px", borderRadius:8, border:"none", fontWeight:600, fontFamily:"inherit", cursor:puedeContinuar?"pointer":"not-allowed", background:puedeContinuar?C.blue:C.gray200, color:puedeContinuar?C.white:C.gray400 }}
              >
                Revisar y enviar →
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 2: Confirmación ── */}
        {paso === 2 && est && (
          <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:14 }}>

            {/* Resumen de la alerta */}
            <div style={{ background: "#fee2e2", border:`2px solid ${"#b91c1c"}40`, borderRadius:12, padding:"14px 16px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              </div>
              <p style={{ margin:"0 0 6px", fontSize:14, fontWeight:700, color:C.gray900 }}>
                {est.nombre} · Grado {est.grado}
              </p>
              <p style={{ margin:0, fontSize:13, color:C.gray700, lineHeight:1.5 }}>
                {descripcion.trim()}
              </p>
            </div>

            {/* Destinatarios con detalle */}
            <div>
              <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:600, color:C.gray700 }}>
                Esta alerta se enviará como mensaje a:
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { rol:"Docente",   nombre:est.docente,   desc:`Recibirá la alerta como mensaje de tipo "Alerta"`, bg:"#dbeafe", color:"#1e40af" },
                  { rol:"Acudiente", nombre:est.acudiente, desc:`Recibirá la alerta como mensaje de tipo "Alerta"`, bg:C.amberLight, color:C.amber },
                ].map(d => (
                  <div key={d.rol} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", background:C.gray50, borderRadius:8 }}>
                    <Avatar nombre={d.nombre} size={30} />
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:C.gray800 }}>{d.nombre}</span>
                        <span style={{ fontSize:10, fontWeight:600, padding:"1px 7px", borderRadius:6, background:d.bg, color:d.color }}>{d.rol}</span>
                      </div>
                      <p style={{ margin:0, fontSize:11, color:C.gray400 }}>{d.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botones */}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:4 }}>
              <button onClick={() => setPaso(1)}
                style={{ fontSize:13, padding:"9px 18px", borderRadius:8, border:`1px solid ${C.gray200}`, background:C.white, color:C.gray500, cursor:"pointer", fontFamily:"inherit" }}
                disabled={enviando}>
                ← Editar
              </button>
              <button
                onClick={() => onEnviar(construirMensajes())}
                style={{ fontSize:13, padding:"9px 18px", borderRadius:8, border:"none", background:C.red, color:C.white, fontWeight:700, cursor:enviando?"not-allowed":"pointer", fontFamily:"inherit", opacity:enviando?0.6:1 }}
                disabled={enviando}
              >
                {enviando ? "Enviando..." : "Enviar alerta"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── TOAST DE CONFIRMACIÓN ──────────────────────────────────────── */
function Toast({ mensaje, onClose }: { mensaje: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:2000, background:C.gray900, color:C.white, fontSize:13, fontWeight:600, padding:"12px 20px", borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,0.25)", whiteSpace:"nowrap", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      ✓ {mensaje}
    </div>
  );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────────────────────── */
export default function Mensajes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const pathRol = location.pathname.replace("/dashboard/mensajes-", "");
  const rol     = ["docente","coordinador","acudiente"].includes(pathRol) ? pathRol : "docente";

  // Dinámico: obtener nombre del usuario autenticado
  const config = {
    nombre: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || "Usuario",
    sub: user?.rol ? user.rol.charAt(0).toUpperCase() + user.rol.slice(1) : rol.charAt(0).toUpperCase() + rol.slice(1),
    navGroups: rol === "coordinador" ? NAV_COORDINADOR : rol === "acudiente" ? NAV_ACUDIENTE : NAV_DOCENTE,
    rolFiltro: rol,
    puedeEnviar: rol !== "acudiente",
    puedeCrearAlertas: rol === "coordinador",
    destinatarios: rol === "docente" 
      ? ["coordinador", "acudiente", "estudiante", "todos"]
      : rol === "coordinador"
      ? ["todos", "docente", "acudiente", "estudiante"]
      : [],
  };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1280);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { getMensajesPara, marcarMensajeLeido, agregarMensaje } = useGESTA();
  const todos = getMensajesPara(config.rolFiltro);

  const [filtro,          setFiltro]          = useState("todos");
  const [seleccionado,    setSeleccionado]     = useState<Mensaje | null>(null);
  const [redactar,        setRedactar]         = useState(false);
  const [nuevoMsg,        setNuevoMsg]         = useState({ para:"todos", asunto:"", contenido:"" });
  const [vistaLista,      setVistaLista]       = useState(true);
  const [showModalAlerta, setShowModalAlerta]  = useState(false);
  const [toast,           setToast]            = useState<string | null>(null);
  const [enviando,        setEnviando]         = useState(false);

  // ── Estado dinámico para estudiantes de alerta ──
  const [estudiantesAlerta, setEstudiantesAlerta] = useState<{ id:number; nombre:string; grado:string; docente:string; acudiente:string }[]>([]);

  // ── Cargar mensajes del backend cuando se monta el componente ──
  const { cargarDatosIniciales } = useGESTA();

  useEffect(() => {
    const cargarEstudiantes = async () => {
      try {
        const data = await estudiantesAPI.getEstudiantesAlerta();
        setEstudiantesAlerta(data);
      } catch (err) {
        console.warn("Error cargando estudiantes para alertas:", err);
      }
    };
    cargarEstudiantes();
  }, []);

  // ── Cargar mensajes desde el backend al montar o cambiar rol ──
  useEffect(() => {
    cargarDatosIniciales(rol);
  }, [rol]);

  // ── Marcar mensaje como leído cuando se selecciona ──
  useEffect(() => {
    if (seleccionado && !seleccionado.leido) {
      marcarMensajeLeido(seleccionado.id);
    }
  }, [seleccionado]);

  const filtered = filtro === "todos"
    ? todos
    : todos.filter(m => m.tipo === filtro || (filtro === "noLeidos" && !m.leido));
  const noLeidos = todos.filter(m => !m.leido).length;

  const ir = (ruta: string) => navigate(`/dashboard/${ruta}`);

  function handleSeleccionar(m: Mensaje) {
    setSeleccionado(m);
    marcarMensajeLeido(m.id);
    setRedactar(false);
    if (isMobile) setVistaLista(false);
  }

  async function handleEnviar() {
    if (!nuevoMsg.asunto.trim() || !nuevoMsg.contenido.trim()) return;
    
    try {
      setEnviando(true);
      // Enviar al backend usando rol
      await mensajesAPI.enviarMensajePorRol({
        destinatarios: nuevoMsg.para,
        asunto: nuevoMsg.asunto,
        contenido: nuevoMsg.contenido,
      });
      
      // Agregar localmente para visualización inmediata
      await agregarMensaje({
        de: config.nombre, rolDe: rol,
        para: nuevoMsg.para, asunto: nuevoMsg.asunto, contenido: nuevoMsg.contenido,
        fecha: "Ahora", leido: false, tipo: "mensaje",
      });
      
      setNuevoMsg({ para:"todos", asunto:"", contenido:"" });
      setRedactar(false);
      if (isMobile) setVistaLista(true);
      setToast(`Mensaje enviado a ${nuevoMsg.para === "todos" ? "toda la comunidad" : nuevoMsg.para}`);
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      setToast("Error al enviar el mensaje. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  // Recibe el array de mensajes generados por el modal y los agrega al contexto
  async function handleEnviarAlerta(mensajes: Omit<Mensaje, "id">[]) {
    try {
      setEnviando(true);
      // Enviar alertas al backend
      for (const msg of mensajes) {
        // Primero enviar como mensaje
        await mensajesAPI.enviarMensajePorRol({
          destinatarios: msg.para,
          asunto: msg.asunto,
          contenido: msg.contenido,
        });
        // Luego crear la alerta en la BD
        const estudianteId = (msg as any).estudianteId;
        if (estudianteId) {
          try {
            await alertasAPI.crearAlerta({
              estudianteId,
              tipo: "academica",
              motivo: msg.contenido,
              responsable: config.nombre,
            });
          } catch (alertErr) {
            console.warn("Error creando alerta en BD:", alertErr);
          }
        }
        await agregarMensaje(msg);
      }
      
      setShowModalAlerta(false);
      // Recargar datos para que aparezcan las alertas
      await cargarDatosIniciales(rol);
      setToast(`Alerta enviada a ${mensajes.length} destinatario(s)`);
      setFiltro("todos");
    } catch (error) {
      console.error("Error enviando alerta:", error);
      setToast("Error al enviar la alerta. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  /* ── PANEL LISTA ── */
  const panelLista = (
    <div style={{ width:isMobile?"100%":320, flexShrink:0, display:isMobile && !vistaLista?"none":"block" }}>
      {/* ── Botones de acción ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {config.puedeCrearAlertas && (!isMobile || vistaLista) && (
          <button
            style={{ ...S.btnPrimary, background:C.red, padding:isMobile?"6px 10px":"7px 14px", fontSize:isMobile?11:12 }}
            onClick={() => setShowModalAlerta(true)}
          >
            {isMobile ? "⚠ Alerta" : "⚠ Crear alerta"}
          </button>
        )}
        {config.puedeEnviar && isMobile && vistaLista && (
          <button style={{ ...S.btnPrimary, padding:"6px 10px", fontSize:11 }}
            onClick={() => { setRedactar(true); setSeleccionado(null); setVistaLista(false); }}>
            + Nuevo
          </button>
        )}
        {config.puedeEnviar && !isMobile && (
          <button style={S.btnPrimary}
            onClick={() => { setRedactar(true); setSeleccionado(null); }}>
            + Nuevo mensaje
          </button>
        )}
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
        {FILTROS.map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            fontSize:11, padding:"4px 10px", borderRadius:16, cursor:"pointer", fontWeight:600,
            background:filtro===f.id?C.blue:C.white,
            color:      filtro===f.id?C.white:C.gray500,
            border:     `1px solid ${filtro===f.id?C.blue:C.gray200}`,
            fontFamily:"inherit",
          }}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ ...S.card, marginBottom:0 }}>
        {filtered.length === 0 ? (
          <div style={{ padding:20, textAlign:"center", fontSize:12, color:C.gray400 }}>Sin mensajes en esta bandeja.</div>
        ) : filtered.map((m, i) => {
          const meta   = TIPO_MSG_META[m.tipo] || TIPO_MSG_META.mensaje;
          const activo = seleccionado?.id === m.id;
          return (
            <div key={m.id} onClick={() => handleSeleccionar(m)}
              style={{ padding:"12px 14px", cursor:"pointer", borderBottom:i<filtered.length-1?`1px solid ${C.gray100}`:"none", background:activo?C.blueLight:m.leido?C.white:"#f0f4ff" }}
              onMouseEnter={ev => { if (!activo) ev.currentTarget.style.background = C.gray50; }}
              onMouseLeave={ev => { if (!activo) ev.currentTarget.style.background = m.leido?C.white:"#f0f4ff"; }}
            >
              <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                {!m.leido
                  ? <div style={{ width:6, height:6, borderRadius:"50%", background:C.blue, flexShrink:0, marginTop:5 }} />
                  : <div style={{ width:6, flexShrink:0 }} />
                }
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:2 }}>
                    <span style={{ fontSize:12, fontWeight:m.leido?500:700, color:C.gray800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:160 }}>
                      {m.asunto}
                    </span>
                    <span style={{ fontSize:10, color:C.gray400, flexShrink:0, marginLeft:4 }}>{m.fecha}</span>
                  </div>
                  <p style={{ margin:0, fontSize:11, color:C.gray500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {m.contenido}
                  </p>
                  <div style={{ marginTop:4, display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:10, fontWeight:600, padding:"1px 6px", borderRadius:8, background:meta.bg, color:meta.color }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize:10, color:C.gray400 }}>{m.de}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ── PANEL DETALLE / REDACTAR ── */
  const panelDetalle = (
    <div style={{ flex:1, display:isMobile && vistaLista?"none":"block" }}>
      {isMobile && !vistaLista && (
        <button onClick={() => setVistaLista(true)}
          style={{ display:"flex", alignItems:"center", gap:5, marginBottom:12, fontSize:12, color:C.blue, background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>
          ← Volver a mensajes
        </button>
      )}

      {redactar ? (
        <div style={S.card}>
          <div style={S.cardHead}>
            <span>Nuevo mensaje</span>
            <button onClick={() => { setRedactar(false); if (isMobile) setVistaLista(true); }}
              style={{ fontSize:12, color:C.gray400, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>✕</button>
          </div>
          <div style={{ padding:"16px" }}>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={S.label}>Para</label>
                <select style={{ ...S.input, height:36 }} value={nuevoMsg.para}
                  onChange={e => setNuevoMsg(p => ({ ...p, para:e.target.value }))}>
                  {config.destinatarios.map(d => <option key={d} value={d}>{DEST_LABEL[d]}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Asunto</label>
                <input style={{ ...S.input, height:36, padding:"8px 12px" }} placeholder="Asunto del mensaje..."
                  value={nuevoMsg.asunto} onChange={e => setNuevoMsg(p => ({ ...p, asunto:e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={S.label}>Contenido</label>
              <textarea rows={6} style={{ ...S.input, resize:"vertical" as const, padding:"8px 12px" }}
                placeholder="Escribe el mensaje aquí..." value={nuevoMsg.contenido}
                onChange={e => setNuevoMsg(p => ({ ...p, contenido:e.target.value }))} />
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <button style={{ ...S.btnPrimary, background:"transparent", color:C.gray500, border:`1px solid ${C.gray200}` }}
                onClick={() => { setRedactar(false); if (isMobile) setVistaLista(true); }}
                disabled={enviando}>
                Cancelar
              </button>
              <button style={S.btnPrimary} onClick={handleEnviar}
                disabled={!nuevoMsg.asunto.trim() || !nuevoMsg.contenido.trim() || enviando}>
                {enviando ? "Enviando..." : "Enviar mensaje"}
              </button>
            </div>
          </div>
        </div>

      ) : seleccionado ? (
        <div style={S.card}>
          <div style={S.cardHead}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {!isMobile && (
                <button onClick={() => setSeleccionado(null)}
                  style={{ fontSize:12, color:C.blue, background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>
                  ← Volver
                </button>
              )}
              <span style={{ fontSize:13, fontWeight:600, color:C.gray900 }}>{seleccionado.asunto}</span>
            </div>
            <span style={{ fontSize:10, color:C.gray400 }}>{seleccionado.fecha}</span>
          </div>
          <div style={{ padding:"16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, padding:"10px 14px", background:C.gray50, borderRadius:8 }}>
              <Avatar nombre={seleccionado.de} size={32} />
              <div>
                <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.gray800 }}>{seleccionado.de}</p>
                <p style={{ margin:0, fontSize:11, color:C.gray400 }}>
                  {seleccionado.rolDe} · Para: {DEST_LABEL[seleccionado.para] || seleccionado.para}
                </p>
              </div>
            </div>
            <div style={{ fontSize:14, color:C.gray700, lineHeight:1.6, whiteSpace:"pre-wrap" as const, marginBottom:16 }}>
              {seleccionado.contenido}
            </div>
            {config.puedeEnviar && (
              <div style={{ borderTop:`1px solid ${C.gray100}`, paddingTop:12 }}>
                <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:600, color:C.gray500 }}>Responder:</p>
                <div style={{ display:"flex", gap:8, flexDirection:isMobile?"column":"row" }}>
                  <textarea rows={2} style={{ ...S.input, resize:"vertical" as const, flex:1, padding:"8px 12px" }}
                    placeholder="Escribe tu respuesta..." />
                  <button style={{ ...S.btnPrimary, alignSelf:"flex-end" }}>Enviar</button>
                </div>
              </div>
            )}
          </div>
        </div>

      ) : (
        <div style={{ ...S.card, display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", minHeight:300, padding:40 }}>
          <div style={{ fontSize:32, marginBottom:12, color:C.gray200 }}>✉</div>
          <p style={{ margin:0, fontSize:14, fontWeight:600, color:C.gray400 }}>Selecciona un mensaje para leerlo</p>
          {config.puedeEnviar && (
            <p style={{ margin:"6px 0 0", fontSize:12, color:C.gray400 }}>o crea uno nuevo con el botón de arriba</p>
          )}
        </div>
      )}
    </div>
  );

  const bottomItems = BOTTOM_ITEMS[rol] || BOTTOM_ITEMS.docente;

  return (
    <div style={S.app}>

      {/* ── Modal crear alerta (solo coordinador) ── */}
      {showModalAlerta && (
        <ModalCrearAlerta
          onEnviar={handleEnviarAlerta}
          onClose={() => setShowModalAlerta(false)}
          isMobile={isMobile}
          nombreUsuario={config.nombre}
          estudiantesAlerta={estudiantesAlerta}
          enviando={enviando}
        />
      )}

      {/* ── Toast de confirmación ── */}
      {toast && <Toast mensaje={toast} onClose={() => setToast(null)} />}

      {!isMobile && (
        <Sidebar
          navGroups={config.navGroups}
          navActivo="mensajes"
          onNav={ir}
          usuario={config.nombre}
          subUsuario={config.sub}
          mensajesNoLeidos={noLeidos}
        />
      )}

      <div style={S.main}>
        <header style={{ ...S.topbar, padding:isMobile?"10px 16px":"10px 24px" }}>
          {isMobile ? (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={S.logoIcon}>G</div>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.gray900 }}>Mensajes</p>
                <p style={{ margin:0, fontSize:11, color:C.gray500 }}>{config.nombre} · {config.sub}</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin:0, fontSize:16, fontWeight:700, color:C.gray900 }}>Mensajes y notificaciones</p>
              <p style={{ margin:"2px 0 0", fontSize:12, color:C.gray500 }}>Colegio Integrado de Fontibón IBEP · Periodo 2 · 2025</p>
            </div>
          )}

          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {noLeidos > 0 && (
              <span style={{ background:C.redLight, color:C.red, fontSize:isMobile?11:12, padding:isMobile?"3px 8px":"4px 12px", borderRadius:12, fontWeight:600 }}>
                {noLeidos} sin leer
              </span>
            )}
          </div>
        </header>

        <main style={{ ...S.content, padding:isMobile?"12px":"20px 24px" }}>
          <div style={{ display:"flex", gap:14 }}>
            {panelLista}
            {panelDetalle}
          </div>
        </main>

        {isMobile && (
          <div style={{ background:C.white, borderTop:`1px solid ${C.gray200}`, display:"flex", justifyContent:"space-around", padding:"8px 0 12px", flexShrink:0 }}>
            {bottomItems.map(item => {
              const activo = item.id === "mensajes";
              return (
                <div key={item.id} onClick={() => ir(item.ruta)}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer" }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:activo?C.blueLight:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <item.Ico color={activo?C.blue:C.gray400} />
                  </div>
                  <span style={{ fontSize:10, color:activo?C.blue:C.gray400, fontWeight:activo?600:400 }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>  
  );
}
