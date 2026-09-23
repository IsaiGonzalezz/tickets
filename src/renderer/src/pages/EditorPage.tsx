import { useState, useEffect, useRef, useCallback } from 'react'
import { Rnd } from 'react-rnd'
import Barcode from 'react-barcode'
import { QRCodeSVG } from 'qrcode.react'
import {
  Type, QrCode, ScanBarcode, Image as ImageIcon,
  Square, Trash2, Save, FileText,
  ZoomIn, ZoomOut, MousePointer2, Receipt, Tag, Hand, Upload,
  Database, CheckCircle2, Scale, LogIn, LogOut as TruckOut,
  AlignLeft, AlignCenter, AlignRight, Bold,
  ChevronDown, ChevronRight, Layers, Settings2, X,
  Move, LayoutGrid, Copy, Undo, FileInput,
  RotateCcw, RotateCw, Smartphone, Monitor
} from 'lucide-react'
import { useEditor } from '../hooks/useEditor'
import { ElementoTicket } from '../types/ticket'
import type { CategoriaPlantilla } from '../../../shared/schemas'

const PX_PER_MM = 3.78
// Umbral de snap más amplio para que sea fácil atrapar las guías
const SNAP_THRESHOLD_PX = 8

// ─── TOOL BUTTON ──────────────────────────────────────────────────────────────
function ToolBtn({ icon, label, onClick, active = false, danger = false, disabled = false }: {
  icon: React.ReactNode; label: string; onClick: () => void
  active?: boolean; danger?: boolean; accent?: boolean; disabled?: boolean
}) {
  let cls = 'group flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg w-full transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed '
  if (danger)      cls += 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
  else if (active) cls += 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40'
  else             cls += 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
  return (
    <button onClick={onClick} className={cls} title={label} disabled={disabled}>
      <div className="w-4 h-4 flex items-center justify-center">{icon}</div>
      <span className="text-[9px] font-medium leading-none tracking-wide uppercase opacity-70 group-hover:opacity-100 transition-opacity">{label}</span>
    </button>
  )
}

function PropSection({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-800/60 last:border-0">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors">
        <span className="text-slate-500 w-3.5 h-3.5 flex items-center justify-center">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 flex-1">{title}</span>
        <span className="text-slate-600 w-3 h-3">
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>}
    </div>
  )
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider w-16 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function MiniInput({ value, onChange, type = 'text', className = '' }: {
  value: any; onChange: (v: any) => void; type?: string; className?: string
}) {
  return (
    <input
      type={type} value={value}
      onChange={e => onChange(type === 'number' ? +e.target.value : e.target.value)}
      className={`w-full bg-[#0d1117] border border-slate-700/80 rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600 ${className}`}
    />
  )
}

function ModeBtn({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${active ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
      <span className="w-3.5 h-3.5">{icon}</span> {label}
    </button>
  )
}

// ─── RULER ────────────────────────────────────────────────────────────────────
function Ruler({ orientation, sizeMm, paperOriginPx, paperSizePx, zoom, scrollOffset }: {
  orientation: 'h' | 'v'
  sizeMm: number
  paperOriginPx: number
  paperSizePx: number
  zoom: number
  scrollOffset: number
}) {
  const STEP_MM    = 10
  const pxPerMmZ   = PX_PER_MM * zoom
  const stepPx     = STEP_MM * pxPerMmZ
  const totalTicks = Math.ceil(sizeMm / STEP_MM) + 2
  const isH        = orientation === 'h'

  const paperCenterDOM  = paperOriginPx + paperSizePx / 2
  const paperVisualEdge = paperCenterDOM - (paperSizePx * zoom) / 2

  return (
    <div className={`${isH ? 'h-6 w-full' : 'w-6 h-full'} bg-[#161b22] ${isH ? 'border-b' : 'border-r'} border-slate-800 pointer-events-none relative overflow-hidden z-10`}
      style={{ boxShadow: isH ? '0 2px 5px rgba(0,0,0,0.2)' : '2px 0 5px rgba(0,0,0,0.2)' }}>
      {Array.from({ length: totalTicks }).map((_, i) => {
        const mmVal = i * STEP_MM
        const posPx = paperVisualEdge - scrollOffset + mmVal * pxPerMmZ
        if (posPx < -stepPx || posPx > (isH ? 4000 : 3000)) return null
        return (
          <div key={i}
            className={`absolute ${isH ? 'top-0 bottom-0 border-l' : 'left-0 right-0 border-t'} border-slate-700/60`}
            style={{ [isH ? 'left' : 'top']: `${posPx}px`, [isH ? 'width' : 'height']: `${stepPx}px` }}>
            {isH
              ? <span className="text-[8px] font-bold text-slate-500 font-mono pl-1 pt-0.5 block select-none">{mmVal}</span>
              : <span className="text-[8px] font-bold text-slate-500 font-mono block select-none"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', paddingLeft: 1, paddingTop: 2 }}>{mmVal}</span>
            }
            <div className={`absolute ${isH ? 'bottom-0 left-0 right-0 h-1.5' : 'right-0 top-0 bottom-0 w-1.5'} opacity-25`}
              style={{ backgroundImage: isH
                ? `repeating-linear-gradient(to right, #94a3b8 0,#94a3b8 1px,transparent 1px,transparent ${pxPerMmZ*2}px)`
                : `repeating-linear-gradient(to bottom,#94a3b8 0,#94a3b8 1px,transparent 1px,transparent ${pxPerMmZ*2}px)` }}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── SNAP GUIDES ──────────────────────────────────────────────────────────────
// Mejora 2: las guías ahora tienen adherencia real (snap).
// calcSnap devuelve la posición ya corregida y las guías activas.
// El componente visual se mantiene igual pero las guías reflejan
// la posición real tras el snap, no la posición "raw".
interface SnapGuide { orientation: 'h' | 'v'; posPaper: number; label?: string }

function SnapGuides({ guides }: { guides: SnapGuide[] }) {
  if (!guides.length) return null
  return (
    <>
      {guides.map((g, i) => g.orientation === 'v' ? (
        <div key={i} className="absolute top-0 bottom-0 pointer-events-none z-50"
          style={{
            left: g.posPaper,
            width: 1,
            background: 'rgba(236,72,153,0.95)',
            boxShadow: '0 0 0 0.5px rgba(236,72,153,0.4), 0 0 6px rgba(236,72,153,0.6)'
          }}>
          {g.label && <span className="absolute top-1 left-1 text-[8px] font-bold font-mono text-pink-400 bg-[#0d1117]/80 px-1 rounded whitespace-nowrap">{g.label}</span>}
        </div>
      ) : (
        <div key={i} className="absolute left-0 right-0 pointer-events-none z-50"
          style={{
            top: g.posPaper,
            height: 1,
            background: 'rgba(236,72,153,0.95)',
            boxShadow: '0 0 0 0.5px rgba(236,72,153,0.4), 0 0 6px rgba(236,72,153,0.6)'
          }}>
          {g.label && <span className="absolute top-1 left-1 text-[8px] font-bold font-mono text-pink-400 bg-[#0d1117]/80 px-1 rounded whitespace-nowrap">{g.label}</span>}
        </div>
      ))}
    </>
  )
}

// ─── EDITOR PAGE ──────────────────────────────────────────────────────────────
export function EditorPage() {
  const editor = useEditor()
  const archivoMenuRef = useRef<HTMLDivElement>(null)
  const scrollRef      = useRef<HTMLDivElement>(null)

  const [etiquetasRecibidas, setEtiquetasRecibidas] = useState<any[]>([])
  const [panelDatosAbierto, setPanelDatosAbierto]   = useState(false)
  const [etiquetaActiva, setEtiquetaActiva]         = useState<any | null>(null)
  const [archivoMenuAbierto, setArchivoMenuAbierto] = useState(false)
  const [scrollPos, setScrollPos]                   = useState({ x: 0, y: 0 })
  const [snapGuides, setSnapGuides]                 = useState<SnapGuide[]>([])

  // Pan refs
  const isDragging  = useRef(false)
  const dragStart   = useRef({ x: 0, y: 0 })
  const scrollStart = useRef({ x: 0, y: 0 })

  const consolidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleConsolidar = useCallback(() => {
    if (consolidateTimer.current) clearTimeout(consolidateTimer.current)
    consolidateTimer.current = setTimeout(() => editor.consolidarHistorial(), 300)
  }, [editor.consolidarHistorial])

  // ── Dimensiones del papel ─────────────────────────────────────────────────
  const paperWpx   = editor.configPapel.anchoMm * PX_PER_MM
  const paperHpx   = editor.configPapel.altoMm  * PX_PER_MM
  const paperOriginX = 2000 - paperWpx / 2
  const paperOriginY = 2000 - paperHpx / 2

  // ── Orientación horizontal ────────────────────────────────────────────────
  const girarOrientacion = useCallback(() => {
    editor.setConfigPapel({
      anchoMm: editor.configPapel.altoMm,
      altoMm:  editor.configPapel.anchoMm,
    })
  }, [editor.configPapel])

  const esHorizontal = editor.configPapel.anchoMm > editor.configPapel.altoMm

  // ── SNAP con adherencia real (Mejora 2) ───────────────────────────────────
  // La función elige, por cada eje, el snap candidato más cercano dentro del
  // umbral y "clava" el elemento en esa posición. Si hay más de un candidato
  // activo, gana el más cercano. Esto replica el comportamiento de Word:
  // el elemento queda pegado a la guía mientras el cursor esté dentro del umbral.
  const calcSnap = useCallback((
    dragEl: ElementoTicket,
    rawX: number,
    rawY: number
  ): { x: number; y: number; guides: SnapGuide[] } => {
    const guides: SnapGuide[] = []

    // ── Candidatos X ──────────────────────────────────────────────────────
    type SnapCandX = { correctedX: number; dist: number; posPaper: number; label: string }
    const candidatesX: SnapCandX[] = []

    const tryX = (snapTo: number, anchor: 'left' | 'right' | 'center', label: string) => {
      const edge = anchor === 'left'   ? rawX
                 : anchor === 'right'  ? rawX + dragEl.ancho
                 :                       rawX + dragEl.ancho / 2
      const dist = Math.abs(edge - snapTo)
      if (dist <= SNAP_THRESHOLD_PX) {
        const nx = anchor === 'left'   ? snapTo
                 : anchor === 'right'  ? snapTo - dragEl.ancho
                 :                       snapTo - dragEl.ancho / 2
        candidatesX.push({ correctedX: nx, dist, posPaper: snapTo, label })
      }
    }

    // ── Candidatos Y ──────────────────────────────────────────────────────
    type SnapCandY = { correctedY: number; dist: number; posPaper: number; label: string }
    const candidatesY: SnapCandY[] = []

    const tryY = (snapTo: number, anchor: 'top' | 'bottom' | 'center', label: string) => {
      const edge = anchor === 'top'    ? rawY
                 : anchor === 'bottom' ? rawY + dragEl.alto
                 :                       rawY + dragEl.alto / 2
      const dist = Math.abs(edge - snapTo)
      if (dist <= SNAP_THRESHOLD_PX) {
        const ny = anchor === 'top'    ? snapTo
                 : anchor === 'bottom' ? snapTo - dragEl.alto
                 :                       snapTo - dragEl.alto / 2
        candidatesY.push({ correctedY: ny, dist, posPaper: snapTo, label })
      }
    }

    const pCX = paperWpx / 2
    const pCY = paperHpx / 2

    // Bordes y centro del papel
    tryX(0,        'left',   '0')
    tryX(paperWpx, 'right',  '')
    tryX(pCX,      'center', 'C')
    tryY(0,        'top',    '0')
    tryY(paperHpx, 'bottom', '')
    tryY(pCY,      'center', 'C')

    // Otros elementos
    editor.elementos.filter(e => e.id !== dragEl.id).forEach(o => {
      const oL  = o.x,               oR  = o.x + o.ancho,  oCX = o.x + o.ancho / 2
      const oT  = o.y,               oB  = o.y + o.alto,   oCY = o.y + o.alto  / 2
      // izquierda del otro ↔ izquierda/derecha/centro del arrastrado
      tryX(oL,  'left',   ''); tryX(oL,  'right',  ''); tryX(oL,  'center', '')
      tryX(oR,  'left',   ''); tryX(oR,  'right',  ''); tryX(oR,  'center', '')
      tryX(oCX, 'left',   ''); tryX(oCX, 'right',  ''); tryX(oCX, 'center', '')
      tryY(oT,  'top',    ''); tryY(oT,  'bottom', ''); tryY(oT,  'center', '')
      tryY(oB,  'top',    ''); tryY(oB,  'bottom', ''); tryY(oB,  'center', '')
      tryY(oCY, 'top',    ''); tryY(oCY, 'bottom', ''); tryY(oCY, 'center', '')
    })

    // Elegir el candidato más cercano por eje
    let sx = rawX, sy = rawY

    if (candidatesX.length > 0) {
      const best = candidatesX.reduce((a, b) => a.dist <= b.dist ? a : b)
      sx = best.correctedX
      // Añadir guías únicas para la posición corregida
      if (!guides.find(g => g.orientation === 'v' && g.posPaper === best.posPaper))
        guides.push({ orientation: 'v', posPaper: best.posPaper, label: best.label })
    }

    if (candidatesY.length > 0) {
      const best = candidatesY.reduce((a, b) => a.dist <= b.dist ? a : b)
      sy = best.correctedY
      if (!guides.find(g => g.orientation === 'h' && g.posPaper === best.posPaper))
        guides.push({ orientation: 'h', posPaper: best.posPaper, label: best.label })
    }

    return { x: sx, y: sy, guides }
  }, [editor.elementos, paperWpx, paperHpx])

  // ── Centrar en papel ──────────────────────────────────────────────────────
  const centrarH = useCallback(() => {
    if (!editor.objSel) return
    editor.actualizarElemento(editor.objSel.id, { x: paperWpx / 2 - editor.objSel.ancho / 2 })
    scheduleConsolidar()
  }, [editor.objSel, paperWpx, scheduleConsolidar])

  const centrarV = useCallback(() => {
    if (!editor.objSel) return
    editor.actualizarElemento(editor.objSel.id, { y: paperHpx / 2 - editor.objSel.alto / 2 })
    scheduleConsolidar()
  }, [editor.objSel, paperHpx, scheduleConsolidar])

  // ── Rotación del elemento seleccionado (Mejora 3) ─────────────────────────
  const rotarElemento = useCallback((delta: number) => {
    if (!editor.objSel) return
    const actual = (editor.objSel as any).rotation || 0
    editor.actualizarElemento(editor.objSel.id, { rotation: (actual + delta + 360) % 360 } as any)
    scheduleConsolidar()
  }, [editor.objSel, scheduleConsolidar])

  const setRotacion = useCallback((deg: number) => {
    if (!editor.objSel) return
    editor.actualizarElemento(editor.objSel.id, { rotation: ((deg % 360) + 360) % 360 } as any)
    scheduleConsolidar()
  }, [editor.objSel, scheduleConsolidar])

  // ── Listeners globales ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='z' && !e.shiftKey) {
        e.preventDefault(); e.stopPropagation()
        if (consolidateTimer.current) { clearTimeout(consolidateTimer.current); consolidateTimer.current = null }
        editor.deshacer(); return
      }
      if ((e.ctrlKey||e.metaKey) && ['g','s'].includes(e.key.toLowerCase())) {
        e.preventDefault(); handleGuardarDirecto(); return
      }
      if (editor.seleccionado && editor.objSel) {
        const paso = e.shiftKey ? 10 : 1
        let nx = editor.objSel.x, ny = editor.objSel.y, moved = false
        if (e.key==='ArrowLeft')  { nx-=paso; moved=true }
        if (e.key==='ArrowRight') { nx+=paso; moved=true }
        if (e.key==='ArrowUp')    { ny-=paso; moved=true }
        if (e.key==='ArrowDown')  { ny+=paso; moved=true }
        if (moved) { e.preventDefault(); editor.actualizarElemento(editor.seleccionado,{x:nx,y:ny}) }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) && editor.seleccionado) {
        const tag = (document.activeElement as HTMLElement)?.tagName
        if (!['INPUT','TEXTAREA'].includes(tag)) scheduleConsolidar()
      }
    }
    const onWheel   = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault() }
    const onClickOut = (e: MouseEvent) => {
      if (archivoMenuRef.current && !archivoMenuRef.current.contains(e.target as Node))
        setArchivoMenuAbierto(false)
    }
    const api = (window as any).api
    let unsub: (() => void) | undefined
    if (api?.onNuevosDatosEtiqueta) {
      unsub = api.onNuevosDatosEtiqueta((datos: any[]) => {
        setEtiquetasRecibidas(datos); setPanelDatosAbierto(true); setEtiquetaActiva(null)
      })
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup',   onKeyUp)
    window.addEventListener('wheel',   onWheel, { passive: false })
    window.addEventListener('mousedown', onClickOut)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup',   onKeyUp)
      window.removeEventListener('wheel',   onWheel)
      window.removeEventListener('mousedown', onClickOut)
      unsub?.()
    }
  }, [editor.seleccionado, editor.objSel, scheduleConsolidar])

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      el.scrollLeft = (4000 - el.clientWidth)  / 2
      el.scrollTop  = (4000 - el.clientHeight) / 2
      setScrollPos({ x: el.scrollLeft, y: el.scrollTop })
    }
  }, [editor.modo])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editor.herramienta === 'hand' || e.button === 1) {
      isDragging.current  = true
      dragStart.current   = { x: e.clientX, y: e.clientY }
      if (scrollRef.current)
        scrollStart.current = { x: scrollRef.current.scrollLeft, y: scrollRef.current.scrollTop }
    } else if (editor.herramienta === 'select') {
      if (!(e.target as HTMLElement).closest('.react-draggable'))
        editor.setSeleccionado(null)
    }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return
    scrollRef.current.scrollLeft = scrollStart.current.x - (e.clientX - dragStart.current.x)
    scrollRef.current.scrollTop  = scrollStart.current.y - (e.clientY - dragStart.current.y)
  }
  const handleMouseUp = () => { isDragging.current = false }

  const procesarVariables = (texto: string) => {
    if (!texto || typeof texto !== 'string') return texto
    if (!etiquetaActiva) return texto
    return texto.replace(/\{\{([^}]+)\}\}/g, (_m, llave) => {
      const k = llave.trim()
      return etiquetaActiva[k] !== undefined ? etiquetaActiva[k] : _m
    })
  }

  const handleGuardarDirecto = async () => { setArchivoMenuAbierto(false); await editor.guardarPlantilla() }
  const handleGuardarComo    = async () => { setArchivoMenuAbierto(false); await editor.guardarComo() }
  const handleLimpiar        = ()       => { setArchivoMenuAbierto(false); editor.limpiarLienzo() }

  // ── Render de contenido con rotación completa (Mejora 3) ─────────────────
  // La rotación se aplica sobre el contenedor interior del elemento para que
  // los handles de Rnd sigan siendo funcionales y el bounding box visible sea
  // correcto. Se usa un anillo de selección también rotado.
  const renderContenido = (el: ElementoTicket) => {
    const rotation = (el as any).rotation || 0

    switch (el.tipo) {
      case 'texto':
        return (
          <div
            style={{
              transform: rotation ? `rotate(${rotation}deg)` : undefined,
              transformOrigin: 'center center',
              fontSize: el.fontSize,
              fontWeight: el.negritas ? 'bold' : 'normal',
              textAlign: el.textAlign,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: el.textAlign==='center' ? 'center' : el.textAlign==='right' ? 'flex-end' : 'flex-start',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              // Mejora 1: texto negro con sombra blanca leve para máxima legibilidad sobre papel blanco
              color: '#111827',
              textShadow: 'none',
            }}
            className="select-none font-sans">
            {procesarVariables(el.contenido)}
          </div>
        )
      case 'codigoBarra':
        return (
          <div
            style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined, transformOrigin: 'center center' }}
            className="w-full h-full flex items-center justify-center bg-transparent overflow-hidden">
            <div className="pointer-events-none [&>svg]:w-full [&>svg]:h-full flex justify-center items-center w-[90%] h-[90%]">
              <Barcode
                value={procesarVariables(el.contenido)||'123456'}
                format={(el.barcodeFormat as any)||'CODE128'}
                width={2} height={100} displayValue
                background="transparent"
                lineColor="#111827"
                margin={0} renderer="svg"
              />
            </div>
          </div>
        )
      case 'qr':
        return (
          <div
            style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined, transformOrigin: 'center center' }}
            className="w-full h-full flex items-center justify-center bg-transparent p-1">
            <QRCodeSVG value={procesarVariables(el.contenido)||'QR'} width="100%" height="100%" fgColor="#111827" />
          </div>
        )
      case 'caja':
        return (
          <div
            style={{
              transform: rotation ? `rotate(${rotation}deg)` : undefined,
              transformOrigin: 'center center',
              width: '100%',
              height: '100%',
              border: `${el.grosorBorde}px solid #111827`,
              // Mejora 1: fondo semitransparente muy sutil para que la caja sea visible sobre papel blanco
              background: 'rgba(17,24,39,0.04)',
            }}
          />
        )
      case 'imagen': {
        const imgSrc = procesarVariables(el.contenido)
        const vacia  = !imgSrc || (imgSrc.startsWith('{{') && imgSrc.endsWith('}}'))
        if (vacia) {
          const sel = editor.objSel?.id === el.id
          return (
            <div
              style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined, transformOrigin: 'center center' }}
              className={`w-full h-full border-2 border-dashed flex flex-col items-center justify-center text-[9px] p-2 text-center pointer-events-none break-all overflow-hidden leading-tight ${sel?'bg-blue-50/80 border-blue-400 text-blue-500 font-medium':'bg-slate-100/60 border-slate-300 text-slate-400'}`}>
              <ImageIcon className={`mb-1 shrink-0 ${sel?'w-5 h-5 opacity-80':'w-4 h-4 opacity-50'}`} />
              {imgSrc ? `{{ ${imgSrc.replace(/[{}]/g,'')} }}` : 'Img'}
            </div>
          )
        }
        return (
          <img
            src={imgSrc} alt=""
            style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined, transformOrigin: 'center center' }}
            className="w-full h-full object-contain pointer-events-none"
          />
        )
      }
      default: return null
    }
  }

  // ── PANTALLA SELECCIÓN CATEGORÍA ──────────────────────────────────────────
  if (!editor.categoriaGuardar) {
    const opciones: { id: CategoriaPlantilla; label: string; desc: string; icon: any; color: string; accent: string }[] = [
      { id:'formulacion_pesaje', label:'Formulación / Pesaje',  desc:'Etiquetas y tickets para formulación y pesaje.',    icon:Scale,    color:'from-emerald-900/40 to-emerald-900/10 border-emerald-700/40 hover:border-emerald-500/60', accent:'text-emerald-400 bg-emerald-500/10' },
      { id:'camionero_entrada',  label:'Camionero — Entrada',   desc:'Tickets de entrada para el módulo de báscula.',     icon:LogIn,    color:'from-blue-900/40 to-blue-900/10 border-blue-700/40 hover:border-blue-500/60',           accent:'text-blue-400 bg-blue-500/10' },
      { id:'camionero_salida',   label:'Camionero — Salida',    desc:'Tickets de salida para el módulo de báscula.',      icon:TruckOut, color:'from-amber-900/40 to-amber-900/10 border-amber-700/40 hover:border-amber-500/60',       accent:'text-amber-400 bg-amber-500/10' },
    ]
    return (
      <div className="flex w-full h-full bg-[#0d1117] items-center justify-center p-8 overflow-auto">
        <div className="max-w-xl w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-1"><LayoutGrid className="w-8 h-8 text-blue-400" /></div>
            <h1 className="text-2xl font-bold text-white tracking-tight">¿Qué vas a diseñar?</h1>
            <p className="text-slate-500 text-sm">Selecciona el módulo para cargar las variables correctas.</p>
          </div>
          <div className="space-y-3">
            {opciones.map(op => {
              const Icon = op.icon
              return (
                <button key={op.id} onClick={() => editor.inicializarConCategoria(op.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r ${op.color} transition-all duration-200 text-left group hover:shadow-xl hover:-translate-y-0.5`}>
                  <div className={`p-2.5 rounded-xl ${op.accent} transition-transform group-hover:scale-110`}><Icon className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm">{op.label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{op.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const rotActual = (editor.objSel as any)?.rotation || 0

  return (
    <div className="flex w-full h-full bg-[#0d1117] overflow-hidden select-none relative font-sans">
      <input type="file" ref={editor.fileInputRef} onChange={editor.cargarImagenEnSeleccion} className="hidden" accept="image/*" />

      {/* ── MODAL GUARDAR COMO ─────────────────────────────────────────────── */}
      {editor.mostrarModalGuardarComo && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg"><Copy className="w-4 h-4" /></div>
              <div>
                <h2 className="text-sm font-semibold text-white">Guardar como nueva copia</h2>
                <p className="text-xs text-slate-500">Asigna un nuevo nombre a este diseño</p>
              </div>
              <button onClick={() => editor.setMostrarModalGuardarComo(false)} className="ml-auto text-slate-600 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5">
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Nombre de la copia</label>
              <input autoFocus type="text" placeholder="Ej. Etiqueta Premium Copia..."
                className="w-full bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
                value={editor.nombrePlantilla}
                onChange={e => editor.setNombrePlantilla(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handleGuardarComo()}
              />
            </div>
            <div className="px-5 py-4 bg-slate-900/40 border-t border-slate-800 flex gap-2 justify-end">
              <button onClick={() => editor.setMostrarModalGuardarComo(false)} className="text-slate-400 hover:text-slate-200 text-sm px-4 py-2">Cancelar</button>
              <button onClick={handleGuardarComo} disabled={editor.guardando}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50">
                <Save className="w-3.5 h-3.5" /> Crear copia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOOLBAR IZQUIERDA ─────────────────────────────────────────────── */}
      <div className="w-[72px] bg-[#161b22] border-r border-slate-800/80 flex flex-col items-center py-3 gap-1 z-30 flex-shrink-0 shadow-2xl">
        <div className="w-full px-2 space-y-0.5">
          <ToolBtn icon={<MousePointer2 className="w-4 h-4" />} label="Select"    active={editor.herramienta==='select'} onClick={() => { editor.setHerramienta('select'); editor.setSeleccionado(null) }} />
          <ToolBtn icon={<Hand className="w-4 h-4" />}          label="Arrastrar" active={editor.herramienta==='hand'}   onClick={() => { editor.setHerramienta('hand');   editor.setSeleccionado(null) }} />
        </div>
        <div className="w-8 h-px bg-slate-800 my-1" />
        <div className="w-full px-2 space-y-0.5">
          <ToolBtn icon={<Type className="w-4 h-4" />}        label="Texto"  onClick={() => editor.agregarElemento('texto')} />
          <ToolBtn icon={<ScanBarcode className="w-4 h-4" />} label="Barras" onClick={() => editor.agregarElemento('codigoBarra')} />
          <ToolBtn icon={<QrCode className="w-4 h-4" />}      label="QR"     onClick={() => editor.agregarElemento('qr')} />
          <ToolBtn icon={<Square className="w-4 h-4" />}      label="Caja"   onClick={() => editor.agregarElemento('caja')} />
          <ToolBtn icon={<ImageIcon className="w-4 h-4" />}   label="Imagen" onClick={() => editor.agregarElemento('imagen')} />
        </div>
        <div className="flex-1" />
        <div className="w-full px-2 space-y-0.5">
          <ToolBtn icon={<Undo className="w-4 h-4" />} label="Deshacer" onClick={editor.deshacer} />
        </div>
      </div>

      {/* ── ÁREA CENTRAL ──────────────────────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col min-w-0">

        {/* Barra superior */}
        <div className="h-14 bg-[#161b22] border-b border-slate-800 flex items-center px-4 gap-3 z-30 flex-shrink-0 shadow-sm relative">

          <div className="flex items-center gap-1.5 relative" ref={archivoMenuRef}>
            <button onClick={() => setArchivoMenuAbierto(!archivoMenuAbierto)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${archivoMenuAbierto?'bg-slate-700 text-white border-slate-600':'bg-slate-800/80 text-slate-300 border-slate-700/50 hover:bg-slate-700 hover:text-white'}`}>
              <FileInput className="w-3.5 h-3.5" /> Archivo
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${archivoMenuAbierto?'rotate-180':''}`} />
            </button>
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700/50"><FileText className="w-4 h-4 text-slate-500" /></div>
            <div className="mr-1">
              <h3 className="text-xs font-bold text-slate-200 truncate max-w-[180px]">{editor.archivoOrigen || 'Diseño sin guardar'}</h3>
              <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">{editor.modo}</p>
            </div>
            {archivoMenuAbierto && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-[#1a212c] border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                <button onClick={handleGuardarDirecto} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 hover:bg-emerald-600 hover:text-white group">
                  <Save className="w-4 h-4 text-emerald-400 group-hover:text-white" /> Guardar
                </button>
                <button onClick={() => editor.setMostrarModalGuardarComo(true)} disabled={!editor.archivoOrigen}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-200 hover:bg-blue-600 hover:text-white group disabled:opacity-40">
                  <Copy className="w-4 h-4 text-blue-400 group-hover:text-white" /> Guardar copia como…
                </button>
                <div className="h-px bg-slate-700 my-1" />
                <button onClick={handleLimpiar} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-600 hover:text-white group">
                  <Trash2 className="w-4 h-4 group-hover:text-white" /> Limpiar diseño
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-slate-800" />

          <div className="flex bg-[#0d1117] p-1 rounded-lg border border-slate-800/80">
            <ModeBtn active={editor.modo==='etiqueta'} onClick={() => editor.cambiarModo('etiqueta')} icon={<Tag className="w-3.5 h-3.5" />}     label="Etiqueta" />
            <ModeBtn active={editor.modo==='ticket'}   onClick={() => editor.cambiarModo('ticket')}   icon={<Receipt className="w-3.5 h-3.5" />} label="Ticket" />
          </div>

          <div className="w-px h-6 bg-slate-800" />

          {/* Dimensiones + orientación */}
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#0d1117] border border-slate-800/80 px-2 py-1.5 rounded-lg">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-bold">W</span>
              <input type="number" value={editor.configPapel.anchoMm}
                onChange={e => editor.setConfigPapel({...editor.configPapel, anchoMm:+e.target.value})}
                className="w-12 bg-transparent text-center text-slate-200 focus:outline-none focus:text-blue-400 transition-colors font-mono" />
              <span className="text-slate-600">mm</span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-bold">H</span>
              <input type="number" value={editor.configPapel.altoMm}
                onChange={e => editor.setConfigPapel({...editor.configPapel, altoMm:+e.target.value})}
                className="w-12 bg-transparent text-center text-slate-200 focus:outline-none focus:text-blue-400 transition-colors font-mono" />
              <span className="text-slate-600">mm</span>
            </div>
            {/* Botón orientación — Mejora 4: icono dinámico + tooltip claro */}
            <button
              onClick={girarOrientacion}
              title={esHorizontal ? 'Cambiar a vertical (Portrait)' : 'Cambiar a horizontal (Landscape)'}
              className={`ml-1 p-1 rounded-md border transition-all duration-200 ${
                esHorizontal
                  ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-400 shadow-sm shadow-indigo-900/20'
                  : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'
              }`}>
              {esHorizontal
                ? <Monitor className="w-3.5 h-3.5" />
                : <Smartphone className="w-3.5 h-3.5" />
              }
            </button>
          </div>

          <div className="w-px h-6 bg-slate-800" />

          <div className="flex items-center gap-1.5 bg-[#0d1117] border border-slate-800/80 p-1 rounded-lg">
            <button onClick={() => editor.setZoom(z => Math.max(0.2, z - 0.1))} className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"><ZoomOut className="w-3.5 h-3.5" /></button>
            <span className="text-[11px] text-slate-300 font-mono w-10 text-center">{Math.round(editor.zoom * 100)}%</span>
            <button onClick={() => editor.setZoom(z => Math.min(3, z + 0.1))} className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"><ZoomIn className="w-3.5 h-3.5" /></button>
          </div>

          <div className="flex-1" />

          <button onClick={() => setPanelDatosAbierto(!panelDatosAbierto)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${panelDatosAbierto?'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/30':'bg-slate-800 text-slate-300 border-slate-700/50 hover:bg-slate-700 hover:text-white'}`}>
            <Database className="w-3.5 h-3.5" /> Variables Externas
            <span className={`bg-blue-300 text-blue-900 text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1 transition-opacity ${etiquetasRecibidas.length>0?'opacity-100':'opacity-30'}`}>
              {etiquetasRecibidas.length}
            </span>
          </button>
        </div>

        {/* ── ZONA REGLAS + CANVAS ──────────────────────────────────────────── */}
        <div className="flex-1 relative overflow-hidden bg-[#090c10]">
          <div className="absolute top-0 left-0 w-6 h-6 bg-[#161b22] border-r border-b border-slate-800 z-20" />

          <div className="absolute left-0 top-6 bottom-0 w-6 z-10 overflow-hidden">
            <Ruler orientation="v" sizeMm={editor.configPapel.altoMm} paperOriginPx={paperOriginY} paperSizePx={paperHpx} zoom={editor.zoom} scrollOffset={scrollPos.y} />
          </div>
          <div className="absolute top-0 left-6 right-0 h-6 z-10 overflow-hidden">
            <Ruler orientation="h" sizeMm={editor.configPapel.anchoMm} paperOriginPx={paperOriginX} paperSizePx={paperWpx} zoom={editor.zoom} scrollOffset={scrollPos.x} />
          </div>

          <div ref={scrollRef}
            onScroll={e => { const el = e.currentTarget; setScrollPos({ x: el.scrollLeft, y: el.scrollTop }) }}
            className={`absolute inset-0 top-6 left-6 overflow-auto ${editor.herramienta==='hand'?'cursor-grab active:cursor-grabbing':'cursor-default'}`}
            style={{ backgroundImage:'radial-gradient(circle, #1e2530 1px, transparent 1px)', backgroundSize:'24px 24px' }}
            onWheel={e => { if (e.ctrlKey) editor.setZoom(z => Math.max(0.2, z+e.deltaY*-0.001)) }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="min-w-[4000px] min-h-[4000px] flex items-center justify-center">

              {/* ── PAPEL ──────────────────────────────────────────────────────
                Mejora 1 + 4: el papel siempre es blanco con sombra visible.
                La orientación horizontal funciona simplemente por el intercambio
                de anchoMm/altoMm. El CSS de impresión (@media print) aplica
                @page { size: landscape } cuando esHorizontal.
              ─────────────────────────────────────────────────────────────── */}
              <style>{`
                @media print {
                  @page {
                    size: ${esHorizontal
                      ? `${editor.configPapel.anchoMm}mm ${editor.configPapel.altoMm}mm landscape`
                      : `${editor.configPapel.anchoMm}mm ${editor.configPapel.altoMm}mm portrait`
                    };
                    margin: 0;
                  }
                  body * { visibility: hidden; }
                  #print-area, #print-area * { visibility: visible; }
                  #print-area {
                    position: fixed !important;
                    top: 0; left: 0;
                    width: ${editor.configPapel.anchoMm}mm !important;
                    height: ${editor.configPapel.altoMm}mm !important;
                    transform: none !important;
                    box-shadow: none !important;
                  }
                }
              `}</style>

              <div
                id="print-area"
                className={`bg-white relative flex-shrink-0 ${editor.modo==='ticket'?'border-b-4 border-dashed border-slate-300/80':''}`}
                style={{
                  width:  `${editor.configPapel.anchoMm}mm`,
                  height: `${editor.configPapel.altoMm}mm`,
                  transform: `scale(${editor.zoom})`,
                  // Mejora 1: halo blanco + sombra fuerte para ver el papel sobre fondo oscuro
                  boxShadow: [
                    '0 0 0 1px rgba(255,255,255,0.22)',
                    '0 0 0 3px rgba(255,255,255,0.06)',
                    '0 24px 80px rgba(0,0,0,0.9)',
                    '0 0 40px rgba(99,102,241,0.14)',
                  ].join(', ')
                }}
                onMouseDown={e => { if (editor.herramienta !== 'hand') e.stopPropagation() }}
              >
                {/* Grid interno sutil */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
                  style={{ backgroundImage:'radial-gradient(#000 1px,transparent 1px)', backgroundSize:'5mm 5mm' }} />

                {/* Mejora 2: guías de snap con línea más visible */}
                <SnapGuides guides={snapGuides} />

                {editor.elementos.map(el => (
                  <Rnd
                    key={`${editor.modo}_${el.id}`}
                    size={{ width: el.ancho, height: el.alto }}
                    position={{ x: el.x, y: el.y }}
                    scale={editor.zoom}
                    // Mejora 2: en onDrag actualizamos posición real con snap para que el
                    // elemento "se deslice" sobre la guía sin soltar el botón.
                    onDrag={(_e, d) => {
                      const { x, y, guides } = calcSnap(el, d.x, d.y)
                      setSnapGuides(guides)
                      // Actualizar posición en tiempo real (sin consolidar) para ver el snap
                      editor.actualizarElemento(el.id, { x, y })
                    }}
                    onDragStop={(_e, d) => {
                      const { x, y } = calcSnap(el, d.x, d.y)
                      editor.actualizarElemento(el.id, { x, y })
                      setSnapGuides([])
                      setTimeout(() => editor.consolidarHistorial(), 0)
                    }}
                    onResizeStop={(_e, _dir, ref, _delta, pos) => {
                      editor.actualizarElemento(el.id, {
                        ancho: parseInt(ref.style.width),
                        alto:  parseInt(ref.style.height),
                        ...pos
                      })
                      setTimeout(() => editor.consolidarHistorial(), 0)
                    }}
                    disableDragging={editor.herramienta==='hand'}
                    onClick={e => { e.stopPropagation(); if (editor.herramienta==='select') editor.setSeleccionado(el.id) }}
                    className={`group ${editor.seleccionado===el.id?'z-20':'z-10'}`}
                    style={{
                      // Mejora 1: sombra clara visible sobre papel blanco cuando hay rotación
                      filter: editor.seleccionado===el.id
                        ? 'drop-shadow(0 0 3px rgba(59,130,246,0.55)) drop-shadow(0 2px 6px rgba(0,0,0,0.22))'
                        : 'drop-shadow(0 1px 3px rgba(0,0,0,0.14))'
                    }}
                  >
                    {/* Mejora 1: ring de selección visible sobre papel blanco */}
                    <div className={`w-full h-full relative ${
                      editor.seleccionado===el.id
                        ? 'ring-2 ring-blue-500 ring-offset-0'
                        : editor.herramienta==='select' ? 'hover:ring-1 hover:ring-blue-400/50 hover:ring-offset-0' : ''
                    }`}>
                      {editor.seleccionado===el.id && (
                        <>
                          <div className="absolute -top-1.5 -left-1.5  w-3 h-3 bg-blue-500 border-2 border-white pointer-events-none rounded-full shadow" />
                          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white pointer-events-none rounded-full shadow" />
                          <div className="absolute -bottom-1.5 -left-1.5  w-3 h-3 bg-blue-500 border-2 border-white pointer-events-none rounded-full shadow" />
                          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white pointer-events-none rounded-full shadow" />
                          {/* Indicador de rotación activa */}
                          {((el as any).rotation || 0) !== 0 && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow pointer-events-none whitespace-nowrap">
                              <RotateCw className="w-2.5 h-2.5" />
                              {(el as any).rotation}°
                            </div>
                          )}
                        </>
                      )}
                      {renderContenido(el)}
                    </div>
                  </Rnd>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PANEL PROPIEDADES ─────────────────────────────────────────────── */}
      {editor.objSel && editor.herramienta === 'select' && (
        <div className="w-72 bg-[#161b22] border-l border-slate-800/80 flex-shrink-0 flex flex-col z-30 shadow-2xl">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-slate-800 rounded shadow-sm border border-slate-700/50"><Settings2 className="w-4 h-4 text-slate-400" /></div>
              <div>
                <span className="block text-xs font-bold text-slate-200">Propiedades</span>
                <span className="block text-[9px] text-blue-400 uppercase font-mono tracking-widest mt-0.5">Obj: {editor.objSel.tipo}</span>
              </div>
            </div>
            <button onClick={() => editor.setSeleccionado(null)} className="text-slate-500 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded"><X className="w-4 h-4" /></button>
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* ── Posición y tamaño ── */}
            <PropSection title="Posición y tamaño" icon={<Move className="w-3 h-3" />}>
              <div className="grid grid-cols-2 gap-3">
                {[{ label:'X', key:'x' },{ label:'Y', key:'y' },{ label:'W', key:'ancho' },{ label:'H', key:'alto' }].map(({ label, key }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      {label} <span className="text-slate-700 font-mono font-normal">px</span>
                    </label>
                    <MiniInput type="number" value={Math.round((editor.objSel as any)[key])} onChange={v => { editor.actualizarElemento(editor.objSel!.id, { [key]:v }); scheduleConsolidar() }} />
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={centrarH} className="flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-slate-700 bg-[#0d1117] text-[10px] font-semibold text-slate-400 hover:border-blue-500/50 hover:text-blue-400 transition-all">
                  <AlignCenter className="w-3 h-3" /> Centro H
                </button>
                <button onClick={centrarV} className="flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-slate-700 bg-[#0d1117] text-[10px] font-semibold text-slate-400 hover:border-blue-500/50 hover:text-blue-400 transition-all">
                  <AlignCenter className="w-3 h-3 rotate-90" /> Centro V
                </button>
              </div>
            </PropSection>

            {/* ── Rotación (Mejora 3) ── */}
            <PropSection title="Rotación" icon={<RotateCw className="w-3 h-3" />}>
              <PropRow label="Ángulo">
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={0} max={359} value={rotActual}
                    onChange={e => setRotacion(+e.target.value)}
                    className="flex-1 accent-blue-500"
                  />
                  <MiniInput
                    type="number" className="w-16 text-center"
                    value={rotActual}
                    onChange={v => setRotacion(+v)}
                  />
                  <span className="text-slate-600 text-xs">°</span>
                </div>
              </PropRow>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 90, 180, 270].map(deg => (
                  <button key={deg} onClick={() => setRotacion(deg)}
                    className={`py-1.5 rounded-md border text-[10px] font-semibold transition-all ${rotActual===deg?'border-blue-500 bg-blue-500/10 text-blue-400':'border-slate-700 bg-[#0d1117] text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}>
                    {deg}°
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {[
                  { label: '−5°', delta: -5, Icon: RotateCcw },
                  { label: '−1°', delta: -1, Icon: RotateCcw },
                  { label: '+1°', delta:  1, Icon: RotateCw  },
                  { label: '+5°', delta:  5, Icon: RotateCw  },
                ].map(({ label, delta, Icon }) => (
                  <button key={label} onClick={() => rotarElemento(delta)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border border-slate-700 bg-[#0d1117] text-[10px] font-semibold text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-all">
                    <Icon className="w-3 h-3" /> {label}
                  </button>
                ))}
              </div>
            </PropSection>

            {/* ── Contenido ── */}
            {editor.objSel.tipo !== 'caja' && (
              <PropSection title="Contenido de datos" icon={<FileText className="w-3 h-3" />}>
                {editor.objSel.tipo === 'imagen' ? (
                  <div className="space-y-3">
                    <button onClick={() => editor.fileInputRef?.current?.click()} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-slate-600 bg-[#0d1117] text-xs font-semibold text-slate-300 hover:border-blue-500 hover:text-blue-400 transition-all">
                      <Upload className="w-4 h-4" /> Subir archivo local
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      {['{{logo}}','{{img1}}','{{img2}}'].map(v => (
                        <button key={v} onClick={() => { editor.actualizarElemento(editor.objSel!.id, { contenido:v }); setTimeout(() => editor.consolidarHistorial(),0) }}
                          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition-all ${editor.objSel!.contenido===v?'border-blue-500 bg-blue-500/10 text-blue-400':'border-slate-700 bg-[#0d1117] text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>
                          <ImageIcon className="w-3.5 h-3.5" /> {v.replace(/[{}]/g,'')}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea rows={3} value={editor.objSel.contenido}
                      onChange={e => { editor.actualizarElemento(editor.objSel!.id,{contenido:e.target.value}); scheduleConsolidar() }}
                      className="w-full bg-[#0d1117] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none placeholder:text-slate-600"
                      placeholder="Escribe texto o usa {{variables}}"
                    />
                    {etiquetaActiva && (
                      <div className="bg-[#0d1117] border border-slate-800 rounded-lg p-3 space-y-2">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Database className="w-3 h-3 text-emerald-500" /> Insertar variables
                        </p>
                        <div className="flex flex-wrap gap-1.5 font-mono">
                          {Object.entries(etiquetaActiva).map(([llave, valor]) => {
                            if (typeof valor==='string' && valor.startsWith('data:image')) return null
                            return (
                              <button key={llave}
                                onClick={() => { const actual=editor.objSel!.contenido||''; const sp=actual.length>0&&!actual.endsWith(' ')?' ':''; editor.actualizarElemento(editor.objSel!.id,{contenido:actual+sp+`{{${llave}}}`}); setTimeout(()=>editor.consolidarHistorial(),0) }}
                                title={`Valor actual: ${valor}`}
                                className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded-md hover:bg-blue-600 hover:border-blue-500 hover:text-white transition-all">
                                {llave}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </PropSection>
            )}

            {/* ── Tipografía ── */}
            {editor.objSel.tipo === 'texto' && (
              <PropSection title="Tipografía" icon={<Type className="w-3 h-3" />}>
                <PropRow label="Tamaño">
                  <div className="flex items-center gap-2">
                    <input type="range" min={8} max={100} value={editor.objSel.fontSize}
                      onChange={e => { editor.actualizarElemento(editor.objSel!.id,{fontSize:+e.target.value}); scheduleConsolidar() }}
                      className="flex-1 accent-blue-500" />
                    <MiniInput type="number" className="w-16 text-center" value={editor.objSel.fontSize}
                      onChange={v => { editor.actualizarElemento(editor.objSel!.id,{fontSize:v}); scheduleConsolidar() }} />
                  </div>
                </PropRow>
                <PropRow label="Estilo">
                  <button onClick={() => { editor.actualizarElemento(editor.objSel!.id,{negritas:!editor.objSel!.negritas}); setTimeout(()=>editor.consolidarHistorial(),0) }}
                    className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-bold transition-all ${editor.objSel.negritas?'border-blue-500 bg-blue-500/10 text-blue-400':'border-slate-700 bg-[#0d1117] text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}>
                    <Bold className="w-3.5 h-3.5" /> Negrita
                  </button>
                </PropRow>
                <PropRow label="Alinear">
                  <div className="flex gap-1 w-full bg-[#0d1117] p-1 rounded-md border border-slate-700/80">
                    {([['left',AlignLeft],['center',AlignCenter],['right',AlignRight]] as const).map(([align, Icon]) => (
                      <button key={align} onClick={() => { editor.actualizarElemento(editor.objSel!.id,{textAlign:align}); setTimeout(()=>editor.consolidarHistorial(),0) }}
                        className={`flex-1 py-1.5 rounded-sm flex items-center justify-center transition-colors ${editor.objSel!.textAlign===align?'bg-slate-700 text-white shadow-sm':'text-slate-500 hover:text-slate-300'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </PropRow>
              </PropSection>
            )}

            {/* ── Código de barras ── */}
            {editor.objSel.tipo === 'codigoBarra' && (
              <PropSection title="Código de barras" icon={<ScanBarcode className="w-3 h-3" />}>
                <PropRow label="Formato">
                  <select className="w-full bg-[#0d1117] border border-slate-700/80 rounded-md px-2.5 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                    value={editor.objSel.barcodeFormat}
                    onChange={e => { editor.actualizarElemento(editor.objSel!.id,{barcodeFormat:e.target.value as any}); setTimeout(()=>editor.consolidarHistorial(),0) }}>
                    <option value="CODE128">Code 128 (Recomendado)</option>
                    <option value="EAN13">EAN-13</option>
                    <option value="UPC">UPC</option>
                    <option value="CODE39">Code 39</option>
                  </select>
                </PropRow>
              </PropSection>
            )}

            {/* ── Caja ── */}
            {editor.objSel.tipo === 'caja' && (
              <PropSection title="Borde de la caja" icon={<Square className="w-3 h-3" />}>
                <PropRow label="Grosor">
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={10} value={editor.objSel.grosorBorde}
                      onChange={e => { editor.actualizarElemento(editor.objSel!.id,{grosorBorde:+e.target.value}); scheduleConsolidar() }}
                      className="flex-1 accent-blue-500" />
                    <div className="text-xs bg-[#0d1117] border border-slate-700 px-2 py-1 rounded text-slate-300 font-mono">{editor.objSel.grosorBorde}px</div>
                  </div>
                </PropRow>
              </PropSection>
            )}

            {/* ── Capas ── */}
            <PropSection title="Orden de capas" icon={<Layers className="w-3 h-3" />} defaultOpen={false}>
              <div className="flex gap-2">
                <button onClick={() => { editor.actualizarElemento(editor.objSel!.id,{zIndex:Math.max(0,((editor.objSel as any).zIndex||0)-1)}); setTimeout(()=>editor.consolidarHistorial(),0) }}
                  className="flex-1 py-2 rounded-md border border-slate-700 bg-[#0d1117] text-xs font-semibold text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-all">↓ Enviar atrás</button>
                <button onClick={() => { editor.actualizarElemento(editor.objSel!.id,{zIndex:((editor.objSel as any).zIndex||0)+1}); setTimeout(()=>editor.consolidarHistorial(),0) }}
                  className="flex-1 py-2 rounded-md border border-slate-700 bg-[#0d1117] text-xs font-semibold text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-all">↑ Traer al frente</button>
              </div>
            </PropSection>
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/40">
            <button onClick={editor.borrarSeleccionado}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold hover:bg-red-500/10 hover:border-red-500/30 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar elemento
            </button>
          </div>
        </div>
      )}

      {/* ── PANEL DATOS EXTERNOS ──────────────────────────────────────────── */}
      {panelDatosAbierto && (
        <div className="absolute top-14 right-72 bottom-0 w-80 bg-[#161b22] border-l border-slate-800 z-40 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-sm font-semibold text-white">Variables disponibles</span>
                <p className="text-xs text-slate-500">{etiquetasRecibidas.length} registros cargados</p>
              </div>
            </div>
            <button onClick={() => setPanelDatosAbierto(false)} className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {etiquetasRecibidas.length === 0 ? (
              <div className="text-center text-slate-600 text-xs p-8 mt-10 space-y-3 bg-[#0d1117] rounded-xl border border-slate-800">
                <Database className="w-10 h-10 mx-auto opacity-20" />
                <p>Esperando datos externos…</p>
                <p className="text-slate-700">Usa Postman o SIAUMEX para enviar un JSON.</p>
              </div>
            ) : (
              etiquetasRecibidas.map((item, idx) => {
                const esActiva = etiquetaActiva === item
                const idMostrar = item.folio || item.id || `Ref-${idx+1}`
                return (
                  <button key={idx} onClick={() => setEtiquetaActiva(item)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${esActiva?'bg-blue-600/10 border-blue-500/50 ring-1 ring-blue-500/30 shadow-lg shadow-blue-900/10':'bg-[#0d1117] border-slate-700/60 hover:border-slate-500 hover:bg-slate-800'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-500 font-mono tracking-wider">#{idMostrar}</span>
                      {esActiva && <span className="flex items-center gap-1 text-[10px] text-blue-400 font-bold"><CheckCircle2 className="w-3 h-3" /> Usando en vista previa</span>}
                    </div>
                    <div className="space-y-1">
                      {Object.entries(item).slice(0,4).map(([llave,valor]) => {
                        if (typeof valor==='string'&&valor.startsWith('data:image')) return null
                        return <p key={llave} className="text-xs text-slate-300 truncate"><span className="text-slate-500 font-mono">{llave}:</span> {valor as string}</p>
                      })}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}