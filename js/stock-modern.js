/**
 * Integración de mejoras modernas al sistema de stock
 * - DataTables para gestión de tabla
 * - SweetAlert2 para confirmaciones
 * - Mantiene compatibilidad con código existente
 */

import { initDataTable, poblarDataTable } from './stock-datatable.js';
import { confirmarEliminacion } from './swal-utils.js';

let dataTableInicializado = false;

/**
 * Mostrar stock usando DataTables
 */
export async function mostrarStockConDataTable(obtenerStock) {
    const stock = await obtenerStock();

    // Inicializar DataTable solo la primera vez
    if (!dataTableInicializado) {
        initDataTable();
        dataTableInicializado = true;
    }

    // Poblar con datos
    poblarDataTable(stock);

    // Retornar stock para mantener compatibilidad
    return stock;
}

/**
 * Configurar eventos de botones con delegación
 * Usa event delegation para manejar botones generados dinámicamente por DataTables
 */
export function configurarEventosDataTable(handlers) {
    const tabla = document.getElementById('stockDataTable');

    if (!tabla) {
        console.error('Tabla no encontrada');
        return;
    }

    // Event delegation para botones de editar
    $(tabla).on('click', '.btn-editar-stock', async function () {
        const id = $(this).data('id');
        if (handlers.onEditar) {
            await handlers.onEditar(id);
        }
    });

    // Event delegation para botones de eliminar con confirmación SweetAlert2
    $(tabla).on('click', '.btn-eliminar-stock', async function () {
        const id = $(this).data('id');
        const nombre = $(this).data('nombre');

        // Mostrar confirmación elegante
        const confirmado = await confirmarEliminacion(nombre);

        if (confirmado && handlers.onEliminar) {
            await handlers.onEliminar(id);
        }
    });
}

/**
 * Actualizar una fila específica en DataTable
 */
export function actualizarFilaDataTable(productos) {
    poblarDataTable(productos);
}
