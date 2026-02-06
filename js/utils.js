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

// Función genérica para imprimir contenido en un iframe oculto
export function imprimirIframe(contenidoHtml, titulo = 'Impresión') {
    let iframe = document.getElementById('impresionIframe');

    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'impresionIframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${titulo}</title>
      <style>
        body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background: white; }
        .ticket-container { width: 260px; background: #fff; padding: 10px; color: #000; font-size: 12px; line-height: 1.2; }
        .ticket-center { text-align: center; }
        .ticket-right { text-align: right; }
        .ticket-bold { font-weight: 900; }
        .ticket-header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
        .ticket-items { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .ticket-items th, .ticket-items td { padding: 2px 0; font-size: 12px; }
        .ticket-items th { border-bottom: 1px solid #000; }
        .ticket-qty { width: 36px; text-align: left; }
        .ticket-desc { text-align: left; }
        .ticket-price { width: 70px; text-align: right; }
        .ticket-total-row { border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; }
        .ticket-small { font-size: 11px; }
        .ticket-msg { margin-top: 10px; border-top: 1px dashed #000; padding-top: 8px; text-align: center; font-weight: 700; }
        @media print { @page { margin: 0; size: auto; } body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body onload="window.print();">
      ${contenidoHtml}
    </body>
    </html>
  `);
    doc.close();
}
