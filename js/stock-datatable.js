/**
 * Configuración de DataTable para Stock
 * Integración con el sistema existente
 */

let dataTable = null;

/**
 * Inicializar DataTable con configuración personalizada
 */
export function initDataTable() {
    // Si ya existe, destruirla primero
    if (dataTable) {
        dataTable.destroy();
    }

    dataTable = $('#stockDataTable').DataTable({
        // Configuración de idioma en español
        language: {
            "decimal": ",",
            "thousands": ".",
            "info": "Mostrando _START_ a _END_ de _TOTAL_ productos",
            "infoEmpty": "Mostrando 0 a 0 de 0 productos",
            "infoFiltered": "(filtrado de _MAX_ productos totales)",
            "infoPostFix": "",
            "lengthMenu": "Mostrar _MENU_ productos",
            "loadingRecords": "Cargando...",
            "processing": "Procesando...",
            "search": "Buscar:",
            "searchPlaceholder": "Producto, categoría, código...",
            "zeroRecords": "No se encontraron productos",
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

        // Opciones de paginación
        pageLength: 20,
        lengthMenu: [[10, 20, 50, 100, -1], [10, 20, 50, 100, "Todos"]],

        // Orden inicial por nombre de producto
        order: [[1, 'asc']],

        // Responsive
        responsive: true,

        // Información adicional
        info: true,

        // Definición de columnas
        columnDefs: [
            {
                // Columna #
                targets: 0,
                orderable: false,
                searchable: false,
                width: '50px'
            },
            {
                // Columna Stock
                targets: 4,
                className: 'text-center',
                render: function (data, type, row) {
                    if (type === 'display') {
                        const stockNum = parseInt(data);
                        let badgeClass = 'bg-success';
                        if (stockNum === 0) {
                            badgeClass = 'bg-danger';
                        } else if (stockNum < 10) {
                            badgeClass = 'bg-warning text-dark';
                        }
                        return `<span class="badge ${badgeClass}">${stockNum}</span>`;
                    }
                    return data;
                }
            },
            {
                // Precio Compra
                targets: 5,
                className: 'text-end',
                render: function (data, type, row) {
                    if (type === 'display') {
                        return formatearPrecio(data);
                    }
                    return data;
                }
            },
            {
                // Precio Venta
                targets: 6,
                className: 'text-end',
                render: function (data, type, row) {
                    if (type === 'display') {
                        return formatearPrecio(data);
                    }
                    return data;
                }
            },
            {
                // Acciones
                targets: 7,
                orderable: false,
                searchable: false,
                className: 'text-center',
                width: '150px'
            }
        ],

        // Opciones de DOM (búsqueda arriba, info y paginación abajo)
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
            '<"row"<"col-sm-12"tr>>' +
            '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
    });

    // Aplicar estilos personalizados después de inicializar
    aplicarEstilosDataTable();
}

/**
 * Formatear precio en guaraníes
 */
function formatearPrecio(precio) {
    const num = Number(precio);
    if (isNaN(num)) return '0 ₲';
    return num.toLocaleString('es-PY') + ' ₲';
}

/**
 * Aplicar estilos personalizados a los elementos de DataTable
 */
function aplicarEstilosDataTable() {
    // Personalizar el input de búsqueda
    $('.dataTables_filter input').addClass('form-control-sm').attr('placeholder', 'Buscar producto...');

    // Personalizar el select de cantidad
    $('.dataTables_length select').addClass('form-select form-select-sm');

    // Añadir icono de búsqueda
    $('.dataTables_filter label').prepend('<i class="bi bi-search me-2"></i>');
}

/**
 * Poblar DataTable con datos
 */
export function poblarDataTable(productos) {
    if (!dataTable) {
        console.warn('DataTable no está inicializada');
        return;
    }

    // Limpiar tabla
    dataTable.clear();

    // Agregar filas
    productos.forEach((producto, index) => {
        const botones = generarBotonesAccion(producto.id, producto.item);

        dataTable.row.add([
            index + 1,
            producto.item,
            producto.categoria,
            producto.codigoBarra || 'N/A',
            producto.cantidad,
            producto.costoCompra || 0,
            producto.costo || 0,
            botones
        ]);
    });

    // Redibujar tabla
    dataTable.draw();
}

/**
 * Generar botones de acción para cada fila
 */
function generarBotonesAccion(id, nombre) {
    return `
    <div class="btn-group btn-group-sm" role="group">
      <button class="btn btn-outline-primary btn-editar-stock" data-id="${id}" title="Editar">
        <i class="bi bi-pencil"></i>
      </button>
      <button class="btn btn-outline-danger btn-eliminar-stock" data-id="${id}" data-nombre="${nombre}" title="Eliminar">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;
}

/**
 * Destruir DataTable
 */
export function destruirDataTable() {
    if (dataTable) {
        dataTable.destroy();
        dataTable = null;
    }
}

/**
 * Obtener instancia de DataTable
 */
export function getDataTable() {
    return dataTable;
}
