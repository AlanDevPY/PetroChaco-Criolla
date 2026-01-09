import { obtenerStock, obtenerCajas, obtenerReposiciones } from "./firebase.js";
import { showSuccess, showError, showLoading, hideLoading } from "./toast-utils.js";

// Extensión de formato custom para dayjs
try { dayjs.extend(dayjs_plugin_customParseFormat); } catch (e) { console.warn("CustomParseFormat no disponible", e); }

let stockCache = [];
let productoSeleccionado = null;
let historialVentas = [];
let historialReposiciones = [];

// Inicializar al cargar la página
window.addEventListener("DOMContentLoaded", async () => {
    console.log('📊 Módulo de Historial de Producto Cargado');

    // Cargar lista de productos para autocompletar
    await cargarListaProductos();

    // Configurar formulario de búsqueda
    const formBuscar = document.getElementById('formBuscarProducto');
    if (formBuscar) {
        formBuscar.addEventListener('submit', async (e) => {
            e.preventDefault();
            await buscarHistorial();
        });
    }

    // Configurar botón de exportar a Excel
    const btnExportarExcel = document.getElementById('btnExportarExcel');
    if (btnExportarExcel) {
        btnExportarExcel.addEventListener('click', () => {
            exportarAExcel();
        });
    }
});

/**
 * Cargar lista de productos para el datalist
 */
async function cargarListaProductos() {
    try {
        const loadingToast = showLoading("Cargando productos...");
        stockCache = await obtenerStock();
        hideLoading(loadingToast);

        const datalist = document.getElementById('listaProductos');
        if (datalist) {
            datalist.innerHTML = '';
            stockCache.forEach(producto => {
                const option = document.createElement('option');
                option.value = producto.item;
                datalist.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar lista de productos:', error);
        showError('❌ Error al cargar la lista de productos');
    }
}

/**
 * Buscar historial del producto
 */
async function buscarHistorial() {
    const inputBuscar = document.getElementById('inputBuscarProducto');
    const nombreProducto = inputBuscar?.value.trim().toUpperCase();

    if (!nombreProducto) {
        showError('❌ Por favor, ingrese el nombre del producto');
        return;
    }

    // Buscar producto en el stock
    productoSeleccionado = stockCache.find(p => 
        p.item.toUpperCase() === nombreProducto
    );

    if (!productoSeleccionado) {
        showError('❌ Producto no encontrado en el stock');
        ocultarResultados();
        return;
    }

    try {
        const loadingToast = showLoading("Buscando historial...");

        // Obtener historial de ventas y reposiciones
        const [ventas, reposiciones] = await Promise.all([
            obtenerHistorialVentas(nombreProducto),
            obtenerHistorialReposiciones(nombreProducto)
        ]);

        // Guardar historiales en variables globales para exportación
        historialVentas = ventas;
        historialReposiciones = reposiciones;

        hideLoading(loadingToast);

        // Mostrar información del producto
        mostrarInfoProducto(productoSeleccionado);

        // Mostrar historial de ventas
        mostrarHistorialVentas(ventas);

        // Mostrar historial de reposiciones
        mostrarHistorialReposiciones(reposiciones);

        showSuccess(`✅ Historial encontrado: ${ventas.length} ventas, ${reposiciones.length} reposiciones`);

    } catch (error) {
        console.error('Error al buscar historial:', error);
        showError('❌ Error al buscar el historial. Por favor, intente nuevamente.');
    }
}

/**
 * Obtener historial de ventas de un producto
 */
async function obtenerHistorialVentas(nombreProducto) {
    try {
        const cajas = await obtenerCajas();
        const ventasDelProducto = [];

        // Recorrer todas las cajas
        cajas.forEach(caja => {
            if (!caja.ventas || !Array.isArray(caja.ventas)) return;

            // Recorrer todas las ventas de cada caja
            caja.ventas.forEach(venta => {
                if (!venta.venta || !Array.isArray(venta.venta)) return;

                // Buscar el producto en los items de la venta
                venta.venta.forEach(itemVenta => {
                    if (itemVenta.item && itemVenta.item.toUpperCase() === nombreProducto) {
                        ventasDelProducto.push({
                            fecha: venta.fecha || '--',
                            cantidad: itemVenta.cantidad || 0,
                            precioUnitario: itemVenta.costo || 0,
                            subtotal: itemVenta.subTotal || 0,
                            cliente: venta.cliente?.nombre || 'Consumidor Final',
                            cajaId: caja.id
                        });
                    }
                });
            });
        });

        // Ordenar por fecha (más reciente primero)
        ventasDelProducto.sort((a, b) => {
            const parseFecha = (fechaStr) => {
                const formatos = ["DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY, h:mm:ss A"];
                for (const fmt of formatos) {
                    const d = dayjs(fechaStr, fmt, true);
                    if (d.isValid()) return d;
                }
                return dayjs(fechaStr);
            };
            return parseFecha(b.fecha).valueOf() - parseFecha(a.fecha).valueOf();
        });

        return ventasDelProducto;
    } catch (error) {
        console.error('Error al obtener historial de ventas:', error);
        return [];
    }
}

/**
 * Obtener historial de reposiciones de un producto
 */
async function obtenerHistorialReposiciones(nombreProducto) {
    try {
        const reposiciones = await obtenerReposiciones(1000); // Obtener hasta 1000 reposiciones
        const reposicionesDelProducto = [];

        // Recorrer todas las reposiciones
        reposiciones.forEach(repo => {
            if (!repo.items || !Array.isArray(repo.items)) return;

            // Buscar el producto en los items de la reposición
            repo.items.forEach(itemRepo => {
                if (itemRepo.item && itemRepo.item.toUpperCase() === nombreProducto) {
                    reposicionesDelProducto.push({
                        fecha: repo.fecha || '--',
                        cantidad: itemRepo.cantidad || 0,
                        precioCompra: itemRepo.costoCompra || 0,
                        totalCompra: (itemRepo.costoCompra || 0) * (itemRepo.cantidad || 0),
                        usuario: repo.usuario || '--'
                    });
                }
            });
        });

        // Ordenar por fecha (más reciente primero)
        reposicionesDelProducto.sort((a, b) => {
            const parseFecha = (fechaStr) => {
                const formatos = ["DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY, h:mm:ss A"];
                for (const fmt of formatos) {
                    const d = dayjs(fechaStr, fmt, true);
                    if (d.isValid()) return d;
                }
                return dayjs(fechaStr);
            };
            return parseFecha(b.fecha).valueOf() - parseFecha(a.fecha).valueOf();
        });

        return reposicionesDelProducto;
    } catch (error) {
        console.error('Error al obtener historial de reposiciones:', error);
        return [];
    }
}

/**
 * Mostrar información del producto
 */
function mostrarInfoProducto(producto) {
    const cardInfo = document.getElementById('infoProducto');
    if (!cardInfo) return;

    document.getElementById('infoNombre').textContent = producto.item || '--';
    document.getElementById('infoStock').textContent = producto.cantidad || 0;
    document.getElementById('infoCategoria').textContent = producto.categoria || '--';
    document.getElementById('infoCodigoBarra').textContent = producto.codigoBarra || '--';

    cardInfo.classList.remove('d-none');
}

/**
 * Mostrar historial de ventas
 */
function mostrarHistorialVentas(ventas) {
    const cardVentas = document.getElementById('cardVentas');
    const tbodyVentas = document.getElementById('tbodyVentas');
    const sinVentas = document.getElementById('sinVentas');
    const badgeCantidad = document.getElementById('badgeCantidadVentas');
    const totalVendido = document.getElementById('totalVendido');

    if (!cardVentas || !tbodyVentas) return;

    // Calcular total
    const totalCantidad = ventas.reduce((sum, v) => sum + (v.cantidad || 0), 0);
    if (totalVendido) totalVendido.textContent = totalCantidad;
    if (badgeCantidad) badgeCantidad.textContent = ventas.length;

    if (ventas.length === 0) {
        cardVentas.classList.remove('d-none');
        tbodyVentas.innerHTML = '';
        if (sinVentas) sinVentas.classList.remove('d-none');
        return;
    }

    if (sinVentas) sinVentas.classList.add('d-none');
    cardVentas.classList.remove('d-none');

    // Generar filas de la tabla
    tbodyVentas.innerHTML = '';
    ventas.forEach((venta, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${venta.fecha}</td>
            <td class="text-center">${venta.cantidad}</td>
            <td class="text-end">${Number(venta.precioUnitario).toLocaleString('es-PY')} Gs</td>
            <td class="text-end">${Number(venta.subtotal).toLocaleString('es-PY')} Gs</td>
            <td>${venta.cliente}</td>
        `;
        tbodyVentas.appendChild(row);
    });

    // Inicializar DataTable si no está inicializado
    if ($.fn.DataTable.isDataTable('#tablaVentas')) {
        $('#tablaVentas').DataTable().destroy();
    }
    $('#tablaVentas').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
        },
        order: [[1, 'desc']], // Ordenar por fecha descendente
        pageLength: 10,
        responsive: true
    });
}

/**
 * Mostrar historial de reposiciones
 */
function mostrarHistorialReposiciones(reposiciones) {
    const cardReposiciones = document.getElementById('cardReposiciones');
    const tbodyReposiciones = document.getElementById('tbodyReposiciones');
    const sinReposiciones = document.getElementById('sinReposiciones');
    const badgeCantidad = document.getElementById('badgeCantidadReposiciones');
    const totalRepuesto = document.getElementById('totalRepuesto');

    if (!cardReposiciones || !tbodyReposiciones) return;

    // Calcular total
    const totalCantidad = reposiciones.reduce((sum, r) => sum + (r.cantidad || 0), 0);
    if (totalRepuesto) totalRepuesto.textContent = totalCantidad;
    if (badgeCantidad) badgeCantidad.textContent = reposiciones.length;

    if (reposiciones.length === 0) {
        cardReposiciones.classList.remove('d-none');
        tbodyReposiciones.innerHTML = '';
        if (sinReposiciones) sinReposiciones.classList.remove('d-none');
        return;
    }

    if (sinReposiciones) sinReposiciones.classList.add('d-none');
    cardReposiciones.classList.remove('d-none');

    // Generar filas de la tabla
    tbodyReposiciones.innerHTML = '';
    reposiciones.forEach((repo, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${repo.fecha}</td>
            <td class="text-center">${repo.cantidad}</td>
            <td class="text-end">${Number(repo.precioCompra).toLocaleString('es-PY')} Gs</td>
            <td class="text-end">${Number(repo.totalCompra).toLocaleString('es-PY')} Gs</td>
            <td>${repo.usuario}</td>
        `;
        tbodyReposiciones.appendChild(row);
    });

    // Inicializar DataTable si no está inicializado
    if ($.fn.DataTable.isDataTable('#tablaReposiciones')) {
        $('#tablaReposiciones').DataTable().destroy();
    }
    $('#tablaReposiciones').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
        },
        order: [[1, 'desc']], // Ordenar por fecha descendente
        pageLength: 10,
        responsive: true
    });
}

/**
 * Ocultar resultados
 */
function ocultarResultados() {
    document.getElementById('infoProducto')?.classList.add('d-none');
    document.getElementById('cardVentas')?.classList.add('d-none');
    document.getElementById('cardReposiciones')?.classList.add('d-none');
    historialVentas = [];
    historialReposiciones = [];
}

/**
 * Exportar historial a Excel
 */
function exportarAExcel() {
    if (!productoSeleccionado) {
        showError('❌ No hay producto seleccionado para exportar');
        return;
    }

    if (historialVentas.length === 0 && historialReposiciones.length === 0) {
        showError('❌ No hay datos para exportar');
        return;
    }

    try {
        // Verificar que SheetJS está disponible
        if (typeof XLSX === 'undefined') {
            showError('❌ Error: Biblioteca de Excel no disponible');
            return;
        }

        const loadingToast = showLoading('Generando archivo Excel...');

        // Crear un nuevo libro de trabajo
        const wb = XLSX.utils.book_new();

        // ===== HOJA 1: INFORMACIÓN DEL PRODUCTO Y RESUMEN =====
        const infoProducto = [
            ['HISTORIAL DE PRODUCTO', ''],
            ['', ''],
            ['INFORMACIÓN DEL PRODUCTO', ''],
            ['Producto', productoSeleccionado.item || '--'],
            ['Stock Actual', productoSeleccionado.cantidad || 0],
            ['Categoría', productoSeleccionado.categoria || '--'],
            ['Código de Barra', productoSeleccionado.codigoBarra || '--'],
            ['Precio Venta', `${Number(productoSeleccionado.costo || 0).toLocaleString('es-PY')} Gs`],
            ['Precio Compra', `${Number(productoSeleccionado.costoCompra || 0).toLocaleString('es-PY')} Gs`],
            ['', ''],
            ['RESUMEN', ''],
            ['Total Ventas Registradas', historialVentas.length],
            ['Total Unidades Vendidas', historialVentas.reduce((sum, v) => sum + (v.cantidad || 0), 0)],
            ['Total Vendido (Gs)', historialVentas.reduce((sum, v) => sum + (v.subtotal || 0), 0).toLocaleString('es-PY') + ' Gs'],
            ['Total Reposiciones Registradas', historialReposiciones.length],
            ['Total Unidades Repuestas', historialReposiciones.reduce((sum, r) => sum + (r.cantidad || 0), 0)],
            ['Total Comprado (Gs)', historialReposiciones.reduce((sum, r) => sum + (r.totalCompra || 0), 0).toLocaleString('es-PY') + ' Gs'],
            ['', ''],
            ['Fecha de Exportación', dayjs().format('DD/MM/YYYY HH:mm:ss')]
        ];

        const wsInfo = XLSX.utils.aoa_to_sheet(infoProducto);
        
        // Establecer anchos de columna para la hoja de información
        wsInfo['!cols'] = [{ wch: 30 }, { wch: 30 }];
        
        XLSX.utils.book_append_sheet(wb, wsInfo, 'Resumen');

        // ===== HOJA 2: HISTORIAL DE VENTAS =====
        if (historialVentas.length > 0) {
            const ventasData = [
                ['#', 'Fecha', 'Cantidad', 'Precio Unitario (Gs)', 'Subtotal (Gs)', 'Cliente']
            ];

            historialVentas.forEach((venta, index) => {
                ventasData.push([
                    index + 1,
                    venta.fecha,
                    venta.cantidad,
                    venta.precioUnitario,
                    venta.subtotal,
                    venta.cliente
                ]);
            });

            // Agregar fila de totales
            const totalCantidadVentas = historialVentas.reduce((sum, v) => sum + (v.cantidad || 0), 0);
            const totalSubtotalVentas = historialVentas.reduce((sum, v) => sum + (v.subtotal || 0), 0);
            ventasData.push(['', 'TOTAL', totalCantidadVentas, '', totalSubtotalVentas, '']);

            const wsVentas = XLSX.utils.aoa_to_sheet(ventasData);
            
            // Establecer anchos de columna
            wsVentas['!cols'] = [
                { wch: 5 },   // #
                { wch: 20 },  // Fecha
                { wch: 10 },  // Cantidad
                { wch: 18 },  // Precio Unitario
                { wch: 18 },  // Subtotal
                { wch: 25 }   // Cliente
            ];
            
            XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas');
        }

        // ===== HOJA 3: HISTORIAL DE REPOSICIONES =====
        if (historialReposiciones.length > 0) {
            const reposicionesData = [
                ['#', 'Fecha', 'Cantidad', 'Precio Compra (Gs)', 'Total Compra (Gs)', 'Usuario']
            ];

            historialReposiciones.forEach((repo, index) => {
                reposicionesData.push([
                    index + 1,
                    repo.fecha,
                    repo.cantidad,
                    repo.precioCompra,
                    repo.totalCompra,
                    repo.usuario
                ]);
            });

            // Agregar fila de totales
            const totalCantidadRepos = historialReposiciones.reduce((sum, r) => sum + (r.cantidad || 0), 0);
            const totalCompraRepos = historialReposiciones.reduce((sum, r) => sum + (r.totalCompra || 0), 0);
            reposicionesData.push(['', 'TOTAL', totalCantidadRepos, '', totalCompraRepos, '']);

            const wsReposiciones = XLSX.utils.aoa_to_sheet(reposicionesData);
            
            // Establecer anchos de columna
            wsReposiciones['!cols'] = [
                { wch: 5 },   // #
                { wch: 20 },  // Fecha
                { wch: 10 },  // Cantidad
                { wch: 18 },  // Precio Compra
                { wch: 18 },  // Total Compra
                { wch: 20 }   // Usuario
            ];
            
            XLSX.utils.book_append_sheet(wb, wsReposiciones, 'Reposiciones');
        }

        // Generar nombre del archivo
        const nombreProductoSafe = (productoSeleccionado.item || 'Producto').replace(/[^a-z0-9]/gi, '_');
        const fecha = dayjs().format('YYYY-MM-DD_HH-mm-ss');
        const nombreArchivo = `Historial_${nombreProductoSafe}_${fecha}.xlsx`;

        // Escribir archivo y descargar
        XLSX.writeFile(wb, nombreArchivo);

        hideLoading(loadingToast);
        showSuccess(`✅ Archivo Excel exportado: ${nombreArchivo}`);

    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        showError('❌ Error al exportar el archivo Excel. Por favor, intente nuevamente.');
    }
}

