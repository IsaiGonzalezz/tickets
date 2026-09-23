import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, X, Edit, Trash2, ImageIcon,
  Star, StarOff, Plus, ChevronDown, ChevronRight,
  Scale, Truck, LogIn, LogOut as TruckOut,
  Activity, Clock, CheckCircle2, AlertCircle,
  Printer, RefreshCw, Hash, Layers, Ruler,
  Calendar, HardDrive, Zap, ZapOff, LayoutTemplate
} from 'lucide-react'
import Barcode from 'react-barcode'
import { QRCodeSVG } from 'qrcode.react'
import { NOMBRE_OCULTO } from '../components/Layout'

type CategoriaPlantilla = 'formulacion_pesaje' | 'camionero_entrada' | 'camionero_salida'

const CAMIONERO_TABS: { id: CategoriaPlantilla; label: string; icon: any }[] = [
  { id: 'camionero_entrada', label: 'Entrada', icon: LogIn },
  { id: 'camionero_salida',  label: 'Salida',  icon: TruckOut },
]
const ALL_CATEGORIAS: CategoriaPlantilla[] = [
  'formulacion_pesaje', 'camionero_entrada', 'camionero_salida'
]

interface PlantillaItem {
  archivo: string; nombre: string; fecha: string; modo: string
  categoria: string; elementosCount: number
  configPapel: { anchoMm: number; altoMm: number } | null
}
interface LogEntry {
  id: string; timestamp: Date; categoria: string
  status: 'ok' | 'error' | 'pending'; mensaje?: string
}

// ── PREVIEW CANVAS ────────────────────────────────────────────────────────────
const PreviewCanvas = ({ plantilla, height = 'h-52' }: { plantilla: any; height?: string }) => {
  if (!plantilla?.configPapel) return null
  const scaleFactor = Math.min(300 / (plantilla.configPapel.anchoMm * 3.78), 0.9)
  return (
    <div className={`w-full ${height} bg-[#080c10] rounded-xl overflow-hidden flex items-center justify-center border border-slate-800/60 relative`}>
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <div style={{
        width: `${plantilla.configPapel.anchoMm}mm`,
        height: `${plantilla.configPapel.altoMm}mm`,
        transform: `scale(${scaleFactor})`,
        backgroundColor: 'white',
        position: 'relative',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.8)'
      }}>
        {(plantilla.elementos || []).map((el: any) => (
          <div key={el.id} style={{ position: 'absolute', left: el.x, top: el.y, width: el.ancho, height: el.alto, overflow: 'hidden' }}>
            {el.tipo === 'texto' && (
              <div style={{ fontSize: el.fontSize, fontWeight: el.negritas ? 'bold' : 'normal', textAlign: el.textAlign, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
                {el.contenido}
              </div>
            )}
            {el.tipo === 'codigoBarra' && (
              <div className="w-full h-full flex justify-center items-center bg-white overflow-hidden [&>svg]:w-full [&>svg]:h-full">
                <Barcode value={el.contenido || '123'} format={el.barcodeFormat || 'CODE128'} width={2} height={100} displayValue background="transparent" margin={0} renderer="svg" />
              </div>
            )}
            {el.tipo === 'qr' && <QRCodeSVG value={el.contenido || 'QR'} width="100%" height="100%" />}
            {el.tipo === 'caja' && <div className="w-full h-full border-black" style={{ borderWidth: el.grosorBorde }} />}
            {el.tipo === 'imagen' && (
              el.contenido && !el.contenido.startsWith('{{')
                ? <img src={el.contenido} className="w-full h-full object-contain" />
                : <div className="bg-slate-100 w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-slate-300" /></div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── BADGE CATEGORÍA ───────────────────────────────────────────────────────────
const CAT_META: Record<string, { label: string; cls: string; dot: string }> = {
  formulacion_pesaje: { label: 'Formulación', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
  camionero_entrada:  { label: 'C. Entrada',  cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30',         dot: 'bg-blue-400' },
  camionero_salida:   { label: 'C. Salida',   cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',      dot: 'bg-amber-400' },
}

function CategoriaBadge({ cat }: { cat: string }) {
  const m = CAT_META[cat] || { label: cat, cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

// ── PLANTILLA CARD ────────────────────────────────────────────────────────────
function PlantillaCard({ item, esActiva, esSeleccionada, onClick }: {
  item: PlantillaItem; esActiva: boolean; esSeleccionada: boolean; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-150 hover:-translate-y-0.5 min-h-[120px] flex flex-col gap-3 group
        ${esSeleccionada
          ? 'border-blue-500/60 bg-blue-500/8 ring-1 ring-blue-500/30 shadow-xl shadow-blue-900/20'
          : esActiva
            ? 'border-amber-500/50 bg-[#1c1a10] ring-1 ring-amber-500/25 shadow-xl shadow-amber-900/15'
            : 'border-slate-700/60 bg-[#161b22] hover:border-slate-600 hover:bg-[#1a2030] hover:shadow-xl hover:shadow-black/30'
        }`}
    >
      {/* Badge ACTIVA */}
      {esActiva && (
        <div className="absolute -top-2.5 -right-2.5 flex items-center gap-1 bg-amber-500 text-amber-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-lg shadow-amber-900/40">
          <Star className="w-2.5 h-2.5 fill-amber-950" /> ACTIVA
        </div>
      )}

      {/* Icono + contador */}
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg transition-colors ${
          esActiva
            ? 'bg-amber-500/15 text-amber-300'
            : esSeleccionada
              ? 'bg-blue-500/15 text-blue-300'
              : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700/60 group-hover:text-slate-300'
        }`}>
          <FileText className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/60 px-2 py-1 rounded-lg">
          <Layers className="w-3 h-3 text-slate-500" />
          <span className="text-[11px] text-slate-400 font-mono font-medium">{item.elementosCount}</span>
        </div>
      </div>

      {/* Nombre + info */}
      <div className="space-y-1.5 mt-auto">
        <h3 className="font-semibold text-sm text-slate-100 truncate leading-tight" title={item.nombre}>
          {item.nombre}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {item.configPapel && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
              <Ruler className="w-2.5 h-2.5 text-slate-500" />
              {item.configPapel.anchoMm}×{item.configPapel.altoMm} mm
            </span>
          )}
          {item.fecha && (
            <span className="text-[11px] text-slate-500">{item.fecha}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PLANTILLA GRID ────────────────────────────────────────────────────────────
function PlantillaGrid({ items, activa, onCrear, onDetalle, itemSeleccionado }: {
  items: PlantillaItem[]; activa: string; itemSeleccionado: PlantillaItem | null
  onCrear: () => void; onDetalle: (i: PlantillaItem) => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {/* Card nuevo */}
      <div
        onClick={onCrear}
        className="group flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 border-dashed border-slate-700/50 hover:border-blue-500/40 hover:bg-blue-500/5 cursor-pointer transition-all min-h-[120px]"
      >
        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-blue-500/15 group-hover:text-blue-400 transition-all group-hover:scale-110">
          <Plus className="w-4 h-4" />
        </div>
        <div className="text-center space-y-0.5">
          <p className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">Nuevo diseño</p>
          <p className="text-[11px] text-slate-600 group-hover:text-slate-500 transition-colors">Con esquema pre-cargado</p>
        </div>
      </div>

      {items.map(item => (
        <PlantillaCard
          key={item.archivo}
          item={item}
          esActiva={activa === item.archivo}
          esSeleccionada={itemSeleccionado?.archivo === item.archivo}
          onClick={() => onDetalle(item)}
        />
      ))}

      {items.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center py-10 gap-2 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center">
            <FileText className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-sm text-slate-500">No hay diseños aún</p>
          <p className="text-xs text-slate-600">Crea uno con el botón de arriba</p>
        </div>
      )}
    </div>
  )
}

// ── SECCIÓN COLAPSABLE ────────────────────────────────────────────────────────
function Seccion({ id, open, onToggle, icon, borderColor, accentBg, accentText, title, subtitle, count, children }: {
  id: string; open: boolean; onToggle: (id: string) => void; icon: React.ReactNode
  borderColor: string; accentBg: string; accentText: string
  title: string; subtitle: string; count: number; children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border bg-[#161b22] overflow-hidden transition-all ${borderColor}`}>
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.015] transition-colors"
      >
        <div className={`p-2.5 rounded-xl ${accentBg}`}>
          <div className={accentText}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm text-slate-100">{title}</h2>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p>
        </div>
        <div className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${accentBg} ${accentText} border-current/30`}>
          {count} {count === 1 ? 'diseño' : 'diseños'}
        </div>
        <span className="text-slate-600 w-5 h-5 flex items-center justify-center">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  )
}

// ── PANEL DETALLE TIPO ADOBE ──────────────────────────────────────────────────
function DetallePanel({ detalle, activa, onClose, onToggleActiva, onEliminar, onEditar }: {
  detalle: { cat: CategoriaPlantilla; item: PlantillaItem; contenidoCompleto: any }
  activa: string; onClose: () => void; onToggleActiva: () => void
  onEliminar: () => void; onEditar: () => void
}) {
  const esActiva = activa === detalle.item.archivo
  const contenido = detalle.contenidoCompleto
  const elementos = contenido.elementos || []

  const tiposCount = elementos.reduce((acc: Record<string, number>, el: any) => {
    acc[el.tipo] = (acc[el.tipo] || 0) + 1; return acc
  }, {})

  const tipoLabels: Record<string, string> = {
    texto: 'Texto', codigoBarra: 'Barras', qr: 'QR', caja: 'Caja', imagen: 'Imagen'
  }

  const gradientTop =
    detalle.cat === 'formulacion_pesaje' ? 'from-emerald-500/70 to-transparent' :
    detalle.cat === 'camionero_entrada'  ? 'from-blue-500/70 to-transparent' :
                                           'from-amber-500/70 to-transparent'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <div className="fixed right-0 top-11 bottom-0 z-50 w-[380px] bg-[#13181f] border-l border-slate-700/60 flex flex-col shadow-2xl shadow-black/70 animate-in slide-in-from-right-6 duration-200">

        {/* Línea de color top */}
        <div className={`h-[2px] w-full bg-gradient-to-r ${gradientTop}`} />

        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-slate-800/60">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-100 truncate">{detalle.item.nombre}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <CategoriaBadge cat={detalle.cat} />
              <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded-md font-mono">
                <Hash className="w-2.5 h-2.5 text-slate-500" />
                {NOMBRE_OCULTO[detalle.cat] || '—'}
              </div>
              {esActiva && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  <Star className="w-2.5 h-2.5 fill-amber-300" /> ACTIVA
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Preview */}
          <div className="px-5 pt-4 pb-4">
            <PreviewCanvas plantilla={contenido} height="h-52" />
          </div>

          {/* Stats row */}
          <div className="px-5 pb-4 grid grid-cols-3 gap-2">
            {[
              { icon: <Ruler className="w-3 h-3" />, label: 'Medidas', value: `${contenido.configPapel?.anchoMm}×${contenido.configPapel?.altoMm}`, unit: 'mm' },
              { icon: <Layers className="w-3 h-3" />, label: 'Objetos', value: String(elementos.length), unit: '' },
              { icon: <LayoutTemplate className="w-3 h-3" />, label: 'Modo', value: detalle.item.modo || 'ticket', unit: '' },
            ].map(stat => (
              <div key={stat.label} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-slate-500 mb-2">
                  {stat.icon}
                  <span className="text-[9px] uppercase tracking-widest font-semibold">{stat.label}</span>
                </div>
                <p className="text-xs font-mono text-slate-200 leading-none">
                  {stat.value}
                  {stat.unit && <span className="text-[10px] text-slate-500 ml-0.5">{stat.unit}</span>}
                </p>
              </div>
            ))}
          </div>

          {/* Composición */}
          {Object.keys(tiposCount).length > 0 && (
            <div className="px-5 pb-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 mb-2.5">Composición</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(tiposCount).map(([tipo, n]) => (
                  <div key={tipo} className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-2">
                    <span className="text-[11px] text-slate-300 font-medium">{tipoLabels[tipo] || tipo}</span>
                    <span className="text-[11px] font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded-md">{n as number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadatos */}
          <div className="px-5 pb-4 space-y-2">
            <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
              <HardDrive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-widest font-semibold text-slate-500 mb-0.5">Archivo en disco</p>
                <p className="text-xs font-mono text-slate-300 truncate">{detalle.item.archivo}</p>
              </div>
            </div>
            {detalle.item.fecha && (
              <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-semibold text-slate-500 mb-0.5">Guardado</p>
                  <p className="text-xs text-slate-300">{detalle.item.fecha}</p>
                </div>
              </div>
            )}
          </div>

          {/* Estado activa */}
          <div className="px-5 pb-5">
            {esActiva ? (
              <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-3.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-200">Plantilla activa</p>
                  <p className="text-[11px] text-amber-400/70 mt-1 leading-relaxed">
                    Se usará automáticamente para peticiones de <span className="font-mono text-amber-300">{NOMBRE_OCULTO[detalle.cat]}</span>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3.5">
                <div className="w-7 h-7 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0 mt-0.5">
                  <ZapOff className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Plantilla inactiva</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Actívala para usarla en impresiones de <span className="font-mono text-slate-400">{NOMBRE_OCULTO[detalle.cat]}</span>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Acciones fijas abajo */}
        <div className="px-5 py-4 border-t border-slate-800/60 bg-[#0f141a] space-y-2">
          <button
            onClick={onEditar}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold transition-all shadow-lg shadow-blue-900/30"
          >
            <Edit className="w-3.5 h-3.5" /> Abrir en editor
          </button>
          <div className="flex gap-2">
            <button
              onClick={onToggleActiva}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all active:scale-[0.98] ${
                esActiva
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                  : 'border-slate-600 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              {esActiva
                ? <><StarOff className="w-3.5 h-3.5" /> Desactivar</>
                : <><Star className="w-3.5 h-3.5" /> Activar</>
              }
            </button>
            <button
              onClick={onEliminar}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/25 bg-red-500/8 text-red-400 hover:bg-red-500/15 hover:border-red-500/40 hover:text-red-300 transition-all active:scale-[0.98] text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────────
export function HomePage() {
  const navigate = useNavigate()
  const api = (window as any).api

  const [datosCat, setDatosCat] = useState<Record<CategoriaPlantilla, { items: PlantillaItem[]; activa: string }>>({
    formulacion_pesaje: { items: [], activa: '' },
    camionero_entrada:  { items: [], activa: '' },
    camionero_salida:   { items: [], activa: '' },
  })
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Record<string, boolean>>({ formulacion_pesaje: true, camionero: true })
  const [camioneroTab, setCamioneroTab] = useState<CategoriaPlantilla>('camionero_entrada')
  const [plantillaDetalle, setPlantillaDetalle] = useState<{ cat: CategoriaPlantilla; item: PlantillaItem; contenidoCompleto: any } | null>(null)
  const [printLog, setPrintLog]     = useState<LogEntry[]>([])
  const [logAbierto, setLogAbierto] = useState(false)

  useEffect(() => {
    if (!api?.onNuevosDatosEtiqueta) return
    const unsub = api.onNuevosDatosEtiqueta((datos: any[]) => {
      setPrintLog(prev => [{
        id: Date.now().toString(), timestamp: new Date(),
        categoria: datos[0]?.categoria || 'desconocido',
        status: 'ok', mensaje: `${datos.length} etiqueta(s) recibidas`
      }, ...prev].slice(0, 50))
      setLogAbierto(true)
    })
    return () => unsub()
  }, [api])

  const cargarTodas = useCallback(async () => {
    if (!api) return
    setRefreshing(true)
    try {
      const r: any = {}
      for (const c of ALL_CATEGORIAS) {
        const res = await api.listarPlantillas(c)
        r[c] = { items: res.items || [], activa: res.activa || '' }
      }
      setDatosCat(r)
    } catch (e) { console.error(e) }
    setLoading(false); setRefreshing(false)
  }, [api])

  useEffect(() => { cargarTodas() }, [cargarTodas])

  const eliminarPlantilla = async (cat: CategoriaPlantilla, archivo: string) => {
    if (!confirm('¿Eliminar esta plantilla del disco?')) return
    const res = await api.eliminarPlantilla(cat, archivo)
    if (res.error) return alert('Error: ' + res.error)
    setPlantillaDetalle(null); cargarTodas()
  }

  const toggleActiva = async (cat: CategoriaPlantilla, archivo: string) => {
    const nuevo = datosCat[cat].activa === archivo ? '' : archivo
    const res = await api.setPlantillaActiva(cat, nuevo)
    if (res.error) return alert('Error: ' + res.error)
    cargarTodas()
  }

  const abrirDetalle = async (cat: CategoriaPlantilla, item: PlantillaItem) => {
    const res = await api.leerPlantilla(cat, item.archivo)
    if (res.error) return alert('Error: ' + res.error)
    setPlantillaDetalle({ cat, item, contenidoCompleto: res.contenido })
  }

  const totalCamionero = datosCat.camionero_entrada.items.length + datosCat.camionero_salida.items.length
  const toggleSeccion  = (id: string) => setSeccionesAbiertas(p => ({ ...p, [id]: !p[id] }))
  const itemSeleccionado = plantillaDetalle?.item || null

  return (
    <div className="flex h-full w-full bg-[#0d1117] overflow-hidden relative">

      {/* Panel detalle */}
      {plantillaDetalle && (
        <DetallePanel
          detalle={plantillaDetalle}
          activa={datosCat[plantillaDetalle.cat].activa}
          onClose={() => setPlantillaDetalle(null)}
          onToggleActiva={async () => {
            await toggleActiva(plantillaDetalle.cat, plantillaDetalle.item.archivo)
            const res = await api.leerPlantilla(plantillaDetalle.cat, plantillaDetalle.item.archivo)
            if (!res.error) setPlantillaDetalle(d => d ? { ...d, contenidoCompleto: res.contenido } : null)
          }}
          onEliminar={() => eliminarPlantilla(plantillaDetalle.cat, plantillaDetalle.item.archivo)}
          onEditar={() => navigate('/editor', {
            state: { plantillaAEditar: plantillaDetalle.contenidoCompleto, categoriaOrigen: plantillaDetalle.cat, archivoOrigen: plantillaDetalle.item.archivo }
          })}
        />
      )}

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto min-w-0">
        <div className="max-w-5xl mx-auto p-6 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-base font-bold text-slate-100 tracking-tight">Gestor de plantillas</h1>
              <p className="text-xs text-slate-400 mt-0.5">Administra y activa los diseños por módulo operativo.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cargarTodas} disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200 text-xs transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Actualizar
              </button>
              <button
                onClick={() => setLogAbierto(o => !o)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  logAbierto ? 'border-blue-500/50 bg-blue-500/10 text-blue-300' : 'border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3 h-3" /> Log
                {printLog.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {printLog.length > 9 ? '9+' : printLog.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-500 gap-3">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Cargando plantillas…</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Formulación */}
              <Seccion
                id="formulacion_pesaje" open={seccionesAbiertas.formulacion_pesaje} onToggle={toggleSeccion}
                icon={<Scale className="w-4 h-4" />}
                borderColor="border-emerald-800/40" accentBg="bg-emerald-500/10" accentText="text-emerald-400"
                title="Formulación / Pesaje" subtitle="Etiquetas para formulación y pesaje de materiales."
                count={datosCat.formulacion_pesaje.items.length}
              >
                <PlantillaGrid
                  items={datosCat.formulacion_pesaje.items}
                  activa={datosCat.formulacion_pesaje.activa}
                  itemSeleccionado={plantillaDetalle?.cat === 'formulacion_pesaje' ? itemSeleccionado : null}
                  onCrear={() => navigate('/editor', { state: { categoriaDestino: 'formulacion_pesaje', crearDesdeEsquema: true } })}
                  onDetalle={i => abrirDetalle('formulacion_pesaje', i)}
                />
              </Seccion>

              {/* Camionero */}
              <Seccion
                id="camionero" open={seccionesAbiertas.camionero} onToggle={toggleSeccion}
                icon={<Truck className="w-4 h-4" />}
                borderColor="border-blue-800/40" accentBg="bg-blue-500/10" accentText="text-blue-400"
                title="Camionero" subtitle="Tickets de entrada y salida para el módulo de báscula."
                count={totalCamionero}
              >
                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                  {CAMIONERO_TABS.map(tab => {
                    const Icon = tab.icon; const isActive = camioneroTab === tab.id; const cnt = datosCat[tab.id].items.length
                    return (
                      <button key={tab.id} onClick={() => setCamioneroTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                          isActive
                            ? tab.id === 'camionero_entrada'
                              ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/30'
                              : 'bg-amber-500 text-amber-950 border-amber-400 shadow-lg shadow-amber-900/30'
                            : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-white/20 text-current' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {cnt}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <PlantillaGrid
                  items={datosCat[camioneroTab].items}
                  activa={datosCat[camioneroTab].activa}
                  itemSeleccionado={plantillaDetalle?.cat === camioneroTab ? itemSeleccionado : null}
                  onCrear={() => navigate('/editor', { state: { categoriaDestino: camioneroTab, crearDesdeEsquema: true } })}
                  onDetalle={i => abrirDetalle(camioneroTab, i)}
                />
              </Seccion>
            </div>
          )}
        </div>
      </div>

      {/* Log de impresión */}
      {logAbierto && (
        <div className="w-64 bg-[#161b22] border-l border-slate-700/60 flex flex-col flex-shrink-0">
          <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-200">Log de impresión</span>
            </div>
            <div className="flex items-center gap-2">
              {printLog.length > 0 && (
                <button onClick={() => setPrintLog([])} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
                  Limpiar
                </button>
              )}
              <button onClick={() => setLogAbierto(false)} className="text-slate-500 hover:text-slate-200 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {printLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                <Activity className="w-8 h-8 text-slate-700" />
                <p className="text-xs text-slate-500">Sin actividad reciente</p>
                <p className="text-[11px] text-slate-600">Las peticiones aparecerán aquí.</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {printLog.map(entry => (
                  <div key={entry.id} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {entry.status === 'ok'
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          : entry.status === 'error'
                          ? <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          : <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                        }
                        <span className={`text-[11px] font-semibold ${
                          entry.status === 'ok' ? 'text-emerald-400' : entry.status === 'error' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {entry.status === 'ok' ? 'Enviado' : entry.status === 'error' ? 'Error' : 'Pendiente'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {entry.timestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <CategoriaBadge cat={entry.categoria} />
                    {entry.mensaje && <p className="text-[11px] text-slate-400">{entry.mensaje}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-slate-800 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-slate-400">Servidor activo en :8080</span>
          </div>
        </div>
      )}
    </div>
  )
}