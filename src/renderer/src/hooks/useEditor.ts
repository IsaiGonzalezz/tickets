import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { 
    ElementoTicket, ConfiguracionPapel, ModoEdicion, 
    Herramienta, Borrador, TipoElemento 
} from '../types/ticket'
import { getEsquemaBase, CategoriaPlantilla } from '../../../shared/schemas'

const PX_PER_MM = 3.78;

export function useEditor() {
  const location = useLocation()

  // --- PERSISTENCIA INICIAL ---
  const getBorradoresGuardados = () => {
      try {
          const stored = sessionStorage.getItem('siaumex_borradores');
          if (stored) return JSON.parse(stored);
      } catch(e) {}
      return {
        etiqueta: { elementos: [], configPapel: { anchoMm: 50, altoMm: 25 } },
        ticket:   { elementos: [], configPapel: { anchoMm: 80, altoMm: 200 } },
        tarjeta:  { elementos: [], configPapel: { anchoMm: 100, altoMm: 60 } } 
      };
  };
  const getModoGuardado = () => (sessionStorage.getItem('siaumex_modo') as ModoEdicion) || 'etiqueta';

  // --- Resolver estado inicial según navegación ---
  const navState = location.state as any
  const initBorradores = getBorradoresGuardados();
  
  let initModo: ModoEdicion = getModoGuardado()
  let initElementos: ElementoTicket[] = initBorradores[initModo]?.elementos || []
  let initConfigPapel: ConfiguracionPapel = initBorradores[initModo]?.configPapel || { anchoMm: 50, altoMm: 25 }

  // CASO 1: Viene a editar una plantilla existente
  if (navState?.plantillaAEditar) {
    const p = navState.plantillaAEditar
    initModo = p.modo || 'ticket'
    initElementos = p.elementos || []
    initConfigPapel = p.configPapel || { anchoMm: 80, altoMm: 150 }
  }
  // CASO 2: Viene a CREAR NUEVO
  else if (navState?.crearDesdeEsquema && navState?.categoriaDestino) {
    const cat = navState.categoriaDestino as CategoriaPlantilla
    const esquemaTicket = getEsquemaBase(cat, 'ticket')
    const esquemaEtiqueta = getEsquemaBase(cat, 'etiqueta')
    initModo = 'ticket'
    initElementos = esquemaTicket.elementos
    initConfigPapel = esquemaTicket.configPapel
    initBorradores.ticket = { elementos: esquemaTicket.elementos, configPapel: esquemaTicket.configPapel }
    initBorradores.etiqueta = { elementos: esquemaEtiqueta.elementos, configPapel: esquemaEtiqueta.configPapel }
  }

  // --- ESTADOS ---
  const [modo, setModo] = useState<ModoEdicion>(initModo)
  const [herramienta, setHerramienta] = useState<Herramienta>('select')
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  
  const [configPapel, setConfigPapel] = useState<ConfiguracionPapel>(initConfigPapel)
  const [elementos, setElementos] = useState<ElementoTicket[]>(initElementos)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)

  const [mostrarModal, setMostrarModal] = useState(false)
  
  // 🚀 NUEVO: Modal para Guardar Como
  const [mostrarModalGuardarComo, setMostrarModalGuardarComo] = useState(false)
  const [nombrePlantilla, setNombrePlantilla] = useState(navState?.archivoOrigen?.replace('.json', '') || '')
  
  const [categoriaGuardar, setCategoriaGuardar] = useState<CategoriaPlantilla | ''>(
    navState?.categoriaDestino || navState?.categoriaOrigen || ''
  )
  const [archivoOrigen, setArchivoOrigen] = useState<string>(navState?.archivoOrigen || '')
  const [guardando, setGuardando] = useState(false)

  // 🚀 NUEVO: Historial para Ctrl + Z (Deshacer)
  const [historial, setHistorial] = useState<ElementoTicket[][]>([initElementos])
  const [pasoActual, setPasoActual] = useState(0)

  // --- REFS ---
  const borradores = useRef<Record<ModoEdicion, Borrador>>(initBorradores)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const startPanMouse = useRef({ x: 0, y: 0 })
  const startPanOffset = useRef({ x: 0, y: 0 })

  // --- EFECTOS ---
  useEffect(() => {
    if (location.state && (location.state as any).plantillaAEditar) {
        const p = (location.state as any).plantillaAEditar
        setModo(p.modo || 'ticket')
        setElementos(p.elementos || [])
        setHistorial([p.elementos || []]) // 🚀 NUEVO: Reiniciar historial al cargar
        setPasoActual(0)
        setConfigPapel(p.configPapel || { anchoMm: 80, altoMm: 150 })
        if (borradores.current[p.modo as ModoEdicion]) {
            borradores.current[p.modo as ModoEdicion] = {
                elementos: p.elementos,
                configPapel: p.configPapel
            }
        }
    }
  }, [location])

  useEffect(() => {
      borradores.current[modo] = { elementos, configPapel };
      try {
          sessionStorage.setItem('siaumex_borradores', JSON.stringify(borradores.current));
          sessionStorage.setItem('siaumex_modo', modo);
      } catch(e) {}
  }, [elementos, configPapel, modo])

  // --- FUNCIONES CORE ---

  // 🚀 NUEVO: Función para guardar en el historial cada vez que hay un cambio
  const guardarEnHistorial = useCallback((nuevosElementos: ElementoTicket[]) => {
    const nuevoHistorial = historial.slice(0, pasoActual + 1)
    nuevoHistorial.push(nuevosElementos)
    // Limitar el historial a 20 pasos para no saturar la memoria
    if (nuevoHistorial.length > 20) nuevoHistorial.shift()
    
    setHistorial(nuevoHistorial)
    setPasoActual(nuevoHistorial.length - 1)
    setElementos(nuevosElementos)
  }, [historial, pasoActual])

  const deshacer = useCallback(() => {
    if (pasoActual > 0) {
      setPasoActual(prev => prev - 1)
      setElementos(historial[pasoActual - 1])
      setSeleccionado(null)
    }
  }, [historial, pasoActual])

  const cambiarModo = (nuevoModo: ModoEdicion) => {
    if (nuevoModo === modo) return;
    borradores.current[modo] = { elementos: [...elementos], configPapel: { ...configPapel } }

    if (!borradores.current[nuevoModo]) {
        borradores.current[nuevoModo] = { elementos: [], configPapel: { anchoMm: 100, altoMm: 60 } };
    }

    const borrador = borradores.current[nuevoModo];
    if (borrador) {
        setElementos(borrador.elementos)
        setHistorial([borrador.elementos]) // 🚀 NUEVO: Limpiar historial al cambiar de modo
        setPasoActual(0)
        setConfigPapel(borrador.configPapel)
        setModo(nuevoModo)
        setSeleccionado(null)
        setPan({ x: 0, y: 0 })
        setZoom(1.0)
    }
  }

  const actualizarPapel = (anchoPx: number, altoPx: number) => {
      const anchoMm = Math.max(10, Math.round(anchoPx / PX_PER_MM))
      const altoMm = Math.max(10, Math.round(altoPx / PX_PER_MM))
      setConfigPapel({ anchoMm, altoMm })
  }

  const agregarElemento = (tipo: TipoElemento, opcionesExtra?: Partial<ElementoTicket>) => {
    const id = Date.now().toString()
    
    const base: ElementoTicket = {
      id, tipo,
      contenido: tipo === 'texto' ? 'Texto Nuevo' : '',
      x: 10, y: 10, ancho: 100, alto: 30,
      fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1,
      zIndex: 10, condicion: 'siempre', ...opcionesExtra
    }

    if (tipo === 'texto') { base.ancho = 100; base.alto = 25; base.grosorBorde = 0; } 
    if (tipo === 'qr') { base.ancho = 40; base.alto = 40; base.contenido = 'https://siaumex.com' }
    if (tipo === 'codigoBarra') { 
        base.ancho = 120; base.alto = 50; 
        base.barcodeFormat = 'CODE128'; 
        base.contenido = '1234567890'; 
    }
    if (tipo === 'caja') { base.ancho = 50; base.alto = 50; base.grosorBorde = 2 }
    if (tipo === 'imagen') { base.ancho = 60; base.alto = 60; base.contenido = '' }
    if (tipo === 'campoDatos') {
        base.ancho = base.ancho || 120; base.alto = base.alto || 30;
        base.textAlign = 'center'; base.contenido = opcionesExtra?.contenido || 'variable_id';
    }

    const nuevosElementos = [...elementos, base]
    guardarEnHistorial(nuevosElementos) // 🚀 NUEVO: Guardar en historial
    setSeleccionado(id)
    setHerramienta('select')
  }

  const cargarImagenEnSeleccion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && seleccionado) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          actualizarElemento(seleccionado, { contenido: event.target.result as string })
        }
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const actualizarElemento = (id: string, cambios: Partial<ElementoTicket>) => {
    const nuevosElementos = elementos.map(e => e.id === id ? { ...e, ...cambios } : e)
    setElementos(nuevosElementos)
    // 🚀 OJO: No metemos el "drag/move" continuo al historial para no saturarlo,
    // pero idealmente deberías llamar a guardarEnHistorial al soltar el ratón (onStop del Draggable)
  }

  // 🚀 NUEVO: Función para forzar el guardado en el historial (se usará al terminar de mover)
  const consolidarHistorial = useCallback(() => {
      const nuevoHistorial = historial.slice(0, pasoActual + 1)
      nuevoHistorial.push([...elementos])
      if (nuevoHistorial.length > 20) nuevoHistorial.shift()
      setHistorial(nuevoHistorial)
      setPasoActual(nuevoHistorial.length - 1)
  }, [elementos, historial, pasoActual])

  const borrarSeleccionado = useCallback(() => {
    if (seleccionado) {
      const nuevosElementos = elementos.filter(e => e.id !== seleccionado)
      guardarEnHistorial(nuevosElementos)
      setSeleccionado(null)
    }
  }, [seleccionado, elementos, guardarEnHistorial])

  // 🚀 NUEVO: Escuchador global de teclado (Suprimir y Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Evitar que borre si está escribiendo en un input de texto
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        borrarSeleccionado();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        deshacer();
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [borrarSeleccionado, deshacer])


  // --- GUARDADO DE PLANTILLA VÍA IPC ---

  // 🚀 NUEVO: Guardado directo (Sobrescribe si ya existe un archivo, o pregunta si es nuevo)
  const guardarDirecto = async () => {
    if (!archivoOrigen) {
        // Si no tiene archivo origen, es nuevo. Abrimos modal de "Guardar Como"
        setMostrarModalGuardarComo(true)
        return
    }
    await ejecutarGuardado(archivoOrigen.replace('.json', '')) // Guardado silencioso
  }

  // 🚀 NUEVO: Guardado Como (Abre modal y pide nombre)
  const guardarComo = async () => {
    if (!nombrePlantilla.trim()) return alert('Por favor escribe un nombre')
    await ejecutarGuardado(nombrePlantilla)
  }

  // Lógica interna de guardado IPC
  const ejecutarGuardado = async (nombreFinal: string) => {
    if (!categoriaGuardar) return alert('Por favor selecciona una categoría de destino')

    const api = (window as any).api
    if (!api || !api.guardarPlantillaFS) {
      alert('Error: API de guardado no disponible. El puente IPC no está listo.')
      return
    }

    setGuardando(true)

    const contenidoPlantilla = {
      nombre: nombreFinal,
      fecha: new Date().toLocaleDateString(),
      modo, 
      categoria: categoriaGuardar,
      elementos,
      configPapel
    }

    try {
      const resultado = await api.guardarPlantillaFS({
        categoria: categoriaGuardar,
        nombreArchivo: nombreFinal,
        contenido: contenidoPlantilla
      })

      if (resultado.error) {
        alert('❌ Error al guardar: ' + resultado.error)
      } else {
        setArchivoOrigen(resultado.archivo) // 🚀 Actualizamos el origen para que el próximo sea directo
        setMostrarModalGuardarComo(false)
        setMostrarModal(false) // Por si venía del modal antiguo
        // alert(`✅ Plantilla guardada exitosamente`) // Lo quitamos para no ser molestos
      }
    } catch (e: any) {
      alert('❌ Error al guardar plantilla: ' + e.message)
    }
    
    setGuardando(false)
  }

  const limpiarLienzo = () => {
    if (confirm('¿Seguro que deseas eliminar TODOS los objetos del lienzo actual? Esta acción no se puede deshacer.')) {
        guardarEnHistorial([]); // 🚀 NUEVO: Se puede deshacer el limpiar lienzo
        setSeleccionado(null);
    }
  }

  // --- Panning ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (herramienta === 'hand' || e.button === 1) {
        isPanning.current = true
        startPanMouse.current = { x: e.clientX, y: e.clientY }
        startPanOffset.current = { x: pan.x, y: pan.y }
        e.preventDefault() 
    } else if (herramienta === 'select') {
        const target = e.target as HTMLElement
        if (!target.closest('.react-draggable') && !target.closest('.prop-panel')) {
           // Click en fondo vacío (deseleccionar)
           setSeleccionado(null)
        }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
        const deltaX = e.clientX - startPanMouse.current.x
        const deltaY = e.clientY - startPanMouse.current.y
        setPan({
            x: startPanOffset.current.x + deltaX,
            y: startPanOffset.current.y + deltaY
        })
    }
  }

  const handleMouseUp = () => {
    isPanning.current = false
  }

  const objSel = elementos.find(e => e.id === seleccionado)

  const inicializarConCategoria = (cat: CategoriaPlantilla) => {
    const esquemaTicket = getEsquemaBase(cat, 'ticket')
    const esquemaEtiqueta = getEsquemaBase(cat, 'etiqueta')

    setModo('ticket')
    setElementos(esquemaTicket.elementos)
    setHistorial([esquemaTicket.elementos])
    setPasoActual(0)
    setConfigPapel(esquemaTicket.configPapel)
    setCategoriaGuardar(cat)
    setSeleccionado(null)
    setPan({ x: 0, y: 0 })
    setZoom(1.0)

    borradores.current.ticket = { elementos: esquemaTicket.elementos, configPapel: esquemaTicket.configPapel }
    borradores.current.etiqueta = { elementos: esquemaEtiqueta.elementos, configPapel: esquemaEtiqueta.configPapel }
  }

  return {
    modo, herramienta, setHerramienta, zoom, setZoom, configPapel, setConfigPapel, actualizarPapel,
    elementos, seleccionado, setSeleccionado, objSel,
    fileInputRef, containerRef, 
    mostrarModal, setMostrarModal, 
    mostrarModalGuardarComo, setMostrarModalGuardarComo, // 🚀 NUEVO
    nombrePlantilla, setNombrePlantilla,
    cambiarModo, agregarElemento, actualizarElemento, consolidarHistorial, // 🚀 NUEVO
    borrarSeleccionado, cargarImagenEnSeleccion,
    guardarPlantilla: guardarDirecto, // 🚀 RENOMBRADO INTERNAMENTE
    guardarComo, // 🚀 NUEVO
    limpiarLienzo,
    pan, handleMouseDown, handleMouseMove, handleMouseUp,
    categoriaGuardar, setCategoriaGuardar, guardando, archivoOrigen,
    inicializarConCategoria,
    deshacer // 🚀 NUEVO
  }
}