import { registrarStock, obtenerStock, eliminarStockPorID, actualizarStockporId, obtenerStockPorId, sumarStockTransaccional, registrarReposicion, obtenerReposiciones, descontarStockTransaccional, registrarSalida, obtenerSalidas, eliminarReposicion, eliminarSalida } from "./firebase.js";
import { showSuccess, showError, showInfo, showLoading, hideLoading, showConfirm, showWarning } from "./toast-utils.js";
import { mostrarStockConDataTable, configurarEventosDataTable, actualizarFilaDataTable } from "./stock-modern.js";
import { confirmarEliminacion, alertaAdvertencia } from "./swal-utils.js";
import { mejorarDatalist } from "./datalist-mejorado.js";
import { parseGs, formatGs } from "./utils.js";

// variables globales

let idStock
let _cacheStock = [];
let reposicionLista = [];
let salidaLista = [];

// Variable para controlar si usar DataTables o sistema manual
const USAR_DATATABLES = true; // Cambiar a false para volver al sistema anterior

// Variables de paginación
let paginaActual = 1;
const productosPorPagina = 20;
let productosFiltrados = []; // Para mantener los productos filtrados o todos



// Función reutilizable para formatear inputs de precio
function formatearInputPrecio(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    // Quitamos cualquier caracter que no sea número
    let valor = input.value.replace(/\D/g, "");
    // Formateamos con separadores de miles
    input.value = valor ? Number(valor).toLocaleString("es-PY") : "";
    // Guardar valor puro en dataset para cálculos
    input.dataset.value = valor;
  });
}

// Aplicar formateo a todos los inputs de precio
const inputPrecio = document.getElementById("nuevoCostoStock");
const inputPrecioCompra = document.getElementById("nuevoPrecioCompraStock");
const actualizarCostoStock = document.getElementById("actualizarCostoStock");
const actualizarPrecioCompraStock = document.getElementById("actualizarPrecioCompraStock");

formatearInputPrecio(inputPrecio);
formatearInputPrecio(inputPrecioCompra);
formatearInputPrecio(actualizarCostoStock);
formatearInputPrecio(actualizarPrecioCompraStock);


// -------------------------------------------------------------------------------


document.getElementById("btnAgregar").addEventListener("click", () => {
  registrarStockForm.reset();
})

// Referencias a elementos
const registrarStockForm = document.getElementById("registrarStockForm");
const actualizarStockForm = document.getElementById("actualizarStockForm");
const stockTable = document.getElementById("stockTable");
// Reposición UI refs
const formAgregarItemReposicion = document.getElementById('formAgregarItemReposicion');
const reposicionProducto = document.getElementById('reposicionProducto');
const reposicionCantidad = document.getElementById('reposicionCantidad');
const reposicionPrecioCompra = document.getElementById('reposicionPrecioCompra');
const reposicionPrecioVenta = document.getElementById('reposicionPrecioVenta');
const reposicionTable = document.getElementById('reposicionTable');
const salidaTable = document.getElementById('salidaTable');
const btnConfirmarReposicion = document.getElementById('btnConfirmarReposicion');
const btnCancelarReposicion = document.getElementById('btnCancelarReposicion');
const btnConfirmarSalida = document.getElementById('btnConfirmarSalida');
const btnCancelarSalida = document.getElementById('btnCancelarSalida');

// Instancias de modales (solo los necesarios para formularios)
const modalAgregarProducto = bootstrap.Modal.getOrCreateInstance(
  document.getElementById("modalAgregarProducto")
);
const modalActualizarProducto = bootstrap.Modal.getOrCreateInstance(
  document.getElementById("modalActualizarProducto")
);



// Función para actualizar estadísticas de stock
function actualizarEstadisticas() {
  const totalProductos = _cacheStock.length;
  const stockBajo = _cacheStock.filter(p => p.cantidad > 0 && p.cantidad <= 10).length;
  const stockAgotado = _cacheStock.filter(p => p.cantidad === 0).length;
  const stockOk = _cacheStock.filter(p => p.cantidad > 10).length;

  const totalProductosEl = document.getElementById('totalProductos');
  const stockBajoEl = document.getElementById('stockBajo');
  const stockAgotadoEl = document.getElementById('stockAgotado');
  const stockOkEl = document.getElementById('stockOk');

  if (totalProductosEl) totalProductosEl.textContent = totalProductos.toLocaleString('es-PY');
  if (stockBajoEl) stockBajoEl.textContent = stockBajo.toLocaleString('es-PY');
  if (stockAgotadoEl) stockAgotadoEl.textContent = stockAgotado.toLocaleString('es-PY');
  if (stockOkEl) stockOkEl.textContent = stockOk.toLocaleString('es-PY');
}

// Función para obtener badge de stock según cantidad
function obtenerBadgeStock(cantidad) {
  if (cantidad === 0) {
    return '<span class="badge bg-danger">Sin Stock</span>';
  } else if (cantidad <= 10) {
    return '<span class="badge bg-warning text-dark">Stock Bajo</span>';
  } else {
    return '<span class="badge bg-success">Disponible</span>';
  }
}

// Función para mostrar stock en la tabla
const mostrarStock = async (resetearPagina = true) => {
  if (USAR_DATATABLES) {
    // Usar DataTables moderno
    _cacheStock = await mostrarStockConDataTable(obtenerStock);

    // Actualizar estadísticas
    actualizarEstadisticas();

    // Poblar datalist para reposición
    const dl = document.getElementById('listaProductosReposicion');
    if (dl) {
      dl.innerHTML = _cacheStock.map(s => `<option value="${s.item}"></option>`).join('');
    }
    // Poblar datalist para salida (misma data)
    const dlSalida = document.getElementById('listaProductosSalida');
    if (dlSalida) {
      dlSalida.innerHTML = _cacheStock.map(s => `<option value="${s.item}"></option>`).join('');
    }
  } else {
    // Sistema manual original
    const stock = await obtenerStock();
    _cacheStock = stock;
    productosFiltrados = [...stock];

    // Actualizar estadísticas
    actualizarEstadisticas();

    if (resetearPagina) {
      paginaActual = 1;
    }

    renderizarPagina();
  }
};

// Función para renderizar una página específica
function renderizarPagina() {
  stockTable.innerHTML = "";

  // Ordenar productos
  const productosOrdenados = [...productosFiltrados].sort((a, b) => a.item.localeCompare(b.item));

  // Calcular índices de paginación
  const totalProductos = productosOrdenados.length;
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina);
  const indiceInicio = (paginaActual - 1) * productosPorPagina;
  const indiceFin = Math.min(indiceInicio + productosPorPagina, totalProductos);

  // Obtener productos de la página actual
  const productosPagina = productosOrdenados.slice(indiceInicio, indiceFin);

  // Si no hay productos
  if (productosPagina.length === 0) {
    stockTable.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          No hay productos para mostrar
        </td>
      </tr>
    `;
    actualizarInfoPaginacion(0, 0, 0);
    return;
  }

  // Construir HTML de la página
  let htmlRows = '';
  for (let i = 0; i < productosPagina.length; i++) {
    const item = productosPagina[i];
    const numeroGlobal = indiceInicio + i + 1; // Número global del producto

    // Determinar clase de fila según stock
    let filaClase = '';
    if (item.cantidad === 0) {
      filaClase = 'table-danger';
    } else if (item.cantidad <= 10) {
      filaClase = 'table-warning';
    }

    htmlRows += `
      <tr class="${filaClase}">
        <td>${numeroGlobal}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <span>${item.item}</span>
            ${obtenerBadgeStock(item.cantidad)}
          </div>
        </td>
        <td><span class="badge bg-secondary">${item.categoria}</span></td>
        <td><code class="text-muted">${item.codigoBarra}</code></td>
        <td class="text-center">
          <strong class="${item.cantidad === 0 ? 'text-danger' : item.cantidad <= 10 ? 'text-warning' : 'text-success'}">
            ${Number(item.cantidad).toLocaleString("es-PY")}
          </strong>
        </td>
        <td class="text-end">${formatGs(item.costoCompra)}</td>
        <td class="text-end">${formatGs(item.costo)}</td>
        <td class="text-center">
          <button data-id="${item.id}" class="btn btn-sm btn-warning btn-editar-stock" title="Editar">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button data-id="${item.id}" class="btn btn-sm btn-danger btn-eliminar-stock" title="Eliminar">
            <i class="bi bi-trash3"></i>
          </button>
        </td>
      </tr>
    `;
  }

  stockTable.innerHTML = htmlRows;

  // Asignar eventos a los botones
  asignarEventosBotones();

  // Actualizar controles de paginación
  actualizarPaginacion(totalPaginas);
  actualizarInfoPaginacion(indiceInicio + 1, indiceFin, totalProductos);
}

// Función para actualizar controles de paginación
function actualizarPaginacion(totalPaginas) {
  const paginacionControles = document.getElementById('paginacionControles');
  if (!paginacionControles) return;

  let htmlPaginacion = '';

  // Botón Anterior
  htmlPaginacion += `
    <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-pagina="${paginaActual - 1}">Anterior</a>
    </li>
  `;

  // Números de página (mostrar máximo 5 páginas)
  const maxBotones = 5;
  let paginaInicio = Math.max(1, paginaActual - Math.floor(maxBotones / 2));
  let paginaFin = Math.min(totalPaginas, paginaInicio + maxBotones - 1);

  // Ajustar si estamos cerca del final
  if (paginaFin - paginaInicio < maxBotones - 1) {
    paginaInicio = Math.max(1, paginaFin - maxBotones + 1);
  }

  // Primera página si no está visible
  if (paginaInicio > 1) {
    htmlPaginacion += `
      <li class="page-item">
        <a class="page-link" href="#" data-pagina="1">1</a>
      </li>
    `;
    if (paginaInicio > 2) {
      htmlPaginacion += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  // Páginas numeradas
  for (let i = paginaInicio; i <= paginaFin; i++) {
    htmlPaginacion += `
      <li class="page-item ${i === paginaActual ? 'active' : ''}">
        <a class="page-link" href="#" data-pagina="${i}">${i}</a>
      </li>
    `;
  }

  // Última página si no está visible
  if (paginaFin < totalPaginas) {
    if (paginaFin < totalPaginas - 1) {
      htmlPaginacion += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    htmlPaginacion += `
      <li class="page-item">
        <a class="page-link" href="#" data-pagina="${totalPaginas}">${totalPaginas}</a>
      </li>
    `;
  }

  // Botón Siguiente
  htmlPaginacion += `
    <li class="page-item ${paginaActual === totalPaginas ? 'disabled' : ''}">
      <a class="page-link" href="#" data-pagina="${paginaActual + 1}">Siguiente</a>
    </li>
  `;

  paginacionControles.innerHTML = htmlPaginacion;

  // Asignar eventos a los botones de paginación
  paginacionControles.querySelectorAll('a.page-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const nuevaPagina = parseInt(link.getAttribute('data-pagina'));
      if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas && nuevaPagina !== paginaActual) {
        paginaActual = nuevaPagina;
        renderizarPagina();
        // Scroll suave hacia arriba
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

// Función para actualizar información de paginación
function actualizarInfoPaginacion(inicio, fin, total) {
  const infoPaginacion = document.getElementById('infoPaginacion');
  if (!infoPaginacion) return;

  infoPaginacion.textContent = `Mostrando ${inicio} - ${fin} de ${total} productos`;
}

// evento de submit para actualizar PRECIO DE VENTA únicamente (Precio Compra deshabilitado)
actualizarStockForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    // Convertir el costo de string a number usando parseGs
    const costoInput = document.getElementById("actualizarCostoStock");
    const costo = parseGs(costoInput.value);
    const costoCompraInput = document.getElementById("actualizarPrecioCompraStock");
    const costoCompra = parseGs(costoCompraInput.value);
    const stockMinimo = Number(document.getElementById("actualizarStockMinimo").value) || 10;

    const stockData = { costo, costoCompra, stockMinimo };

    await actualizarStockporId(idStock, stockData);
    modalActualizarProducto.hide();

    showSuccess("✅ Stock actualizado correctamente");

    await mostrarStock();
  } catch (error) {
    console.error("Error al actualizar stock:", error);
    showError("❌ Error al actualizar el stock. Por favor, intente nuevamente.");
  }
});

// Evento submit para registrar stock
registrarStockForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const FechaDeRegistro = dayjs().format("DD/MM/YYYY, h:mm:ss A"); // legacy string
    // registrar item con mayúsculas y evitar espacio en blanco
    const item = document.getElementById("nuevoItemStock").value.trim().toUpperCase();
    const categoria = document.getElementById("nuevoCategoriaStock").value;
    const codigoBarra = document.getElementById("nuevoCodigoBarraStock").value;
    const cantidad = Number(document.getElementById("nuevoCantidadStock").value);

    // Validaciones
    if (!item || item.length === 0) {
      alertaAdvertencia("⚠️ Campo requerido", "El nombre del producto es obligatorio");
      return;
    }

    if (!codigoBarra || codigoBarra.length === 0) {
      alertaAdvertencia("⚠️ Campo requerido", "El código de barra es obligatorio");
      return;
    }

    if (cantidad < 0) {
      alertaAdvertencia("⚠️ Cantidad inválida", "La cantidad no puede ser negativa");
      return;
    }

    // Convertir el costo de string a number usando parseGs
    const costo = parseGs(document.getElementById("nuevoCostoStock").value);
    const costoCompra = parseGs(document.getElementById("nuevoPrecioCompraStock").value);
    const stockMinimo = Number(document.getElementById("nuevoStockMinimo").value) || 10;

    const stockData = { FechaDeRegistro, item, codigoBarra, categoria, cantidad, costo, costoCompra, stockMinimo };

    // Verificar si el codigo de barra ya existe en el stock
    const obtenerStockTotal = await obtenerStock();
    if (obtenerStockTotal.some((item) => item.codigoBarra === codigoBarra)) {
      alertaAdvertencia("⚠️ Código duplicado", "El código de barra ya existe en el stock");
      return;
    }

    // ⚡ Cerrar modal "Agregar Producto"
    modalAgregarProducto.hide();

    // ⚡ Mostrar notificación de carga
    const loadingToast = showLoading("Agregando stock...");

    await registrarStock(stockData);

    // ⚡ Registrar stock en Firebase
    hideLoading(loadingToast);
    showSuccess("✅ Stock agregado correctamente");

    registrarStockForm.reset();
    await mostrarStock();
  } catch (error) {
    console.error("Error al registrar stock:", error);
    showError("❌ Error al registrar el stock. Por favor, intente nuevamente.");
  }
});

// Atajos de teclado
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K para enfocar búsqueda
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const buscarInput = document.getElementById('buscarProducto');
    if (buscarInput) {
      buscarInput.focus();
      buscarInput.select();
    }
  }

  // Ctrl/Cmd + N para agregar producto (solo admin)
  if ((e.ctrlKey || e.metaKey) && e.key === 'n' && document.querySelector('.solo-admin')) {
    e.preventDefault();
    const btnAgregar = document.getElementById('btnAgregar');
    if (btnAgregar && !btnAgregar.disabled) {
      btnAgregar.click();
    }
  }

  // Escape para cerrar modales
  if (e.key === 'Escape') {
    const modalesAbiertos = document.querySelectorAll('.modal.show');
    modalesAbiertos.forEach(modal => {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) modalInstance.hide();
    });
  }
});

// Cargar stock al iniciar
window.addEventListener("DOMContentLoaded", async () => {
  const loadingToast = showLoading("Obteniendo stock...");
  await mostrarStock();
  hideLoading(loadingToast);

  // Mejorar el datalist de reposición
  mejorarDatalist('reposicionProducto', 'listaProductosReposicion');
  // Mejorar el datalist de salida (autocomplete)
  mejorarDatalist('salidaProducto', 'listaProductosSalida');

  // Configurar eventos de DataTables si está activado
  if (USAR_DATATABLES) {
    configurarEventosDataTable({
      onEditar: async (id) => {
        idStock = id;
        const stock = await obtenerStockPorId(id);

        document.getElementById("actualizarItemStock").value = stock.item;
        document.getElementById("actualizarCategoriaStock").value = stock.categoria;
        document.getElementById("actualizarCodigoBarraStock").value = stock.codigoBarra;
        document.getElementById("actualizarCostoStock").value = Number(stock.costo).toLocaleString("es-PY");
        document.getElementById("actualizarPrecioCompraStock").value = Number(stock.costoCompra).toLocaleString("es-PY");

        modalActualizarProducto.show();
      },
      onEliminar: async (id) => {
        await eliminarStockPorID(id);
        showSuccess("✅ Stock eliminado correctamente");
        await mostrarStock();
      }
    });
  }
});

// 🔍 Funcionalidad de búsqueda de productos (optimizada con debouncing)
const buscarProductoInput = document.getElementById('buscarProducto');
let timeoutBusqueda = null; // Para debouncing
let buscandoActivo = false; // Indicador de búsqueda activa

if (buscarProductoInput) {
  buscarProductoInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();

    // Limpiar timeout anterior
    if (timeoutBusqueda) {
      clearTimeout(timeoutBusqueda);
    }

    // Si está vacío, mostrar todos inmediatamente
    if (!searchTerm) {
      buscandoActivo = false;
      productosFiltrados = [..._cacheStock];
      paginaActual = 1;
      actualizarEstadisticas(); // Restaurar estadísticas completas
      renderizarPagina();
      return;
    }

    // Mostrar indicador de búsqueda si hay muchos productos
    if (_cacheStock.length > 100 && !buscandoActivo) {
      buscandoActivo = true;
      stockTable.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted py-3">
            <div class="spinner-border spinner-border-sm me-2" role="status">
              <span class="visually-hidden">Buscando...</span>
            </div>
            Buscando...
          </td>
        </tr>
      `;
    }

    // Esperar 300ms después de la última tecla antes de filtrar
    timeoutBusqueda = setTimeout(() => {
      filtrarProductos(searchTerm, e.target.value);
      buscandoActivo = false;
    }, 300);
  });
}

// Función separada para filtrar productos (optimizada)
function filtrarProductos(searchTerm, valorOriginal) {
  const startTime = performance.now(); // Medir rendimiento

  // Filtrar productos (optimizado para grandes conjuntos de datos)
  const resultados = [];
  const searchTermLower = searchTerm; // Ya viene en minúsculas

  for (let i = 0; i < _cacheStock.length; i++) {
    const producto = _cacheStock[i];
    if (
      producto.item.toLowerCase().includes(searchTermLower) ||
      producto.categoria.toLowerCase().includes(searchTermLower) ||
      producto.codigoBarra.toString().includes(searchTermLower)
    ) {
      resultados.push(producto);
    }
  }

  // Actualizar productos filtrados
  productosFiltrados = resultados;
  paginaActual = 1; // Resetear a primera página

  // Actualizar estadísticas con resultados filtrados
  const totalProductos = resultados.length;
  const stockBajo = resultados.filter(p => p.cantidad > 0 && p.cantidad <= 10).length;
  const stockAgotado = resultados.filter(p => p.cantidad === 0).length;
  const stockOk = resultados.filter(p => p.cantidad > 10).length;

  const totalProductosEl = document.getElementById('totalProductos');
  const stockBajoEl = document.getElementById('stockBajo');
  const stockAgotadoEl = document.getElementById('stockAgotado');
  const stockOkEl = document.getElementById('stockOk');

  if (totalProductosEl) totalProductosEl.textContent = totalProductos.toLocaleString('es-PY');
  if (stockBajoEl) stockBajoEl.textContent = stockBajo.toLocaleString('es-PY');
  if (stockAgotadoEl) stockAgotadoEl.textContent = stockAgotado.toLocaleString('es-PY');
  if (stockOkEl) stockOkEl.textContent = stockOk.toLocaleString('es-PY');

  // Si no hay resultados
  if (resultados.length === 0) {
    stockTable.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-5">
          <i class="bi bi-search fs-1 d-block mb-3 opacity-50"></i>
          <p class="mb-0">No se encontraron productos con "<strong>${valorOriginal}</strong>"</p>
          <small class="text-muted">Intenta con otro término de búsqueda</small>
        </td>
      </tr>
    `;
    actualizarInfoPaginacion(0, 0, 0);
    document.getElementById('paginacionControles').innerHTML = '';
    return;
  }

  // Renderizar página con resultados
  renderizarPagina();

  // Log de rendimiento (solo en desarrollo)
  const endTime = performance.now();
  console.log(`🔍 Búsqueda completada: ${resultados.length} resultados en ${Math.round(endTime - startTime)}ms`);
}

// Función para asignar eventos a los botones de editar/eliminar
function asignarEventosBotones() {
  // Eliminar stock
  const botonesEliminar = document.querySelectorAll(".btn-eliminar-stock");
  botonesEliminar.forEach((boton) => {
    boton.addEventListener("click", async () => {
      const id = boton.getAttribute("data-id");
      await eliminarStockPorID(id);

      showSuccess("✅ Stock eliminado correctamente");

      await mostrarStock();
      // Limpiar búsqueda
      if (buscarProductoInput) buscarProductoInput.value = '';
    });
  });

  // Actualizar stock
  const botonesActualizar = document.querySelectorAll(".btn-editar-stock");
  botonesActualizar.forEach((boton) => {
    boton.addEventListener("click", async () => {
      idStock = boton.getAttribute("data-id");
      modalActualizarProducto.show();

      const item = await obtenerStockPorId(idStock);
      if (item) {
        document.getElementById("actualizarItemStock").value = item.item;
        document.getElementById("actualizarCategoriaStock").value = item.categoria;
        document.getElementById("actualizarCodigoBarraStock").value = item.codigoBarra;
        document.getElementById("actualizarCostoStock").value = Number(item.costo).toLocaleString("es-PY");
        document.getElementById("actualizarPrecioCompraStock").value = Number(item.costoCompra).toLocaleString("es-PY");
        document.getElementById("actualizarStockMinimo").value = item.stockMinimo || 10;
      }
    });
  });
}

// Actualizar también en el código de DataTables
if (USAR_DATATABLES) {
  configurarEventosDataTable({
    onEditar: async (id) => {
      idStock = id;
      const stock = await obtenerStockPorId(id);

      document.getElementById("actualizarItemStock").value = stock.item;
      document.getElementById("actualizarCategoriaStock").value = stock.categoria;
      document.getElementById("actualizarCodigoBarraStock").value = stock.codigoBarra;
      document.getElementById("actualizarCostoStock").value = Number(stock.costo).toLocaleString("es-PY");
      document.getElementById("actualizarPrecioCompraStock").value = Number(stock.costoCompra).toLocaleString("es-PY");
      document.getElementById("actualizarStockMinimo").value = stock.stockMinimo || 10;

      modalActualizarProducto.show();
    },
    onEliminar: async (id) => {
      await eliminarStockPorID(id);
      showSuccess("✅ Stock eliminado correctamente");
      await mostrarStock();
    }
  });
}

// parseGs y formatGs ahora se importan de utils.js

const renderReposicionTabla = () => {
  if (!reposicionTable) return;
  reposicionTable.innerHTML = '';
  reposicionLista.forEach((it, idx) => {
    reposicionTable.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${it.item}</td>
        <td class="text-center">${it.cantidad}</td>
        <td class="text-end">${formatGs(it.costoCompra)}</td>
        <td class="text-end">${formatGs(it.costo)}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-idx="${idx}">Eliminar</button></td>
      </tr>`);
  });
  const enabled = reposicionLista.length > 0;
  if (btnConfirmarReposicion) btnConfirmarReposicion.disabled = !enabled;
  if (btnCancelarReposicion) btnCancelarReposicion.disabled = !enabled;

  // bind eliminar
  reposicionTable.querySelectorAll('button[data-idx]')?.forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-idx'));
      reposicionLista.splice(i, 1);
      renderReposicionTabla();
    });
  });
};

// Helpers Salida
const renderSalidaTabla = () => {
  if (!salidaTable) return;
  salidaTable.innerHTML = '';
  salidaLista.forEach((it, idx) => {
    salidaTable.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${it.item}</td>
        <td class="text-center">${it.cantidad}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-idx="${idx}">Eliminar</button></td>
      </tr>`);
  });
  const enabled = salidaLista.length > 0;
  if (btnConfirmarSalida) btnConfirmarSalida.disabled = !enabled;
  if (btnCancelarSalida) btnCancelarSalida.disabled = !enabled;

  // bind eliminar
  salidaTable.querySelectorAll('button[data-idx]')?.forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-idx'));
      salidaLista.splice(i, 1);
      renderSalidaTabla();
    });
  });
};

// Formateo de precios en inputs de reposición (usando función reutilizable)
formatearInputPrecio(reposicionPrecioCompra);
formatearInputPrecio(reposicionPrecioVenta);

// Auto-completar precios al seleccionar producto
if (reposicionProducto) {
  reposicionProducto.addEventListener('change', () => {
    const nombre = reposicionProducto.value.trim();
    const base = _cacheStock.find(s => String(s.item).toUpperCase() === nombre.toUpperCase());
    if (base) {
      if (reposicionPrecioCompra) {
        reposicionPrecioCompra.value = Number(base.costoCompra || 0).toLocaleString("es-PY");
      }
      if (reposicionPrecioVenta) {
        reposicionPrecioVenta.value = Number(base.costo || 0).toLocaleString("es-PY");
      }
    }
  });
}

// Agregar item a la nota
if (formAgregarItemReposicion) {
  formAgregarItemReposicion.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const nombre = reposicionProducto.value.trim();
      if (!nombre) {
        showWarning('⚠️ Debe seleccionar un producto');
        reposicionProducto.focus();
        return;
      }

      const base = _cacheStock.find(s => String(s.item).toUpperCase() === nombre.toUpperCase());
      if (!base) {
        showWarning('⚠️ Producto no encontrado en stock');
        reposicionProducto.focus();
        return;
      }

      const cant = Number(reposicionCantidad.value);
      if (!cant || cant <= 0) {
        showWarning('⚠️ Cantidad inválida. Debe ser mayor a 0');
        reposicionCantidad.focus();
        return;
      }

      // Si el usuario ingresó precios, usarlos; sino, usar los del producto
      let cc = base.costoCompra || 0;
      let cv = base.costo || 0;

      if (reposicionPrecioCompra && reposicionPrecioCompra.value.trim()) {
        cc = parseGs(reposicionPrecioCompra.value);
      }
      if (reposicionPrecioVenta && reposicionPrecioVenta.value.trim()) {
        cv = parseGs(reposicionPrecioVenta.value);
      }

      const existente = reposicionLista.find(it => it.id === base.id);
      if (existente) {
        existente.cantidad += cant;
        existente.costoCompra = cc;
        existente.costo = cv;
      } else {
        reposicionLista.push({ id: base.id, item: base.item, cantidad: cant, costoCompra: cc, costo: cv });
      }

      // Limpiar formulario
      reposicionProducto.value = '';
      reposicionCantidad.value = '1';
      if (reposicionPrecioCompra) reposicionPrecioCompra.value = '';
      if (reposicionPrecioVenta) reposicionPrecioVenta.value = '';
      reposicionProducto.focus();
      renderReposicionTabla();
    } catch (error) {
      console.error('Error al agregar item a reposición:', error);
      showError('❌ Error al agregar el item. Por favor, intente nuevamente.');
    }
  });
}

// --- SALIDA: agregar item a la nota de salida ---
const formAgregarItemSalida = document.getElementById('formAgregarItemSalida');
const salidaProducto = document.getElementById('salidaProducto');
const salidaCantidad = document.getElementById('salidaCantidad');
const salidaDescripcion = document.getElementById('salidaDescripcion');

if (formAgregarItemSalida) {
  formAgregarItemSalida.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const nombre = salidaProducto.value.trim();
      if (!nombre) {
        showWarning('⚠️ Debe seleccionar un producto');
        salidaProducto.focus();
        return;
      }

      const base = _cacheStock.find(s => String(s.item).toUpperCase() === nombre.toUpperCase());
      if (!base) {
        showWarning('⚠️ Producto no encontrado en stock');
        salidaProducto.focus();
        return;
      }

      const cant = Number(salidaCantidad.value);
      if (!cant || cant <= 0) {
        showWarning('⚠️ Cantidad inválida. Debe ser mayor a 0');
        salidaCantidad.focus();
        return;
      }

      // Validar que haya stock suficiente
      if (base.cantidad < cant) {
        showWarning(`⚠️ Stock insuficiente. Solo hay ${base.cantidad} unidades disponibles`);
        salidaCantidad.focus();
        return;
      }

      const existente = salidaLista.find(it => it.id === base.id);
      if (existente) {
        const nuevaCantidad = existente.cantidad + cant;
        // Validar stock total si ya existe en la lista
        if (base.cantidad < nuevaCantidad) {
          showWarning(`⚠️ Stock insuficiente. Solo hay ${base.cantidad} unidades disponibles`);
          return;
        }
        existente.cantidad = nuevaCantidad;
      } else {
        salidaLista.push({ id: base.id, item: base.item, cantidad: cant });
      }

      // Limpiar formulario
      salidaProducto.value = '';
      salidaCantidad.value = '1';
      salidaProducto.focus();
      renderSalidaTabla();
    } catch (error) {
      console.error('Error al agregar item a salida:', error);
      showError('❌ Error al agregar el item. Por favor, intente nuevamente.');
    }
  });
}

// Cancelar salida
if (btnCancelarSalida) {
  btnCancelarSalida.addEventListener('click', () => {
    salidaLista = [];
    renderSalidaTabla();
  });
}

// Confirmar salida: transacción y registro
if (btnConfirmarSalida) {
  btnConfirmarSalida.addEventListener('click', async () => {
    if (salidaLista.length === 0) {
      showWarning('⚠️ No hay items para procesar');
      return;
    }

    try {
      const itemsTx = salidaLista.map(r => ({ id: r.id, cantidad: r.cantidad }));

      // Validar que todos los items tengan cantidad válida
      const itemsInvalidos = itemsTx.filter(item => !item.cantidad || item.cantidad <= 0);
      if (itemsInvalidos.length > 0) {
        showError('❌ Hay items con cantidades inválidas');
        return;
      }

      // descontar stock en una transacción
      await descontarStockTransaccional(itemsTx);

      // registrar nota de salida
      const totalItems = salidaLista.reduce((acc, it) => acc + Number(it.cantidad), 0);
      const usuario = (document.getElementById('usuarioLogueado')?.textContent || '').trim();
      const descripcion = (salidaDescripcion?.value || '').trim();
      const nota = {
        fecha: dayjs().format('DD/MM/YYYY HH:mm:ss'),
        usuario,
        descripcion,
        items: salidaLista,
        totalItems
      };
      await registrarSalida(nota);

      // limpiar y refrescar
      salidaLista = [];
      if (salidaDescripcion) salidaDescripcion.value = '';
      renderSalidaTabla();
      await mostrarStock();
      showSuccess('✅ Salida registrada correctamente');
    } catch (err) {
      console.error('Error al procesar salida:', err);
      showError('❌ Error al procesar la salida. Por favor, intente nuevamente.');
    }
  });
}

// Cancelar nota
if (btnCancelarReposicion) {
  btnCancelarReposicion.addEventListener('click', () => {
    reposicionLista = [];
    renderReposicionTabla();
  });
}

// Confirmar reposición
if (btnConfirmarReposicion) {
  btnConfirmarReposicion.addEventListener('click', async () => {
    if (reposicionLista.length === 0) {
      showWarning('⚠️ No hay items para procesar');
      return;
    }

    try {
      // Validar que todos los items tengan cantidad válida
      const itemsInvalidos = reposicionLista.filter(item => !item.cantidad || item.cantidad <= 0);
      if (itemsInvalidos.length > 0) {
        showError('❌ Hay items con cantidades inválidas');
        return;
      }

      const itemsTx = reposicionLista.map(r => ({
        id: r.id,
        cantidad: r.cantidad,
        costoCompra: r.costoCompra || 0,
        costo: r.costo || 0
      }));

      // sumar stock en una transacción y actualizar precios
      await sumarStockTransaccional(itemsTx);

      // registrar nota
      const totalCompra = reposicionLista.reduce((acc, it) => acc + (Number(it.costoCompra) || 0) * Number(it.cantidad), 0);
      const totalItems = reposicionLista.reduce((acc, it) => acc + Number(it.cantidad), 0);
      const usuario = (document.getElementById('usuarioLogueado')?.textContent || '').trim();
      const nota = {
        fecha: dayjs().format('DD/MM/YYYY HH:mm:ss'),
        usuario,
        items: reposicionLista,
        totalCompra,
        totalItems
      };
      await registrarReposicion(nota);

      // limpiar y refrescar
      reposicionLista = [];
      renderReposicionTabla();
      await mostrarStock();
      showSuccess('✅ Reposición registrada correctamente');
    } catch (err) {
      console.error('Error al procesar reposición:', err);
      showError('❌ Error al procesar la reposición. Por favor, intente nuevamente.');
    }
  });
}

// Historial: cargar al abrir modal
const modalHistorial = document.getElementById('modalHistorialReposiciones');
if (modalHistorial) {
  modalHistorial.addEventListener('show.bs.modal', async () => {
    const tbody = document.getElementById('historialReposicionesTable');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Cargando...</td></tr>';
    const notas = await obtenerReposiciones(50);
    if (!notas.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin registros</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    notas.forEach(n => {
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${n.fecha || '-'}</td>
          <td>${n.usuario || '-'}</td>
          <td>${n.totalItems || (n.items?.length || 0)}</td>
          <td class="text-end">${formatGs(n.totalCompra || 0)}</td>
          <td class="text-end">
            <div class="btn-group" role="group">
              <button class="btn btn-sm btn-outline-primary" data-note-id="${n.id}" data-note-type="reposicion" data-action="ver">
                <i class="bi bi-eye"></i> Ver
              </button>
              <button class="btn btn-sm btn-outline-danger" data-note-id="${n.id}" data-note-type="reposicion" data-action="eliminar">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>`);
      // Attach click handlers
      const btnVer = tbody.querySelector(`button[data-note-id="${n.id}"][data-action="ver"]`);
      if (btnVer) btnVer.addEventListener('click', () => mostrarDetalleNotaModal(n, 'reposicion'));
      
      const btnEliminar = tbody.querySelector(`button[data-note-id="${n.id}"][data-action="eliminar"]`);
      if (btnEliminar) btnEliminar.addEventListener('click', () => eliminarReposicionHandler(n));
    });
  });
}

// Historial Salidas
const modalHistorialSalidas = document.getElementById('modalHistorialSalidas');
if (modalHistorialSalidas) {
  modalHistorialSalidas.addEventListener('show.bs.modal', async () => {
    const tbody = document.getElementById('historialSalidasTable');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Cargando...</td></tr>';
    const notas = await obtenerSalidas(50);
    if (!notas.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin registros</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    notas.forEach(n => {
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${n.fecha || '-'}</td>
          <td>${n.usuario || '-'}</td>
          <td>${(n.descripcion && n.descripcion.length > 80) ? n.descripcion.slice(0, 80) + '...' : (n.descripcion || '-')}</td>
          <td>${n.totalItems || (n.items?.length || 0)}</td>
          <td class="text-end">
            <div class="btn-group" role="group">
              <button class="btn btn-sm btn-outline-primary" data-note-id="${n.id}" data-note-type="salida" data-action="ver">
                <i class="bi bi-eye"></i> Ver
              </button>
              <button class="btn btn-sm btn-outline-danger" data-note-id="${n.id}" data-note-type="salida" data-action="eliminar">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>`);
      // Attach click handlers
      const btnVer = tbody.querySelector(`button[data-note-id="${n.id}"][data-action="ver"]`);
      if (btnVer) btnVer.addEventListener('click', () => mostrarDetalleNotaModal(n, 'salida'));
      
      const btnEliminar = tbody.querySelector(`button[data-note-id="${n.id}"][data-action="eliminar"]`);
      if (btnEliminar) btnEliminar.addEventListener('click', () => eliminarSalidaHandler(n));
    });
  });
}

// Mostrar detalle de nota en modal reutilizable
function mostrarDetalleNotaModal(nota, tipo) {
  try {
    const modalEl = document.getElementById('modalDetalleNota');
    if (!modalEl) return;
    document.getElementById('detalleNotaTitle').textContent = tipo === 'reposicion' ? 'Detalle Nota de Reposición' : 'Detalle Nota de Salida';
    document.getElementById('detalleNotaFecha').textContent = nota.fecha || '-';
    document.getElementById('detalleNotaUsuario').textContent = nota.usuario || '-';
    document.getElementById('detalleNotaDescripcion').textContent = nota.descripcion || (nota.totalCompra ? `Total Compra: ${formatGs(nota.totalCompra)}` : '-');
    const tbody = document.getElementById('detalleNotaItemsBody');
    tbody.innerHTML = '';
    (nota.items || []).forEach(it => {
      const cantidad = it.cantidad || it.cant || 0;
      tbody.insertAdjacentHTML('beforeend', `<tr><td>${it.item || it.nombre || '-'}</td><td class="text-center">${cantidad}</td></tr>`);
    });
    // Guardar la nota actualmente mostrada para acciones (ej: imprimir)
    window._notaActualDetalle = { nota, tipo };
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  } catch (e) {
    console.error('Error mostrando detalle de nota:', e);
  }
}

// Handler para eliminar reposición
async function eliminarReposicionHandler(nota) {
  try {
    const confirmado = await Swal.fire({
      title: '¿Eliminar nota de reposición?',
      html: `Se eliminará la nota del <strong>${nota.fecha || 'fecha desconocida'}</strong>.<br><small class="text-muted">Esta acción no se puede deshacer</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-trash me-1"></i> Sí, eliminar',
      cancelButtonText: '<i class="bi bi-x-circle me-1"></i> Cancelar',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d'
    });
    
    if (!confirmado.isConfirmed) return;
    
    if (!confirmado) return;

    // Mostrar loading
    const loading = Swal.fire({
      title: 'Eliminando...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    await eliminarReposicion(nota.id);

    await Swal.fire({
      icon: 'success',
      title: '¡Eliminado!',
      text: 'La nota de reposición ha sido eliminada correctamente',
      timer: 2000,
      showConfirmButton: false
    });

    // Recargar el historial
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalHistorialReposiciones'));
    if (modal) {
      modal.hide();
      setTimeout(() => {
        modal.show();
      }, 300);
    }
  } catch (error) {
    console.error('Error al eliminar reposición:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo eliminar la nota de reposición. Intenta nuevamente.',
      confirmButtonText: 'Aceptar'
    });
  }
}

// Handler para eliminar salida
async function eliminarSalidaHandler(nota) {
  try {
    const confirmado = await Swal.fire({
      title: '¿Eliminar nota de salida?',
      html: `Se eliminará la nota del <strong>${nota.fecha || 'fecha desconocida'}</strong>.<br><small class="text-muted">Esta acción no se puede deshacer</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-trash me-1"></i> Sí, eliminar',
      cancelButtonText: '<i class="bi bi-x-circle me-1"></i> Cancelar',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d'
    });
    
    if (!confirmado.isConfirmed) return;
    
    if (!confirmado) return;

    // Mostrar loading
    const loading = Swal.fire({
      title: 'Eliminando...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    await eliminarSalida(nota.id);

    await Swal.fire({
      icon: 'success',
      title: '¡Eliminado!',
      text: 'La nota de salida ha sido eliminada correctamente',
      timer: 2000,
      showConfirmButton: false
    });

    // Recargar el historial
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalHistorialSalidas'));
    if (modal) {
      modal.hide();
      setTimeout(() => {
        modal.show();
      }, 300);
    }
  } catch (error) {
    console.error('Error al eliminar salida:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo eliminar la nota de salida. Intenta nuevamente.',
      confirmButtonText: 'Aceptar'
    });
  }
}

// Generar ticket imprimible desde una nota (reposicion o salida)
export function generarTicketDesdeNota(nota, tipo) {
  try {
    const fecha = nota.fecha || dayjs().format('DD/MM/YYYY HH:mm:ss');
    const usuario = nota.usuario || '-';
    const descripcion = nota.descripcion || '';

    const itemsHtml = (nota.items || []).map(it => {
      const cantidad = it.cantidad || it.cant || 0;
      return `<tr><td class="ticket-qty">${cantidad}</td><td class="ticket-desc">${it.item || it.nombre || '-'}</td></tr>`;
    }).join('');

    const totalItems = nota.totalItems || (nota.items || []).reduce((s, it) => s + (Number(it.cantidad) || 0), 0);

    const ticketBody = `
      <div class="ticket-container">
        <div class="ticket-header ticket-center" style="border-bottom:2px solid #000;padding-bottom:1.5mm;margin-bottom:1.5mm;">
          <div class="ticket-bold" style="font-size:15px;letter-spacing:1px;">Petro Chaco Criolla</div>
          <div class="ticket-small">Nota: ${tipo === 'reposicion' ? 'Reposición' : 'Salida'}</div>
        </div>
        <div style="font-size:11px;text-align:left;margin-bottom:1.5mm;line-height:1.3;">
          <span class="ticket-bold">Fecha:</span> ${fecha}<br>
          <span class="ticket-bold">Usuario:</span> ${usuario}<br>
          ${descripcion ? `<span class="ticket-bold">Descripción:</span> ${descripcion}<br>` : ''}
        </div>
        <div style="border-bottom:1px dashed #000;margin-bottom:1.5mm;"></div>
        <table class="ticket-items">
          <thead>
            <tr>
              <th class="ticket-qty">Cant</th>
              <th class="ticket-desc">Producto</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div style="border-bottom:1px dashed #000;margin-bottom:1.5mm;"></div>
        <div class="ticket-total-row" style="background:#f5f5f5;border-radius:1.5mm;padding:1.2mm 0 1.2mm 0;margin-bottom:1.5mm;">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:0.5mm;">
            <span class="ticket-bold">Items</span>
            <span class="ticket-right">${totalItems}</span>
          </div>
        </div>
        <div class="ticket-msg" id="ticket-msg" style="margin-top:2mm;">Documento interno</div>
      </div>
    `;

    // Construir un documento HTML mínimo y abrirlo en una nueva ventana para imprimir.
    const fullHtml = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Ticket</title>
          <style>
            @media print { @page { size: 70mm auto; margin: 0; } body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            body{ margin:0; padding:0; background:#fff; color:#000; }
            .ticket-container{ width:70mm; box-sizing:border-box; padding:4px 4px; font-family: 'Courier New', monospace; font-size:12px; line-height:1.3; }
            .ticket-header{ margin-bottom:6px; }
            .ticket-center{ text-align:center; }
            .ticket-bold{ font-weight:700; }
            .ticket-items{ width:100%; border-collapse:collapse; margin:6px 0; }
            .ticket-items th, .ticket-items td{ padding:4px 2px; text-align:left; }
            .ticket-qty{ width:15%; text-align:center; }
            .ticket-desc{ width:85%; }
          </style>
        </head>
        <body>
          ${ticketBody}
        </body>
      </html>`;

    const printWin = window.open('', '_blank', 'toolbar=0,location=0,menubar=0,width=400,height=800');
    if (!printWin) {
      showInfo('No se pudo abrir la ventana de impresión. Revisa el bloqueador de ventanas emergentes.');
      return;
    }

    printWin.document.open();
    printWin.document.write(fullHtml);
    printWin.document.close();
    printWin.focus();

    // Esperar un momento para que el navegador renderice la ventana de impresión
    setTimeout(() => {
      try {
        printWin.print();
      } catch (e) {
        console.error('Error al imprimir desde ventana:', e);
      }
      // Cerrar la ventana automáticamente unos instantes después de imprimir
      setTimeout(() => {
        try { printWin.close(); } catch (e) { /* ignore */ }
      }, 600);
    }, 500);

  } catch (e) {
    console.error('Error generando ticket desde nota (fallback):', e);
  }
}

// Botón imprimir en modal detalle
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnImprimirNota');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = window._notaActualDetalle;
    if (!current || !current.nota) {
      showInfo('No hay nota seleccionada para imprimir');
      return;
    }
    generarTicketDesdeNota(current.nota, current.tipo);
  });
});

// Función para generar ticket de stock por categoría
function generarTicketStockPorCategoria(categoria, productos) {
  try {
    const fecha = dayjs().format('DD/MM/YYYY HH:mm:ss');
    const usuario = (document.getElementById('usuarioLogueado')?.textContent || '').trim() || '-';
    
    // Ordenar productos por nombre
    const productosOrdenados = productos.sort((a, b) => {
      const nombreA = (a.item || '').toUpperCase();
      const nombreB = (b.item || '').toUpperCase();
      return nombreA.localeCompare(nombreB);
    });

    const itemsHtml = productosOrdenados.map(producto => {
      const cantidad = producto.cantidad || 0;
      const nombre = producto.item || '-';
      return `<tr><td class="ticket-qty">${cantidad}</td><td class="ticket-desc">${nombre}</td></tr>`;
    }).join('');

    const totalItems = productos.length;
    const totalCantidad = productos.reduce((sum, p) => sum + (Number(p.cantidad) || 0), 0);

    const ticketBody = `
      <div class="ticket-container">
        <div class="ticket-header ticket-center" style="border-bottom:2px solid #000;padding-bottom:1.5mm;margin-bottom:1.5mm;">
          <div class="ticket-bold" style="font-size:15px;letter-spacing:1px;">Petro Chaco Criolla</div>
          <div class="ticket-small">Control de Stock</div>
        </div>
        <div style="font-size:11px;text-align:left;margin-bottom:1.5mm;line-height:1.3;">
          <span class="ticket-bold">Categoría:</span> ${categoria}<br>
          <span class="ticket-bold">Fecha:</span> ${fecha}<br>
          <span class="ticket-bold">Usuario:</span> ${usuario}<br>
        </div>
        <div style="border-bottom:1px dashed #000;margin-bottom:1.5mm;"></div>
        <table class="ticket-items">
          <thead>
            <tr>
              <th class="ticket-qty">Cant</th>
              <th class="ticket-desc">Producto</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div style="border-bottom:1px dashed #000;margin-bottom:1.5mm;"></div>
        <div class="ticket-total-row" style="background:#f5f5f5;border-radius:1.5mm;padding:1.2mm 0 1.2mm 0;margin-bottom:1.5mm;">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:0.5mm;">
            <span class="ticket-bold">Productos</span>
            <span class="ticket-right">${totalItems}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;">
            <span class="ticket-bold">Total Unidades</span>
            <span class="ticket-right">${totalCantidad}</span>
          </div>
        </div>
        <div class="ticket-msg" id="ticket-msg" style="margin-top:2mm;">Documento para control interno</div>
      </div>
    `;

    // Construir un documento HTML mínimo y abrirlo en una nueva ventana para imprimir
    const fullHtml = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Stock por Categoría - ${categoria}</title>
          <style>
            @media print { @page { size: 70mm auto; margin: 0; } body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            body{ margin:0; padding:0; background:#fff; color:#000; }
            .ticket-container{ width:70mm; box-sizing:border-box; padding:4px 4px; font-family: 'Courier New', monospace; font-size:12px; line-height:1.3; }
            .ticket-header{ margin-bottom:6px; }
            .ticket-center{ text-align:center; }
            .ticket-bold{ font-weight:700; }
            .ticket-items{ width:100%; border-collapse:collapse; margin:6px 0; }
            .ticket-items th, .ticket-items td{ padding:4px 2px; text-align:left; }
            .ticket-qty{ width:15%; text-align:center; }
            .ticket-desc{ width:85%; }
            .ticket-right{ text-align:right; }
          </style>
        </head>
        <body>
          ${ticketBody}
        </body>
      </html>`;

    const printWin = window.open('', '_blank', 'toolbar=0,location=0,menubar=0,width=400,height=800');
    if (!printWin) {
      showInfo('No se pudo abrir la ventana de impresión. Revisa el bloqueador de ventanas emergentes.');
      return;
    }

    printWin.document.open();
    printWin.document.write(fullHtml);
    printWin.document.close();
    printWin.focus();

    // Esperar un momento para que el navegador renderice la ventana de impresión
    setTimeout(() => {
      try {
        printWin.print();
      } catch (e) {
        console.error('Error al imprimir desde ventana:', e);
      }
      // Cerrar la ventana automáticamente unos instantes después de imprimir
      setTimeout(() => {
        try { printWin.close(); } catch (e) { /* ignore */ }
      }, 600);
    }, 500);

  } catch (e) {
    console.error('Error generando ticket de stock por categoría:', e);
    showError('❌ Error al generar el ticket. Por favor, intente nuevamente.');
  }
}

// Configurar selector de categoría y botón de imprimir
document.addEventListener('DOMContentLoaded', () => {
  const selectCategoria = document.getElementById('selectCategoriaImprimir');
  const btnImprimirStock = document.getElementById('btnImprimirStockCategoria');

  if (!selectCategoria || !btnImprimirStock) return;

  // Habilitar/deshabilitar botón según selección
  selectCategoria.addEventListener('change', () => {
    btnImprimirStock.disabled = !selectCategoria.value;
  });

  // Evento click en botón imprimir
  btnImprimirStock.addEventListener('click', async () => {
    const categoria = selectCategoria.value;
    if (!categoria) {
      showWarning('⚠️ Por favor, selecciona una categoría');
      return;
    }

    try {
      // Obtener stock actualizado
      const stock = await obtenerStock();
      
      // Filtrar productos por categoría
      const productosCategoria = stock.filter(p => p.categoria === categoria);
      
      if (productosCategoria.length === 0) {
        showWarning(`⚠️ No hay productos en la categoría "${categoria}"`);
        return;
      }

      // Generar y imprimir ticket
      generarTicketStockPorCategoria(categoria, productosCategoria);
      showSuccess(`✅ Ticket generado para ${productosCategoria.length} productos de ${categoria}`);
    } catch (error) {
      console.error('Error al imprimir stock por categoría:', error);
      showError('❌ Error al obtener el stock. Por favor, intente nuevamente.');
    }
  });
});

