/**
 * Viewer de Auditoría - PetroChaco-Criolla
 * Muestra los registros de auditoría en una tabla interactiva
 */

import { db } from "./firebase.js";
import { collection, query, orderBy, limit, getDocs, where } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let auditoriaTable;
let todosLosRegistros = [];

// Ocultar spinner al cargar
function ocultarSpinner() {
    const spinner = document.getElementById('globalSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

// Cargar navbar
async function cargarNavbar() {
    try {
        const response = await fetch('partials/navbar.html');
        const html = await response.text();
        document.getElementById('navbar-container').innerHTML = html;
    } catch (error) {
        console.error('Error cargando navbar:', error);
    }
}

// Formatear badge de módulo
function getBadgeModulo(modulo) {
    const colores = {
        ventas: 'success',
        stock: 'primary',
        clientes: 'info',
        caja: 'warning',
        sistema: 'secondary'
    };
    const color = colores[modulo] || 'secondary';
    return `<span class="badge bg-${color}">${modulo}</span>`;
}

// Formatear badge de acción
function getBadgeAccion(accion) {
    const iconos = {
        VENTA_COMPLETADA: '<i class="bi bi-cart-check text-success"></i>',
        STOCK_CREADO: '<i class="bi bi-plus-circle text-primary"></i>',
        STOCK_ACTUALIZADO: '<i class="bi bi-pencil-square text-warning"></i>',
        STOCK_ELIMINADO: '<i class="bi bi-trash text-danger"></i>',
        STOCK_REPOSICION: '<i class="bi bi-box-arrow-in-down text-info"></i>',
        CLIENTE_CREADO: '<i class="bi bi-person-plus text-success"></i>',
        CLIENTE_ACTUALIZADO: '<i class="bi bi-person-check text-warning"></i>',
        CLIENTE_ELIMINADO: '<i class="bi bi-person-dash text-danger"></i>',
        CAJA_ABIERTA: '<i class="bi bi-unlock text-success"></i>',
        CAJA_CERRADA: '<i class="bi bi-lock text-danger"></i>',
        SESION_INICIADA: '<i class="bi bi-box-arrow-in-right text-primary"></i>'
    };
    const icono = iconos[accion] || '<i class="bi bi-circle"></i>';
    return `${icono} <small>${accion.replace(/_/g, ' ')}</small>`;
}

// Formatear detalles resumidos
function getDetallesResumido(detalles, accion) {
    if (!detalles) return '--';

    switch (accion) {
        case 'VENTA_COMPLETADA':
            return `Cliente: ${detalles.cliente || 'N/A'} | Total: ${(detalles.total || 0).toLocaleString('es-PY')} Gs`;
        case 'STOCK_CREADO':
        case 'STOCK_ACTUALIZADO':
            return `Producto: ${detalles.item || 'N/A'} | Cant: ${detalles.cantidad || 'N/A'}`;
        case 'STOCK_REPOSICION':
            return `Total Compra: ${(detalles.totalCompra || 0).toLocaleString('es-PY')} Gs | Items: ${detalles.cantidadProductos || 0}`;
        case 'CLIENTE_CREADO':
            return `${detalles.nombre || 'N/A'} | RUC: ${detalles.ruc || 'N/A'}`;
        case 'CAJA_ABIERTA':
        case 'CAJA_CERRADA':
            return detalles.fechaApertura || detalles.fechaCierre || '--';
        default:
            return JSON.stringify(detalles).substring(0, 50) + '...';
    }
}

// Cargar datos de auditoría
async function cargarAuditoria() {
    try {
        const auditoriaRef = collection(db, "Auditoria");
        const q = query(auditoriaRef, orderBy("timestamp", "desc"), limit(500));
        const snapshot = await getDocs(q);

        todosLosRegistros = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderizarTabla(todosLosRegistros);
        poblarFiltroUsuarios(todosLosRegistros);

    } catch (error) {
        console.error("Error cargando auditoría:", error);
        alert("Error al cargar los registros de auditoría. Verifica tus permisos.");
    }
}

// Renderizar tabla con DataTables
function renderizarTabla(registros) {
    if (auditoriaTable) {
        auditoriaTable.destroy();
    }

    const tbody = document.querySelector('#auditoriaTable tbody');
    tbody.innerHTML = '';

    registros.forEach(reg => {
        const row = tbody.insertRow();
        row.innerHTML = `
      <td>${reg.fechaLegible || reg.fecha || '--'}</td>
      <td><strong>${reg.usuario || 'Sistema'}</strong></td>
      <td>${getBadgeModulo(reg.modulo)}</td>
      <td>${getBadgeAccion(reg.accion)}</td>
      <td>
        <small>${getDetallesResumido(reg.detalles, reg.accion)}</small>
        <button class="btn btn-sm btn-outline-primary ms-2" onclick="verDetalles('${reg.id}')">
          <i class="bi bi-eye"></i>
        </button>
      </td>
    `;
    });

    auditoriaTable = $('#auditoriaTable').DataTable({
        language: {
            url: "//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json"
        },
        order: [[0, 'desc']],
        pageLength: 50,
        lengthMenu: [[25, 50, 100, -1], [25, 50, 100, "Todos"]],
        responsive: true
    });
}

// Poblar filtro de usuarios
function poblarFiltroUsuarios(registros) {
    const usuarios = [...new Set(registros.map(r => r.usuario))].sort();
    const select = document.getElementById('filtroUsuario');
    select.innerHTML = '<option value="">Todos los usuarios</option>';
    usuarios.forEach(u => {
        select.innerHTML += `<option value="${u}">${u}</option>`;
    });
}

// Aplicar filtros
window.aplicarFiltros = function () {
    const usuario = document.getElementById('filtroUsuario').value;
    const modulo = document.getElementById('filtroModulo').value;
    const accion = document.getElementById('filtroAccion').value;

    let filtrados = [...todosLosRegistros];

    if (usuario) {
        filtrados = filtrados.filter(r => r.usuario === usuario);
    }
    if (modulo) {
        filtrados = filtrados.filter(r => r.modulo === modulo);
    }
    if (accion) {
        filtrados = filtrados.filter(r => r.accion === accion);
    }

    renderizarTabla(filtrados);
};

// Ver detalles de un registro
window.verDetalles = function (id) {
    const registro = todosLosRegistros.find(r => r.id === id);
    if (registro) {
        const detalles = {
            Fecha: registro.fechaLegible || registro.fecha,
            Usuario: registro.usuario,
            Módulo: registro.modulo,
            Acción: registro.accion,
            Detalles: registro.detalles,
            Navegador: registro.navegador
        };
        document.getElementById('detallesJSON').textContent = JSON.stringify(detalles, null, 2);
        new bootstrap.Modal(document.getElementById('modalDetalles')).show();
    }
};

// Refrescar datos
window.refreshAuditoria = async function () {
    auditoriaTable.destroy();
    await cargarAuditoria();
};

// Inicializar al cargar la página
window.addEventListener('DOMContentLoaded', async () => {
    await cargarNavbar();
    await cargarAuditoria();
    ocultarSpinner();
});
