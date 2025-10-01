import { obtenerStock, obtenerStockPorId } from "./firebase.js";

// VARIABLES GLOBALES
let pedido = [];
let pedidoGenerado = {};

// FUNCION DE SUMAR SUB TOTALES
function calcularTotalPedido() {
    //   desabilitar boton de cobro si el pedido esta vacio
    if (pedido.length === 0) {
        btnCobrar.disabled = true;
    }else{
        btnCobrar.disabled = false;
    }
    
    return pedido.reduce((acumulador, item) => acumulador + item.subTotal, 0);
}

// Detectamos todos los inputs de tipo number
document.querySelectorAll("body input[type='text']").forEach(input => {
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
document
  .getElementById("agregarProductoForm")
  .addEventListener("submit", async (e) => {
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

// FUNCION PRINCIPAL AL CARGAR LA PAGINA
window.addEventListener("DOMContentLoaded", async () => {
  await mostrarStockDataList();
});

// FUNCIONES EN MODAL DE COBRO
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
const transferencia = Number(transferenciaInput.value.replace(/\./g, "") || 0);


  const pagado = efectivo + tarjeta + transferencia;
  const diferencia = totalPedido - pagado;

  modalTotalCobro.classList.remove("alert-danger", "alert-warning", "alert-success");

  if (diferencia > 0) {
    // Falta pagar → rojo
    modalTotalCobro.textContent = "Falta pagar: " + diferencia.toLocaleString("es-PY") + " Gs";
    modalTotalCobro.classList.add("alert-danger");
  } else if (diferencia === 0) {
    // Exacto → verde
    modalTotalCobro.textContent = "Pago exacto";
    modalTotalCobro.classList.add("alert-success");
  } else {
    // Vuelto → amarillo
    modalTotalCobro.textContent = "Vuelto: " + (-diferencia).toLocaleString("es-PY") + " Gs";
    modalTotalCobro.classList.add("alert-warning");
  }
}

// Escuchar cambios en los inputs
[efectivoInput, tarjetaInput, transferenciaInput].forEach((input) => {
  input.addEventListener("input", actualizarCobro);
});
