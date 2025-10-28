import { obtenerCajas, obtenerCajaPorId, actualizarCajaporId } from "./firebase.js";

let idCajaIndividual

window.addEventListener("DOMContentLoaded", async () => {
  await mostrarCajas();
});

// FUNCION DE MOSTRAR LAS CAJAS EN TABLA
const mostrarCajas = async () => {
  const cajas = await obtenerCajas();
  const tablaCajas = document.getElementById("cajasTable");
  let contador = 1;

 tablaCajas.innerHTML = "";


cajas
  .filter(caja => caja.estado === "abierta") // solo cajas abiertas
  .forEach(caja => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${contador++}</td>
      <td>${caja.fechaApertura}</td>
      <td>${caja.fechaCierre || "--"}</td>
      <td>${caja.totalRecaudado.toLocaleString("es-PY") + " Gs"}</td>
      <td>
        <span class="badge ${caja.estado === 'abierta' ? 'bg-success' : 'bg-danger'}">
          ${caja.estado}
        </span>
      </td>
      <td>
        <button data-id="${caja.id}" class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#detalleCajaModal">
          Ver detalle
        </button>
      </td>
    `;

    tablaCajas.appendChild(fila); // mejor que innerHTML +=
  });
  // obtener dataId de la caja seleccionada
  const botonesVerDetalle = document.querySelectorAll(".btn-primary");
  botonesVerDetalle.forEach((boton) => {
    boton.addEventListener("click", async () => {
      idCajaIndividual = boton.getAttribute("data-id");
      console.log(idCajaIndividual);
      await mostrarDetalleCaja();
    });
  });
}

// FUNCION PARA MOSTRAR DETALLE DE CAJA
const mostrarDetalleCaja = async () => {
  const caja = await obtenerCajaPorId(idCajaIndividual);
  document.getElementById("detalleAperturaCaja").textContent = caja.fechaApertura;
  document.getElementById("detalleCierreCaja").textContent = caja.fechaCierre || "--";
  document.getElementById("detalleTotalRecaudadoCaja").textContent = caja.totalRecaudado.toLocaleString("es-PY") + " Gs";


  // recorres ventas y guardat total efectivo, total tarjeta y total transferencia
  let totalEfectivo = 0;
  let totalTarjeta = 0;
  let totalTransferencia = 0;

  caja.ventas.forEach((venta) => {
    let restante = venta.total;

    const efectivoAplicado = Math.min(venta.efectivo, restante);
    restante -= efectivoAplicado;

    const tarjetaAplicado = Math.min(venta.tarjeta, restante);
    restante -= tarjetaAplicado;

    const transferenciaAplicado = Math.min(venta.transferencia, restante);
    restante -= transferenciaAplicado;

    totalEfectivo += efectivoAplicado;
    totalTarjeta += tarjetaAplicado;
    totalTransferencia += transferenciaAplicado;

  });


  document.getElementById("detalleTotalEfectivoCaja").textContent = totalEfectivo.toLocaleString("es-PY") + " Gs";
  document.getElementById("detalleTotalTarjetaCaja").textContent = totalTarjeta.toLocaleString("es-PY") + " Gs";
  document.getElementById("detalleTotalTransferenciaCaja").textContent = totalTransferencia.toLocaleString("es-PY") + " Gs";

  // mostrar detalle de venta en tabla
  const ventasAccordion = document.getElementById("ventasAccordion");
  ventasAccordion.innerHTML = "";

  caja.ventas.forEach((venta, index) => {
    let restante = venta.total;

    const efectivoAplicado = Math.min(venta.efectivo, restante);
    restante -= efectivoAplicado;

    const tarjetaAplicado = Math.min(venta.tarjeta, restante);
    restante -= tarjetaAplicado;

    const transferenciaAplicado = Math.min(venta.transferencia, restante);
    restante -= transferenciaAplicado;

    const vuelto = (venta.efectivo + venta.tarjeta + venta.transferencia) - venta.total;

    // Generar acordeón-item
    const item = document.createElement("div");
    item.classList.add("accordion-item");

    item.innerHTML = `
      <h2 class="accordion-header" id="heading${index}">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}">
          📅 ${venta.fecha} - Cliente: ${venta.cliente.nombre} | Total: ${venta.total.toLocaleString("es-PY")} Gs
        </button>
      </h2>
      <div id="collapse${index}" class="accordion-collapse collapse" aria-labelledby="heading${index}"
        data-bs-parent="#ventasAccordion">
        <div class="accordion-body">
          <p><strong>Efectivo:</strong> ${efectivoAplicado.toLocaleString("es-PY")} Gs</p>
          <p><strong>Tarjeta:</strong> ${tarjetaAplicado.toLocaleString("es-PY")} Gs</p>
          <p><strong>Transferencia:</strong> ${transferenciaAplicado.toLocaleString("es-PY")} Gs</p>
          <p><strong>Vuelto:</strong> ${vuelto > 0 ? vuelto.toLocaleString("es-PY") + " Gs" : "-"}</p>

          <!-- Detalle de items vendidos -->
          <table class="table table-sm table-bordered mt-3">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${venta.venta.map((item) => `
                <tr>
                  <td>${item.item}</td>
                  <td>${item.cantidad}</td>
                  <td>${item.costo.toLocaleString("es-PY")} Gs</td>
                  <td>${item.subTotal.toLocaleString("es-PY")} Gs</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    ventasAccordion.appendChild(item);
  });




}

//? FUNCION DE REALIZAR CIERRE DE CAJA

document.getElementById("formCierreCaja").addEventListener("submit", async (e) => {
  e.preventDefault();

  // buscamos la caja que esta abierto y cambiamos a estado cerrado
  // 1️⃣ Esperamos a que la promesa se resuelva
  const cajas = await obtenerCajas();

  // 2️⃣ Ahora sí podemos usar .find sobre el array
  const cajaAbierta = cajas.find(caja => caja.estado === "abierta");


  if (!cajaAbierta) {
    alert("No hay una caja abierta para cerrar.");
    return;
  }

  const datoActualizado = {
    estado: "cerrada",
    fechaCierre: dayjs().format("DD/MM/YYYY HH:mm:ss")
  };

  await actualizarCajaporId(cajaAbierta.id, datoActualizado);

  mostrarCajas();

  // Obtener la instancia existente y cerrarla
bootstrap.Modal.getInstance(document.getElementById('cierreCajaModal')).hide();




});

