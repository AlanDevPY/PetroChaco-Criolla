// Utilidades centrales de formato, parseo y helpers generales
// Evita duplicar lógica en distintos módulos.

// Formatea un número (o cadena convertible) a Guaraníes con sufijo
export function formatGs(value) {
    const num = Number(value || 0);
    return num.toLocaleString("es-PY") + " Gs";
}

// Parsea un string con puntos (ej: "12.500") a número entero
export function parseGs(str) {
    if (str == null) return 0;
    return Number(String(str).replace(/\./g, "").replace(/[^\d]/g, "")) || 0;
}

// Debounce básico para reducir lecturas intensivas (ej: búsqueda por RUC)
export function debounce(fn, delay = 200) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
}

// Mostrar aviso reutilizable (usa modal si existe, si no fallback a alert)
export function mostrarAviso(tipo, mensaje) {
    const modalTitulo = document.getElementById("modalAvisoTitulo");
    const modalMensaje = document.getElementById("modalAvisoMensaje");
    const modalHeader = document.getElementById("modalAvisoHeader");
    const modalRoot = document.getElementById("modalAviso");

    if (!modalRoot || !modalTitulo || !modalMensaje || !modalHeader) {
        // Fallback mínimo si el modal no está en el DOM
        console[(tipo === "warning" || tipo === "error") ? "error" : "log"](mensaje);
        alert(mensaje);
        return;
    }

    modalHeader.className = "modal-header";
    if (tipo === "success") {
        modalHeader.classList.add("bg-success", "text-white");
        modalTitulo.textContent = "✅ Éxito";
    } else if (tipo === "warning") {
        modalHeader.classList.add("bg-warning", "text-dark");
        modalTitulo.textContent = "⚠️ Advertencia";
    } else if (tipo === "error") {
        modalHeader.classList.add("bg-danger", "text-white");
        modalTitulo.textContent = "❌ Error";
    } else {
        modalHeader.classList.add("bg-secondary", "text-white");
        modalTitulo.textContent = "ℹ️ Aviso";
    }

    modalMensaje.textContent = mensaje;

    const modal = new bootstrap.Modal(modalRoot);
    modal.show();

    setTimeout(() => {
        modal.hide();
    }, 1500);
}

// Helper para asegurar números válidos
export function safeNumber(v, def = 0) {
    const n = Number(v);
    return isNaN(n) ? def : n;
}

// Componer vuelto dado total y pago
export function calcularVuelto(total, pago) {
    const t = safeNumber(total);
    const p = safeNumber(pago);
    return Math.max(p - t, 0);
}

// Centralizar lógica de combinación de medios de pago -> diferencia
export function calcularDiferencia(total, efectivo, tarjeta, transferencia) {
    const t = safeNumber(total);
    const pagado = safeNumber(efectivo) + safeNumber(tarjeta) + safeNumber(transferencia);
    return t - pagado; // >0 falta, =0 exacto, <0 hay vuelto
}
