import { registrarStock, obtenerStock, eliminarStockPorID, actualizarStockporId, obtenerStockPorId, sumarStockTransaccional, registrarReposicion, obtenerReposiciones } from "./firebase.js";

// variables globales

let idStock
let _cacheStock = [];
let reposicionLista = [];



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

// Instancias de modales
const modalAgregarProducto = bootstrap.Modal.getOrCreateInstance(
  document.getElementById("modalAgregarProducto")
);
const modalStockActualizado = bootstrap.Modal.getOrCreateInstance(
  document.getElementById("modalStockActualizado")
);
const modalActualizarProducto = bootstrap.Modal.getOrCreateInstance(
  document.getElementById("modalActualizarProducto")
);
const modalStockEliminado = bootstrap.Modal.getOrCreateInstance(
  document.getElementById("modalStockEliminado")
);
const modalAgregandoStock = bootstrap.Modal.getOrCreateInstance(
  document.getElementById("modalAgregandoStock")
);
const modalStockAgregado = bootstrap.Modal.getOrCreateInstance(
  document.getElementById("modalStockAgregado")
);
const modalObteniendoStock = bootstrap.Modal.getOrCreateInstance(
  document.getElementById("modalObteniendoStock")
);



// Función para mostrar stock en la tabla
const mostrarStock = async () => {
  const stock = await obtenerStock();
  _cacheStock = stock;
  stockTable.innerHTML = "";
  let contador = 0;

  stock.sort((a, b) => a.item.localeCompare(b.item));

  stock.forEach((item) => {
    stockTable.innerHTML += `
      <tr>
        <td>${++contador}</td>
        <td>${item.item}</td>
        <td>${item.categoria}</td>
        <td>${item.codigoBarra}</td>
        <td class="text-center">${Number(item.cantidad).toLocaleString("es-PY")}</td>
        <td class="text-end">${Number(item.costoCompra).toLocaleString("es-PY")} Gs</td>
        <td class="text-end">${Number(item.costo).toLocaleString("es-PY")} Gs</td>
        <td class="text-center">
          <button data-id="${item.id}" class="btn btn-sm btn-warning">✏️</button>
          <button data-id="${item.id}" class="btn btn-sm btn-danger">❌</button>
        </td>
      </tr>
    `;
  });

  // Eliminar stock
  const botonesEliminar = document.querySelectorAll("#stockTable .btn-danger");
  botonesEliminar.forEach((boton) => {
    boton.addEventListener("click", async () => {
      const id = boton.getAttribute("data-id");
      await eliminarStockPorID(id);

      modalStockEliminado.show();
      setTimeout(() => {
        modalStockEliminado.hide();
      }, 2000);
      await mostrarStock();
    });
  });

  //   actualizar stock
  const botonesActualizar = document.querySelectorAll("#stockTable .btn-warning");
  botonesActualizar.forEach((boton) => {
    boton.addEventListener("click", async () => {
      idStock = boton.getAttribute("data-id");
      modalActualizarProducto.show();

      // obtener stock por id (evita traer toda la colección)
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
};

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

  modalStockActualizado.show();
  setTimeout(() => {
    modalStockActualizado.hide();
  }, 2000);

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
    alert("El codigo de barra ya existe en el stock.");
    return;
  }




  // ⚡ Cerrar modal "Agregar Producto"
  modalAgregarProducto.hide();

  // ⚡ Mostrar modal "Agregando stock"
  modalAgregandoStock.show();
  setTimeout(() => {
    modalAgregandoStock.hide();
    // ⚡ Mostrar modal "Stock agregado"
    modalStockAgregado.show();
    setTimeout(() => {
      modalStockAgregado.hide();
    }, 2000);
  }, 2000);

  await registrarStock(stockData);

  //   ⚡ Registrar stock en Firebase

  registrarStockForm.reset();
  await mostrarStock();
});

// Cargar stock al iniciar
window.addEventListener("DOMContentLoaded", async () => {
  modalObteniendoStock.show();
  await mostrarStock();
  modalObteniendoStock.hide();
  // Poblar datalist para reposición
  const dl = document.getElementById('listaProductosReposicion');
  if (dl) {
    dl.innerHTML = _cacheStock.map(s => `<option value="${s.item}"></option>`).join('');
  }
});

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
    if (!base) { alert('Producto no encontrado en stock'); return; }
    if (!cant || cant <= 0) { alert('Cantidad inválida'); return; }

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

