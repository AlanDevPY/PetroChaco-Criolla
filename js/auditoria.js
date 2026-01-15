/**
 * Sistema de Auditoría - PetroChaco-Criolla
 * Registra todas las acciones importantes del sistema para trazabilidad
 */

import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { db } from "./firebase.js";

/**
 * Tipos de acciones auditables
 */
export const ACCIONES = {
    // Ventas
    VENTA_COMPLETADA: "VENTA_COMPLETADA",
    VENTA_REVERTIDA: "VENTA_REVERTIDA",

    // Stock
    STOCK_CREADO: "STOCK_CREADO",
    STOCK_ACTUALIZADO: "STOCK_ACTUALIZADO",
    STOCK_ELIMINADO: "STOCK_ELIMINADO",
    STOCK_REPOSICION: "STOCK_REPOSICION",
    STOCK_SALIDA: "STOCK_SALIDA",

    // Clientes
    CLIENTE_CREADO: "CLIENTE_CREADO",
    CLIENTE_ACTUALIZADO: "CLIENTE_ACTUALIZADO",
    CLIENTE_ELIMINADO: "CLIENTE_ELIMINADO",

    // Caja
    CAJA_ABIERTA: "CAJA_ABIERTA",
    CAJA_CERRADA: "CAJA_CERRADA",

    // Sistema
    SESION_INICIADA: "SESION_INICIADA",
    SESION_CERRADA: "SESION_CERRADA",
};

/**
 * Obtiene el nombre del usuario actual del DOM
 * @returns {string} Nombre del usuario o "Sistema"
 */
function obtenerUsuarioActual() {
    const usuarioElement = document.getElementById("usuarioLogueado");
    if (usuarioElement && usuarioElement.textContent) {
        return usuarioElement.textContent.trim();
    }

    const nombreElement = document.getElementById("nombreUsuario");
    if (nombreElement && nombreElement.textContent) {
        return nombreElement.textContent.trim();
    }

    return "Sistema";
}

/**
 * Registra una acción en la auditoría
 * @param {string} accion - Tipo de acción (usar constantes ACCIONES)
 * @param {Object} detalles - Detalles específicos de la acción
 * @param {string} [modulo] - Módulo del sistema (ventas, stock, caja, etc.)
 * @returns {Promise<void>}
 */
export async function registrarAuditoria(accion, detalles = {}, modulo = "general") {
    try {
        const registro = {
            accion,
            modulo,
            detalles,
            usuario: obtenerUsuarioActual(),
            fecha: new Date().toISOString(),
            fechaLegible: dayjs().format("DD/MM/YYYY HH:mm:ss"),
            timestamp: serverTimestamp(),
            navegador: navigator.userAgent,
            ip: null // Se podría agregar con un servicio externo si es necesario
        };

        await addDoc(collection(db, "Auditoria"), registro);

        // Log solo en modo desarrollo
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            console.log("📝 Auditoría registrada:", accion, detalles);
        }
    } catch (error) {
        // IMPORTANTE: No lanzar error, la auditoría no debe bloquear operaciones
        console.error("⚠️ Error al registrar auditoría (no crítico):", error);
    }
}

/**
 * Registra una venta completada
 * @param {Object} venta - Datos de la venta
 */
export async function auditarVenta(venta) {
    await registrarAuditoria(
        ACCIONES.VENTA_COMPLETADA,
        {
            total: venta.total,
            cliente: venta.cliente?.nombre || "Consumidor Final",
            clienteRUC: venta.cliente?.ruc || "Sin RUC",
            cantidadProductos: venta.venta.length,
            metodoPago: {
                efectivo: venta.efectivo || 0,
                tarjeta: venta.tarjeta || 0,
                transferencia: venta.transferencia || 0
            },
            productos: venta.venta.map(p => ({
                item: p.item,
                cantidad: p.cantidad,
                subtotal: p.subTotal
            }))
        },
        "ventas"
    );
}

/**
 * Registra una modificación de stock
 * @param {string} operacion - "CREADO", "ACTUALIZADO", "ELIMINADO"
 * @param {Object} producto - Datos del producto
 * @param {Object} [cambios] - Cambios realizados (para actualizaciones)
 */
export async function auditarStock(operacion, producto, cambios = null) {
    let accion;
    switch (operacion) {
        case "CREADO":
            accion = ACCIONES.STOCK_CREADO;
            break;
        case "ACTUALIZADO":
            accion = ACCIONES.STOCK_ACTUALIZADO;
            break;
        case "ELIMINADO":
            accion = ACCIONES.STOCK_ELIMINADO;
            break;
        default:
            accion = ACCIONES.STOCK_ACTUALIZADO;
    }

    const detalles = {
        productoId: producto.id,
        item: producto.item,
        categoria: producto.categoria,
        codigoBarra: producto.codigoBarra,
    };

    if (cambios) {
        detalles.cambios = cambios;
    } else {
        detalles.cantidad = producto.cantidad;
        detalles.costo = producto.costo;
        detalles.costoCompra = producto.costoCompra;
    }

    await registrarAuditoria(accion, detalles, "stock");
}

/**
 * Registra una reposición de stock
 * @param {Object} reposicion - Datos de la reposición
 */
export async function auditarReposicion(reposicion) {
    await registrarAuditoria(
        ACCIONES.STOCK_REPOSICION,
        {
            totalCompra: reposicion.totalCompra,
            totalItems: reposicion.totalItems,
            cantidadProductos: reposicion.items.length,
            productos: reposicion.items.map(p => ({
                item: p.item,
                cantidad: p.cantidad,
                costoCompra: p.costoCompra || 0
            }))
        },
        "stock"
    );
}

/**
 * Registra una salida de stock
 * @param {Object} salida - Datos de la salida
 */
export async function auditarSalida(salida) {
    await registrarAuditoria(
        ACCIONES.STOCK_SALIDA,
        {
            motivo: salida.motivo || "No especificado",
            totalItems: salida.totalItems,
            cantidadProductos: salida.items.length,
            productos: salida.items.map(p => ({
                item: p.item,
                cantidad: p.cantidad
            }))
        },
        "stock"
    );
}

/**
 * Registra operaciones con clientes
 * @param {string} operacion - "CREADO", "ACTUALIZADO", "ELIMINADO"
 * @param {Object} cliente - Datos del cliente
 */
export async function auditarCliente(operacion, cliente) {
    let accion;
    switch (operacion) {
        case "CREADO":
            accion = ACCIONES.CLIENTE_CREADO;
            break;
        case "ACTUALIZADO":
            accion = ACCIONES.CLIENTE_ACTUALIZADO;
            break;
        case "ELIMINADO":
            accion = ACCIONES.CLIENTE_ELIMINADO;
            break;
        default:
            accion = ACCIONES.CLIENTE_ACTUALIZADO;
    }

    await registrarAuditoria(
        accion,
        {
            clienteId: cliente.id,
            nombre: cliente.nombre,
            ruc: cliente.ruc,
            telefono: cliente.telefono || "Sin teléfono",
            direccion: cliente.direccion || "Sin dirección"
        },
        "clientes"
    );
}

/**
 * Registra apertura o cierre de caja
 * @param {string} operacion - "ABIERTA" o "CERRADA"
 * @param {Object} caja - Datos de la caja
 */
export async function auditarCaja(operacion, caja) {
    const accion = operacion === "ABIERTA" ? ACCIONES.CAJA_ABIERTA : ACCIONES.CAJA_CERRADA;

    const detalles = {
        cajaId: caja.id,
        fechaApertura: caja.fechaApertura,
    };

    if (operacion === "CERRADA") {
        detalles.fechaCierre = caja.fechaCierre;
        detalles.totalRecaudado = caja.totalRecaudado;
        detalles.cantidadVentas = caja.ventas?.length || 0;
    }

    await registrarAuditoria(accion, detalles, "caja");
}

/**
 * Registra inicio de sesión
 * @param {string} email - Email del usuario
 * @param {string} rol - Rol del usuario
 */
export async function auditarSesion(email, rol) {
    await registrarAuditoria(
        ACCIONES.SESION_INICIADA,
        {
            email,
            rol
        },
        "sistema"
    );
}

// Exportar todo
export default {
    ACCIONES,
    registrarAuditoria,
    auditarVenta,
    auditarStock,
    auditarReposicion,
    auditarSalida,
    auditarCliente,
    auditarCaja,
    auditarSesion
};
