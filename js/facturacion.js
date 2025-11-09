// ========================================
// FACTURACIÓN - GESTIÓN DE TIMBRADOS SET
// ========================================

import { db } from './firebase.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

// ========================================
// VARIABLES GLOBALES
// ========================================
let tablaTimbrados;

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
        const hoy = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

        const q = query(
            timbradosRef,
            where('activo', '==', true),
            where('fechaVencimiento', '>=', hoy),
            orderBy('fechaVencimiento', 'asc')
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn('⚠️ No hay timbrado activo');
            return null;
        }

        const timbrado = querySnapshot.docs[0];
        return {
            id: timbrado.id,
            ...timbrado.data()
        };

    } catch (error) {
        console.error('❌ Error al obtener timbrado activo:', error);
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
