import {
  obtenerStock,
  obtenerStockPorId,
  registrarCliente,
  obtenerClientes,
  obtenerCajas,
  actualizarStockporId,
  eliminarClientePorID,
  registrarCaja,
  actualizarCajaporId,
} from "./firebase.js";

// VARIABLES GLOBALES
let pedido = [];
let pedidoGenerado = {};
let cliente;

// FUNCION DE SUMAR SUB TOTALES
function calcularTotalPedido() {
  //   desabilitar boton de cobro si el pedido esta vacio
  if (pedido.length === 0) {
    btnCobrar.disabled = true;
  } else {
    btnCobrar.disabled = false;
  }

  return pedido.reduce((acumulador, item) => acumulador + item.subTotal, 0);
}

// Detectamos todos los inputs de tipo number
document.querySelectorAll(".formatearInput").forEach((input) => {
  // Guardamos el valor "puro" en un atributo dataset
  input.dataset.value = input.value;

  input.addEventListener("input", () => {
    // Quitamos todo lo que no sea número
    let valorPuro = input.value.replace(/\D/g, "");

    // Guardamos el valor puro para cálculos
    input.dataset.value = valorPuro;

    // Mostramos el valor formateado con puntos para el usuario
    input.value = valorPuro ? Number(valorPuro).toLocaleString("de-DE") : "";
  });
});

// FUNCION DE MODAL ALERTA

function mostrarAviso(tipo, mensaje) {
  const modalTitulo = document.getElementById("modalAvisoTitulo");
  const modalMensaje = document.getElementById("modalAvisoMensaje");
  const modalHeader = document.getElementById("modalAvisoHeader");

  // Limpiar clases previas
  modalHeader.className = "modal-header";

  // Ajustar estilo según tipo
  if (tipo === "success") {
    modalHeader.classList.add("bg-success", "text-white");
    modalTitulo.textContent = "✅ Éxito";
  } else if (tipo === "warning") {
    modalHeader.classList.add("bg-warning", "text-dark");
    modalTitulo.textContent = "⚠️ Advertencia";
  } else {
    modalHeader.classList.add("bg-secondary", "text-white");
    modalTitulo.textContent = "ℹ️ Aviso";
  }

  modalMensaje.textContent = mensaje;

  const modal = new bootstrap.Modal(document.getElementById("modalAviso"));
  modal.show();

  //   OCULATAR MODAL LUEGO DE 2 SEGUNDOS
  setTimeout(() => {
    modal.hide();
  }, 1200);
  document.getElementById("inputProducto").focus();
}

// FUNCION PARA OBTENER STOCK Y MOSTRAR EN EL DATALIST
const mostrarStockDataList = async () => {
  const stock = await obtenerStock();

  let stockDataList = document.getElementById("listaProductos");

  stock.forEach((item) => {
    stockDataList.innerHTML += `
        <option data-id="${item.id}" value="${item.item}">${item.codigoBarra}</option>
        `;
  });
};

// FUNCION PARA AGREGAR PEDIDO
document.getElementById("agregarProductoForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const cantidad = Number(document.getElementById("cantidad").value);
  const inputValue = document.getElementById("inputProducto").value.trim();
  const dataList = document.getElementById("listaProductos");
  const options = dataList.querySelectorAll("option");

  // Validar cantidad
  if (cantidad <= 0) {
    alert("Ingrese una cantidad válida.");
    return;
  }

  // Buscar el ID del producto por nombre o código de barra
  let selectedId = null;
  options.forEach((option) => {
    const nombre = option.value.trim();
    const codigo = option.textContent.trim();
    if (inputValue === nombre || inputValue === codigo) {
      selectedId = option.getAttribute("data-id");
    }
  });

  // Validar si seleccionó un item válido
  if (!selectedId) {
    mostrarAviso("warning", "Producto no encontrado.");
    return;
  }

  // Obtener el producto del stock
  const stockItem = await obtenerStockPorId(selectedId);

  // Buscar si ya existe el item en el pedido
  const pedidoExistente = pedido.find((p) => p.id === stockItem.id);

  if (stockItem.cantidad < cantidad) {
    mostrarAviso("warning", "No hay suficiente stock.");
    return;
  } else if (pedidoExistente) {
    // Si ya existe, aumentar la cantidad y actualizar subtotal
    pedidoExistente.cantidad += cantidad;
    pedidoExistente.subTotal =
      pedidoExistente.cantidad * pedidoExistente.costo;
  } else {
    // Si no existe, agregar como nuevo item
    const pedidoItem = {
      id: stockItem.id,
      item: stockItem.item,
      cantidad,
      costo: stockItem.costo,
      subTotal: stockItem.costo * cantidad,
    };
    pedido.push(pedidoItem);
  }

  mostrarPedidoCargado();

  // Limpiar el formulario y mantener el foco
  document.getElementById("agregarProductoForm").reset();
  document.getElementById("inputProducto").focus();

  // Mostrar total en Guaraníes
  document.getElementById("totalPedido").textContent =
    calcularTotalPedido().toLocaleString("es-PY") + " Gs";
  console.log(pedidoGenerado);
});

// FUNCION PARA MOSTRAR PEDIDO CARGADO
const mostrarPedidoCargado = () => {
  const pedidoList = document.getElementById("carritoTable");
  pedidoList.innerHTML = "";

  pedido.forEach((item) => {
    pedidoList.innerHTML += `
        <tr>
            <td>${item.item}</td>
            <td class="text-center"> ${item.cantidad}</td>
            <td class="text-end">${item.costo.toLocaleString("es-PY")} Gs</td>
            <td class="text-end">${item.subTotal.toLocaleString(
      "es-PY"
    )} Gs</td>
             <td><button class="btn btn-sm btn-danger">❌</button></td>
        </tr>
        `;
  });

  // eliminar pedido
  const botonesEliminar = document.querySelectorAll(".btn-danger");
  botonesEliminar.forEach((boton) => {
    boton.addEventListener("click", async () => {
      const index = Array.from(botonesEliminar).indexOf(boton);
      pedido.splice(index, 1);
      mostrarPedidoCargado();
      document.getElementById("totalPedido").textContent =
        calcularTotalPedido().toLocaleString("es-PY") + " Gs";
    });
  });
};

//? FUNCIONES EN MODAL DE COBRO--------------------------------------------------
btnCobrar.addEventListener("click", async () => {
  modalTotalCobro.textContent =
    "Total a pagar: " + calcularTotalPedido().toLocaleString("es-PY") + " Gs";

  // reset form
  document.getElementById("modalCobrarForm").reset();
});

const efectivoInput = document.getElementById("efectivo");
const tarjetaInput = document.getElementById("tarjeta");
const transferenciaInput = document.getElementById("transferencia");
const modalTotalCobro = document.getElementById("modalTotalCobro");

function actualizarCobro() {
  const totalPedido = calcularTotalPedido(); // total que el cliente debe
  const efectivo = Number(efectivoInput.value.replace(/\./g, "") || 0);
  const tarjeta = Number(tarjetaInput.value.replace(/\./g, "") || 0);
  const transferencia = Number(
    transferenciaInput.value.replace(/\./g, "") || 0
  );

  const pagado = efectivo + tarjeta + transferencia;
  const diferencia = totalPedido - pagado;

  modalTotalCobro.classList.remove(
    "alert-danger",
    "alert-warning",
    "alert-success"
  );

  if (diferencia > 0) {
    // Falta pagar → rojo
    modalTotalCobro.textContent =
      "Falta pagar: " + diferencia.toLocaleString("es-PY") + " Gs";
    modalTotalCobro.classList.add("alert-danger");
  } else if (diferencia === 0) {
    // Exacto → verde
    modalTotalCobro.textContent = "Pago exacto";
    modalTotalCobro.classList.add("alert-success");
  } else {
    // Vuelto → amarillo
    modalTotalCobro.textContent =
      "Vuelto: " + (-diferencia).toLocaleString("es-PY") + " Gs";
    modalTotalCobro.classList.add("alert-warning");
  }
}

// Escuchar cambios en los inputs
[efectivoInput, tarjetaInput, transferenciaInput].forEach((input) => {
  input.addEventListener("input", actualizarCobro);
});

// funcion con modal cobro cliente

let timeout;
clienteRucCobro.addEventListener("input", () => {
  clearTimeout(timeout);
  timeout = setTimeout(async () => {
    const ruc = clienteRucCobro.value.trim();
    if (!ruc) return;
    const clientes = await obtenerClientes();
    cliente = clientes.find((c) => c.ruc === ruc);
    if (cliente) {
      clienteNombreCobro.value = cliente.nombre;
      clienteDireccionCobro.value = cliente.direccion;
      clienteTelefonoCobro.value = cliente.telefono;
    }
  }, 400);
});

// FUNCION PARA REGISTRAR LA VENTA
document.getElementById("modalCobrarForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Obtengo todas las cajas
  const Cajas = await obtenerCajas();

  // Busco si hay alguna caja abierta
  let cajaAbierta = Cajas.find((caja) => caja.estado === "abierta");
  let usuarioLogueado = document.getElementById("usuarioLogueado").textContent

  // Datos de la venta actual
  const venta = {
    cliente: cliente, // asumiendo que ya definiste el objeto cliente
    venta: pedido, // array de productos de la venta actual
    fecha: dayjs().format("DD/MM/YYYY HH:mm:ss"),
    efectivo: Number(efectivoInput.value.replace(/\./g, "")),
    tarjeta: Number(tarjetaInput.value.replace(/\./g, "")),
    transferencia: Number(transferenciaInput.value.replace(/\./g, "")),
    total: calcularTotalPedido(),
  };


  // funcion para descontar stock de la venta
  async function descontarStock(venta) {
    for (const item of venta.venta) {
      const id = item.id;
      const cantidadItemVenta = Number(item.cantidad); // 🔹 Convertir a número

      const cantidadStock = await obtenerStockPorId(id);
      const stockActual = Number(cantidadStock.cantidad); // 🔹 Convertir a número

      console.log(
        `🔹 ${id}: ${stockActual} - ${cantidadItemVenta} = ${stockActual - cantidadItemVenta}`);


      if (stockActual >= cantidadItemVenta) {
        const nuevoStock = stockActual - cantidadItemVenta;
        await actualizarStockporId(id, { cantidad: nuevoStock });
        console.log(`✅ ${id}: ${stockActual} → ${nuevoStock}`);
      } else {
        console.log(`❌ No hay stock suficiente para ${id}`);
      }
    }
  }

  if (!cajaAbierta) {
    // No hay caja abierta → creo la primera caja y agrego la venta
    const nuevaCaja = {
      fechaApertura: dayjs().format("DD/MM/YYYY HH:mm:ss"),
      estado: "abierta",
      totalRecaudado: venta.total,
      ventas: [venta], // registro la venta directamente
      usuario: usuarioLogueado
    };

    const totalPedido = calcularTotalPedido(); // total que el cliente debe
    const efectivo = Number(efectivoInput.value.replace(/\./g, "") || 0);
    const tarjeta = Number(tarjetaInput.value.replace(/\./g, "") || 0);
    const transferencia = Number(transferenciaInput.value.replace(/\./g, "") || 0);

    const pagado = efectivo + tarjeta + transferencia;
    const diferencia = totalPedido - pagado;

    if (diferencia > 0) {
      mostrarAviso("warning", "Falta pagar: " + diferencia.toLocaleString("es-PY") + " Gs");
      return;
    } else {
      await registrarCaja(nuevaCaja);
      descontarStock(venta);
      imprimirTicket(venta);


      // obtenner instancia de modalcobro y cerrar
      const modalCobro = bootstrap.Modal.getInstance(document.getElementById("modalCobro"));
      modalCobro.hide();
      const badge = document.getElementById("estadoCajaBadge");
      badge.textContent = "Caja Abierta";
      badge.classList.remove("bg-danger");
      badge.classList.add("bg-success");

    }
  } else {
    // Caja abierta → agrego la venta al array de ventas existente
    cajaAbierta.ventas.push(venta);

    // Actualizo el total recaudado
    cajaAbierta.totalRecaudado += venta.total;

    const totalPedido = calcularTotalPedido(); // total que el cliente debe
    const efectivo = Number(efectivoInput.value.replace(/\./g, "") || 0);
    const tarjeta = Number(tarjetaInput.value.replace(/\./g, "") || 0);
    const transferencia = Number(transferenciaInput.value.replace(/\./g, "") || 0);

    const pagado = efectivo + tarjeta + transferencia;
    const diferencia = totalPedido - pagado;

    if (diferencia > 0) {
      console.log("no se puede realizar cobro, monto insuficiente");
    } else {
      // Actualizo la caja en Firestore
      await actualizarCajaporId(cajaAbierta.id, cajaAbierta);
      descontarStock(venta);
      imprimirTicket(venta);

      // obtenner instancia de modalcobro y cerrar
      const modalCobro = bootstrap.Modal.getInstance(
        document.getElementById("modalCobro")
      );
      modalCobro.hide();
    }
  }

  // Aquí podrías limpiar el formulario y resetear el pedido
  pedido = [];
  document.getElementById("modalCobrarForm").reset();
  // resetear tabla de pedido

  mostrarAviso("success", "Venta registrada con exito.");
  mostrarPedidoCargado();
  actualizarCobro();
  // Mostrar total en Guaraníes
  document.getElementById("totalPedido").textContent =
    calcularTotalPedido().toLocaleString("es-PY") + " Gs";
});

// ?FUNCIONES CON MODAL GESTION DE CLIENTES


// Evento submit para registrar cliente
document.getElementById("formCliente").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document
    .getElementById("clienteNombre")
    .value.trim()
    .toUpperCase();
  const ruc = document.getElementById("clienteRuc").value.trim();
  const telefono = document
    .getElementById("clienteTelefono")
    .value.trim()
    .toUpperCase();
  const direccion = document
    .getElementById("clienteDireccion")
    .value.trim()
    .toUpperCase();

  const cliente = {
    nombre: nombre,
    ruc: ruc,
    telefono: telefono,
    direccion: direccion,
  };

  // verificar si hay cliente con ese mismo ruc registrado
  const clientes = await obtenerClientes();
  const clienteExistente = clientes.find((c) => c.ruc === ruc);
  if (clienteExistente) {
    mostrarAviso("warning", "Ya existe un cliente con ese RUC registrado.");
    return;
  }

  await registrarCliente(cliente);

  // Obtener la instancia existente y cerrarla
  bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();


  await mostrarClientes();
});

// funcion para mostrar los clientes registrados
async function mostrarClientes() {
  const clientes = await obtenerClientes();
  const tbody = document.getElementById("tablaClientes");
  tbody.innerHTML = "";

  // ordenar clientes por nombre
  clientes.sort((a, b) => a.nombre.localeCompare(b.nombre));

  clientes.forEach((cliente) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <tr>
        <td>${cliente.nombre}</td>
        <td>${cliente.ruc}</td>
        <td>${cliente.telefono}</td>
        <td>${cliente.direccion}</td>
        <td>
          <button class="btn btn-sm btn-danger" data-id="${cliente.id}">
            Eliminar
          </button>
        </td>
      </tr>
    `;
    tbody.appendChild(row);
  });

  // eliminar clientes por id
  const botonesEliminar = document.querySelectorAll(".btn-danger");
  botonesEliminar.forEach((boton) => {
    boton.addEventListener("click", async () => {
      const id = boton.getAttribute("data-id");
      await eliminarClientePorID(id);
      await mostrarClientes();
    });
  });
}





window.addEventListener("DOMContentLoaded", async () => {
  await mostrarClientes();
  const spinner = document.getElementById("spinnerCarga");
  const contenido = document.getElementById("contenidoPrincipal");

  // Mostrar spinner usando Bootstrap;
  spinner.classList.add("d-flex");



  // Esperar a que se carguen los datos
  await mostrarStockDataList();

  const Cajas = await obtenerCajas();
  let cajaAbierta = Cajas.find((caja) => caja.estado === "abierta");

  if (cajaAbierta) {
    const badge = document.getElementById("estadoCajaBadge");
    badge.textContent = "Caja Abierta";
    badge.classList.remove("bg-danger");
    badge.classList.add("bg-success");
  }

  // Ocultar spinner y mostrar contenido usando clases Bootstrap
  spinner.classList.remove("d-flex");
  spinner.classList.add("d-none");

});


// FUNCION PARA GENERAR TICKTE DE VENTA
function imprimirTicket(venta) {
  // --- DATOS DEL CLIENTE ---
  const cliente = venta.cliente || {};
  document.getElementById("ticket-cliente").textContent = cliente.nombre || "Consumidor Final";

  // --- FECHA ---
  document.getElementById("ticket-fecha").textContent = venta.fecha || new Date().toLocaleString("es-PY");

  // --- LIMPIAR ITEMS ANTERIORES ---
  const cuerpo = document.getElementById("ticket-items-body");
  cuerpo.innerHTML = "";

  // --- AGREGAR PRODUCTOS ---
  if (venta.venta && Array.isArray(venta.venta)) {
    venta.venta.forEach((item) => {
      const fila = document.createElement("tr");

      fila.innerHTML = `
        <td class="ticket-qty">${item.cantidad}</td>
        <td class="ticket-desc">${item.item}</td>
        <td class="ticket-price">${item.subTotal.toLocaleString("es-PY")}</td>
      `;

      cuerpo.appendChild(fila);
    });
  }

  // --- TOTALES ---
  const subtotal = venta.venta?.reduce((acc, v) => acc + v.subTotal, 0) || 0;
  const impuestos = Math.round(subtotal * 0.1); // por ejemplo, 10%
  const total = venta.total || subtotal;
  const pago = venta.efectivo || 0;
  const vuelto = pago - total;

  document.getElementById("ticket-subtotal").textContent = subtotal.toLocaleString("es-PY");
  document.getElementById("ticket-tax").textContent = impuestos.toLocaleString("es-PY");
  document.getElementById("ticket-total").textContent = total.toLocaleString("es-PY");
  document.getElementById("ticket-pago").textContent = pago.toLocaleString("es-PY");
  document.getElementById("ticket-vuelto").textContent = vuelto > 0 ? vuelto.toLocaleString("es-PY") : "0";

  // --- MENSAJE FINAL PERSONALIZADO ---
  const msg = document.getElementById("ticket-msg");
  msg.textContent = `¡Gracias ${cliente.nombre || "por tu compra"}! Vuelve pronto 🚗⛽`;

  setTimeout(() => {
    window.print();
  }, 3000);

}
