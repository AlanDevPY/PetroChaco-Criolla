import { obtenerCajas, obtenerCajaPorId, actualizarCajaporId, sumarStockTransaccional } from "./firebase.js";

let idCajaIndividual;
// Extensión de formato custom (verificar disponibilidad global)
try { dayjs.extend(dayjs_plugin_customParseFormat); } catch (e) { console.warn("CustomParseFormat no disponible", e); }

window.addEventListener("DOMContentLoaded", async () => {
  if (document.body?.dataset?.rol) {
    await mostrarCajas();
  } else {
    // Esperar a que firebase.js propague el rol
    document.addEventListener('rol-ready', async () => {
      await mostrarCajas();
    }, { once: true });
  }
});

// FUNCION DE MOSTRAR LAS CAJAS EN TABLA
const mostrarCajas = async () => {
  const cajas = await obtenerCajas();
  const rol = document.body?.dataset?.rol || 'cajero'; // default cajero si no llega
  const tablaCajas = document.getElementById("cajasTable");
  let contador = 1;

  // ordenar por fecha de apertura, hora, minuto y segundo
  const parseFecha = (s) => {
    // Intenta múltiples formatos conocidos
    const f = ["DD/MM/YYYY, h:mm:ss A", "DD/MM/YYYY HH:mm:ss"]; // 12h y 24h
    for (const fmt of f) {
      const d = dayjs(s, fmt, true);
      if (d.isValid()) return d;
    }
    // fallback: intentar parsear nativo
    return dayjs(s);
  };

  // Preferir Timestamp si existe (fechaAperturaTS) para orden consistente
  cajas.sort((a, b) => {
    const db = b.fechaAperturaTS?.seconds ? dayjs.unix(b.fechaAperturaTS.seconds) : parseFecha(b.fechaApertura);
    const da = a.fechaAperturaTS?.seconds ? dayjs.unix(a.fechaAperturaTS.seconds) : parseFecha(a.fechaApertura);
    return db.diff(da);
  });

  // Filtrar según rol: admin ve todas, otros solo la abierta
  const visibles = rol === 'admin' ? cajas : cajas.filter(c => c.estado === 'abierta');

  tablaCajas.innerHTML = "";
  if (visibles.length === 0) {
    tablaCajas.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No hay caja abierta</td></tr>`;
    return;
  }

  visibles.forEach((caja) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
          <tr>
            <td>${contador++}</td>
            <td>${caja.fechaApertura}</td>
            <td>${caja.usuario || '-'}</td>
            <td>${caja.fechaCierre || "--"}</td>
            <td>
              <span class="badge ${caja.estado === 'abierta' ? 'bg-success' : 'bg-danger'}">
                ${caja.estado}
              </span>
            </td>
            <td>
              <button data-id="${caja.id}" class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#detalleCajaModal">
                Ver detalle
              </button>
              ${rol === 'admin' && caja.estado === 'abierta' ? `<button data-id="${caja.id}" class="btn btn-sm btn-outline-danger ms-1" data-bs-toggle="modal" data-bs-target="#cierreCajaModal">Cerrar</button>` : ''}
            </td>
          </tr>
        `;

    tablaCajas.innerHTML += fila.outerHTML;
  });

  // obtener dataId de la caja seleccionada
  // Limitar seleccion a la tabla para evitar capturar otros .btn-primary
  const botonesVerDetalle = document.querySelectorAll("#cajasTable .btn-primary");
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

  const rol = document.body?.dataset?.rol || 'cajero';

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
          
          ${rol === 'admin' && caja.estado === 'abierta' ? `
            <div class="text-end mt-2">
              <button class="btn btn-sm btn-outline-danger btnRevertirVenta" data-index="${index}">
                <i class="bi bi-arrow-counterclockwise me-1"></i>Revertir Venta
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    ventasAccordion.appendChild(item);
  });

  // Agregar listeners a los botones de revertir
  if (rol === 'admin' && caja.estado === 'abierta') {
    document.querySelectorAll('.btnRevertirVenta').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ventaIndex = parseInt(btn.getAttribute('data-index'));
        await revertirVenta(idCajaIndividual, ventaIndex);
      });
    });
  }




}

//? FUNCION DE REALIZAR CIERRE DE CAJA

// Cierre de caja + impresión (fusionado desde cajaUnica.js)
document.getElementById("formCierreCaja")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rol = document.body?.dataset?.rol || 'cajero';
  if (rol !== 'admin' && rol !== 'cajero') return; // seguridad básica

  const cajas = await obtenerCajas();
  const cajaAbierta = cajas.find(caja => caja.estado === "abierta");
  if (!cajaAbierta) {
    alert("No hay una caja abierta para cerrar.");
    return;
  }
  const datoActualizado = { estado: "cerrada", fechaCierre: dayjs().format("DD/MM/YYYY HH:mm:ss") };
  await actualizarCajaporId(cajaAbierta.id, datoActualizado);
  mostrarCajas();
  bootstrap.Modal.getInstance(document.getElementById('cierreCajaModal'))?.hide();
  setTimeout(() => imprimirCierre(cajaAbierta), 500); // imprimir rápido
});

// Preparar modal de cierre cuando se abre
const cierreModalEl = document.getElementById('cierreCajaModal');
if (cierreModalEl) {
  cierreModalEl.addEventListener('show.bs.modal', async () => {
    const cajas = await obtenerCajas();
    const cajaAbierta = cajas.find(c => c.estado === 'abierta');
    const ahora = dayjs();
    if (!cajaAbierta) {
      document.getElementById('cierreTotalRecaudado').textContent = 'Sin caja abierta';
      return;
    }
    let efectivo = 0, tarjeta = 0, transferencia = 0, itemsVendidos = 0;
    const ventas = cajaAbierta.ventas || [];
    ventas.forEach(v => {
      let restante = v.total;
      const efectivoAplicado = Math.min(v.efectivo, restante); restante -= efectivoAplicado;
      const tarjetaAplicado = Math.min(v.tarjeta, restante); restante -= tarjetaAplicado;
      const transferenciaAplicado = Math.min(v.transferencia, restante); restante -= transferenciaAplicado;
      efectivo += efectivoAplicado; tarjeta += tarjetaAplicado; transferencia += transferenciaAplicado;
      (v.venta || []).forEach(item => { itemsVendidos += item.cantidad; });
    });
    const total = efectivo + tarjeta + transferencia;
    // Rellenar tarjetas
    const fmt = n => n.toLocaleString('es-PY') + ' Gs';
    document.getElementById('cierreTotalRecaudado').textContent = fmt(total);
    document.getElementById('cierreTotalEfectivo').textContent = fmt(efectivo);
    document.getElementById('cierreTotalTarjeta').textContent = fmt(tarjeta);
    document.getElementById('cierreTotalTransferencia').textContent = fmt(transferencia);
    document.getElementById('cierreCantVentas').textContent = ventas.length;
    document.getElementById('cierreItemsVendidos').textContent = itemsVendidos;
    document.getElementById('cierreApertura').textContent = cajaAbierta.fechaApertura || '--';
    document.getElementById('cierreAhoraTime').textContent = ahora.format('DD/MM/YYYY HH:mm:ss');
    // Rellenar tabla de ventas
    const tbody = document.getElementById('cajaVentasTableModal');
    if (tbody) {
      tbody.innerHTML = '';
      ventas.forEach(v => {
        const metodoPago = v.efectivo > 0 ? 'Efectivo' : (v.tarjeta > 0 ? 'Pos/Qr' : (v.transferencia > 0 ? 'Transferencia' : '-'));
        tbody.insertAdjacentHTML('beforeend', `<tr><td>${v.fecha}</td><td>${v.cliente?.nombre || 'Consumidor Final'}</td><td>${v.total.toLocaleString('es-PY')} Gs</td><td>${metodoPago}</td></tr>`);
      });
      if (ventas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin ventas registradas</td></tr>';
      }
    }
  });
}

function imprimirCierre(caja) {
  const fechaCierre = dayjs().format("DD/MM/YYYY HH:mm:ss");
  let wrapper = document.getElementById("ticket-wrapper");
  if (!wrapper) {
    // crear contenedor mínimo si no existe
    wrapper = document.createElement('div');
    wrapper.id = 'ticket-wrapper';
    document.body.appendChild(wrapper);
  }
  wrapper.innerHTML = "";
  const ticketHTML = `
    <div style="width:280px;font-family:monospace;text-align:center;line-height:1.25;color:#000;">
      <div style="font-size:18px;font-weight:900;letter-spacing:0.5px;color:#000;">PETRO CHACO CRIOLLA</div>
      <div style="font-size:11px;font-weight:700;color:#000;">SISTEMA POS - CIERRE DE CAJA</div>
      <hr style="margin:4px 0;border-top:2px solid #000;">
      <div style="font-size:13px;font-weight:800;color:#000;">CAJA: ${caja.usuario || '-'} (${caja.estado})</div>
      <div style="font-size:11px;text-align:left;margin-top:4px;color:#000;font-weight:600;">Apertura: ${caja.fechaApertura}</div>
      <div style="font-size:11px;text-align:left;color:#000;font-weight:600;">Cierre: ${fechaCierre}</div>
      <hr style="margin:4px 0;border-top:1px solid #000;">
      <table style="width:100%;font-size:11px;border-collapse:collapse;color:#000;">
        <thead><tr style="border-bottom:1px solid #000;"><th style="text-align:left;font-weight:800;">Cant</th><th style="text-align:left;font-weight:800;">Producto</th><th style="text-align:right;font-weight:800;">Subtotal</th></tr></thead>
        <tbody id="ticket-items-body"></tbody>
      </table>
      <hr style="margin:4px 0;border-top:1px dashed #000;">
      <div id="ticket-resumen" style="font-size:11px;text-align:left;font-weight:700;color:#000;"></div>
      <div style="font-size:12px;font-weight:900;text-align:right;margin-top:4px;color:#000;" id="ticket-total"></div>
      <div style="font-size:11px;text-align:right;font-weight:700;color:#000;" id="ticket-pago"></div>
      <div style="font-size:11px;text-align:right;font-weight:700;color:#000;" id="ticket-extra"></div>
      <hr style="margin:4px 0;border-top:2px solid #000;">
      <div style="font-size:10px;font-weight:700;color:#000;">Generado: ${fechaCierre}</div>
      <div style="font-size:10px;font-weight:700;color:#000;">Gracias por su trabajo ✔</div>
    </div>`;
  wrapper.insertAdjacentHTML("beforeend", ticketHTML);
  let total = 0, efectivoEnCaja = 0, tarjeta = 0, transferencia = 0;
  const resumenProductos = {};
  let ventasCount = 0, itemsCount = 0;
  (caja.ventas || []).forEach(v => {
    ventasCount++;
    (v.venta || []).forEach(p => {
      if (!resumenProductos[p.item]) resumenProductos[p.item] = { cantidad: 0, total: 0 };
      resumenProductos[p.item].cantidad += p.cantidad;
      resumenProductos[p.item].total += p.subTotal;
      total += p.subTotal;
      itemsCount += p.cantidad;
    });
    efectivoEnCaja += v.efectivo || 0;
    tarjeta += v.tarjeta || 0;
    transferencia += v.transferencia || 0;
  });
  const sumaPagos = efectivoEnCaja + tarjeta + transferencia;
  if (sumaPagos > total) {
    let exceso = sumaPagos - total;
    if (efectivoEnCaja >= exceso) efectivoEnCaja -= exceso; else {
      exceso -= efectivoEnCaja; efectivoEnCaja = 0;
      if (tarjeta >= exceso) tarjeta -= exceso; else {
        exceso -= tarjeta; tarjeta = 0; transferencia -= exceso;
      }
    }
  }
  const cuerpo = document.getElementById("ticket-items-body");
  for (const [item, info] of Object.entries(resumenProductos)) {
    cuerpo.insertAdjacentHTML("beforeend", `<tr><td style="text-align:left;">${info.cantidad}</td><td style="text-align:left;">${item}</td><td style="text-align:right;">${info.total.toLocaleString()} Gs</td></tr>`);
  }
  document.getElementById("ticket-total").textContent = `TOTAL VENTAS: ${total.toLocaleString()} Gs`;
  document.getElementById("ticket-pago").textContent = `Efec: ${efectivoEnCaja.toLocaleString()} | Pos/Qr: ${tarjeta.toLocaleString()} | Transf: ${transferencia.toLocaleString()} Gs`;
  document.getElementById("ticket-resumen").innerHTML = `Ventas: <strong>${ventasCount}</strong> | Items: <strong>${itemsCount}</strong>`;
  const exceso = (efectivoEnCaja + tarjeta + transferencia) - total;
  if (exceso > 0) {
    document.getElementById("ticket-extra").textContent = `Ajuste de exceso pagos: -${exceso.toLocaleString()} Gs`;
  }
  setTimeout(() => { window.print(); }, 300);
  // Ocultar el ticket una vez que finaliza la impresión
  const hideTicket = () => {
    const w = document.getElementById('ticket-wrapper');
    if (w) w.innerHTML = '';
    window.removeEventListener('afterprint', hideTicket);
  };
  window.addEventListener('afterprint', hideTicket);
}

// Función para revertir una venta (solo admin)
async function revertirVenta(cajaId, ventaIndex) {
  const rol = document.body?.dataset?.rol || 'cajero';
  if (rol !== 'admin') {
    alert('Solo el administrador puede revertir ventas.');
    return;
  }

  if (!confirm('¿Está seguro de revertir esta venta? Los items volverán al stock y se descontará el monto de la caja.')) {
    return;
  }

  // Mostrar modal de procesamiento
  const modalProcesando = new bootstrap.Modal(document.getElementById('modalProcesandoReversion'));
  modalProcesando.show();

  try {
    // Obtener caja actual
    const caja = await obtenerCajaPorId(cajaId);

    if (caja.estado !== 'abierta') {
      modalProcesando.hide();
      alert('Solo se pueden revertir ventas de cajas abiertas.');
      return;
    }

    if (!caja.ventas || ventaIndex >= caja.ventas.length) {
      modalProcesando.hide();
      alert('Venta no encontrada.');
      return;
    }

    const venta = caja.ventas[ventaIndex];

    // Preparar items para devolver al stock
    const itemsParaDevolver = (venta.venta || []).map(item => ({
      id: item.id,
      cantidad: item.cantidad
    }));

    // Devolver stock transaccional
    if (itemsParaDevolver.length > 0) {
      await sumarStockTransaccional(itemsParaDevolver);
    }

    // Calcular monto a descontar de la caja
    const montoDescontar = venta.total || 0;

    // Actualizar caja: eliminar venta del array y ajustar totalRecaudado
    const nuevasVentas = caja.ventas.filter((_, idx) => idx !== ventaIndex);
    const nuevoTotal = Math.max(0, (caja.totalRecaudado || 0) - montoDescontar);

    await actualizarCajaporId(cajaId, {
      ventas: nuevasVentas,
      totalRecaudado: nuevoTotal
    });

    // Ocultar modal de procesamiento
    modalProcesando.hide();

    alert('Venta revertida exitosamente. Stock y totales actualizados.');

    // Refrescar vista
    await mostrarDetalleCaja();
    await mostrarCajas();

  } catch (error) {
    // Ocultar modal de procesamiento en caso de error
    modalProcesando.hide();
    console.error('Error al revertir venta:', error);
    alert('Error al revertir la venta: ' + (error.message || 'Desconocido'));
  }
}

