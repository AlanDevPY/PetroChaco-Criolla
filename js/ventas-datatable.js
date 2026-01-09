/**
 * VENTAS-DATATABLE.JS
 * Integración de DataTables para el módulo de Ventas
 * Configuración para tabla de clientes
 */

/**
 * Inicializa DataTable en la tabla de clientes
 * @returns {Object} Instancia de DataTable
 */
export function initClientesDataTable() {
    // Destruir instancia previa si existe
    if ($.fn.DataTable.isDataTable('#tablaClientes')) {
        $('#tablaClientes').DataTable().destroy();
    }

    const table = $('#tablaClientes').DataTable({
        // Configuración de idioma en español
        language: {
            "processing": "Procesando...",
            "lengthMenu": "Mostrar _MENU_ clientes",
            "zeroRecords": "No se encontraron clientes",
            "emptyTable": "No hay clientes registrados",
            "info": "Mostrando _START_ a _END_ de _TOTAL_ clientes",
            "infoEmpty": "Mostrando 0 a 0 de 0 clientes",
            "infoFiltered": "(filtrado de _MAX_ clientes totales)",
            "search": "Buscar:",
            "paginate": {
                "first": "Primero",
                "last": "Último",
                "next": "Siguiente",
                "previous": "Anterior"
            },
            "aria": {
                "sortAscending": ": activar para ordenar ascendente",
                "sortDescending": ": activar para ordenar descendente"
            }
        },

        // Configuración de visualización
        pageLength: 10,
        lengthMenu: [[10, 20, 50, 100, -1], [10, 20, 50, 100, "Todos"]],

        // Ordenamiento inicial por nombre (columna 0)
        order: [[0, 'asc']],

        // Responsive y scrolling
        responsive: true,
        scrollX: false,

        // Estilo Bootstrap 5 - Layout simplificado sin márgenes extra
        dom: '<"d-flex justify-content-between align-items-center mb-3"lf>' +
            't' +
            '<"d-flex justify-content-between align-items-center mt-3"ip>',

        // Configuración de columnas
        columnDefs: [
            {
                targets: 0, // Columna Nombre
                className: 'text-start'
            },
            {
                targets: 1, // Columna RUC/CI
                className: 'text-start'
            },
            {
                targets: 2, // Columna Teléfono
                className: 'text-start'
            },
            {
                targets: 3, // Columna Dirección
                className: 'text-start'
            },
            {
                targets: 4, // Columna Acciones
                orderable: false,
                searchable: false,
                className: 'text-center'
            }
        ],

        // Callbacks
        initComplete: function () {
            // console.log('✅ DataTable de Clientes inicializado correctamente');
        }
    });

    return table;
}

/**
 * Pobla la tabla de clientes con datos
 * @param {Array} clientes - Array de objetos cliente
 */
export function poblarTablaClientes(clientes) {
    const table = $('#tablaClientes').DataTable();

    // Limpiar tabla
    table.clear();

    // Ordenar clientes por nombre
    clientes.sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Agregar cada cliente
    clientes.forEach(cliente => {
        table.row.add([
            cliente.nombre,
            cliente.ruc || 'N/A',
            cliente.telefono || 'N/A',
            cliente.direccion || 'N/A',
            generarBotonesAccionCliente(cliente.id)
        ]);
    });

    // Dibujar la tabla
    table.draw();
}

/**
 * Genera los botones de acción para cada cliente
 * @param {string} id - ID del cliente
 * @returns {string} HTML de los botones
 */
function generarBotonesAccionCliente(id) {
    return `
    <button class="btn btn-sm btn-danger btn-eliminar-cliente" data-id="${id}">
      <i class="bi bi-trash3"></i> Eliminar
    </button>
  `;
}

/**
 * Actualiza un cliente existente en la tabla
 * @param {Object} cliente - Objeto cliente con ID
 */
export function actualizarClienteEnTabla(cliente) {
    const table = $('#tablaClientes').DataTable();

    // Buscar la fila por ID (asumiendo que el ID está en data-id del botón eliminar)
    table.rows().every(function () {
        const row = this;
        const node = row.node();
        const btnEliminar = $(node).find('.btn-eliminar-cliente');

        if (btnEliminar.data('id') === cliente.id) {
            // Actualizar los datos de la fila
            row.data([
                cliente.nombre,
                cliente.ruc || 'N/A',
                cliente.telefono || 'N/A',
                cliente.direccion || 'N/A',
                generarBotonesAccionCliente(cliente.id)
            ]).draw();
        }
    });
}

/**
 * Elimina un cliente de la tabla
 * @param {string} id - ID del cliente a eliminar
 */
export function eliminarClienteDeTabla(id) {
    const table = $('#tablaClientes').DataTable();
    
    if (!table) {
        console.error('DataTable no está inicializado');
        return false;
    }

    // Buscar y eliminar la fila usando el ID directamente
    let filaEncontrada = false;
    let rowIndex = -1;
    
    table.rows().every(function (rowIdx) {
        const row = this;
        const node = row.node();
        const btnEliminar = $(node).find('.btn-eliminar-cliente');
        const clienteId = btnEliminar.data('id');

        if (clienteId === id) {
            rowIndex = rowIdx;
            filaEncontrada = true;
            return false; // Salir del loop
        }
    });

    if (filaEncontrada && rowIndex >= 0) {
        // Eliminar la fila usando el índice
        table.row(rowIndex).remove();
        table.draw(false); // false para mantener el orden actual sin recargar
        // console.log(`✅ Cliente ${id} eliminado de la tabla (fila ${rowIndex})`);
        return true;
    } else {
        // Si no se encuentra, probablemente el listener en tiempo real ya la eliminó
        // No mostrar warning, simplemente retornar false
        // El listener en tiempo real se encargará de actualizar la tabla
        return false;
    }
}

/**
 * Obtiene el total de clientes en la tabla
 * @returns {number} Total de clientes
 */
export function getTotalClientes() {
    const table = $('#tablaClientes').DataTable();
    return table.rows().count();
}

/**
 * Busca clientes por texto
 * @param {string} texto - Texto a buscar
 */
export function buscarCliente(texto) {
    const table = $('#tablaClientes').DataTable();
    table.search(texto).draw();
}

/**
 * Limpia el filtro de búsqueda
 */
export function limpiarBusqueda() {
    const table = $('#tablaClientes').DataTable();
    table.search('').draw();
}
