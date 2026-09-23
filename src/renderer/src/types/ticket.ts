// src/types/ticket.ts

export type ModoEdicion = 'etiqueta' | 'ticket' | 'tarjeta' | 'libre';

export type CondicionImpresion = 'siempre' | 'si_es_peso' | 'si_es_unidad' | 'si_precio_cero';

export type Herramienta = 'select' | 'hand' | 'texto' | 'caja' | 'qr' | 'codigoBarra' | 'imagen';

export type TipoElemento = 'texto' | 'codigoBarra' | 'qr' | 'caja' | 'imagen' | 'campoDatos';

// --- ESTA ES LA INTERFAZ QUE FALTABA ---
export interface Borrador {
    elementos: ElementoTicket[];
    configPapel: ConfiguracionPapel;
}
// ----------------------------------------

export interface ConfiguracionPapel {
    anchoMm: number;
    altoMm: number;
}

export interface ElementoTicket {
    id: string;
    tipo: TipoElemento;
    contenido: string; 
    x: number;
    y: number;
    ancho: number;
    alto: number;
    // Estilos
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right';
    negritas?: boolean;
    grosorBorde?: number;
    
    // Propiedades PRO
    variableLabel?: string;      
    condicion?: CondicionImpresion; 
    zIndex?: number;             
    barcodeFormat?: string;      
}

// Árbol de datos para el panel lateral
export interface NodoVariable {
    id: string;
    label: string;
    ejemplo: string;
}

export const ARBOL_DATOS: Record<string, NodoVariable[]> = {
    'Artículo (Item)': [
        { id: 'item_name', label: 'Nombre Artículo', ejemplo: 'Piña Miel' },
        { id: 'item_code', label: 'Código Artículo', ejemplo: '50012' },
        { id: 'item_price', label: 'Precio Unitario', ejemplo: '$ 25.00' },
        { id: 'item_desc', label: 'Descripción', ejemplo: 'Fruta fresca...' }
    ],
    'Pesaje (Weight)': [
        { id: 'weight_net', label: 'Peso Neto', ejemplo: '1.250 kg' },
        { id: 'weight_tare', label: 'Tara', ejemplo: '0.050 kg' },
        { id: 'units', label: 'Unidades', ejemplo: '1' }
    ],
    'Total': [
        { id: 'total_amt', label: 'Importe Total', ejemplo: '$ 31.25' },
        { id: 'date_pack', label: 'Fecha Envasado', ejemplo: '18/02/2026' },
        { id: 'time_pack', label: 'Hora', ejemplo: '14:30' }
    ]
};