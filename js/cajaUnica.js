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

  // sumar todo
  let totalVentas = totalEfectivo + totalTarjeta + totalTransferencia;
  console.log("Total Ventas:", totalVentas);
  document.getElementById("detalleTotalRecaudadoCaja").textContent = totalVentas.toLocaleString("es-PY") + " Gs";



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
          📅 ${venta.fecha} - Cliente: ${venta.cliente} | Total: ${venta.total.toLocaleString("es-PY")} Gs
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

  setTimeout(() => {
    imprimirCierre(cajaAbierta);
  }, 3000);

});




function imprimirCierre(caja) {
  // Fecha de cierre
  const fechaCierre = dayjs().format("DD/MM/YYYY HH:mm:ss");

  // Wrapper del ticket
  const wrapper = document.getElementById("ticket-wrapper");
  wrapper.innerHTML = ""; // Limpiamos

  // Creamos el contenido del ticket
  const ticketHTML = `
    <div style="width: 280px; font-family: monospace; text-align: center; line-height: 1.2;">
      <h2 style="margin:0;">Petro Chaco</h2>
      <p style="margin:0;">Criolla</p>
      <hr>
      <h3 style="margin:5px 0;">CIERRE DE CAJA - ${caja.usuario}</h3>
      <p style="margin:0; font-size:12px;">Apertura: ${caja.fechaApertura}</p>
      <p style="margin:0; font-size:12px;">Cierre: ${fechaCierre}</p>
      <hr>
      <table style="width:100%; font-size:12px; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align:left;">Cant</th>
            <th style="text-align:left;">Producto</th>
            <th style="text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody id="ticket-items-body">
        </tbody>
      </table>
      <hr>
      <p style="text-align:right; margin:2px 0; font-weight:bold;" id="ticket-total"></p>
      <p style="text-align:right; margin:2px 0;" id="ticket-pago"></p>
      <hr>
      <p style="font-size:10px;">Este es un ticket de cierre de caja generado por el sistema.</p>
    </div>
  `;
  wrapper.insertAdjacentHTML("beforeend", ticketHTML);
  wrapper.classList.add("show");

  // Totales y resumen de productos
  let total = 0, efectivoEnCaja = 0, tarjeta = 0, transferencia = 0;
  const resumenProductos = {};

  caja.ventas.forEach(v => {
    v.venta.forEach(p => {
      if (!resumenProductos[p.item]) resumenProductos[p.item] = { cantidad: 0, total: 0 };
      resumenProductos[p.item].cantidad += p.cantidad;
      resumenProductos[p.item].total += p.subTotal;
      total += p.subTotal;
    });

    efectivoEnCaja += v.efectivo || 0;
    tarjeta += v.tarjeta || 0;
    transferencia += v.transferencia || 0;
  });

  // Ajustar exceso de pagos
  const sumaPagos = efectivoEnCaja + tarjeta + transferencia;
  if (sumaPagos > total) {
    const exceso = sumaPagos - total;
    if (efectivoEnCaja >= exceso) efectivoEnCaja -= exceso;
    else {
      let restante = exceso - efectivoEnCaja;
      efectivoEnCaja = 0;
      if (tarjeta >= restante) tarjeta -= restante;
      else {
        restante -= tarjeta;
        tarjeta = 0;
        transferencia -= restante;
      }
    }
  }

  // Llenar tabla
  const cuerpo = document.getElementById("ticket-items-body");
  for (const [item, info] of Object.entries(resumenProductos)) {
    const fila = `
      <tr>
        <td style="text-align:left;">${info.cantidad}</td>
        <td style="text-align:left;">${item}</td>
        <td style="text-align:right;">${info.total.toLocaleString()} Gs</td>
      </tr>
    `;
    cuerpo.insertAdjacentHTML("beforeend", fila);
  }

  // Totales finales
  document.getElementById("ticket-total").textContent = `Total: ${total.toLocaleString()} Gs`;
  document.getElementById("ticket-pago").textContent =
    `Efectivo: ${efectivoEnCaja.toLocaleString()} Gs | Pos/Qr: ${tarjeta.toLocaleString()} Gs | Transferencia: ${transferencia.toLocaleString()} Gs`;

  // Imprimir
  setTimeout(() => {
    window.print();
    wrapper.classList.remove("show");
  }, 500);
}
