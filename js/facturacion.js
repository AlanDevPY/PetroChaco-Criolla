// ========================================
// FACTURACIÓN - GESTIÓN DE TIMBRADOS SET
// ========================================

import { db, obtenerFacturas, anularFactura, obtenerFacturaPorId } from './firebase.js';
import { FirebaseCache } from './firebase-cache.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

// ========================================
// VARIABLES GLOBALES
// ========================================
let tablaTimbrados;
let tablaFacturas;

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Solo ejecutar si estamos en la página de facturación
    const tablaTimbradosElement = document.getElementById('tablaTimbrados');
    if (!tablaTimbradosElement) {
        console.log('📋 Módulo de facturación cargado (funciones disponibles)');
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
    tablaFacturas = $('#tablaFacturas').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
        },
        responsive: true,
        autoWidth: false,
        // quitar filtro (search) por defecto, usamos nuestro input personalizado
        dom: 'lrtip',
        pageLength: 10,
        order: [[4, 'desc']],
        columnDefs: [
            { targets: 0, visible: false },
            { targets: 6, orderable: false }
        ]
    });
}

async function cargarFacturas() {
    try {
        // Intentar obtener del caché primero para conocer la procedencia y edad
        const cache = new FirebaseCache('facturas');
        let facturas = cache.get();
        let fromCache = true;
        if (!facturas) {
            // Si no hay caché válido, pedir al helper (que además guardará en caché)
            facturas = await obtenerFacturas(200);
            fromCache = false;
        }
        if (!tablaFacturas) inicializarTablaFacturas();
        tablaFacturas.clear();
        facturas.forEach(f => {
            const clienteNombre = (f.cliente && f.cliente.nombre) ? f.cliente.nombre : 'Consumidor Final';
            const fecha = f.fechaTS && f.fechaTS.toDate ? f.fechaTS.toDate().toLocaleString() : '-';
            const estado = f.estado === 'anulada' ? '<span class="badge bg-danger">Anulada</span>' : '<span class="badge bg-success">Activa</span>';
            const acciones = `
              <button class="btn btn-sm btn-primary" onclick="window.verFactura('${f.id}')"><i class="bi bi-eye"></i></button>
              <button class="btn btn-sm btn-danger ms-1" onclick="window.anularFacturaConfirm('${f.id}')"><i class="bi bi-x-circle"></i></button>
            `;
            tablaFacturas.row.add([f.id, f.numeroFormateado || f.numero, clienteNombre, (f.total || 0).toLocaleString('es-PY') + ' Gs', fecha, estado, acciones]);
        });
        tablaFacturas.draw();

        // Actualizar badge en botón y barra informativa
        const badge = document.getElementById('facturasBadgeCount');
        const cacheBadge = document.getElementById('facturasCacheBadge');
        const info = document.getElementById('facturasInfo');
        const empty = document.getElementById('facturasEmpty');
        if (badge) badge.textContent = (facturas && facturas.length) ? facturas.length : 0;
        if (empty) empty.style.display = (facturas && facturas.length) ? 'none' : 'block';

        if (fromCache) {
            if (cacheBadge) { cacheBadge.className = 'badge bg-info ms-2'; cacheBadge.textContent = 'cache'; }
            if (info) info.textContent = `Obtenidas ${facturas.length || 0} (cache: ${cache.getAge()}s)`;
        } else {
            if (cacheBadge) { cacheBadge.className = 'badge bg-success ms-2'; cacheBadge.textContent = 'en vivo'; }
            if (info) info.textContent = `Obtenidas ${facturas.length || 0} (consulta en vivo)`;
        }
    } catch (e) {
        console.error('Error al cargar facturas', e);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las facturas.' });
    }
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
        if (f.venta && Array.isArray(f.venta)) {
            f.venta.forEach(it => {
                itemsHtml += `<tr><td>${it.cantidad}</td><td>${it.item}</td><td>${(it.subTotal || 0).toLocaleString('es-PY')} Gs</td></tr>`;
            });
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
            // Invalidate cache and reload (use global invalidate if available)
            try {
                // try to invalidate using imported function if available
                const { invalidateCache } = await import('./firebase-cache.js');
                invalidateCache('facturas');
            } catch (e) {
                console.warn('No se pudo invalidar caché por import dinámico', e);
            }
            await cargarFacturas();
        });
    }

    // Actualizar badge inicial con datos de caché (si existen)
    try { updateFacturasBadge(); } catch (e) { /* ignore */ }
});

// ========================================
// CARGAR TIMBRADOS DESDE FIREBASE
// ========================================
async function cargarTimbrados() {
    try {
        const timbradosRef = collection(db, 'timbrados');
        const q = query(timbradosRef, orderBy('fechaCreacion', 'desc'));
        const querySnapshot = await getDocs(q);

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

            // Formatear número actual
            const numeroActual = `${timbrado.establecimiento}-${timbrado.puntoExpedicion}-${String(timbrado.numeroActual || timbrado.rangoDesde).padStart(7, '0')}`;

            // Formatear rango
            const rango = `${String(timbrado.rangoDesde).padStart(7, '0')} - ${String(timbrado.rangoHasta).padStart(7, '0')}`;

            // Formatear vigencia
            const vigencia = `${timbrado.fechaInicio} a ${timbrado.fechaVencimiento}`;

            // Botones de acción
            const acciones = `
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

        // Recargar tabla
        await cargarTimbrados();

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

console.log('✅ facturacion.js cargado correctamente');
