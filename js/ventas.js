import {
  obtenerStock,
  obtenerStockPorId,
  registrarCliente,
  obtenerClientesCached,
  obtenerCajas,
  actualizarStockporId,
  eliminarClientePorID,
  registrarCaja,
  actualizarCajaporId,
  obtenerStockCached,
  descontarStockTransaccional,
} from "./firebase.js";
import { formatGs, mostrarAviso, debounce } from "./utils.js";
import { toastSwal } from "./swal-utils.js";
import {
  confirmarEliminacion,
  alertaExito,
  alertaError,
  alertaAdvertencia,
  alertaInfo,
  mostrarCargando,
  ocultarCargando
} from "./swal-utils.js";
import {
  initClientesDataTable,
  poblarTablaClientes,
  eliminarClienteDeTabla
} from "./ventas-datatable.js";

// Importar función de datalist mejorado (reutilizamos la misma de stock)
import { mejorarDatalist } from "./datalist-mejorado.js";

// Importar funciones de facturación
import { obtenerTimbradoActivo, incrementarNumeroFactura } from "./facturacion.js";
import { registrarFactura } from "./firebase.js";

// VARIABLES GLOBALES
let pedido = [];
let pedidoGenerado = {};
let cliente;

// Referencias a elementos por id (evita depender de variables globales implícitas)
const btnCobrar = document.getElementById("btnCobrar");
const btnConfirmarVenta = document.getElementById("btnConfirmarVenta");
const clienteRucCobro = document.getElementById("clienteRucCobro");
const clienteNombreCobro = document.getElementById("clienteNombreCobro");
const clienteDireccionCobro = document.getElementById("clienteDireccionCobro");
const clienteTelefonoCobro = document.getElementById("clienteTelefonoCobro");

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


// FUNCION PARA OBTENER STOCK Y MOSTRAR EN EL DATALIST
const mostrarStockDataList = async () => {
  // Usa caché para evitar lecturas repetidas
  const stock = (await obtenerStockCached?.()) || (await obtenerStock());

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
  btnConfirmarVenta.disabled = false;

  const cantidad = Number(document.getElementById("cantidad").value);
  const inputValue = document.getElementById("inputProducto").value.trim();
  const dataList = document.getElementById("listaProductos");
  const options = dataList.querySelectorAll("option");

  // Validar cantidad
  if (cantidad <= 0) {
    alertaAdvertencia("Cantidad inválida", "Ingrese una cantidad válida.");
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
    alertaAdvertencia("Producto no encontrado", "El producto ingresado no existe en el sistema.");
    return;
  }

  // Obtener el producto del stock
  const stockItem = await obtenerStockPorId(selectedId);

  // Buscar si ya existe el item en el pedido
  const pedidoExistente = pedido.find((p) => p.id === stockItem.id);

  if (stockItem.cantidad < cantidad) {
    alertaAdvertencia("Stock insuficiente", `Solo hay ${stockItem.cantidad} unidades disponibles.`);
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
  document.getElementById("totalPedido").textContent = formatGs(calcularTotalPedido());
  console.log(pedidoGenerado);
});

// FUNCION PARA MOSTRAR PEDIDO CARGADO
const mostrarPedidoCargado = () => {
  const pedidoList = document.getElementById("carritoTableBody");
  pedidoList.innerHTML = "";

  pedido.forEach((item) => {
    pedidoList.innerHTML += `
        <tr class="animate__animated animate__fadeIn">
            <td>${item.item}</td>
            <td class="text-center"> ${item.cantidad}</td>
            <td class="text-end">${item.costo.toLocaleString("es-PY")} Gs</td>
            <td class="text-end">${item.subTotal.toLocaleString(
      "es-PY"
    )} Gs</td>
             <td class="text-center"><button class="btn btn-sm btn-danger"><i class="bi bi-trash3"></i></button></td>
        </tr>
        `;
  });

  // eliminar pedido
  // Limitar al tbody del carrito para no capturar otros botones .btn-danger de la página
  const botonesEliminar = document.querySelectorAll("#carritoTableBody .btn-danger");
  botonesEliminar.forEach((boton) => {
    boton.addEventListener("click", async () => {
      const index = Array.from(botonesEliminar).indexOf(boton);
      pedido.splice(index, 1);
      mostrarPedidoCargado();
      document.getElementById("totalPedido").textContent = formatGs(calcularTotalPedido());
    });
  });
};

//? FUNCIONES EN MODAL DE COBRO--------------------------------------------------
btnCobrar?.addEventListener("click", async () => {
  modalTotalCobro.textContent = "Total a pagar: " + formatGs(calcularTotalPedido());

  // reset form
  document.getElementById("modalCobrarForm").reset();
  // Forzar actualización de color
  actualizarCobro();
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
    modalTotalCobro.textContent = "Falta pagar: " + formatGs(diferencia);
    modalTotalCobro.classList.add("alert-danger");
  } else if (diferencia === 0) {
    // Exacto → verde
    modalTotalCobro.textContent = "Pago exacto";
    modalTotalCobro.classList.add("alert-success");
  } else {
    // Vuelto → amarillo
    modalTotalCobro.textContent = "Vuelto: " + formatGs(-diferencia);
    modalTotalCobro.classList.add("alert-warning");
  }
}

// Escuchar cambios en los inputs
[efectivoInput, tarjetaInput, transferenciaInput].forEach((input) => {
  input.addEventListener("input", actualizarCobro);
});

// funcion con modal cobro cliente

const buscarClientePorRuc = debounce(async () => {
  const ruc = clienteRucCobro.value.trim();
  if (!ruc) return;
  const clientes = await obtenerClientesCached();
  cliente = clientes.find((c) => c.ruc === ruc);
  if (cliente) {
    clienteNombreCobro.value = cliente.nombre;
    clienteDireccionCobro.value = cliente.direccion;
    clienteTelefonoCobro.value = cliente.telefono;
  }
}, 150);
clienteRucCobro?.addEventListener("input", buscarClientePorRuc);


// FUNCION PARA REGISTRAR LA VENTA
document.getElementById("modalCobrarForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  btnConfirmarVenta.disabled = true;


  // Validar cliente
  if (!cliente || !cliente.ruc || cliente.ruc.trim() === "") {
    alertaAdvertencia("Cliente requerido", "Ingrese un RUC válido antes de cobrar.");
    clienteRucCobro.focus();
    btnConfirmarVenta.disabled = false;
    return;
  }




  // Obtengo todas las cajas
  const Cajas = await obtenerCajas();

  // Busco si hay alguna caja abierta
  let cajaAbierta = Cajas.find((caja) => caja.estado === "abierta");
  let usuarioLogueado = document.getElementById("usuarioLogueado").textContent

  // Datos de la venta actual
  const venta = {
    cliente: cliente, // objeto cliente
    venta: pedido, // array de productos
    fecha: dayjs().format("DD/MM/YYYY HH:mm:ss"), // string legacy conservada
    efectivo: Number(efectivoInput.value.replace(/\./g, "")),
    tarjeta: Number(tarjetaInput.value.replace(/\./g, "")),
    transferencia: Number(transferenciaInput.value.replace(/\./g, "")),
    total: calcularTotalPedido(),
  };


  // funcion para descontar stock de la venta
  // Descuento transaccional de stock para evitar condiciones de carrera
  const descontarStock = async (ventaActual) => {
    try {
      await descontarStockTransaccional(ventaActual.venta.map(i => ({ id: i.id, cantidad: Number(i.cantidad) })));
      return true;
    } catch (err) {
      console.error("Error transaccional al descontar stock:", err);
      return false;
    }
  };

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
      alertaAdvertencia("Pago insuficiente", "Falta pagar: " + formatGs(diferencia));
      btnConfirmarVenta.disabled = false;
      return;
    } else {
      await registrarCaja(nuevaCaja);
      const ok = await descontarStock(venta);
      if (!ok) {
        btnConfirmarVenta.disabled = false;
        alertaError("Error al descontar stock", "No se pudo completar la venta.");
        return;
      }

      // Imprimir según checkbox: ticket o factura legal
      await procesarImpresion(venta);


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
      alertaAdvertencia("Pago insuficiente", "Falta pagar: " + formatGs(diferencia));
      btnConfirmarVenta.disabled = false;

      return;
    } else {

      btnConfirmarVenta.disabled = true;
      // Actualizo la caja en Firestore
      await actualizarCajaporId(cajaAbierta.id, cajaAbierta);
      const ok = await descontarStock(venta);
      if (!ok) {
        btnConfirmarVenta.disabled = false;
        alertaError("Error al descontar stock", "No se pudo completar la venta.");
        return;
      }

      // Imprimir según checkbox: ticket o factura legal
      await procesarImpresion(venta);

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

  btnConfirmarVenta.disabled = true;
  // Usar toast en vez de modal para evitar que tape el ticket al imprimir
  toastSwal("Venta registrada", "success");
  mostrarPedidoCargado();
  actualizarCobro();
  // Mostrar total en Guaraníes
  document.getElementById("totalPedido").textContent = formatGs(calcularTotalPedido());
});

// Invalidar caché de stock después de una venta
const invalidarCacheStock = () => {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("stockCache");
    console.log("Caché de stock invalidada.");
  }
};

// Actualizar solo los productos modificados en la caché después de una venta
const actualizarCacheStock = async (productosVendidos) => {
  try {
    // Obtener la caché actual
    const stockCache = JSON.parse(localStorage.getItem("stockCache")) || [];

    // Actualizar los productos vendidos en la caché
    productosVendidos.forEach((productoVendido) => {
      const productoEnCache = stockCache.find((item) => item.id === productoVendido.id);
      if (productoEnCache) {
        productoEnCache.cantidad -= productoVendido.cantidad;
      }
    });

    // Guardar la caché actualizada
    localStorage.setItem("stockCache", JSON.stringify(stockCache));
    console.log("Caché de stock actualizada.");
  } catch (error) {
    console.error("Error al actualizar la caché de stock:", error);
  }
};

// Modificar la lógica de registro de venta para actualizar la caché
const registrarVenta = async (venta, cajaAbierta) => {
  try {
    // Actualizar la caja en Firebase
    await actualizarCajaporId(cajaAbierta.id, cajaAbierta);

    // Descontar stock en Firebase
    const ok = await descontarStockTransaccional(venta.venta.map(i => ({ id: i.id, cantidad: Number(i.cantidad) })));
    if (!ok) {
      throw new Error("Error al descontar stock");
    }

    // Actualizar la caché de stock
    await actualizarCacheStock(venta.venta);

    // Mostrar mensaje de éxito
    // Usar toast en vez de modal para evitar que tape el ticket al imprimir
    toastSwal("Venta registrada", "success");
  } catch (error) {
    console.error("Error al registrar la venta:", error);
    alertaError("Error al registrar la venta", error.message || "Ocurrió un error desconocido.");
  }
};

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
  const clientes = await obtenerClientesCached();
  const clienteExistente = clientes.find((c) => c.ruc === ruc);
  if (clienteExistente) {
    alertaAdvertencia("Cliente duplicado", "Ya existe un cliente con ese RUC registrado.");
    return;
  }

  await registrarCliente(cliente);
  alertaExito("Cliente registrado", `${nombre} ha sido registrado correctamente.`);

  // Cerrar el modal de registro
  const modalRegistrar = bootstrap.Modal.getInstance(document.getElementById('modalRegistrarCliente'));
  if (modalRegistrar) {
    modalRegistrar.hide();
  }

  // Limpiar formulario
  formCliente.reset();

  await mostrarClientes();
});

// funcion para mostrar los clientes registrados
async function mostrarClientes() {
  const clientes = await obtenerClientesCached();

  // Si DataTables está inicializado, poblar tabla
  if ($.fn.DataTable.isDataTable('#tablaClientes')) {
    poblarTablaClientes(clientes);
  } else {
    // Inicializar DataTable por primera vez
    initClientesDataTable();
    poblarTablaClientes(clientes);
  }
}

// Configurar eventos de DataTable para eliminar clientes
function configurarEventosClientes() {
  // Usar delegación de eventos para botones dinámicos
  $(document).on('click', '.btn-eliminar-cliente', async function () {
    const id = $(this).data('id');

    // Buscar el nombre del cliente
    const clientes = await obtenerClientesCached();
    const cliente = clientes.find(c => c.id === id);
    const nombreCliente = cliente ? cliente.nombre : 'este cliente';

    const confirmacion = await confirmarEliminacion(nombreCliente, 'cliente');

    if (confirmacion.isConfirmed) {
      try {
        await eliminarClientePorID(id);
        eliminarClienteDeTabla(id);
        alertaExito("Cliente eliminado", `${nombreCliente} ha sido eliminado correctamente.`);
      } catch (error) {
        console.error('Error al eliminar cliente:', error);
        alertaError("Error al eliminar", "No se pudo eliminar el cliente.");
      }
    }
  });
}





window.addEventListener("DOMContentLoaded", async () => {
  configurarEventosClientes();

  // Cargar clientes cuando se abra el modal de Ver Clientes
  const modalVerClientes = document.getElementById('modalVerClientes');
  if (modalVerClientes) {
    modalVerClientes.addEventListener('shown.bs.modal', async () => {
      await mostrarClientes();
    });
  }

  const spinner = document.getElementById("spinnerCarga");
  const contenido = document.getElementById("contenidoPrincipal");

  // Mostrar spinner usando Bootstrap;
  spinner.classList.add("d-flex");



  // Esperar a que se carguen los datos
  await mostrarStockDataList();

  // Inicializar datalist mejorado
  mejorarDatalist('inputProducto', 'listaProductos');

  const Cajas = await obtenerCajas();
  let cajaAbierta = Cajas.find((caja) => caja.estado === "abierta");

  if (cajaAbierta) {
    const badge = document.getElementById("estadoCajaBadge");
    badge.innerHTML = '<i class="bi bi-unlock"></i> Caja Abierta';
    badge.classList.remove("bg-danger");
    badge.classList.add("bg-success");
  }

  // Ocultar spinner y mostrar contenido usando clases Bootstrap
  spinner.classList.remove("d-flex");
  spinner.classList.add("d-none");

});


// ========================================
// FUNCIÓN PARA GENERAR FACTURA FISCAL
// ========================================
async function imprimirFacturaFiscal(venta, timbrado) {
  // --- DATOS DEL TIMBRADO Y EMPRESA ---
  document.getElementById("factura-razon-social").textContent = timbrado.razonSocial;
  document.getElementById("factura-ruc").textContent = `RUC: ${timbrado.rucEmpresa}`;
  document.getElementById("factura-direccion").textContent = timbrado.direccionFiscal;
  document.getElementById("factura-timbrado").textContent = timbrado.numeroTimbrado;
  document.getElementById("factura-vigencia").textContent =
    `${timbrado.fechaInicio.split('-').reverse().join('/')} - ${timbrado.fechaVencimiento.split('-').reverse().join('/')}`;

  // --- NÚMERO DE FACTURA ---
  // Registrar la factura en Firestore y reservar el número de timbrado de forma atómica
  let registroFacturaInfo = null;
  try {
    registroFacturaInfo = await registrarFactura({ venta, cliente: venta.cliente, total: venta.total, cajaId: null, usuario: document.getElementById('usuarioLogueado')?.textContent || null }, timbrado.id);
    document.getElementById("factura-numero").textContent = registroFacturaInfo.numeroFormateado;
    // exponer id de factura por si se necesita (no mutar venta original sin copy)
    venta.facturaId = registroFacturaInfo.id;
  } catch (err) {
    console.error('Error al registrar la factura en Firestore:', err);
    alertaError('Error', 'No se pudo registrar la factura en la base de datos. Se intentará imprimir igualmente.');
    const numeroFactura = `${timbrado.establecimiento}-${timbrado.puntoExpedicion}-${String(timbrado.numeroActual).padStart(7, '0')}`;
    document.getElementById("factura-numero").textContent = numeroFactura;
  }

  // --- FECHA ---
  document.getElementById("factura-fecha").textContent = venta.fecha || new Date().toLocaleString("es-PY");

  // --- DATOS DEL CLIENTE ---
  const cliente = venta.cliente || {};
  document.getElementById("factura-cliente-nombre").textContent = cliente.nombre || "Consumidor Final";
  document.getElementById("factura-cliente-ruc").textContent = cliente.ruc || "0000000-0";
  document.getElementById("factura-cliente-direccion").textContent = cliente.direccion || "-";

  // --- LIMPIAR ITEMS ANTERIORES ---
  const cuerpo = document.getElementById("factura-items-body");
  cuerpo.innerHTML = "";

  // --- CALCULAR TOTALES POR IVA ---
  let totalGravadas5 = 0;
  let totalGravadas10 = 0;
  let totalExentas = 0;

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

      // Por ahora asumimos todo gravado al 10%
      // TODO: Agregar campo IVA a productos en stock
      totalGravadas10 += item.subTotal;
    });
  }

  // --- CALCULAR IVA ---
  const iva5 = Math.round(totalGravadas5 / 21); // 5% incluido = total / 21
  const iva10 = Math.round(totalGravadas10 / 11); // 10% incluido = total / 11

  // --- MOSTRAR TOTALES ---
  document.getElementById("factura-gravadas-5").textContent = totalGravadas5.toLocaleString("es-PY") + " Gs";
  document.getElementById("factura-gravadas-10").textContent = totalGravadas10.toLocaleString("es-PY") + " Gs";
  document.getElementById("factura-exentas").textContent = totalExentas.toLocaleString("es-PY") + " Gs";
  document.getElementById("factura-iva-5").textContent = iva5.toLocaleString("es-PY") + " Gs";
  document.getElementById("factura-iva-10").textContent = iva10.toLocaleString("es-PY") + " Gs";
  document.getElementById("factura-total").textContent = venta.total.toLocaleString("es-PY") + " Gs";

  // Nota: la numeración se reservó y actualizó dentro de registrarFactura (transacción).

  // --- OCULTAR MODAL DE COBRO Y ESPERAR ANTES DE IMPRIMIR SOLO FACTURA FISCAL ---
  // Oculta el modal de cobro si está visible
  const modalCobroEl = document.getElementById('modalCobro');
  if (modalCobroEl && modalCobroEl.classList.contains('show')) {
    const modalCobro = bootstrap.Modal.getInstance(modalCobroEl);
    if (modalCobro) modalCobro.hide();
  }
  // Esperar a que el modal y el toast se oculten completamente (toastSwal dura 3s)
  setTimeout(() => {
    try {
      // Oculta todos los .ticket-wrapper
      document.querySelectorAll('.ticket-wrapper').forEach(w => w.classList.remove('show-print'));
      // Solo muestra la factura fiscal
      const fiscalWrapper = document.getElementById('factura-fiscal-container')?.closest('.ticket-wrapper');
      if (!fiscalWrapper) return;

      // --- IMPRESIÓN DOBLE: ORIGINAL Y COPIA SOLO PARA FACTURA FISCAL ---
      let paso = 0;
      let copiaPendiente = false;
      const msg = document.querySelector('#factura-fiscal-container .ticket-msg');
      const mensajeOriginal = msg ? msg.innerHTML : '';

      function imprimirConMensaje(mensaje, callback) {
        if (msg) msg.innerHTML = mensaje;
        document.querySelectorAll('.ticket-wrapper').forEach(w => w.classList.remove('show-print'));
        fiscalWrapper.classList.add('show-print');
        window.print();
        setTimeout(() => {
          fiscalWrapper.classList.remove('show-print');
          if (callback) callback();
        }, 500);
      }

      function imprimirCopia() {
        if (copiaPendiente) return; // Evita dobles disparos
        copiaPendiente = true;
        setTimeout(() => {
          imprimirConMensaje('Copia: Comercio', () => {
            if (msg) msg.innerHTML = mensajeOriginal;
            window.onafterprint = null;
          });
        }, 100);
      }

      // Imprimir original y preparar handler para la copia
      paso = 1;
      copiaPendiente = false;
      imprimirConMensaje('Original: Cliente', () => {
        // Handler robusto para onafterprint
        let handler;
        handler = function () {
          window.onafterprint = null;
          imprimirCopia();
        };
        window.onafterprint = handler;
        // Fallback: si onafterprint no dispara en 1s, forzar la copia
        setTimeout(() => {
          if (!copiaPendiente) imprimirCopia();
        }, 1000);
      });
    } catch (err) {
      console.error('Error durante la preparación de impresión de factura:', err);
      window.print();
    }
  }, 3200); // 3s para el toast + 200ms extra
}

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
  const total = venta.total || subtotal;
  const pago = venta.efectivo || 0;
  const vuelto = pago - total;

  // Si el ticket es "simple" (no factura legal), NO mostrar impuestos
  document.getElementById("ticket-subtotal").textContent = subtotal.toLocaleString("es-PY");
  document.getElementById("ticket-tax").textContent = "-";
  document.getElementById("ticket-total").textContent = total.toLocaleString("es-PY");
  document.getElementById("ticket-pago").textContent = pago.toLocaleString("es-PY");
  document.getElementById("ticket-vuelto").textContent = vuelto > 0 ? vuelto.toLocaleString("es-PY") : "0";

  // --- MENSAJE FINAL PERSONALIZADO ---
  const msg = document.getElementById("ticket-msg");
  // Guardar mensaje original para restaurar luego
  const mensajeOriginal = `¡Gracias ${cliente.nombre || "por tu compra"}! Vuelve pronto 🚗⛽`;
  // --- OCULTAR FACTURA, MOSTRAR SOLO TICKET ---
  document.getElementById("ticket-container").style.display = "block";
  document.getElementById("factura-fiscal-container").style.display = "none";

  // --- IMPRESIÓN SIMPLE SOLO PARA TICKET ---
  setTimeout(() => {
    // Marcar únicamente el wrapper del ticket para impresión (compatibiliza con css .show-print)
    document.querySelectorAll('.ticket-wrapper').forEach(w => w.classList.remove('show-print'));
    const ticketWrapper = document.getElementById('ticket-container')?.closest('.ticket-wrapper');
    if (ticketWrapper) ticketWrapper.classList.add('show-print');
    window.print();
    setTimeout(() => {
      if (ticketWrapper) ticketWrapper.classList.remove('show-print');
    }, 500);
  }, 3200); // 3s para el toast + 200ms extra

}


// Procesar impresión: si el cajero marcó emitir factura legal, intentar imprimir factura fiscal
async function procesarImpresion(venta) {
  const emitirCheckbox = document.getElementById('emitirFacturaLegal');
  const emitir = emitirCheckbox ? emitirCheckbox.checked : false;

  if (emitir) {
    // Obtener timbrado activo
    try {
      const timbrado = await obtenerTimbradoActivo();
      if (!timbrado) {
        alertaError('Sin timbrado activo', 'No se encontró un timbrado SET activo. Se imprimirá el comprobante normal.');
        imprimirTicket(venta);
        return;
      }

      // Llamar a la función que imprime la factura fiscal
      await imprimirFacturaFiscal(venta, timbrado);
    } catch (err) {
      console.error('Error obteniendo timbrado activo:', err);
      alertaError('Error', 'No se pudo obtener el timbrado. Se imprimirá el comprobante normal.');
      imprimirTicket(venta);
    }
  } else {
    // Imprimir comprobante normal
    imprimirTicket(venta);
  }
}
