import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Ticket, Settings, Home, Activity, Wifi } from 'lucide-react'

// ─── GENERADOR HTML FANTASMA (intacto) ───────────────────────────────────────
const generarHTMLFantasma = (plantilla: any, datos: any) => {
  const procesar = (txt: string) =>
    txt ? txt.replace(/\{\{([^}]+)\}\}/g, (m, key) => datos[key.trim()] !== undefined ? datos[key.trim()] : m) : ''

  const elementosHTML = plantilla.elementos.map((el: any) => {
    const style = `position: absolute; top: ${el.y}px; left: ${el.x}px; width: ${el.ancho}px; height: ${el.alto}px; overflow: hidden;`
    if (el.tipo === 'texto') {
      const align = el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start'
      return `<div style="${style} display: flex; align-items: center; justify-content: ${align}; font-size: ${el.fontSize}px; font-weight: ${el.negritas ? 'bold' : 'normal'}; white-space: nowrap;">${procesar(el.contenido)}</div>`
    }
    if (el.tipo === 'caja')
      return `<div style="${style} border: ${el.grosorBorde}px solid black;"></div>`
    if (el.tipo === 'imagen') {
      const src = procesar(el.contenido)
      if (!src || src.startsWith('{{')) return ''
      return `<img src="${src}" style="${style} object-fit: contain;" />`
    }
    if (el.tipo === 'codigoBarra') {
      const val = procesar(el.contenido) || '123456'
      return `<div style="${style} display: flex; align-items: center; justify-content: center;"><svg class="barcode" jsbarcode-value="${val}" jsbarcode-format="${el.barcodeFormat || 'CODE128'}" jsbarcode-displayvalue="true" jsbarcode-width="2" jsbarcode-height="100" jsbarcode-margin="0" style="width:100%; height:100%;"></svg></div>`
    }
    if (el.tipo === 'qr') {
      const val = procesar(el.contenido) || 'QR'
      return `<div style="${style}"><canvas class="qrcode" data-value="${val}" style="width:100%; height:100%;"></canvas></div>`
    }
    return ''
  }).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
    <style>
      @page { margin: 0; size: ${plantilla.configPapel.anchoMm}mm ${plantilla.configPapel.altoMm}mm; }
      body { margin: 0; padding: 0; width: ${plantilla.configPapel.anchoMm}mm; height: ${plantilla.configPapel.altoMm}mm; position: relative; background: white; font-family: sans-serif; overflow: hidden; }
    </style></head>
    <body onload="initScripts()">${elementosHTML}
    <script>
      function initScripts() {
        if (typeof JsBarcode !== 'undefined') JsBarcode(".barcode").init();
        if (typeof QRCode !== 'undefined') {
          document.querySelectorAll('.qrcode').forEach(c => QRCode.toCanvas(c, c.getAttribute('data-value'), { margin: 0, width: c.clientWidth, height: c.clientHeight }));
        }
      }
    </script></body></html>`
}

// ─── NOMBRE OCULTO POR CATEGORÍA ─────────────────────────────────────────────
export const NOMBRE_OCULTO: Record<string, string> = {
  formulacion_pesaje: 'ticket_pesaje',
  camionero_entrada:  'ticket_entrada',
  camionero_salida:   'ticket_salida',
}

// ─── LAYOUT ───────────────────────────────────────────────────────────────────
export function Layout() {
  const location = useLocation()
  const api = (window as any).api
  const [ultimaImpresion, setUltimaImpresion] = useState<string | null>(null)
  const [servidorActivo] = useState(true)

  // 👻 ESCUCHADOR FANTASMA — impresión automática silenciosa
  useEffect(() => {
    if (!api?.onNuevosDatosEtiqueta) return

    const desuscribir = api.onNuevosDatosEtiqueta(async (datosArray: any[]) => {
      for (const item of datosArray) {
        if (item.imprimir_automatica && item.categoria) {
          try {
            const infoCat = await api.listarPlantillas(item.categoria)
            if (!infoCat.activa) {
              console.error(`Sin plantilla activa en ${item.categoria}`)
              continue
            }
            const resPlan = await api.leerPlantilla(item.categoria, infoCat.activa)
            if (resPlan.error) continue

            const htmlFinal = generarHTMLFantasma(resPlan.contenido, item)
            await api.imprimirEtiqueta({ html: htmlFinal })

            setUltimaImpresion(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
            console.log(`🖨️ Impresión silenciosa: ${item.categoria}`)
          } catch (err) {
            console.error('Error en impresión automática:', err)
          }
        }
      }
    })

    return () => desuscribir?.()
  }, [api])

  const tabs = [
    { to: '/',       label: 'Inicio',      icon: Home },
    { to: '/editor', label: 'Editor',      icon: Ticket },
    { to: '/config', label: 'Configuración', icon: Settings },
  ]

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] overflow-hidden">

      {/* ── NAVBAR SUPERIOR ─────────────────────────────────────────────────── */}
      <header className="h-11 bg-[#161b22] border-b border-slate-800/80 flex items-center px-4 gap-0 flex-shrink-0 z-40">

        {/* Logo */}
        <div className="flex items-center gap-2 pr-6 border-r border-slate-800">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
            <Ticket className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-200 tracking-tight">Siaumex</span>
        </div>

        {/* Tabs de navegación */}
        <nav className="flex items-center h-full ml-1">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-2 px-4 h-full text-xs font-medium transition-colors ${
                  active
                    ? 'text-slate-100'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {/* Indicador activo — línea inferior */}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-blue-500 rounded-t-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Status del servidor + última impresión */}
        <div className="flex items-center gap-4 text-[11px]">
          {ultimaImpresion && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <Activity className="w-3 h-3" />
              <span>Última impresión: <span className="text-slate-400 font-mono">{ultimaImpresion}</span></span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-slate-600 border-l border-slate-800 pl-4">
            <div className={`w-1.5 h-1.5 rounded-full ${servidorActivo ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <Wifi className="w-3 h-3" />
            <span className={servidorActivo ? 'text-slate-500' : 'text-red-500'}>
              :8080
            </span>
          </div>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL ──────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        <Outlet />
      </main>
    </div>
  )
}