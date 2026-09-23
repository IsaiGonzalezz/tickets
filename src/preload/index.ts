import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Función para enviar a imprimir
  imprimirEtiqueta: (datos: any) => ipcRenderer.invoke('imprimir-etiqueta', datos),

  // Escuchar datos de Postman blindado
  onNuevosDatosEtiqueta: (callback: (datos: any) => void) => {
    const listener = (_event: any, datos: any) => callback(datos);
    ipcRenderer.on('nuevos-datos-etiqueta', listener);
    return () => ipcRenderer.removeListener('nuevos-datos-etiqueta', listener);
  },

  // --- NUEVO: Gestión de Plantillas en File System ---
  guardarPlantillaFS: (datos: { categoria: string; nombreArchivo: string; contenido: any }) =>
    ipcRenderer.invoke('plantillas:guardar', datos),

  listarPlantillas: (categoria: string) =>
    ipcRenderer.invoke('plantillas:listar', categoria),

  eliminarPlantilla: (categoria: string, nombreArchivo: string) =>
    ipcRenderer.invoke('plantillas:eliminar', categoria, nombreArchivo),

  setPlantillaActiva: (categoria: string, nombreArchivo: string) =>
    ipcRenderer.invoke('plantillas:set-activa', categoria, nombreArchivo),

  leerPlantilla: (categoria: string, nombreArchivo: string) =>
    ipcRenderer.invoke('plantillas:leer', categoria, nombreArchivo),

  abrirPreferenciasImpresora: () =>
  ipcRenderer.invoke('abrir-preferencias-impresora'),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}