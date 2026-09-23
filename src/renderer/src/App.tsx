import { useEffect, JSX } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { EditorPage } from './pages/EditorPage'
import { HomePage } from './pages/HomePage'
import { getEsquemaBase } from '../../shared/schemas'
import { useState } from 'react' 
import { Printer } from 'lucide-react'

function PaginaConfig() {
  const api = (window as any).api
  const [abriendo, setAbriendo] = useState(false)
  const [mensaje, setMensaje]   = useState<string | null>(null)

  const abrirPreferencias = async () => {
    setAbriendo(true)
    setMensaje(null)
    try {
      const res = await api.abrirPreferenciasImpresora()
      if (!res.success) {
        setMensaje('No se pudo abrir las preferencias: ' + res.error)
      }
    } catch (e: any) {
      setMensaje('Error: ' + e.message)
    } finally {
      setAbriendo(false)
    }
  }

  return (
    <div className="flex w-full h-full bg-[#0d1117] overflow-auto p-8">
      <div className="max-w-xl w-full space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-lg font-bold text-slate-100 tracking-tight">Configuración</h1>
          <p className="text-xs text-slate-500 mt-0.5">Ajustes del sistema de impresión.</p>
        </div>

        {/* Card impresora */}
        <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Printer className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Impresora</p>
              <p className="text-xs text-slate-500">Configuración de impresión del sistema</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Abre el panel de preferencias de impresión de Windows para configurar
              la impresora predeterminada: tamaño de papel, calidad, copias y más.
            </p>
            <button
              onClick={abrirPreferencias}
              disabled={abriendo}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30"
            >
              {abriendo
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Abriendo…</>
                : <><Printer className="w-3.5 h-3.5" /> Abrir preferencias de impresora</>
              }
            </button>
            {mensaje && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {mensaje}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


function MotorFantasma() {
  useEffect(() => {
    const api = (window as any).api
    const ipcRenderer = (window as any).electron?.ipcRenderer || (window as any).ipcRenderer

    if (!api?.onNuevosDatosEtiqueta) return

    const unsubscribe = api.onNuevosDatosEtiqueta(async (lote: any[]) => {
      console.log("👻 ¡Motor Fantasma escuchó a Postman!", lote)
      
      for (const etiquetaDatos of lote) {
        let esquemaFinal = null
        let categoriaDestino = 'formulacion_pesaje' // Valor por defecto

        // 1. Deducir el módulo usando tu nuevo dato "tipo_operacion"
        const op = (etiquetaDatos.tipo_operacion || '').toLowerCase()

        if (op === 'entrada') {
          categoriaDestino = 'camionero_entrada'
        } else if (op === 'salida') {
          categoriaDestino = 'camionero_salida'
        } else if (op === 'formulacion') {
          categoriaDestino = 'formulacion_pesaje'
        } else {
          // Si por alguna razón se les olvida mandar el tipo_operacion, intentamos adivinar por el nombre
          const p = (etiquetaDatos.plantilla || '').toLowerCase()
          if (p.includes('entrada')) categoriaDestino = 'camionero_entrada'
          else if (p.includes('salida')) categoriaDestino = 'camionero_salida'
        }

        // 2. Preguntarle a Electron cuál es la plantilla que marcaste como ACTIVA (con la estrellita)
        if (ipcRenderer) {
          try {
            const infoCategoria = await ipcRenderer.invoke('plantillas:listar', categoriaDestino)
            
            if (infoCategoria && infoCategoria.activa) {
              // Si hay una activa, la leemos de su carpeta correcta
              const respuesta = await ipcRenderer.invoke('plantillas:leer', categoriaDestino, infoCategoria.activa)
              if (respuesta && respuesta.success && respuesta.contenido) {
                esquemaFinal = respuesta.contenido
                console.log(`⭐ Usando la plantilla ACTIVA '${infoCategoria.activa}' del módulo '${categoriaDestino}'`)
              }
            }
          } catch (e) {
            console.warn("⚠️ Error al buscar la plantilla activa:", e)
          }
        }

        // 3. Plan de rescate: Si borraste todas las plantillas o ninguna tiene estrellita
        if (!esquemaFinal) {
          console.log(`⚠️ Ninguna plantilla activa en '${categoriaDestino}'. Usando diseño predeterminado.`)
          const modoFallback = categoriaDestino === 'formulacion_pesaje' ? 'etiqueta' : 'ticket'
          esquemaFinal = getEsquemaBase(categoriaDestino as any, modoFallback)
        }
        
        // 4. ¡A imprimir!
        api.imprimirEtiqueta({
          esquema: esquemaFinal,
          datos: etiquetaDatos
        })
      }
    })

    return () => unsubscribe()
  }, [])

  return null
}

function App(): JSX.Element {
  return (
    <HashRouter>
      <MotorFantasma />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="editor" element={<EditorPage />} />
          <Route path="config" element={<PaginaConfig />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App