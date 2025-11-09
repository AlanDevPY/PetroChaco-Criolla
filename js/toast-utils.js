/**
 * Utilidades para notificaciones Toast con Toastify
 * Reemplaza los modales de Bootstrap por notificaciones más modernas
 * 
 * @author AlanDevPy
 */

// Configuración por defecto de Toastify
const defaultConfig = {
    duration: 3000,
    close: true,
    gravity: "top",
    position: "right",
    stopOnFocus: true,
};

/**
 * Mostrar notificación de éxito
 * @param {string} message - Mensaje a mostrar
 * @param {number} duration - Duración en ms (por defecto 3000)
 */
export function showSuccess(message, duration = 3000) {
    Toastify({
        text: message,
        duration: duration,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
        },
    }).showToast();
}

/**
 * Mostrar notificación de error
 * @param {string} message - Mensaje a mostrar
 * @param {number} duration - Duración en ms (por defecto 4000)
 */
export function showError(message, duration = 4000) {
    Toastify({
        text: message,
        duration: duration,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: "linear-gradient(to right, #ff5f6d, #ffc371)",
        },
    }).showToast();
}

/**
 * Mostrar notificación de información
 * @param {string} message - Mensaje a mostrar
 * @param {number} duration - Duración en ms (por defecto 3000)
 */
export function showInfo(message, duration = 3000) {
    Toastify({
        text: message,
        duration: duration,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: "linear-gradient(to right, #4facfe, #00f2fe)",
        },
    }).showToast();
}

/**
 * Mostrar notificación de advertencia
 * @param {string} message - Mensaje a mostrar
 * @param {number} duration - Duración en ms (por defecto 4000)
 */
export function showWarning(message, duration = 4000) {
    Toastify({
        text: message,
        duration: duration,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: "linear-gradient(to right, #f093fb, #f5576c)",
        },
    }).showToast();
}

/**
 * Mostrar notificación de carga/procesando
 * @param {string} message - Mensaje a mostrar
 * @returns {Object} - Objeto toast para poder cerrarlo después
 */
export function showLoading(message = "Procesando...") {
    const toast = Toastify({
        text: "⏳ " + message,
        duration: -1, // No se cierra automáticamente
        close: false,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: "linear-gradient(to right, #667eea, #764ba2)",
        },
    });
    toast.showToast();
    return toast;
}

/**
 * Cerrar notificación de carga
 * @param {Object} toast - Objeto toast retornado por showLoading
 */
export function hideLoading(toast) {
    if (toast && toast.hideToast) {
        toast.hideToast();
    }
}

/**
 * Mostrar confirmación con callback
 * @param {string} message - Mensaje de confirmación
 * @param {Function} onConfirm - Función a ejecutar si confirma
 */
export function showConfirm(message, onConfirm) {
    const confirmed = confirm(message);
    if (confirmed && onConfirm) {
        onConfirm();
    }
}

// Exportar todo por defecto
export default {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showLoading,
    hideLoading,
    showConfirm
};
