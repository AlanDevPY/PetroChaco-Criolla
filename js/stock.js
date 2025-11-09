import { registrarStock, obtenerStock, eliminarStockPorID, actualizarStockporId, obtenerStockPorId, sumarStockTransaccional, registrarReposicion, obtenerReposiciones } from "./firebase.js";
import { showSuccess, showError, showInfo, showLoading, hideLoading, showConfirm } from "./toast-utils.js";
import { mostrarStockConDataTable, configurarEventosDataTable, actualizarFilaDataTable } from "./stock-modern.js";
import { confirmarEliminacion, alertaAdvertencia } from "./swal-utils.js";

// variables globales

let idStock
let _cacheStock = [];
let reposicionLista = [];

// Variable para controlar si usar DataTables o sistema manual
const USAR_DATATABLES = true; // Cambiar a false para volver al sistema anterior

// Variables de paginación
let paginaActual = 1;
const productosPorPagina = 20;
let productosFiltrados = []; // Para mantener los productos filtrados o todos



//? Función para formatear el precio en el input y mostrar con decimales
const inputPrecio = document.getElementById("nuevoCostoStock");
inputPrecio.addEventListener("input", () => {
  // Quitamos cualquier caracter que no sea número
  let valor = inputPrecio.value.replace(/\D/g, "");

  // Formateamos con separadores de miles
  inputPrecio.value = valor ? Number(valor).toLocaleString("es-PY") : "";
});

const inputPrecioCompra = document.getElementById("nuevoPrecioCompraStock");
inputPrecioCompra.addEventListener("input", () => {
  // Quitamos cualquier caracter que no sea número
  let valor = inputPrecioCompra.value.replace(/\D/g, "");

  // Formateamos con separadores de miles
  inputPrecioCompra.value = valor ? Number(valor).toLocaleString("es-PY") : "";
});

const actualizarCostoStock = document.getElementById("actualizarCostoStock");
actualizarCostoStock.addEventListener("input", () => {
  // Quitamos cualquier caracter que no sea número
  let valor = actualizarCostoStock.value.replace(/\D/g, "");

  // Formateamos con separadores de miles
  actualizarCostoStock.value = valor ? Number(valor).toLocaleString("es-PY") : "";
});

const actualizarPrecioCompraStock = document.getElementById("actualizarPrecioCompraStock");
actualizarPrecioCompraStock.addEventListener("input", () => {
  // Quitamos cualquier caracter que no sea número
  let valor = actualizarPrecioCompraStock.value.replace(/\D/g, "");

  // Formateamos con separadores de miles
  actualizarPrecioCompraStock.value = valor ? Number(valor).toLocaleString("es-PY") : "";
});


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
const reposicionTotalCompra = document.getElementById('reposicionTotalCompra');
const btnConfirmarReposicion = document.getElementById('btnConfirmarReposicion');
const btnCancelarReposicion = document.getElementById('btnCancelarReposicion');

// Instancias de modales (solo los necesarios para formularios)
const modalAgregarProducto = bootstrap.Modal.getOrCreateInstance(
  document.getElementById("modalAgregarProducto")
);
const modalActualizarProducto = bootstrap.Modal.getOrCreateInstance(
  document.getElementById("modalActualizarProducto")
);



// Función para mostrar stock en la tabla
const mostrarStock = async (resetearPagina = true) => {
  if (USAR_DATATABLES) {
    // Usar DataTables moderno
    _cacheStock = await mostrarStockConDataTable(obtenerStock);

    // Poblar datalist para reposición
    const dl = document.getElementById('listaProductosReposicion');
    if (dl) {
      dl.innerHTML = _cacheStock.map(s => `<option value="${s.item}"></option>`).join('');
    }
  } else {
    // Sistema manual original
    const stock = await obtenerStock();
    _cacheStock = stock;
    productosFiltrados = [...stock];

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

    htmlRows += `
      <tr>
        <td>${numeroGlobal}</td>
        <td>${item.item}</td>
        <td>${item.categoria}</td>
        <td>${item.codigoBarra}</td>
        <td class="text-center">${Number(item.cantidad).toLocaleString("es-PY")}</td>
        <td class="text-end">${Number(item.costoCompra).toLocaleString("es-PY")} Gs</td>
        <td class="text-end">${Number(item.costo).toLocaleString("es-PY")} Gs</td>
        <td class="text-center">
          <button data-id="${item.id}" class="btn btn-sm btn-warning btn-editar-stock">✏️</button>
          <button data-id="${item.id}" class="btn btn-sm btn-danger btn-eliminar-stock">❌</button>
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
  // Convertir el costo de string a number
  let costo = document.getElementById("actualizarCostoStock").value;
  // Quitar los puntos antes de guardar
  costo = Number(costo.replace(/\./g, ""));

  const stockData = { costo };

  await actualizarStockporId(idStock, stockData);
  modalActualizarProducto.hide();

  showSuccess("✅ Stock actualizado correctamente");

  await mostrarStock();
});

// Evento submit para registrar stock
registrarStockForm.addEventListener("submit", async (e) => {
  e.preventDefault();


  const FechaDeRegistro = dayjs().format("DD/MM/YYYY, h:mm:ss A"); // legacy string
  // registrar item con mayuscular y evitar espacio en blanco
  const item = document.getElementById("nuevoItemStock").value.trim().toUpperCase();
  const categoria = document.getElementById("nuevoCategoriaStock").value;
  const codigoBarra = document.getElementById("nuevoCodigoBarraStock").value;
  const cantidad = Number(document.getElementById("nuevoCantidadStock").value);

  // Convertir el costo de string a number
  let costo = document.getElementById("nuevoCostoStock").value;
  let costoCompra = document.getElementById("nuevoPrecioCompraStock").value;

  // Quitar los puntos antes de guardar
  costo = Number(costo.replace(/\./g, ""));
  costoCompra = Number(costoCompra.replace(/\./g, ""));


  const stockData = { FechaDeRegistro, item, codigoBarra, categoria, cantidad, costo, costoCompra };

  let obtenerStockTotal = await obtenerStock();


  // Verificar si el codigo de barra ya existe en el stock
  if (obtenerStockTotal.some((item) => item.codigoBarra === codigoBarra)) {
    alertaAdvertencia("⚠️ Código duplicado", "El código de barra ya existe en el stock");
    return;
  }




  // ⚡ Cerrar modal "Agregar Producto"
  modalAgregarProducto.hide();

  // ⚡ Mostrar notificación de carga
  const loadingToast = showLoading("Agregando stock...");

  await registrarStock(stockData);

  //   ⚡ Registrar stock en Firebase
  hideLoading(loadingToast);
  showSuccess("✅ Stock agregado correctamente");

  registrarStockForm.reset();
  await mostrarStock();
});

// Cargar stock al iniciar
window.addEventListener("DOMContentLoaded", async () => {
  const loadingToast = showLoading("Obteniendo stock...");
  await mostrarStock();
  hideLoading(loadingToast);

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

  // Si no hay resultados
  if (resultados.length === 0) {
    stockTable.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          🔍 No se encontraron productos con "${valorOriginal}"
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
      }
    });
  });
}

// Helpers reposición
const parseGs = (str) => {
  if (!str) return 0;
  return Number(String(str).replace(/\./g, '').replace(/\s/g, '')) || 0;
};
const formatGs = (n) => (Number(n) || 0).toLocaleString('es-PY') + ' Gs';

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

// Formateo de precios en inputs de reposición
if (reposicionPrecioCompra) {
  reposicionPrecioCompra.addEventListener("input", () => {
    let valor = reposicionPrecioCompra.value.replace(/\D/g, "");
    reposicionPrecioCompra.value = valor ? Number(valor).toLocaleString("es-PY") : "";
  });
}

if (reposicionPrecioVenta) {
  reposicionPrecioVenta.addEventListener("input", () => {
    let valor = reposicionPrecioVenta.value.replace(/\D/g, "");
    reposicionPrecioVenta.value = valor ? Number(valor).toLocaleString("es-PY") : "";
  });
}

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
    const nombre = reposicionProducto.value.trim();
    const base = _cacheStock.find(s => String(s.item).toUpperCase() === nombre.toUpperCase());
    const cant = Number(reposicionCantidad.value);
    if (!base) { showWarning('⚠️ Producto no encontrado en stock'); return; }
    if (!cant || cant <= 0) { showWarning('⚠️ Cantidad inválida'); return; }

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
    reposicionProducto.value = '';
    reposicionCantidad.value = '1';
    if (reposicionPrecioCompra) reposicionPrecioCompra.value = '';
    if (reposicionPrecioVenta) reposicionPrecioVenta.value = '';
    renderReposicionTabla();
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
    if (reposicionLista.length === 0) return;
    const itemsTx = reposicionLista.map(r => ({
      id: r.id,
      cantidad: r.cantidad,
      costoCompra: r.costoCompra,
      costo: r.costo
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
          <td></td>
        </tr>`);
    });
  });
}

