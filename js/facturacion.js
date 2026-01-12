// ========================================
// FACTURACIÓN - GESTIÓN DE TIMBRADOS SET
// ========================================

import { db, obtenerFacturas, anularFactura, obtenerFacturaPorId, sincronizarNumeroActualTimbrado } from './firebase.js';
import { FirebaseCache } from './firebase-cache.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, limit, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

// ========================================
// VARIABLES GLOBALES
// ========================================
let tablaTimbrados;
let tablaFacturas;
let unsubscribeTimbrados = null; // Para almacenar la función de limpieza del listener de timbrados
let unsubscribeFacturas = null; // Para almacenar la función de limpieza del listener de facturas
let facturasCache = []; // Cache de facturas para calcular última factura por timbrado

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Solo ejecutar si estamos en la página de facturación
    const tablaTimbradosElement = document.getElementById('tablaTimbrados');
    if (!tablaTimbradosElement) {
        // console.log('📋 Módulo de facturación cargado (funciones disponibles)');
        return; // No estamos en facturacion.html, solo exportar funciones
    }

    console.log('📋 Módulo de Facturación Cargado');

    // Ocultar contenido y mostrar spinner inicialmente
    const spinner = document.getElementById('spinnerCarga');
    const contenido = document.getElementById('contenidoPrincipal');

    if (spinner && contenido) {
        contenido.style.display = 'none';
        spinner.style.display = 'flex';
    }

    try {
        // Inicializar DataTable
        inicializarTabla();
        inicializarTablaFacturas();

        // Cargar timbrados desde Firebase
        await cargarTimbrados();

        // Event Listeners
        const formTimbrado = document.getElementById('formNuevoTimbrado');
        if (formTimbrado) {
            formTimbrado.addEventListener('submit', guardarTimbrado);
            console.log('✅ Event listener agregado al formulario');
        } else {
            console.error('❌ No se encontró el formulario #formNuevoTimbrado');
        }

        console.log('✅ Sistema de facturación listo');

    } catch (error) {
        console.error('❌ Error al inicializar:', error);
    } finally {
        // Siempre ocultar spinner y mostrar contenido
        if (spinner && contenido) {
            spinner.style.setProperty('display', 'none', 'important');
            contenido.style.setProperty('display', 'block', 'important');
        }
    }
});

// ========================================
// INICIALIZAR DATATABLE
// ========================================
function inicializarTabla() {
    tablaTimbrados = $('#tablaTimbrados').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
        },
        responsive: true,
        pageLength: 10,
        order: [[3, 'desc']], // Ordenar por vigencia descendente
        columnDefs: [
            { targets: 6, orderable: false } // Columna de acciones no ordenable
        ]
    });
}

function inicializarTablaFacturas() {
    // Registrar tipo de ordenamiento personalizado para números de factura
    // DataTables requiere el sufijo '-pre' para la función de preprocesamiento
    $.fn.dataTable.ext.type.order['factura-numero-pre'] = function (data) {
        // Extraer el número numérico del formato "002-002-0000019"
        // Buscar el último segmento numérico después del último guión
        if (!data) return 0;
        const match = String(data).match(/(\d+)$/);
        if (match) {
            return parseInt(match[1], 10);
        }
        return 0;
    };

    tablaFacturas = $('#tablaFacturas').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
        },
        responsive: true,
        autoWidth: false,
        // quitar filtro (search) por defecto, usamos nuestro input personalizado
        dom: 'lrtip',
        pageLength: 10,
        order: [[1, 'desc']], // Ordenar por número de factura (columna 1) descendente (mayor a menor)
        columnDefs: [
            { targets: 0, visible: false },
            { 
                targets: 1, // Columna de número de factura
                type: 'factura-numero' // Usar tipo de ordenamiento personalizado
            },
            { targets: 6, orderable: false }
        ]
    });
}

async function cargarFacturas() {
    try {
        // Si no hay cache aún, cargar inicialmente
        if (facturasCache.length === 0) {
            const facturas = await obtenerFacturas(200);
            facturasCache = facturas;
        }
        
        if (!tablaFacturas) inicializarTablaFacturas();
        actualizarTablaFacturas();

        // Actualizar badge en botón y barra informativa
        const badge = document.getElementById('facturasBadgeCount');
        const cacheBadge = document.getElementById('facturasCacheBadge');
        const info = document.getElementById('facturasInfo');
        const empty = document.getElementById('facturasEmpty');
        if (badge) badge.textContent = (facturasCache && facturasCache.length) ? facturasCache.length : 0;
        if (empty) empty.style.display = (facturasCache && facturasCache.length) ? 'none' : 'block';

        if (cacheBadge) { cacheBadge.className = 'badge bg-success ms-2'; cacheBadge.textContent = 'en vivo'; }
        if (info) info.textContent = `Obtenidas ${facturasCache.length || 0} (tiempo real)`;
    } catch (e) {
        console.error('Error al cargar facturas', e);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las facturas.' });
    }
}

function actualizarTablaFacturas() {
    if (!tablaFacturas) return;
    
    // Limpiar tabla
    tablaFacturas.clear();
    
    // Procesar cada factura del cache
    facturasCache.forEach((factura) => {
        const cliente = factura.cliente || {};
        const nombreCliente = cliente.nombre || 'Consumidor Final';
        const total = (factura.total || 0).toLocaleString('es-PY');
        const fecha = factura.fecha || '';
        const numeroFormateado = factura.numeroFormateado || factura.numero || '';
        
        // Badge de estado
        let estadoBadge = '';
        if (factura.estado === 'anulada') {
            estadoBadge = '<span class="badge bg-danger">Anulada</span>';
        } else {
            estadoBadge = '<span class="badge bg-success">Activa</span>';
        }
        
        // Botones de acción
        const acciones = `
            <button class="btn btn-sm btn-info" onclick="verFactura('${factura.id}')" title="Ver detalle">
                <i class="bi bi-eye"></i>
            </button>
            ${factura.estado !== 'anulada' ? `
            <button class="btn btn-sm btn-warning" onclick="anularFacturaConfirm('${factura.id}')" title="Anular">
                <i class="bi bi-x-circle"></i>
            </button>
            ` : ''}
        `;
        
        // Agregar fila a la tabla
        tablaFacturas.row.add([
            factura.id,              // Id (columna 0, oculta)
            numeroFormateado,        // Nº Factura
            nombreCliente,           // Cliente
            total,                   // Total
            fecha,                   // Fecha
            estadoBadge,             // Estado
            acciones                 // Acciones
        ]);
    });
    
    // Dibujar tabla
    tablaFacturas.draw();
}

// Función pública para actualizar el badge en la UI sin abrir el modal
export function updateFacturasBadge() {
    try {
        const cache = new FirebaseCache('facturas');
        const cached = cache.get();
        const badge = document.getElementById('facturasBadgeCount');
        const cacheBadge = document.getElementById('facturasCacheBadge');
        if (badge) badge.textContent = (cached && cached.length) ? cached.length : 0;
        if (cacheBadge) {
            if (cached) { cacheBadge.className = 'badge bg-info ms-2'; cacheBadge.textContent = 'cache'; }
            else { cacheBadge.className = 'badge bg-secondary ms-2'; cacheBadge.textContent = 'vacío'; }
        }
    } catch (e) {
        console.warn('No se pudo actualizar el badge de facturas', e);
    }
}

// Funciones globales para botones de la tabla (namespace window)
window.anularFacturaConfirm = async function (id) {
    const res = await Swal.fire({
        title: '¿Anular factura?',
        text: 'Se marcará la factura como anulada. Esta acción puede requerir autorizaciones según su flujo.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, anular',
        cancelButtonText: 'Cancelar'
    });
    if (res.isConfirmed) {
        try {
            await anularFactura(id, { usuario: document.getElementById('usuarioLogueado')?.textContent || null });
            Swal.fire({ icon: 'success', title: 'Anulada', text: 'La factura fue marcada como anulada.' });
            cargarFacturas();
        } catch (e) {
            console.error('Error al anular factura', e);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo anular la factura.' });
        }
    }
}

window.verFactura = async function (id) {
    try {
        const f = await obtenerFacturaPorId(id);
        if (!f) return Swal.fire({ icon: 'info', title: 'No encontrada', text: 'No se encontró la factura.' });
        // Mostrar detalle simple
        const cliente = f.cliente || {};
        let itemsHtml = '';
        // Soportar ambos casos: f.venta es array directo o es objeto con .venta array
        let items = [];
        if (Array.isArray(f.venta)) {
            items = f.venta;
        } else if (f.venta && Array.isArray(f.venta.venta)) {
            items = f.venta.venta;
        }
        if (items.length > 0) {
            items.forEach(it => {
                itemsHtml += `<tr><td>${it.cantidad}</td><td>${it.item}</td><td>${(it.subTotal || 0).toLocaleString('es-PY')} Gs</td></tr>`;
            });
        } else {
            itemsHtml = '<tr><td colspan="3" class="text-center text-muted">Sin ítems</td></tr>';
        }
        const html = `
          <div>
            <p><strong>Factura:</strong> ${f.numeroFormateado || f.numero}</p>
            <p><strong>Cliente:</strong> ${cliente.nombre || 'Consumidor Final'}</p>
            <p><strong>Total:</strong> ${(f.total || 0).toLocaleString('es-PY')} Gs</p>
            <table class="table"><thead><tr><th>Cant</th><th>Item</th><th>SubTotal</th></tr></thead><tbody>${itemsHtml}</tbody></table>
          </div>
        `;
        Swal.fire({ title: 'Detalle de factura', html, width: '800px' });
    } catch (e) {
        console.error('Error al ver factura', e);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo obtener el detalle.' });
    }
}

// Cargar facturas cada vez que se abre el modal
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modalVerFacturas');
    if (modal) {
        modal.addEventListener('shown.bs.modal', async () => {
            await cargarFacturas();
        });
    }
    // Wire search and refresh UI
    const search = document.getElementById('facturaSearch');
    if (search) {
        search.addEventListener('input', (e) => {
            if (tablaFacturas) {
                tablaFacturas.search(e.target.value).draw();
            }
        });
    }
    const btnRefresh = document.getElementById('btnRefreshFacturas');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            // Recargar facturas manualmente desde cache (ya está actualizado en tiempo real)
            actualizarTablaFacturas();
        });
    }

    // Actualizar badge inicial con datos de caché (si existen)
    try { updateFacturasBadge(); } catch (e) { /* ignore */ }
});

// ========================================
// CONFIGURAR LISTENERS EN TIEMPO REAL
// ========================================
function configurarListenersTiempoReal() {
    // Limpiar listeners anteriores si existen
    if (unsubscribeTimbrados) {
        unsubscribeTimbrados();
    }
    if (unsubscribeFacturas) {
        unsubscribeFacturas();
    }

    // Listener para timbrados
    const timbradosRef = collection(db, 'timbrados');
    const timbradosQuery = query(timbradosRef, orderBy('fechaCreacion', 'desc'));
    unsubscribeTimbrados = onSnapshot(timbradosQuery, (snapshot) => {
        console.log('🔄 Timbrados actualizados en tiempo real');
        // Usar el snapshot directamente para actualizar
        cargarTimbradosDesdeSnapshot(snapshot);
    }, (error) => {
        console.error('❌ Error en listener de timbrados:', error);
    });

    // Listener para facturas (para actualizar última factura por timbrado)
    const facturasRef = collection(db, 'Facturas');
    const facturasQuery = query(facturasRef, orderBy('fechaTS', 'desc'), limit(500));
    unsubscribeFacturas = onSnapshot(facturasQuery, (snapshot) => {
        console.log('🔄 Facturas actualizadas en tiempo real');
        // Actualizar cache de facturas
        facturasCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Recargar timbrados para actualizar última factura
        if (tablaTimbrados) {
            cargarTimbrados();
        }
    }, (error) => {
        console.error('❌ Error en listener de facturas:', error);
    });
}

// ========================================
// CARGAR TIMBRADOS DESDE SNAPSHOT (tiempo real)
// ========================================
function cargarTimbradosDesdeSnapshot(querySnapshot) {
    try {
        // Obtener últimas facturas por timbrado desde cache
        let ultimasFacturasPorTimbrado = {};
        facturasCache.forEach((factura) => {
            const timbradoId = factura.timbradoId;
            const estadoValido = !factura.estado || factura.estado === 'activa';
            if (timbradoId && estadoValido && factura.numero) {
                if (!ultimasFacturasPorTimbrado[timbradoId] || 
                    factura.numero > (ultimasFacturasPorTimbrado[timbradoId].numero || 0)) {
                    ultimasFacturasPorTimbrado[timbradoId] = {
                        numeroFormateado: factura.numeroFormateado || null,
                        numero: factura.numero || 0
                    };
                }
            }
        });

        // Limpiar tabla
        tablaTimbrados.clear();

        querySnapshot.forEach((docSnap) => {
            const timbrado = docSnap.data();
            const id = docSnap.id;

            // Calcular estado
            const hoy = new Date();
            const fechaVenc = new Date(timbrado.fechaVencimiento);
            const diasRestantes = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));

            let estadoBadge;
            if (diasRestantes < 0) {
                estadoBadge = '<span class="badge bg-danger">Vencido</span>';
            } else if (diasRestantes <= 30) {
                estadoBadge = `<span class="badge bg-warning">Por vencer (${diasRestantes}d)</span>`;
            } else {
                estadoBadge = `<span class="badge bg-success">Activo (${diasRestantes}d)</span>`;
            }

            // Obtener la última factura emitida de este timbrado
            let numeroActual;
            const ultimaFactura = ultimasFacturasPorTimbrado[id];
            if (ultimaFactura && ultimaFactura.numeroFormateado) {
                numeroActual = ultimaFactura.numeroFormateado;
            } else {
                numeroActual = `${timbrado.establecimiento}-${timbrado.puntoExpedicion}-${String(timbrado.rangoDesde).padStart(7, '0')}`;
            }

            // Formatear rango
            const rango = `${String(timbrado.rangoDesde).padStart(7, '0')} - ${String(timbrado.rangoHasta).padStart(7, '0')}`;

            // Formatear vigencia
            const vigencia = `${timbrado.fechaInicio} a ${timbrado.fechaVencimiento}`;

            // Botones de acción
            const acciones = `
        <button class="btn btn-sm btn-info" onclick="sincronizarTimbrado('${id}')" title="Sincronizar número actual">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button class="btn btn-sm btn-warning" onclick="editarTimbrado('${id}')" title="Editar">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="eliminarTimbrado('${id}')" title="Eliminar">
          <i class="bi bi-trash"></i>
        </button>
      `;

            // Agregar fila a la tabla
            tablaTimbrados.row.add([
                timbrado.numeroTimbrado,
                timbrado.rucEmpresa,
                timbrado.razonSocial,
                vigencia,
                numeroActual,
                rango,
                estadoBadge,
                acciones
            ]);
        });

        tablaTimbrados.draw();
    } catch (error) {
        console.error('❌ Error al cargar timbrados desde snapshot:', error);
    }
}

// ========================================
// CARGAR TIMBRADOS DESDE FIREBASE (inicial)
// ========================================
async function cargarTimbrados() {
    try {
        const timbradosRef = collection(db, 'timbrados');
        const q = query(timbradosRef, orderBy('fechaCreacion', 'desc'));
        const querySnapshot = await getDocs(q);

        // Obtener todas las facturas para encontrar la última de cada timbrado
        let ultimasFacturasPorTimbrado = {};
        try {
            // Obtener todas las facturas (sin filtros complejos para evitar problemas de índices)
            const facturasRef = collection(db, 'Facturas');
            const facturasQuery = query(facturasRef, orderBy('fechaTS', 'desc'), limit(500));
            const facturasSnapshot = await getDocs(facturasQuery);
            
            console.log(`📋 Total facturas obtenidas: ${facturasSnapshot.size}`);
            
            // Procesar facturas: filtrar por estado activa y agrupar por timbradoId
            facturasSnapshot.forEach((docSnap) => {
                const factura = docSnap.data();
                const timbradoId = factura.timbradoId;
                
                // Debug: mostrar información de facturas
                if (factura.numeroFormateado) {
                    console.log(`📄 Factura: ${factura.numeroFormateado}, TimbradoId: ${timbradoId}, Estado: ${factura.estado}, Número: ${factura.numero}`);
                }
                
                // Solo procesar facturas activas (o sin estado, para compatibilidad)
                const estadoValido = !factura.estado || factura.estado === 'activa';
                if (timbradoId && estadoValido && factura.numero) {
                    // Si no existe o si esta factura tiene un número mayor, actualizar
                    if (!ultimasFacturasPorTimbrado[timbradoId] || 
                        factura.numero > (ultimasFacturasPorTimbrado[timbradoId].numero || 0)) {
                        ultimasFacturasPorTimbrado[timbradoId] = {
                            numeroFormateado: factura.numeroFormateado || null,
                            numero: factura.numero || 0
                        };
                    }
                }
            });
            
            console.log('📊 Últimas facturas por timbrado:', ultimasFacturasPorTimbrado);
        } catch (error) {
            console.error('❌ Error al obtener facturas para mostrar última factura:', error);
            // Continuar sin las facturas, mostrará el número inicial del rango
        }

        // Limpiar tabla
        tablaTimbrados.clear();

        querySnapshot.forEach((docSnap) => {
            const timbrado = docSnap.data();
            const id = docSnap.id;

            // Calcular estado
            const hoy = new Date();
            const fechaVenc = new Date(timbrado.fechaVencimiento);
            const diasRestantes = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));

            let estadoBadge;
            if (diasRestantes < 0) {
                estadoBadge = '<span class="badge bg-danger">Vencido</span>';
            } else if (diasRestantes <= 30) {
                estadoBadge = `<span class="badge bg-warning">Por vencer (${diasRestantes}d)</span>`;
            } else {
                estadoBadge = `<span class="badge bg-success">Activo (${diasRestantes}d)</span>`;
            }

            // Obtener la última factura emitida de este timbrado
            let numeroActual;
            const ultimaFactura = ultimasFacturasPorTimbrado[id];
            if (ultimaFactura && ultimaFactura.numeroFormateado) {
                // Mostrar la última factura emitida
                numeroActual = ultimaFactura.numeroFormateado;
                console.log(`✅ Timbrado ${id}: Última factura encontrada: ${numeroActual}`);
            } else {
                // Si no hay facturas, mostrar el número inicial del rango
                numeroActual = `${timbrado.establecimiento}-${timbrado.puntoExpedicion}-${String(timbrado.rangoDesde).padStart(7, '0')}`;
                console.log(`⚠️ Timbrado ${id}: No se encontraron facturas, usando rango inicial: ${numeroActual}`);
            }

            // Formatear rango
            const rango = `${String(timbrado.rangoDesde).padStart(7, '0')} - ${String(timbrado.rangoHasta).padStart(7, '0')}`;

            // Formatear vigencia
            const vigencia = `${timbrado.fechaInicio} a ${timbrado.fechaVencimiento}`;

            // Botones de acción
            const acciones = `
        <button class="btn btn-sm btn-info" onclick="sincronizarTimbrado('${id}')" title="Sincronizar número actual">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button class="btn btn-sm btn-warning" onclick="editarTimbrado('${id}')" title="Editar">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="eliminarTimbrado('${id}')" title="Eliminar">
          <i class="bi bi-trash"></i>
        </button>
      `;

            // Agregar fila a la tabla
            tablaTimbrados.row.add([
                timbrado.numeroTimbrado,
                timbrado.rucEmpresa,
                timbrado.razonSocial,
                vigencia,
                numeroActual,
                rango,
                estadoBadge,
                acciones
            ]);
        });

        tablaTimbrados.draw();
        console.log(`✅ ${querySnapshot.size} timbrado(s) cargado(s)`);

    } catch (error) {
        console.error('❌ Error al cargar timbrados:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los timbrados: ' + error.message
        });
    }
}

// ========================================
// GUARDAR NUEVO TIMBRADO
// ========================================
async function guardarTimbrado(e) {
    e.preventDefault();

    const nuevoTimbrado = {
        numeroTimbrado: document.getElementById('numeroTimbrado').value.trim(),
        rucEmpresa: document.getElementById('rucEmpresa').value.trim(),
        razonSocial: document.getElementById('razonSocial').value.trim(),
        direccionFiscal: document.getElementById('direccionFiscal').value.trim() || '',
        fechaInicio: document.getElementById('fechaInicio').value,
        fechaVencimiento: document.getElementById('fechaVencimiento').value,
        establecimiento: document.getElementById('establecimiento').value.trim().padStart(3, '0'),
        puntoExpedicion: document.getElementById('puntoExpedicion').value.trim().padStart(3, '0'),
        rangoDesde: parseInt(document.getElementById('rangoDesde').value),
        rangoHasta: parseInt(document.getElementById('rangoHasta').value),
        numeroActual: parseInt(document.getElementById('rangoDesde').value), // Inicia en el primer número
        observaciones: document.getElementById('observaciones').value.trim() || '',
        fechaCreacion: new Date().toISOString(),
        activo: true
    };

    // Validaciones
    if (nuevoTimbrado.rangoDesde >= nuevoTimbrado.rangoHasta) {
        Swal.fire({
            icon: 'warning',
            title: 'Rango inválido',
            text: 'El número inicial debe ser menor al número final'
        });
        return;
    }

    if (new Date(nuevoTimbrado.fechaInicio) >= new Date(nuevoTimbrado.fechaVencimiento)) {
        Swal.fire({
            icon: 'warning',
            title: 'Fechas inválidas',
            text: 'La fecha de inicio debe ser anterior a la fecha de vencimiento'
        });
        return;
    }

    try {
        // Guardar en Firebase
        await addDoc(collection(db, 'timbrados'), nuevoTimbrado);

        // Cerrar modal y resetear formulario
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuevoTimbrado'));
        modal.hide();
        document.getElementById('formNuevoTimbrado').reset();

        // No es necesario recargar - el listener en tiempo real actualizará automáticamente

        Swal.fire({
            icon: 'success',
            title: '¡Timbrado Registrado!',
            text: `Timbrado ${nuevoTimbrado.numeroTimbrado} guardado exitosamente`,
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error('❌ Error al guardar timbrado:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo guardar el timbrado: ' + error.message
        });
    }
}

// ========================================
// OBTENER TIMBRADO ACTIVO
// ========================================
export async function obtenerTimbradoActivo() {
    try {
        const timbradosRef = collection(db, 'timbrados');

        // Para evitar la necesidad de un índice compuesto en proyectos pequeños
        // consultamos solo por 'activo' y luego filtramos/ordenamos en el cliente.
        const q = query(timbradosRef, where('activo', '==', true));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn('⚠️ No hay timbrado activo');
            return null;
        }

        const hoy = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

        // Mapear y filtrar por fecha de vencimiento en el cliente
        const timbrados = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const timbradosValidos = timbrados
            .filter(t => t.fechaVencimiento && t.fechaVencimiento >= hoy)
            .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));

        if (timbradosValidos.length === 0) {
            console.warn('⚠️ No hay timbrado activo dentro de la vigencia');
            return null;
        }

        return timbradosValidos[0];

    } catch (error) {
        console.error('❌ Error al obtener timbrado activo:', error);

        // Si Firebase sugiere crear un índice compuesto, extraer el enlace y mostrarlo al usuario
        const msg = error && error.message ? error.message : '';
        const match = msg.match(/https?:\/\/console\.firebase\.google\.com\/[^")\s]+/);
        if (match && match[0]) {
            const url = match[0];
            Swal.fire({
                icon: 'error',
                title: 'Error al obtener timbrado activo',
                html: `La consulta requiere un índice compuesto en Firestore. Cree el índice antes de continuar: <a href="${url}" target="_blank">Crear índice en Firebase Console</a>`
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error al obtener timbrado activo',
                text: error && error.message ? error.message : String(error)
            });
        }

        return null;
    }
}

// ========================================
// INCREMENTAR NÚMERO DE FACTURA
// ========================================
export async function incrementarNumeroFactura(timbradoId) {
    try {
        const timbradoRef = doc(db, 'timbrados', timbradoId);
        const timbradoSnap = await getDoc(timbradoRef);

        if (!timbradoSnap.exists()) {
            throw new Error('Timbrado no encontrado');
        }

        const timbrado = timbradoSnap.data();
        const nuevoNumero = (timbrado.numeroActual || timbrado.rangoDesde) + 1;

        // Verificar que no exceda el rango
        if (nuevoNumero > timbrado.rangoHasta) {
            throw new Error('Se agotó el rango de facturas del timbrado');
        }

        // Actualizar número actual
        await updateDoc(timbradoRef, {
            numeroActual: nuevoNumero
        });

        return nuevoNumero;

    } catch (error) {
        console.error('❌ Error al incrementar número de factura:', error);
        throw error;
    }
}

// ========================================
// SINCRONIZAR NÚMERO ACTUAL DEL TIMBRADO
// ========================================
window.sincronizarTimbrado = async function (id) {
    const result = await Swal.fire({
        title: '¿Sincronizar número actual?',
        text: 'Se verificará la última factura emitida y se actualizará el número actual del timbrado.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, sincronizar',
        cancelButtonText: 'Cancelar',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                const resultado = await sincronizarNumeroActualTimbrado(id);
                return resultado;
            } catch (error) {
                Swal.showValidationMessage(`Error: ${error.message}`);
                return false;
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    });

    if (result.isConfirmed && result.value) {
        const data = result.value;
        await Swal.fire({
            icon: 'success',
            title: 'Sincronizado',
            html: `
                <p>${data.mensaje}</p>
                <p><strong>Nuevo número actual:</strong> ${data.numeroActual}</p>
            `,
            timer: 3000,
            showConfirmButton: true
        });
        
        // Recargar timbrados para mostrar el número actualizado
        await cargarTimbrados();
    }
};

// ========================================
// ELIMINAR TIMBRADO
// ========================================
window.eliminarTimbrado = async function (id) {
    const result = await Swal.fire({
        title: '¿Eliminar timbrado?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, 'timbrados', id));
            await cargarTimbrados();

            Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'Timbrado eliminado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('❌ Error al eliminar:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo eliminar el timbrado'
            });
        }
    }
};

// ========================================
// EDITAR TIMBRADO (Por implementar)
// ========================================
window.editarTimbrado = function (id) {
    Swal.fire({
        icon: 'info',
        title: 'Función en desarrollo',
        text: 'La edición de timbrados estará disponible próximamente'
    });
};

// console.log('✅ facturacion.js cargado correctamente');
