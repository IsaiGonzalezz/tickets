import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'

import express from 'express'
import cors from 'cors'

let mainWindow: BrowserWindow | null = null;

const PLANTILLAS_DIR = join(app.getPath('userData'), 'plantillas')
const CATEGORIAS_VALIDAS = ['formulacion_pesaje', 'camionero_entrada', 'camionero_salida']

import { exec } from 'child_process'

ipcMain.handle('abrir-preferencias-impresora', async () => {

  return new Promise((resolve) => {

    exec(
      `powershell "(Get-CimInstance Win32_Printer | Where-Object {$_.Default -eq $true}).Name"`,
      (error, stdout) => {

        if (error) {
          resolve({
            success: false,
            error: error.message
          })
          return
        }

        const printerName = stdout.trim()

        console.log('Predeterminada:', printerName)

        if (!printerName) {
          resolve({
            success: false,
            error: 'No se encontró impresora predeterminada'
          })
          return
        }

        exec(
          `rundll32 printui.dll,PrintUIEntry /e /n "${printerName}"`,
          (err2) => {

            if (err2) {
              resolve({
                success: false,
                error: err2.message
              })
            } else {
              resolve({
                success: true
              })
            }

          }
        )

      }
    )

  })

})


function inicializarDirectorios() {
  if (!fs.existsSync(PLANTILLAS_DIR)) {
    fs.mkdirSync(PLANTILLAS_DIR, { recursive: true })
  }
  for (const cat of CATEGORIAS_VALIDAS) {
    const dir = join(PLANTILLAS_DIR, cat)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
  console.log('📂 Directorio de plantillas:', PLANTILLAS_DIR)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true
    },
    minWidth: 1000,
    minHeight: 700
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function startLocalServer() {
  const serverApp = express();
  serverApp.use(cors());
  serverApp.use(express.json());

  serverApp.post('/imprimir', (req, res) => {
    console.log('📡 [Servidor Local] JSON Recibido:', req.body);

    const loteEtiquetas = req.body.lote_etiquetas;

    if (!loteEtiquetas || !Array.isArray(loteEtiquetas)) {
      return res.status(400).json({ error: "El JSON debe contener un arreglo llamado 'lote_etiquetas'" });
    }

    import('electron').then(({ BrowserWindow }) => {
      const ventanasAbiertas = BrowserWindow.getAllWindows();
      if (ventanasAbiertas.length > 0) {
        ventanasAbiertas[0].webContents.send('nuevos-datos-etiqueta', loteEtiquetas);
        console.log("✅ ¡Aviso disparado a React exitosamente!");
      } else {
        console.log("❌ Error: No hay ventanas de React abiertas.");
      }
    });

    return res.status(200).json({ success: true, message: `Se recibieron ${loteEtiquetas.length} etiquetas.` });
  });

  const PORT = 8070;
  serverApp.listen(PORT, () => {
    console.log(`🚀 Servidor local escuchando en http://localhost:${PORT}`);
  });
}

function registrarHandlersPlantillas() {
  ipcMain.handle('plantillas:listar', async (_event, categoria: string) => {
    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      return { error: 'Categoría inválida', items: [] }
    }
    const dir = join(PLANTILLAS_DIR, categoria)
    try {
      const archivos = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== '_config.json')
      const items = archivos.map(nombre => {
        try {
          const contenido = JSON.parse(fs.readFileSync(join(dir, nombre), 'utf-8'))
          return {
            archivo: nombre,
            nombre: contenido.nombre || nombre.replace('.json', ''),
            fecha: contenido.fecha || '',
            modo: contenido.modo || '',
            categoria: contenido.categoria || categoria,
            elementosCount: contenido.elementos?.length || 0,
            configPapel: contenido.configPapel || null
          }
        } catch {
          return { archivo: nombre, nombre: nombre.replace('.json', ''), fecha: '', modo: '', categoria, elementosCount: 0, configPapel: null }
        }
      })

      let activa = ''
      const configPath = join(dir, '_config.json')
      if (fs.existsSync(configPath)) {
        try {
          const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
          activa = cfg.activa || ''
        } catch { }
      }

      return { items, activa }
    } catch {
      return { items: [], activa: '' }
    }
  })

  ipcMain.handle('plantillas:guardar', async (_event, datos: { categoria: string; nombreArchivo: string; contenido: any }) => {
    const { categoria, nombreArchivo, contenido } = datos
    if (!CATEGORIAS_VALIDAS.includes(categoria)) return { error: 'Categoría inválida' }

    const nombreLimpio = nombreArchivo.replace(/[^a-zA-Z0-9_\-\sáéíóúñÁÉÍÓÚÑ()]/g, '').trim()
    if (!nombreLimpio) return { error: 'Nombre de archivo inválido' }

    const archivo = `${nombreLimpio}.json`
    const ruta = join(PLANTILLAS_DIR, categoria, archivo)

    try {
      fs.writeFileSync(ruta, JSON.stringify(contenido, null, 2), 'utf-8')
      console.log(`💾 Plantilla guardada: ${ruta}`)
      return { success: true, archivo, ruta }
    } catch (e: any) {
      console.error('❌ Error al guardar plantilla:', e)
      return { error: e.message }
    }
  })

  ipcMain.handle('plantillas:eliminar', async (_event, categoria: string, nombreArchivo: string) => {
    if (!CATEGORIAS_VALIDAS.includes(categoria)) return { error: 'Categoría inválida' }

    const ruta = join(PLANTILLAS_DIR, categoria, nombreArchivo)
    try {
      if (fs.existsSync(ruta)) {
        fs.unlinkSync(ruta)
        console.log(`🗑️ Plantilla eliminada: ${ruta}`)

        const configPath = join(PLANTILLAS_DIR, categoria, '_config.json')
        if (fs.existsSync(configPath)) {
          try {
            const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
            if (cfg.activa === nombreArchivo) {
              cfg.activa = ''
              fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8')
            }
          } catch { }
        }

        return { success: true }
      }
      return { error: 'Archivo no encontrado' }
    } catch (e: any) {
      return { error: e.message }
    }
  })

  ipcMain.handle('plantillas:set-activa', async (_event, categoria: string, nombreArchivo: string) => {
    if (!CATEGORIAS_VALIDAS.includes(categoria)) return { error: 'Categoría inválida' }

    const configPath = join(PLANTILLAS_DIR, categoria, '_config.json')
    try {
      const cfg = { activa: nombreArchivo }
      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8')
      console.log(`⭐ Plantilla activa [${categoria}]: ${nombreArchivo}`)
      return { success: true }
    } catch (e: any) {
      return { error: e.message }
    }
  })

  ipcMain.handle('plantillas:leer', async (_event, categoria: string, nombreArchivo: string) => {
    if (!CATEGORIAS_VALIDAS.includes(categoria)) return { error: 'Categoría inválida' }

    const ruta = join(PLANTILLAS_DIR, categoria, nombreArchivo)
    try {
      if (!fs.existsSync(ruta)) return { error: 'Archivo no encontrado' }
      const contenido = JSON.parse(fs.readFileSync(ruta, 'utf-8'))
      return { success: true, contenido }
    } catch (e: any) {
      return { error: e.message }
    }
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  inicializarDirectorios()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // --- MOTOR FANTASMA: IMPRESIÓN DIRECTA SIN VENTANAS ---
  ipcMain.handle('imprimir-etiqueta', async (_, payload) => {
    console.log('🖨️ Armando e imprimiendo ticket de forma silenciosa...');

    const { esquema, datos } = payload;
    if (!esquema || !datos) return { error: "Faltan datos o esquema" };

    const workerWindow = new BrowserWindow({
      show: false, // ¡No se muestra NADA!
      width: 400, height: 600,
      webPreferences: { nodeIntegration: true, contextIsolation: false }
    });

    const procesar = (texto: string) => {
      if (!texto) return '';
      return texto.replace(/\{\{([^}]+)\}\}/g, (_, k) => datos[k.trim()] || '');
    };

    const elementosHTML = esquema.elementos.map((el: any) => {
      const cont = procesar(el.contenido);
      let css = `position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${el.ancho}px; height: ${el.alto}px; z-index: ${el.zIndex || 1}; box-sizing: border-box;`;

      if (el.tipo === 'texto') {
        css += ` font-size: ${el.fontSize}px; text-align: ${el.textAlign}; font-weight: ${el.negritas ? 'bold' : 'normal'}; overflow: hidden; white-space: nowrap; display: flex; align-items: center; justify-content: ${el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start'};`;
        if (el.grosorBorde) css += ` border: ${el.grosorBorde}px solid black;`;
        return `<div style="${css}">${cont}</div>`;
      } else if (el.tipo === 'caja') {
        css += ` background-color: transparent;`;
        if (el.grosorBorde) css += ` border: ${el.grosorBorde}px solid black;`;
        return `<div style="${css}"></div>`;
      } else if (el.tipo === 'imagen' && cont) {
        return `<img src="${cont}" style="${css} object-fit: contain;" />`;
      } else if (el.tipo === 'codigoBarra') {
        return `<div style="${css} display: flex; justify-content: center;"><svg class="barcode" jsbarcode-value="${cont}" jsbarcode-format="${el.barcodeFormat || 'CODE128'}"></svg></div>`;
      } else if (el.tipo === 'qr') {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(cont)}`;
        return `<img src="${qrUrl}" style="${css} object-fit: contain;" />`;
      }
      return '';
    }).join('\n');

    const htmlContent = `
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
          <style>
            @page { margin: 0; size: ${esquema.configPapel.anchoMm}mm ${esquema.configPapel.altoMm}mm; }
            body { margin: 0; padding: 0; font-family: sans-serif; position: relative; width: ${esquema.configPapel.anchoMm}mm; height: ${esquema.configPapel.altoMm}mm; background: white; }
          </style>
        </head>
        <body>
          ${elementosHTML}
          <script>
            setTimeout(() => {
              document.querySelectorAll('.barcode').forEach(svg => {
                JsBarcode(svg, svg.getAttribute('jsbarcode-value'), { format: svg.getAttribute('jsbarcode-format'), displayValue: true, margin: 0, height: 40 });
              });
            }, 100);
          </script>
        </body>
      </html>
    `;

    try {
      await workerWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(htmlContent));

      // Damos 500ms para que se dibuje todo y mandamos a imprimir en SILENCIO
      // Damos 500ms para que se dibuje todo y mandamos a imprimir en SILENCIO
      setTimeout(() => {
        workerWindow.webContents.print({
          silent: true,
          printBackground: true,
          margins: { marginType: 'none' }, // Le quita los bordes fantasma de Windows
          pageSize: {
            width: esquema.configPapel.anchoMm * 1000, // Electron necesita la medida en micras (1mm = 1000)
            height: esquema.configPapel.altoMm * 1000
          }
        }, (success, errorType) => {
          if (!success) console.error("❌ Error de impresión:", errorType);
          else console.log("✅ ¡Impresión disparada a la impresora predeterminada!");
          workerWindow.close();
        });
      }, 500);
      return { success: true, message: "Enviado a impresora" };
    } catch (e) {
      workerWindow.close();
      throw e;
    }
  })

  registrarHandlersPlantillas()
  startLocalServer()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})