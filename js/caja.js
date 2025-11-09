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

      // Generar acordeón-item con diseño BRILLANTE y LLAMATIVO - COLORES CORPORATIVOS AZUL
      const item = document.createElement("div");
      item.classList.add("accordion-item");
      item.style.cssText = "background: rgba(255, 255, 255, 0.15); border: 2px solid rgba(40, 193, 255, 0.4); margin-bottom: 0.75rem; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);";

      item.innerHTML = `
      <h2 class="accordion-header" id="heading${index}">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
          data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}"
          style="background: linear-gradient(135deg, rgba(31, 63, 161, 0.5) 0%, rgba(18, 43, 98, 0.5) 100%); 
                 color: white; 
                 border-radius: 12px; 
                 font-weight: 700;
                 font-size: 1.05rem;
                 text-shadow: 0 2px 6px rgba(0,0,0,0.5);
                 border: 2px solid rgba(40, 193, 255, 0.5);
                 box-shadow: 0 4px 12px rgba(31, 63, 161, 0.3), inset 0 0 30px rgba(40, 193, 255, 0.1);">
          <i class="bi bi-calendar-event me-2" style="color: #6dd6ff; filter: drop-shadow(0 2px 4px rgba(109, 214, 255, 0.4));"></i>${venta.fecha} - 
          <i class="bi bi-person ms-3 me-2" style="color: #6dd6ff; filter: drop-shadow(0 2px 4px rgba(109, 214, 255, 0.4));"></i>${venta.cliente.nombre} | 
          <strong class="ms-3" style="color: #fff; font-size: 1.15rem; text-shadow: 0 0 15px rgba(40, 193, 255, 0.8), 0 2px 6px rgba(0,0,0,0.5);">${venta.total.toLocaleString("es-PY")} Gs</strong>
        </button>
      </h2>
      <div id="collapse${index}" class="accordion-collapse collapse" aria-labelledby="heading${index}"
        data-bs-parent="#ventasAccordion">
        <div class="accordion-body" style="background: linear-gradient(135deg, rgba(10, 26, 60, 0.95) 0%, rgba(18, 43, 98, 0.95) 100%); 
                                           color: white; 
                                           padding: 1.5rem; 
                                           border-top: 2px solid rgba(40, 193, 255, 0.3);
                                           box-shadow: inset 0 4px 20px rgba(0, 0, 0, 0.5);">
          <div class="row mb-3">
            <div class="col-md-3">
              <div class="stat-card">
                <div class="stat-label"><i class="bi bi-cash me-1"></i>Efectivo</div>
                <div class="stat-value" style="font-size: 1.5rem;">${efectivoAplicado.toLocaleString("es-PY")} Gs</div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="stat-card">
                <div class="stat-label"><i class="bi bi-credit-card me-1"></i>Pos/Qr</div>
                <div class="stat-value" style="font-size: 1.5rem;">${tarjetaAplicado.toLocaleString("es-PY")} Gs</div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="stat-card">
                <div class="stat-label"><i class="bi bi-bank me-1"></i>Transferencia</div>
                <div class="stat-value" style="font-size: 1.5rem;">${transferenciaAplicado.toLocaleString("es-PY")} Gs</div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="stat-card">
                <div class="stat-label">💰 Vuelto</div>
                <div class="stat-value" style="font-size: 1.5rem;">${vuelto > 0 ? vuelto.toLocaleString("es-PY") + " Gs" : "-"}</div>
              </div>
            </div>
          </div>

          <!-- Detalle de items vendidos -->
          <div class="table-responsive mt-3" style="background: rgba(10, 15, 25, 0.95); padding: 1rem; border-radius: 12px; border: 2px solid rgba(40, 193, 255, 0.4); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(40, 193, 255, 0.15);">
            <table class="table table-sm table-bordered" style="background: transparent !important; border: none; margin-bottom: 0;">
              <thead>
                <tr style="background: linear-gradient(135deg, rgba(31, 63, 161, 0.7) 0%, rgba(18, 43, 98, 0.7) 100%); border-bottom: 2px solid rgba(40, 193, 255, 0.6);">
                  <th style="color: #fff; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.5); font-size: 1.05rem; padding: 12px; border: none;">📦 Producto</th>
                  <th style="color: #fff; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.5); font-size: 1.05rem; padding: 12px; border: none;">🔢 Cantidad</th>
                  <th style="color: #fff; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.5); font-size: 1.05rem; padding: 12px; border: none;">💵 Precio</th>
                  <th style="color: #fff; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.5); font-size: 1.05rem; padding: 12px; border: none;">💰 Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${venta.venta.map((item) => `
                  <tr style="background: transparent; border-top: 1px solid rgba(40, 193, 255, 0.25);">
                    <td style="color: #fff; font-weight: 600; text-shadow: 0 1px 3px rgba(0,0,0,0.4); font-size: 1.05rem; padding: 10px; border: none;">${item.item}</td>
                    <td style="color: #6dd6ff; font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,0.4); font-size: 1.1rem; padding: 10px; border: none;">${item.cantidad}</td>
                    <td style="color: #90ee90; font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,0.4); font-size: 1.1rem; padding: 10px; border: none;">${item.costo.toLocaleString("es-PY")} Gs</td>
                    <td style="color: #ffd966; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.5); font-size: 1.15rem; padding: 10px; border: none;">${item.subTotal.toLocaleString("es-PY")} Gs</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          
          ${rol === 'admin' && caja.estado === 'abierta' ? `
            <div class="text-end mt-3">
              <button class="btn btn-outline-danger btnRevertirVenta" data-index="${index}" 
                      style="font-weight: 600; 
                             box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
                             border: 2px solid rgba(220, 53, 69, 0.6);
                             text-shadow: 0 1px 3px rgba(0,0,0,0.3);">
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

