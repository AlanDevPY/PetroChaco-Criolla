/**
 * Utilidades de SweetAlert2 para confirmaciones elegantes
 * Integración con el diseño glassmorphism
 */

// Configuración por defecto con tema oscuro
const defaultConfig = {
    background: 'rgba(17, 23, 28, .95)',
    color: '#e8f1f5',
    confirmButtonColor: '#28c1ff',
    cancelButtonColor: '#ff5f6d',
    customClass: {
        popup: 'swal-glass-popup',
        confirmButton: 'btn btn-primary',
        cancelButton: 'btn btn-outline-danger'
    },
    backdrop: 'rgba(0, 0, 0, 0.7)',
    showClass: {
        popup: 'animate__animated animate__zoomIn animate__faster'
    },
    hideClass: {
        popup: 'animate__animated animate__zoomOut animate__faster'
    }
};

/**
 * Confirmación de eliminación
 */
export async function confirmarEliminacion(nombreItem) {
    const result = await Swal.fire({
        ...defaultConfig,
        title: '¿Eliminar producto?',
        html: `Se eliminará <strong>${nombreItem}</strong> del stock.<br><small class="text-muted">Esta acción no se puede deshacer</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-trash me-1"></i> Sí, eliminar',
        cancelButtonText: '<i class="bi bi-x-circle me-1"></i> Cancelar',
        focusCancel: true,
        reverseButtons: true
    });

    return result.isConfirmed;
}

/**
 * Confirmación genérica
 */
export async function confirmar(titulo, mensaje, textoBoton = 'Confirmar') {
    const result = await Swal.fire({
        ...defaultConfig,
        title: titulo,
        html: mensaje,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: textoBoton,
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });

    return result.isConfirmed;
}

/**
 * Alerta de éxito
 */
export function alertaExito(titulo, mensaje = '', duracion = 2000) {
    return Swal.fire({
        ...defaultConfig,
        title: titulo,
        html: mensaje,
        icon: 'success',
        timer: duracion,
        timerProgressBar: true,
        showConfirmButton: false
    });
}

/**
 * Alerta de error
 */
export function alertaError(titulo, mensaje = '') {
    return Swal.fire({
        ...defaultConfig,
        title: titulo,
        html: mensaje,
        icon: 'error',
        confirmButtonText: 'Entendido'
    });
}

/**
 * Alerta de advertencia
 */
export function alertaAdvertencia(titulo, mensaje = '') {
    return Swal.fire({
        ...defaultConfig,
        title: titulo,
        html: mensaje,
        icon: 'warning',
        confirmButtonText: 'Entendido'
    });
}

/**
 * Alerta informativa
 */
export function alertaInfo(titulo, mensaje = '') {
    return Swal.fire({
        ...defaultConfig,
        title: titulo,
        html: mensaje,
        icon: 'info',
        confirmButtonText: 'Entendido'
    });
}

/**
 * Toast rápido (combinación con Toastify para mensajes muy breves)
 */
export function toastSwal(titulo, icono = 'success') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: 'rgba(17, 23, 28, .95)',
        color: '#e8f1f5',
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    return Toast.fire({
        icon: icono,
        title: titulo
    });
}

/**
 * Confirmación con input
 */
export async function confirmarConInput(titulo, mensaje, placeholder = '', inputType = 'text') {
    const result = await Swal.fire({
        ...defaultConfig,
        title: titulo,
        html: mensaje,
        input: inputType,
        inputPlaceholder: placeholder,
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value) {
                return 'Debes ingresar un valor';
            }
        }
    });

    if (result.isConfirmed) {
        return result.value;
    }
    return null;
}

/**
 * Loading modal
 */
export function mostrarCargando(titulo = 'Procesando...', mensaje = 'Por favor espera') {
    Swal.fire({
        ...defaultConfig,
        title: titulo,
        html: mensaje,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

/**
 * Cerrar loading
 */
export function ocultarCargando() {
    Swal.close();
}
