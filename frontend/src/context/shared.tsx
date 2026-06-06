// ═══════════════════════════════════════════════════════════════
// shared.tsx — Constantes, estilos, iconos y componentes globales
// Importar en todos los archivos del proyecto GESTA
// ═══════════════════════════════════════════════════════════════
import React from "react";

/* ─── PALETA GLOBAL ───────────────────────────────────────────── */
export const C = {
  blue:       "#1a56db",
  blueDark:   "#1648c0",
  blueLight:  "#EBF2FE",
  blueText:   "#1a3a6e",
  green:      "#15803d",
  greenLight: "#dcfce7",
  amber:      "#92400e",
  amberLight: "#fef3c7",
  red:        "#b91c1c",
  redLight:   "#fee2e2",
  purple:     "#5b21b6",
  purpleLight:"#ede9fe",
  gray50:     "#f9fafb",
  gray100:    "#f3f4f6",
  gray200:    "#e5e7eb",
  gray300:    "#d1d5db",
  gray400:    "#9ca3af",
  gray500:    "#6b7280",
  gray700:    "#374151",
  gray800:    "#1f2937",
  gray900:    "#111827",
  white:      "#ffffff",
};

/* ─── ESTILOS BASE GLOBALES ───────────────────────────────────── */
export const S: Record<string, React.CSSProperties> = {
  app:        { display:"flex", height:"100vh", background:C.gray100, fontFamily:"'Inter','Segoe UI',sans-serif", fontSize:16, overflow:"hidden" },
  sidebar:    { width:264, background:C.white, borderRight:`1px solid ${C.gray200}`, display:"flex", flexDirection:"column", flexShrink:0 },
  main:       { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  content:    { flex:1, overflowY:"auto", padding:"24px 28px" },
  topbar:     { background:C.white, borderBottom:`1px solid ${C.gray200}`, padding:"12px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 },
  logoIcon:   { width:36, height:36, borderRadius:6, background:C.blue, color:C.white, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:17, flexShrink:0 },
  logo:       { display:"flex", alignItems:"center", gap:12, padding:"16px 18px", borderBottom:`1px solid ${C.gray200}` },
  navSection: { fontSize:11, fontWeight:600, color:C.gray400, padding:"14px 18px 4px", textTransform:"uppercase", letterSpacing:"0.5px", margin:0 },
  navItem:    { display:"flex", alignItems:"center", gap:9, padding:"9px 18px", fontSize:14, cursor:"pointer", background:"transparent", border:"none", width:"100%", textAlign:"left", fontFamily:"inherit" },
  tableCard:  { background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, overflow:"hidden", marginBottom:16 },
  tableHead:  { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px", borderBottom:`1px solid ${C.gray100}` },
  table:      { width:"100%", borderCollapse:"collapse", fontSize:13 },
  th:         { fontSize:12, fontWeight:600, color:C.gray500, textAlign:"left", padding:"10px 18px", background:C.gray50, borderBottom:`1px solid ${C.gray200}` },
  td:         { padding:"10px 18px", color:C.gray700, borderBottom:`1px solid ${C.gray100}`, verticalAlign:"middle" },
  card:       { background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, overflow:"hidden", marginBottom:14 },
  cardHead:   { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px", borderBottom:`1px solid ${C.gray100}`, fontSize:14, fontWeight:600, color:C.gray800 },
  select:     { fontSize:13, padding:"5px 10px", height:32, borderRadius:6, border:`1px solid ${C.gray200}`, background:C.white, color:C.gray700, fontFamily:"inherit" },
  btnSm:      { fontSize:12, padding:"5px 12px", borderRadius:6, border:`1px solid ${C.gray200}`, background:C.white, color:C.gray700, cursor:"pointer", fontFamily:"inherit" },
  btnPrimary: { fontSize:13, padding:"6px 16px", borderRadius:6, border:"none", background:C.blue, color:C.white, cursor:"pointer", fontWeight:600, fontFamily:"inherit" },
  avatar:     { width:32, height:32, borderRadius:"50%", background:C.blueLight, color:C.blueText, fontSize:12, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  input:      { width:"100%", fontSize:14, padding:"9px 13px", border:`1px solid ${C.gray200}`, borderRadius:8, background:C.white, color:C.gray800, fontFamily:"inherit", boxSizing:"border-box" },
  label:      { fontSize:12, fontWeight:600, color:C.gray500, display:"block", marginBottom:4 },
  zoom: "120%" as any,
};

/* ─── SEMAFORO MAP ────────────────────────────────────────────── */
export const SM: Record<string, { bg:string; color:string; dot:string; label:string }> = {
  verde:    { bg:"#dcfce7", color:"#15803d", dot:"#16a34a", label:"Verde" },
  amarillo: { bg:"#fef3c7", color:"#92400e", dot:"#d97706", label:"Amarillo" },
  rojo:     { bg:"#fee2e2", color:"#b91c1c", dot:"#dc2626", label:"Rojo" },
};

/* ─── COMPONENTE SEMAFORO ─────────────────────────────────────── */
export function Semaforo({ nivel, label, grande }: { nivel:string; label?:string; grande?:boolean }) {
  const s = SM[nivel] || SM.verde;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap: grande?8:5, padding: grande?"6px 14px":"2px 8px", borderRadius:10, fontSize: grande?14:11, fontWeight:600, background:s.bg, color:s.color }}>
      <span style={{ width: grande?10:6, height: grande?10:6, borderRadius:"50%", background:s.dot, flexShrink:0 }} />
      {label ?? s.label}
    </span>
  );
}

/* ─── COMPONENTE AVATAR ───────────────────────────────────────── */
export function Avatar({ nombre, size = 28 }: { nombre:string; size?:number }) {
  const initials = nombre.split(" ").map((w:string) => w[0]).slice(0,2).join("");
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:C.blueLight, color:C.blueText, fontSize:size*0.38, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      {initials}
    </div>
  );
}

/* ─── ICONOS SVG GLOBALES ─────────────────────────────────────── */
export const IcoHome = ({ color }: { color:string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
export const IcoCheck = ({ color }: { color:string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
export const IcoEdit = ({ color }: { color:string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
export const IcoBell = ({ color }: { color:string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
export const IcoEye = ({ color }: { color:string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
export const IcoMsg = ({ color }: { color:string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
export const IcoUsers = ({ color }: { color:string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
export const IcoBook = ({ color }: { color:string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
export const IcoEyeOpen = ({ color = "#9CA3AF" }: { color?:string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
export const IcoEyeOff = ({ color = "#9CA3AF" }: { color?:string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
// Iconos decorativos panel azul login (stroke blanco fijo)
export const IcoBookWhite = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
export const IcoBellWhite = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
export const IcoChartWhite = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
export const IcoClipboardWhite = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
);

/* ─── TIPO META (observaciones) ───────────────────────────────── */
export const TIPO_OBS_META: Record<string, { bg:string; color:string; label:string }> = {
  Academica:     { bg:"#dbeafe", color:"#1e40af", label:"Academica" },
  Disciplinaria: { bg:"#fee2e2", color:"#991b1b", label:"Disciplinaria" },
  Seguimiento:   { bg:"#dcfce7", color:"#166534", label:"Seguimiento" },
  Logro:         { bg:"#fef3c7", color:"#92400e", label:"Logro" },
  Asistencia:    { bg:"#ede9fe", color:"#5b21b6", label:"Asistencia" },
  Positiva:      { bg:"#dcfce7", color:"#166534", label:"Positiva" },
};

/* ─── TIPO META (mensajes/notificaciones) ─────────────────────── */
export const TIPO_MSG_META: Record<string, { bg:string; color:string; label:string }> = {
  mensaje:      { bg:C.purpleLight, color:C.purple,   label:"Mensaje" },
  notificacion: { bg:C.greenLight,  color:C.green,    label:"Notificacion" },
  alerta:       { bg:C.redLight,    color:C.red,      label:"Alerta" },
  inasistencia: { bg:C.amberLight,  color:C.amber,    label:"Inasistencia" },
  notas:        { bg:C.blueLight,   color:C.blueText, label:"Notas" },
};

/* ─── TIPO ICON COLOR (observador) ───────────────────────────── */
export const TIPO_ICON_COLOR: Record<string, string> = {
  Disciplinaria: "#991b1b",
  Academica:     "#1e40af",
  Seguimiento:   "#166534",
  Logro:         "#92400e",
  Asistencia:    "#5b21b6",
};

/* ─── NAV CONFIGS POR ROL ─────────────────────────────────────── */
export type NavItem = { id:string; label:string; ruta:string; badge?:number; active?:boolean };
export type NavGroup = { section:string; items:NavItem[] };

export const NAV_DOCENTE: NavGroup[] = [
  { section:"Principal", items:[
    { id:"inicio",         label:"Inicio",         ruta:"docente" },
    { id:"asistencia",     label:"Asistencia",     ruta:"asistencia-docente" },
    { id:"calificaciones", label:"Calificaciones", ruta:"calificaciones-docente" },
    { id:"observador",     label:"Observador",     ruta:"observador-docente" },
  ]},
  { section:"Comunicacion", items:[
    { id:"mensajes", label:"Mensajes y Alertas", ruta:"mensajes-docente", badge:3 },
  ]},
];

export const NAV_COORDINADOR: NavGroup[] = [
  { section:"Principal", items:[
    { id:"inicio",         label:"Inicio",         ruta:"coordinador" },
    { id: "asistencia", label: "Asistencia", ruta: "asistencia-coordinador" },
    { id:"estudiantes",    label:"Estudiantes",    ruta:"estudiantes-coordinador" },
    { id:"calificaciones", label:"Calificaciones", ruta:"calificaciones-coordinador" },
    { id:"observador",     label:"Observador",     ruta:"observador-coordinador" },
  ]},
  { section:"Comunicacion", items:[
    { id:"mensajes", label:"Mensajes y Alertas", ruta:"mensajes-coordinador", badge:3 },
  ]},
];

export const NAV_ACUDIENTE: NavGroup[] = [
  { section:"Principal", items:[
    { id:"inicio",    label:"Inicio",    ruta:"acudiente" },
    { id:"mensajes",  label:"Mensajes",  ruta:"mensajes-acudiente" },
  ]},
];

export const BOTTOM_NAV_DOCENTE = [
  { id:"inicio",         label:"Inicio",     ruta:"docente",               Ico:IcoHome },
  { id:"asistencia",     label:"Asistencia", ruta:"asistencia-docente",    Ico:IcoCheck },
  { id:"calificaciones", label:"Calificaciones",      ruta:"calificaciones-docente",Ico:IcoEdit },
  { id:"observador",     label:"Observador", ruta:"observador-docente",    Ico:IcoEye },
  { id:"mensajes",       label:"Mensajes",   ruta:"mensajes-docente",      Ico:IcoMsg },
];

export const BOTTOM_NAV_COORDINADOR = [
  { id:"inicio",         label:"Inicio",         ruta:"coordinador",                Ico:IcoHome },
  { id: "asistencia", label: "Asistencia", ruta: "asistencia-coordinador", Ico: IcoCheck },
  { id:"estudiantes",    label:"Estudiantes",    ruta:"estudiantes-coordinador",    Ico:IcoUsers },
  { id:"calificaciones", label:"Notas",          ruta:"calificaciones-coordinador", Ico:IcoEdit },
  { id:"observador",     label:"Observador",     ruta:"observador-coordinador",     Ico:IcoEye },
  { id:"mensajes",       label:"Mensajes",       ruta:"mensajes-coordinador",       Ico:IcoMsg },
];

export const BOTTOM_NAV_ACUDIENTE = [
  { id:"inicio",   label:"Inicio",   ruta:"acudiente",         Ico:IcoHome },
  { id:"mensajes", label:"Mensajes", ruta:"mensajes-acudiente",Ico:IcoMsg },
];

/* ─── COMPONENTE SIDEBAR REUTILIZABLE ────────────────────────── */
export function Sidebar({
  navGroups, navActivo, onNav, usuario, subUsuario,
}: {
  navGroups: NavGroup[];
  navActivo: string;
  onNav: (ruta:string, id:string) => void;
  usuario: string;
  subUsuario: string;
}) {
  return (
    <aside style={S.sidebar}>
      <div style={S.logo}>
        <div style={S.logoIcon}>G</div>
        <div>
          <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.gray900, lineHeight:1.2 }}>GESTA</p>
          <p style={{ margin:0, fontSize:10, color:C.gray400, lineHeight:1.3 }}>Gestion y Alertas Estudiantiles</p>
        </div>
      </div>

      <nav style={{ flex:1, paddingTop:4, overflowY:"auto" }}>
        {navGroups.map(g => (
          <div key={g.section}>
            <p style={S.navSection}>{g.section}</p>
            {g.items.map(item => (
              <button
                key={item.id}
                onClick={() => onNav(item.ruta, item.id)}
                style={{
                  ...S.navItem,
                  borderLeft: (navActivo===item.id || item.active) ? `3px solid ${C.blue}` : "3px solid transparent",
                  color:      (navActivo===item.id || item.active) ? C.blue       : C.gray500,
                  background: (navActivo===item.id || item.active) ? C.blueLight  : "transparent",
                  fontWeight: (navActivo===item.id || item.active) ? 600 : 400,
                }}
              >
                {item.label}
                {item.badge != null && (
                  <span style={{ marginLeft:"auto", background:C.redLight, color:C.red, fontSize:10, padding:"1px 6px", borderRadius:10, fontWeight:700 }}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.gray200}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Avatar nombre={usuario} size={28} />
          <div>
            <p style={{ margin:0, fontSize:12, fontWeight:600, color:C.gray800 }}>{usuario}</p>
            <p style={{ margin:0, fontSize:10, color:C.gray400 }}>{subUsuario}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ─── COMPONENTE BOTTOM NAV MOBILE ───────────────────────────── */
export function BottomNav({
  items, navActivo, onNav, badges = {},
}: {
  items: { id:string; label:string; ruta:string; Ico:React.ComponentType<{color:string}> }[];
  navActivo: string;
  onNav: (ruta:string, id:string) => void;
  badges?: Record<string, number>;
}) {
  return (
    <div style={{ background:C.white, borderTop:`1px solid ${C.gray200}`, display:"flex", justifyContent:"space-around", padding:"8px 0 12px", flexShrink:0 }}>
      {items.map(item => {
        const activo = navActivo === item.id;
        const count  = badges[item.id] || 0;
        return (
          <div
            key={item.id}
            onClick={() => onNav(item.ruta, item.id)}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer", position:"relative" }}
          >
            <div style={{ width:36, height:36, borderRadius:10, background:activo?C.blueLight:"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <item.Ico color={activo?C.blue:C.gray400} />
              {count > 0 && (
                <span style={{ position:"absolute", top:0, right:0, background:C.red, color:C.white, borderRadius:"50%", fontSize:9, width:14, height:14, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
                  {count}
                </span>
              )}
            </div>
            <span style={{ fontSize:10, color:activo?C.blue:C.gray400, fontWeight:activo?600:400 }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── CARD SECCION ACORDEON ──────────────────────────────────── */
export function CardSeccion({
  titulo, sub, badgeVal, badgeColor, abierto, onToggle, irA, labelIr, children, isMobile,
}: {
  titulo:string; sub?:string; badgeVal?:string|number; badgeColor?:string;
  abierto:boolean; onToggle:()=>void; irA?:()=>void; labelIr?:string;
  children:React.ReactNode; isMobile:boolean;
}) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
      <button onClick={onToggle} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:isMobile?"12px 14px":"14px 20px", background:C.white, border:"none", cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {badgeVal !== undefined && (
            <div style={{ width:42, height:42, borderRadius:8, background:(badgeColor||C.blue)+"20", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontSize:15, fontWeight:700, color:badgeColor||C.blue }}>{badgeVal}</span>
            </div>
          )}
          <div>
            <p style={{ margin:0, fontSize:isMobile?13:14, fontWeight:600, color:C.gray900 }}>{titulo}</p>
            {sub && <p style={{ margin:0, fontSize:11, color:C.gray400, marginTop:1 }}>{sub}</p>}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {irA && !isMobile && (
            <span onClick={e => { e.stopPropagation(); irA(); }} style={{ fontSize:12, color:C.blue, cursor:"pointer", padding:"4px 10px", borderRadius:6, border:`1px solid ${C.blue}`, background:C.blueLight, fontWeight:500 }}>
              {labelIr || "Ver completo →"}
            </span>
          )}
          <div style={{ width:28, height:28, borderRadius:6, background:C.gray100, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:C.gray500, flexShrink:0 }}>
            {abierto ? "▲" : "▼"}
          </div>
        </div>
      </button>
      {abierto && (
        <div style={{ borderTop:`1px solid ${C.gray100}` }}>
          {children}
          {irA && isMobile && (
            <div style={{ padding:"10px 14px", borderTop:`1px solid ${C.gray100}` }}>
              <button onClick={irA} style={{ width:"100%", padding:"10px", borderRadius:8, border:`1px solid ${C.blue}`, background:C.blueLight, color:C.blue, fontSize:13, cursor:"pointer", fontWeight:600, fontFamily:"inherit" }}>
                {labelIr || "Ver completo →"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── BADGE CONDICION ─────────────────────────────────────────── */
export function BadgeCondicion({ tipo }: { tipo:string|null }) {
  if (!tipo) return null;
  const map: Record<string,{label:string;bg:string;color:string}> = {
    repitente: { label:"Rep", bg:"#fef3c7", color:"#92400e" },
    inclusion:  { label:"Inc", bg:"#ede9fe", color:"#5b21b6" },
  };
  const s = map[tipo];
  if (!s) return null;
  return (
    <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:4, background:s.bg, color:s.color, marginLeft:6, flexShrink:0 }}>
      {s.label}
    </span>
  );
}

/* ─── PILL DE TIPO OBSERVACION ────────────────────────────────── */
export function TipoPill({ tipo }: { tipo:string }) {
  const m = TIPO_OBS_META[tipo] || { bg:C.blueLight, color:C.blueText, label:tipo };
  return (
    <span style={{ display:"inline-flex", padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:600, background:m.bg, color:m.color }}>
      {m.label}
    </span>
  );
}

/* ─── LOGO HEADER MOBILE ─────────────────────────────────────── */
export function LogoHeader({ titulo, sub }: { titulo:string; sub:string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={S.logoIcon}>G</div>
      <div>
        <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.gray900 }}>{titulo}</p>
        <p style={{ margin:0, fontSize:11, color:C.gray500 }}>{sub}</p>
      </div>
    </div>
  );
}

/* ─── UTILIDADES ──────────────────────────────────────────────── */
export function getInitials(nombre:string): string {
  return nombre.split(" ").map((w:string) => w[0]).slice(0,2).join("");
}

export function isMobileWidth(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 1280;
}

export function nivelDeProm(p:number|null): string|null {
  if (p === null) return null;
  if (p >= 3.0) return "verde";
  if (p >= 2.0) return "amarillo";
  return "rojo";
}