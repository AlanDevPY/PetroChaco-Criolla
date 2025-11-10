import { obtenerCajas, obtenerCajaPorId, actualizarCajaporId, sumarStockTransaccional } from "./firebase.js";

let idCajaIndividual;
let tablaCajas; // Variable para DataTable

// Extensión de formato custom (verificar disponibilidad global)
try { dayjs.extend(dayjs_plugin_customParseFormat); } catch (e) { console.warn("CustomParseFormat no disponible", e); }

// Control del spinner
const ocultarSpinner = () => {
  const spinner = document.getElementById('spinner');
  const contenido = document.getElementById('contenidoPrincipal');

  if (spinner) {
    spinner.style.display = 'none';
    spinner.style.opacity = '0';
    spinner.style.pointerEvents = 'none';
    spinner.style.zIndex = '-1';
    spinner.classList.add('hidden');
    spinner.classList.add('d-none');
  }

  if (contenido) {
    contenido.style.display = 'block';
  }
};

// Timeout de seguridad: ocultar spinner después de 3 segundos
setTimeout(() => {
  ocultarSpinner();
}, 3000);

// Inicializar DataTable
const inicializarTabla = () => {
  if ($.fn.DataTable.isDataTable('#tablaCajas')) {
    tablaCajas = $('#tablaCajas').DataTable();
  } else {
    tablaCajas = $('#tablaCajas').DataTable({
      language: {
        url: 'https://cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
      },
      order: [[1, 'desc']], // Ordenar por fecha de apertura descendente
      pageLength: 10,
      lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
      responsive: true,
      columnDefs: [
        { orderable: false, targets: 5 } // Columna de acciones no ordenable
      ]
    });
  }
};

window.addEventListener("DOMContentLoaded", async () => {
  console.log('🏦 Módulo de Caja Cargado');

  // Inicializar DataTable
  inicializarTabla();

  if (document.body?.dataset?.rol) {
    await mostrarCajas();
    ocultarSpinner();
  } else {
    // Esperar a que firebase.js propague el rol
    document.addEventListener('rol-ready', async () => {
      await mostrarCajas();
      ocultarSpinner();
    }, { once: true });
  }
});

// FUNCION DE MOSTRAR LAS CAJAS EN TABLA
const mostrarCajas = async () => {
  const cajas = await obtenerCajas();
  const rol = document.body?.dataset?.rol || 'cajero'; // default cajero si no llega

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

  // Limpiar y recargar DataTable
  tablaCajas.clear();

  if (visibles.length === 0) {
    tablaCajas.row.add([
      '<td colspan="6" class="text-center text-white-50">No hay caja abierta</td>',
      '', '', '', '', ''
    ]).draw();
    return;
  }

  visibles.forEach((caja, index) => {
    const estadoBadge = caja.estado === 'abierta'
      ? '<span class="badge bg-success"><i class="bi bi-unlock me-1"></i>Abierta</span>'
      : '<span class="badge bg-danger"><i class="bi bi-lock me-1"></i>Cerrada</span>';

    const acciones = `
      <button data-id="${caja.id}" class="btn btn-sm btn-primary btn-ver-detalle">
        <i class="bi bi-eye me-1"></i>Ver detalle
      </button>
      ${rol === 'admin' && caja.estado === 'abierta' ? `
        <button data-id="${caja.id}" class="btn btn-sm btn-outline-danger ms-1 btn-cerrar-caja">
          <i class="bi bi-x-circle me-1"></i>Cerrar
        </button>
      ` : ''}
    `;

    tablaCajas.row.add([
      index + 1,
      caja.fechaApertura,
      caja.usuario || '-',
      caja.fechaCierre || '<span class="text-white-50">--</span>',
      estadoBadge,
      acciones
    ]);
  });

  tablaCajas.draw();

  // Agregar event listeners usando delegación de eventos
  $('#tablaCajas tbody').off('click', '.btn-ver-detalle').on('click', '.btn-ver-detalle', async function (e) {
    e.preventDefault();
    e.stopPropagation();

    idCajaIndividual = this.getAttribute('data-id');

    try {
      await mostrarDetalleCaja();

      const modalElement = document.getElementById('detalleCajaModal');
      if (!modalElement) return;

      // Forzar que el spinner esté oculto
      const spinner = document.getElementById('spinner');
      if (spinner) {
        spinner.style.display = 'none';
        spinner.style.pointerEvents = 'none';
        spinner.classList.add('hidden');
      }

      // Abrir modal con Bootstrap API
      const bootstrapModal = new bootstrap.Modal(modalElement, {
        backdrop: true,
        keyboard: true,
        focus: true
      });

      bootstrapModal.show();

      // Verificar y forzar clases si es necesario
      setTimeout(() => {
        const $modal = $('#detalleCajaModal');
        if (!$modal.hasClass('show')) {
          $modal.addClass('show').css('display', 'block');
          $('body').addClass('modal-open').css('overflow', 'hidden');
          if (!$('.modal-backdrop').length) {
            $('body').append('<div class="modal-backdrop fade show"></div>');
          }
        }

        // Forzar que navbar baje su z-index
        $('#navbar-placeholder, .navbar, .fixed-top').css('z-index', '1');
      }, 100);

    } catch (error) {
      console.error('Error al mostrar detalle de caja:', error);
    }
  });

  // Event listener para botón de cerrar caja (solo admin)
  $('#tablaCajas tbody').off('click', '.btn-cerrar-caja').on('click', '.btn-cerrar-caja', function (e) {
    e.preventDefault();
    e.stopPropagation();
    $('#cierreCajaModal').modal('show');
  });
}

// FUNCION PARA MOSTRAR DETALLE DE CAJA
const mostrarDetalleCaja = async () => {
  try {
    const caja = await obtenerCajaPorId(idCajaIndividual);

    if (!caja) {
      console.error('Error: Caja no encontrada');
      return;
    }

    document.getElementById("detalleAperturaCaja").textContent = caja.fechaApertura;
    document.getElementById("detalleCierreCaja").textContent = caja.fechaCierre || "--";

    // Calcular totales por método de pago
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

    let totalVentas = totalEfectivo + totalTarjeta + totalTransferencia;

    document.getElementById("detalleTotalRecaudadoCaja").textContent = totalVentas.toLocaleString("es-PY") + " Gs";
    document.getElementById("detalleTotalEfectivoCaja").textContent = totalEfectivo.toLocaleString("es-PY") + " Gs";
    document.getElementById("detalleTotalTarjetaCaja").textContent = totalTarjeta.toLocaleString("es-PY") + " Gs";
    document.getElementById("detalleTotalTransferenciaCaja").textContent = totalTransferencia.toLocaleString("es-PY") + " Gs";

    // Generar acordeón de ventas
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

      // Generar acordeón-item SOLO con Bootstrap 5 puro
      const item = document.createElement("div");
      item.classList.add("accordion-item");

      item.innerHTML = `
      <h2 class="accordion-header" id="heading${index}">
        <button class="accordion-button collapsed bg-white" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}">
          <i class="bi bi-calendar-event me-2"></i>${venta.fecha} - 
          <i class="bi bi-person ms-3 me-2"></i>${venta.cliente.nombre} | 
          <strong class="ms-3">${venta.total.toLocaleString("es-PY")} Gs</strong>
        </button>
      </h2>
      <div id="collapse${index}" class="accordion-collapse collapse" aria-labelledby="heading${index}"
        data-bs-parent="#ventasAccordion">
        <div class="accordion-body bg-light">
          <div class="row mb-3">
            <div class="col-md-3">
              <div class="p-2 rounded bg-success text-white"><i class="bi bi-cash me-1"></i> Efectivo: <span>${efectivoAplicado.toLocaleString("es-PY")} Gs</span></div>
            </div>
            <div class="col-md-3">
              <div class="p-2 rounded bg-primary text-white"><i class="bi bi-credit-card me-1"></i> Pos/Qr: <span>${tarjetaAplicado.toLocaleString("es-PY")} Gs</span></div>
            </div>
            <div class="col-md-3">
              <div class="p-2 rounded bg-info text-dark"><i class="bi bi-bank me-1"></i> Transferencia: <span>${transferenciaAplicado.toLocaleString("es-PY")} Gs</span></div>
            </div>
            <div class="col-md-3">
              <div class="p-2 rounded bg-warning text-dark">💰 Vuelto: <span>${vuelto > 0 ? vuelto.toLocaleString("es-PY") + " Gs" : "-"}</span></div>
            </div>
          </div>

          <!-- Detalle de items vendidos -->
          <div class="table-responsive mt-3">
            <table class="table table-sm table-bordered">
              <thead class="table-primary">
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
          
          ${rol === 'admin' && caja.estado === 'abierta' ? `
            <div class="text-end mt-3">
              <button class="btn btn-outline-danger btnRevertirVenta" data-index="${index}">
                <i class="bi bi-arrow-counterclockwise me-2"></i>Revertir Venta
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

  } catch (error) {
    console.error('Error en mostrarDetalleCaja():', error);
    throw error;
  }
}//? FUNCION DE REALIZAR CIERRE DE CAJA

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
    wrapper = document.createElement('div');
    wrapper.id = 'ticket-wrapper';
    wrapper.className = 'ticket-wrapper';
    document.body.appendChild(wrapper);
  } else {
    wrapper.className = 'ticket-wrapper';
  }
  wrapper.innerHTML = "";
  // Diseño visual mejorado tipo comprobante de cierre
  const ticketHTML = `
    <div class="ticket-container" style="padding:2mm 0 2mm 0;">
      <div class="ticket-header ticket-center" style="border-bottom:2px solid #000;padding-bottom:1.5mm;margin-bottom:1.5mm;">
        <div class="ticket-bold" style="font-size:15px;letter-spacing:1px;">Petro Chaco Criolla</div>
        <div class="ticket-small">Ruta N20° - Santiago, Misiones</div>
        <div class="ticket-small">Tel: 0984 000 000</div>
      </div>
      <div style="font-size:11px;text-align:left;margin-bottom:1.5mm;line-height:1.3;">
        <span class="ticket-bold">Usuario:</span> <span id="ticket-usuario">${caja.usuario || '-'}</span><br>
        <span class="ticket-bold">Fecha cierre:</span> <span id="ticket-fecha">${fechaCierre}</span><br>
        <span class="ticket-bold">Apertura:</span> ${caja.fechaApertura}<br>
        <span class="ticket-bold">Estado:</span> ${caja.estado}
      </div>
      <div style="border-bottom:1px dashed #000;margin-bottom:1.5mm;"></div>
      <table class="ticket-items" style="margin-bottom:1.5mm;width:100%;border-collapse:collapse;font-size:9px;">
        <thead>
          <tr style="border-bottom:1.2px solid #000;background:#f0f0f0;">
            <th class="ticket-qty" style="text-align:center;padding:0.5mm 0.2mm;width:12%;">Cant</th>
            <th class="ticket-desc" style="text-align:left;padding:0.5mm 0.2mm;width:58%;">Producto</th>
            <th class="ticket-price" style="text-align:right;padding:0.5mm 0.2mm;width:30%;">Costo</th>
          </tr>
        </thead>
        <tbody id="ticket-items-body"></tbody>
      </table>
      <div style="border-bottom:1px dashed #000;margin-bottom:1.5mm;"></div>
      <div class="ticket-total-row" style="background:#f5f5f5;border-radius:1.5mm;padding:1.2mm 0 1.2mm 0;margin-bottom:1.5mm;">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:0.5mm;">
          <span class="ticket-bold">Ventas</span>
          <span id="ticket-ventas" class="ticket-right"></span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:0.5mm;">
          <span class="ticket-bold">Items</span>
          <span id="ticket-items" class="ticket-right"></span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-top:1mm;">
          <span class="ticket-bold">TOTAL</span>
          <span id="ticket-total" class="ticket-right" style="font-size:13px;"></span>
        </div>
      </div>
      <div style="border:1px solid #000;border-radius:1mm;padding:1mm 1mm 0.5mm 1mm;margin-bottom:1.5mm;">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:0.5mm;">
          <span class="ticket-bold">Efectivo</span>
          <span id="ticket-pago-efec" class="ticket-right"></span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:0.5mm;">
          <span class="ticket-bold">Pos/Qr</span>
          <span id="ticket-pago-tarj" class="ticket-right"></span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:0.5mm;">
          <span class="ticket-bold">Transferencia</span>
          <span id="ticket-pago-transf" class="ticket-right"></span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;">
          <span class="ticket-bold">Ajuste</span>
          <span id="ticket-extra" class="ticket-right"></span>
        </div>
      </div>
      <div class="ticket-msg" id="ticket-msg" style="margin-top:2mm;">
        ¡Gracias por su trabajo! ✔
      </div>
      <div class="ticket-center ticket-small" style="margin-top:2mm;">
        <div>-----------------------------</div>
        <div class="ticket-bold">CIERRE DE CAJA</div>
      </div>
    </div>
  `;
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
  let exceso = 0;
  if (sumaPagos > total) {
    exceso = sumaPagos - total;
    if (efectivoEnCaja >= exceso) efectivoEnCaja -= exceso; else {
      exceso -= efectivoEnCaja; efectivoEnCaja = 0;
      if (tarjeta >= exceso) tarjeta -= exceso; else {
        exceso -= tarjeta; tarjeta = 0; transferencia -= exceso;
      }
    }
  }
  const cuerpo = document.getElementById("ticket-items-body");
  const productos = Object.entries(resumenProductos);
  productos.forEach(([item, info], idx) => {
    const border = idx < productos.length - 1 ? 'border-bottom:0.7px dashed #bbb;' : '';
    cuerpo.insertAdjacentHTML("beforeend", `
      <tr class='ticket-item-row' style="${border}">
        <td class='ticket-qty ticket-item-peq' style="text-align:center;padding:0.4mm 0.2mm;width:12%;vertical-align:middle;">${info.cantidad}</td>
        <td class='ticket-desc ticket-item-peq' style="text-align:left;padding:0.4mm 0.2mm;width:58%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle;">${item}</td>
        <td class='ticket-price ticket-item-peq' style="text-align:right;padding:0.4mm 0.2mm;width:30%;vertical-align:middle;">${info.total.toLocaleString()} Gs</td>
      </tr>
    `);
  });
  document.getElementById("ticket-ventas").textContent = ventasCount;
  document.getElementById("ticket-items").textContent = itemsCount;
  document.getElementById("ticket-total").textContent = `${total.toLocaleString()} Gs`;
  document.getElementById("ticket-pago-efec").textContent = efectivoEnCaja.toLocaleString();
  document.getElementById("ticket-pago-tarj").textContent = tarjeta.toLocaleString();
  document.getElementById("ticket-pago-transf").textContent = transferencia.toLocaleString();
  document.getElementById("ticket-extra").textContent = exceso > 0 ? `-${exceso.toLocaleString()} Gs` : "-";
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

