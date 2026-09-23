// src/shared/schemas.ts
// Definiciones de categorías operativas y esquemas base para plantillas

export type CategoriaPlantilla = 'formulacion_pesaje' | 'camionero_entrada' | 'camionero_salida'

export interface InfoCategoria {
  id: CategoriaPlantilla
  label: string
  descripcion: string
  color: string       // tailwind color key
  variables: string[] // variables del sistema disponibles
}

export const CATEGORIAS: Record<CategoriaPlantilla, InfoCategoria> = {
  formulacion_pesaje: {
    id: 'formulacion_pesaje',
    label: 'Formulacion / Pesaje',
    descripcion: 'Etiquetas para el modulo de formulacion y pesaje de materiales.',
    color: 'emerald',
    variables: [
      'op', 'formula', 'ingrediente', 'fecha_hora',
      'p_bruto', 'p_tara', 'p_neto', 'logo', 'nom_emp', 'rfc'
    ]
  },
  camionero_entrada: {
    id: 'camionero_entrada',
    label: 'Camionero — Entrada',
    descripcion: 'Tickets de entrada para el módulo de camioneros (báscula).',
    color: 'blue',
    variables: [
      'op', 'folio', 'tipo_operacion', 'cliente', 'proveedor', 'producto',
      'placas', 'chofer', 'peso_bruto', 'peso_tara', 'peso_neto',
      'fecha_entrada', 'hora_entrada', 'observaciones', 'img1', 'img2'
    ]
  },
  camionero_salida: {
    id: 'camionero_salida',
    label: 'Camionero — Salida',
    descripcion: 'Tickets de salida para el módulo de camioneros (báscula).',
    color: 'amber',
    variables: [
      'op', 'folio', 'tipo_operacion', 'cliente', 'proveedor', 'producto',
      'placas', 'chofer', 'peso_bruto', 'peso_tara', 'peso_neto',
      'fecha_entrada', 'hora_entrada', 'fecha_salida', 'hora_salida',
      'observaciones', 'img1', 'img2'
    ]
  }
}

// --- Esquemas base: el canvas NO inicia en blanco ---
// Cada esquema tiene elementos pre-configurados con variables {{variable}} ya mapeadas.

export interface EsquemaBase {
  elementos: any[]
  configPapel: { anchoMm: number; altoMm: number }
}

let _uid = 0
function uid() { return `base_${Date.now()}_${++_uid}` }

export function getEsquemaBase(categoria: CategoriaPlantilla, modo?: 'ticket' | 'etiqueta'): EsquemaBase {
  _uid = 0 // reset para consistencia

  switch (categoria) {
    case 'formulacion_pesaje':
      if (modo === 'ticket') {
        return {
          configPapel: { anchoMm: 80, altoMm: 150 },
          elementos: [
            { id: uid(), tipo: 'imagen', contenido: '{{logo}}', x: 76, y: 15, ancho: 150, alto: 60, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{nom_emp}}', x: 10, y: 85, ancho: 282, alto: 30, fontSize: 20, textAlign: 'center', negritas: true, grosorBorde: 0, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: 'RFC: {{rfc}}', x: 10, y: 120, ancho: 282, alto: 20, fontSize: 12, textAlign: 'center', negritas: false, grosorBorde: 0, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'caja', contenido: '', x: 15, y: 150, ancho: 272, alto: 2, grosorBorde: 2, zIndex: 5, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: 'OP: {{op}} | Form: {{formula}}', x: 10, y: 165, ancho: 282, alto: 20, fontSize: 14, textAlign: 'center', negritas: true, grosorBorde: 0, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: 'INGREDIENTE:', x: 10, y: 205, ancho: 282, alto: 20, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 0, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{ingrediente}}', x: 10, y: 230, ancho: 282, alto: 40, fontSize: 28, textAlign: 'center', negritas: true, grosorBorde: 0, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'caja', contenido: '', x: 15, y: 285, ancho: 272, alto: 2, grosorBorde: 2, zIndex: 5, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: 'Peso Bruto: {{p_bruto}} kg', x: 20, y: 310, ancho: 262, alto: 20, fontSize: 14, textAlign: 'left', negritas: false, grosorBorde: 0, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: 'Peso Tara: {{p_tara}} kg', x: 20, y: 340, ancho: 262, alto: 20, fontSize: 14, textAlign: 'left', negritas: false, grosorBorde: 0, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: 'Peso Neto: {{p_neto}} kg', x: 20, y: 380, ancho: 262, alto: 30, fontSize: 22, textAlign: 'left', negritas: true, grosorBorde: 0, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'codigoBarra', contenido: '{{op}}', x: 51, y: 440, ancho: 200, alto: 60, barcodeFormat: 'CODE128', zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{fecha_hora}}', x: 10, y: 520, ancho: 282, alto: 20, fontSize: 12, textAlign: 'center', negritas: false, grosorBorde: 0, zIndex: 10, condicion: 'siempre' }
          ]
        }
      } else { // Etiqueta Formulación
        return {
          configPapel: { anchoMm: 100, altoMm: 75 },
          elementos: [
            { id: uid(), tipo: 'caja', contenido: '', x: 15, y: 15, ancho: 348, alto: 253, grosorBorde: 3, zIndex: 5, condicion: 'siempre' },
            { id: uid(), tipo: 'imagen', contenido: '{{logo}}', x: 30, y: 30, ancho: 80, alto: 50, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{nom_emp}}', x: 120, y: 30, ancho: 220, alto: 25, fontSize: 18, textAlign: 'right', negritas: true, grosorBorde: 0, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: 'RFC: {{rfc}}', x: 120, y: 60, ancho: 220, alto: 20, fontSize: 12, textAlign: 'right', negritas: false, grosorBorde: 0, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{ingrediente}}', x: 30, y: 100, ancho: 318, alto: 35, fontSize: 28, textAlign: 'center', negritas: true, grosorBorde: 0, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: 'OP: {{op}} | Form: {{formula}}', x: 30, y: 145, ancho: 318, alto: 20, fontSize: 14, textAlign: 'center', negritas: true, grosorBorde: 0, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: 'B: {{p_bruto}}kg  |  T: {{p_tara}}kg  |  N: {{p_neto}}kg', x: 30, y: 175, ancho: 318, alto: 25, fontSize: 15, textAlign: 'center', negritas: true, grosorBorde: 0, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'codigoBarra', contenido: '{{op}}', x: 89, y: 210, ancho: 200, alto: 40, barcodeFormat: 'CODE128', zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{fecha_hora}}', x: 30, y: 255, ancho: 318, alto: 15, fontSize: 10, textAlign: 'center', negritas: false, grosorBorde: 0, zIndex: 10, condicion: 'siempre' }
          ]
        }
      }

    case 'camionero_entrada':
      if (modo === 'etiqueta') {
        // Etiqueta compacta para entrada (50x30mm)
        return {
          configPapel: { anchoMm: 50, altoMm: 30 },
          elementos: [
            { id: uid(), tipo: 'texto', contenido: 'ENTRADA', x: 5, y: 3, ancho: 180, alto: 18, fontSize: 11, textAlign: 'center', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: 'Folio: {{id}}', x: 5, y: 22, ancho: 90, alto: 14, fontSize: 8, textAlign: 'left', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{placas}}', x: 95, y: 22, ancho: 90, alto: 14, fontSize: 8, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{cliente}}{{proveedor}}', x: 5, y: 37, ancho: 180, alto: 14, fontSize: 8, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{producto}}', x: 5, y: 52, ancho: 180, alto: 14, fontSize: 8, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: 'Peso: {{peso}}', x: 5, y: 67, ancho: 110, alto: 14, fontSize: 8, textAlign: 'left', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{fecha}}', x: 115, y: 67, ancho: 70, alto: 14, fontSize: 8, textAlign: 'right', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'codigoBarra', contenido: '{{id}}', x: 5, y: 84, ancho: 180, alto: 28, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre', barcodeFormat: 'CODE128' }
          ]
        }
      }

      // ── Ticket largo ENTRADA (80×200mm) ──────────────────────────────────────
      return {
        configPapel: { anchoMm: 80, altoMm: 200 },
        elementos: [

          // ── MEMBRETE: Logo + datos empresa ─────────────────────────────────
          { id: uid(), tipo: 'imagen', contenido: '{{logo}}', x: 10, y: 8, ancho: 60, alto: 50, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: '{{empresa}}', x: 75, y: 8, ancho: 215, alto: 18, fontSize: 12, textAlign: 'left', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: '{{direccion}}', x: 75, y: 27, ancho: 215, alto: 14, fontSize: 8, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'RFC: {{rfc}}', x: 75, y: 42, ancho: 110, alto: 13, fontSize: 8, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Tel: {{telefono}}', x: 190, y: 42, ancho: 100, alto: 13, fontSize: 8, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Separador ──────────────────────────────────────────────────────
          { id: uid(), tipo: 'caja', contenido: '', x: 10, y: 64, ancho: 280, alto: 1, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Título ─────────────────────────────────────────────────────────
          { id: uid(), tipo: 'texto', contenido: 'TICKET DE ENTRADA', x: 10, y: 70, ancho: 280, alto: 26, fontSize: 17, textAlign: 'center', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Folio + tipo operación ─────────────────────────────────────────
          { id: uid(), tipo: 'texto', contenido: 'Folio: {{id}}', x: 10, y: 102, ancho: 140, alto: 18, fontSize: 11, textAlign: 'left', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Op: {{tipo_operacion}}', x: 155, y: 102, ancho: 140, alto: 18, fontSize: 11, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Separador ──────────────────────────────────────────────────────
          { id: uid(), tipo: 'caja', contenido: '', x: 10, y: 126, ancho: 280, alto: 1, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Datos de la operación ──────────────────────────────────────────
          { id: uid(), tipo: 'texto', contenido: 'Cliente: {{cliente}}', x: 10, y: 134, ancho: 280, alto: 18, fontSize: 10, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Proveedor: {{proveedor}}', x: 10, y: 153, ancho: 280, alto: 18, fontSize: 10, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Producto: {{producto}}', x: 10, y: 172, ancho: 280, alto: 18, fontSize: 10, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Placas: {{placas}}', x: 10, y: 191, ancho: 140, alto: 18, fontSize: 10, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Chofer: {{chofer}}', x: 155, y: 191, ancho: 140, alto: 18, fontSize: 10, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Separador ──────────────────────────────────────────────────────
          { id: uid(), tipo: 'caja', contenido: '', x: 10, y: 215, ancho: 280, alto: 1, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Peso ───────────────────────────────────────────────────────────
          { id: uid(), tipo: 'texto', contenido: 'Peso Bruto: {{peso}}', x: 10, y: 223, ancho: 280, alto: 22, fontSize: 13, textAlign: 'left', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Fecha + observaciones ──────────────────────────────────────────
          { id: uid(), tipo: 'texto', contenido: 'Fecha: {{fecha}}', x: 10, y: 250, ancho: 280, alto: 16, fontSize: 9, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Obs: {{observaciones}}', x: 10, y: 268, ancho: 280, alto: 16, fontSize: 9, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Fotos ──────────────────────────────────────────────────────────
          { id: uid(), tipo: 'imagen', contenido: '{{img1}}', x: 10, y: 292, ancho: 130, alto: 90, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'imagen', contenido: '{{img2}}', x: 155, y: 292, ancho: 130, alto: 90, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Separador ──────────────────────────────────────────────────────
          { id: uid(), tipo: 'caja', contenido: '', x: 10, y: 392, ancho: 280, alto: 1, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Código de barras ───────────────────────────────────────────────
          { id: uid(), tipo: 'codigoBarra', contenido: '{{id}}', x: 30, y: 400, ancho: 240, alto: 50, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre', barcodeFormat: 'CODE128' }
        ]
      }

    case 'camionero_salida':
      if (modo === 'etiqueta') {
        // Etiqueta compacta para salida (50x30mm)
        return {
          configPapel: { anchoMm: 50, altoMm: 30 },
          elementos: [
            { id: uid(), tipo: 'texto', contenido: 'SALIDA', x: 5, y: 3, ancho: 180, alto: 18, fontSize: 11, textAlign: 'center', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: 'Folio: {{id}}', x: 5, y: 22, ancho: 90, alto: 14, fontSize: 8, textAlign: 'left', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{placas}}', x: 95, y: 22, ancho: 90, alto: 14, fontSize: 8, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{cliente}}{{proveedor}}', x: 5, y: 37, ancho: 180, alto: 14, fontSize: 8, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{producto}}', x: 5, y: 52, ancho: 180, alto: 14, fontSize: 8, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: 'Neto: {{peso}}', x: 5, y: 67, ancho: 110, alto: 14, fontSize: 8, textAlign: 'left', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'texto', contenido: '{{fecha}}', x: 115, y: 67, ancho: 70, alto: 14, fontSize: 8, textAlign: 'right', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
            { id: uid(), tipo: 'codigoBarra', contenido: '{{id}}', x: 5, y: 84, ancho: 180, alto: 28, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre', barcodeFormat: 'CODE128' }
          ]
        }
      }

      // ── Ticket largo SALIDA (80×200mm) ───────────────────────────────────────
      return {
        configPapel: { anchoMm: 80, altoMm: 200 },
        elementos: [

          // ── MEMBRETE: Logo + datos empresa ─────────────────────────────────
          { id: uid(), tipo: 'imagen', contenido: '{{logo}}', x: 10, y: 8, ancho: 60, alto: 50, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: '{{empresa}}', x: 75, y: 8, ancho: 215, alto: 18, fontSize: 12, textAlign: 'left', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: '{{direccion}}', x: 75, y: 27, ancho: 215, alto: 14, fontSize: 8, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'RFC: {{rfc}}', x: 75, y: 42, ancho: 110, alto: 13, fontSize: 8, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Tel: {{telefono}}', x: 190, y: 42, ancho: 100, alto: 13, fontSize: 8, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Separador ──────────────────────────────────────────────────────
          { id: uid(), tipo: 'caja', contenido: '', x: 10, y: 64, ancho: 280, alto: 1, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Título ─────────────────────────────────────────────────────────
          { id: uid(), tipo: 'texto', contenido: 'TICKET DE SALIDA', x: 10, y: 70, ancho: 280, alto: 26, fontSize: 17, textAlign: 'center', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Folio + tipo operación ─────────────────────────────────────────
          { id: uid(), tipo: 'texto', contenido: 'Folio: {{id}}', x: 10, y: 102, ancho: 140, alto: 18, fontSize: 11, textAlign: 'left', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Op: {{tipo_operacion}}', x: 155, y: 102, ancho: 140, alto: 18, fontSize: 11, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Separador ──────────────────────────────────────────────────────
          { id: uid(), tipo: 'caja', contenido: '', x: 10, y: 126, ancho: 280, alto: 1, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Datos de la operación ──────────────────────────────────────────
          { id: uid(), tipo: 'texto', contenido: 'Cliente: {{cliente}}', x: 10, y: 134, ancho: 280, alto: 18, fontSize: 10, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Proveedor: {{proveedor}}', x: 10, y: 153, ancho: 280, alto: 18, fontSize: 10, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Producto: {{producto}}', x: 10, y: 172, ancho: 280, alto: 18, fontSize: 10, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Placas: {{placas}}', x: 10, y: 191, ancho: 140, alto: 18, fontSize: 10, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Chofer: {{chofer}}', x: 155, y: 191, ancho: 140, alto: 18, fontSize: 10, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Separador ──────────────────────────────────────────────────────
          { id: uid(), tipo: 'caja', contenido: '', x: 10, y: 215, ancho: 280, alto: 1, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Pesos ──────────────────────────────────────────────────────────
          { id: uid(), tipo: 'texto', contenido: 'Peso Neto: {{peso}}', x: 10, y: 223, ancho: 280, alto: 24, fontSize: 14, textAlign: 'center', negritas: true, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Fecha + observaciones ──────────────────────────────────────────
          { id: uid(), tipo: 'texto', contenido: 'Fecha: {{fecha}}', x: 10, y: 254, ancho: 280, alto: 16, fontSize: 9, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'texto', contenido: 'Obs: {{observaciones}}', x: 10, y: 272, ancho: 280, alto: 16, fontSize: 9, textAlign: 'left', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Fotos ──────────────────────────────────────────────────────────
          { id: uid(), tipo: 'imagen', contenido: '{{img1}}', x: 10, y: 296, ancho: 130, alto: 90, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },
          { id: uid(), tipo: 'imagen', contenido: '{{img2}}', x: 155, y: 296, ancho: 130, alto: 90, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Separador ──────────────────────────────────────────────────────
          { id: uid(), tipo: 'caja', contenido: '', x: 10, y: 396, ancho: 280, alto: 1, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre' },

          // ── Código de barras ───────────────────────────────────────────────
          { id: uid(), tipo: 'codigoBarra', contenido: '{{id}}', x: 30, y: 404, ancho: 240, alto: 50, fontSize: 14, textAlign: 'center', negritas: false, grosorBorde: 1, zIndex: 10, condicion: 'siempre', barcodeFormat: 'CODE128' }
        ]
      }
  }
}

