import { registrarStock, obtenerStock, eliminarStockPorID, actualizarStockporId } from "./firebase.js";

// variables globales

let idStock



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


btnAgregar.addEventListener("click", () => {
      registrarStockForm.reset();
})

// Referencias a elementos
const registrarStockForm = document.getElementById("registrarStockForm");
const actualizarStockForm = document.getElementById("actualizarStockForm");
const stockTable = document.getElementById("stockTable");

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
  const botonesEliminar = document.querySelectorAll(".btn-danger");
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
  const botonesActualizar = document.querySelectorAll(".btn-warning");
  botonesActualizar.forEach((boton) => {
    boton.addEventListener("click", async () => {
       idStock = boton.getAttribute("data-id");
      modalActualizarProducto.show();

    //   obtener stock por id
      const stock = await obtenerStock();

      stock.forEach((item) => {
        if (item.id === idStock) {
          document.getElementById("actualizarItemStock").value = item.item;
          document.getElementById("actualizarCategoriaStock").value = item.categoria;
          document.getElementById("actualizarCodigoBarraStock").value = item.codigoBarra;
          document.getElementById("actualizarCantidadStock").value = item.cantidad;
          document.getElementById("actualizarCostoStock").value = Number(item.costo).toLocaleString("es-PY");
          document.getElementById("actualizarPrecioCompraStock").value = Number(item.costoCompra).toLocaleString("es-PY");
        }
      });
    });
  });
};

// evento de submit para actaualizar stock
actualizarStockForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const item = document.getElementById("actualizarItemStock").value;
  const categoria = document.getElementById("actualizarCategoriaStock").value;
  const cantidad = Number(document.getElementById("actualizarCantidadStock").value);
  const codigoBarra = Number(document.getElementById("actualizarCodigoBarraStock").value);

  // Convertir el costo de string a number
  let costo = document.getElementById("actualizarCostoStock").value;
  let costoCompra = document.getElementById("actualizarPrecioCompraStock").value;

  // Quitar los puntos antes de guardar
  costo = Number(costo.replace(/\./g, ""));
  costoCompra = Number(costoCompra.replace(/\./g, ""));

  const stockData = { item, categoria, cantidad, costo, costoCompra, codigoBarra };

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


  const FechaDeRegistro = dayjs().format("DD/MM/YYYY, h:mm:ss A");
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
});

