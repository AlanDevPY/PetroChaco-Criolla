import {
  obtenerStock,
  obtenerStockPorId,
  obtenerStockTiempoReal,
  registrarCliente,
  obtenerClientes,
  obtenerClientesTiempoReal,
  obtenerCajas,
  obtenerCajasTiempoReal,
  actualizarStockporId,
  eliminarClientePorID,
  registrarCaja,
  actualizarCajaporId,
  descontarStockTransaccional,
  sumarStockTransaccional,
} from "./firebase.js";
import { formatGs, mostrarAviso, debounce, parseGs, calcularDiferencia } from "./utils.js";
import { toastSwal } from "./swal-utils.js";
import { showLoading, hideLoading } from "./toast-utils.js";
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
let unsubscribeStock = null; // Para almacenar la función de limpieza del listener en tiempo real
let unsubscribeClientes = null; // Para almacenar la función de limpieza del listener de clientes en tiempo real
let unsubscribeCajas = null; // Para almacenar la función de limpieza del listener de cajas en tiempo real
let stockCache = []; // Cache de stock para uso en tiempo real
let clientesCache = []; // Cache de clientes para uso en tiempo real

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


// FUNCION PARA ACTUALIZAR STOCK EN EL DATALIST (tiempo real)
const actualizarStockDataList = (stock) => {
  stockCache = stock; // Actualizar cache
  let stockDataList = document.getElementById("listaProductos");
  if (!stockDataList) return;

  // Limpiar y repoblar
  stockDataList.innerHTML = '';
  stock.forEach((item) => {
    stockDataList.innerHTML += `
        <option data-id="${item.id}" value="${item.item}">${item.codigoBarra}</option>
        `;
  });
};

// FUNCION PARA OBTENER STOCK Y MOSTRAR EN EL DATALIST (mantener para compatibilidad inicial)
const mostrarStockDataList = async () => {
  // Consulta directa a Firebase para obtener stock real
  const stock = await obtenerStock();
  actualizarStockDataList(stock);
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

  // Mostrar spinner mientras se procesa
  const loadingToast = showLoading("Agregando producto...");

  try {
    // Obtener el producto del stock - usar cache actualizado en tiempo real primero
    let stockItem;
    if (stockCache.length > 0) {
      // Buscar en el cache primero (más rápido y actualizado en tiempo real)
      const itemEnCache = stockCache.find(item => item.id === selectedId);
      if (itemEnCache) {
        stockItem = itemEnCache;
      } else {
        // Si no está en cache, consultar directamente
        stockItem = await obtenerStockPorId(selectedId);
      }
    } else {
      // Si no hay cache, consultar directamente
      stockItem = await obtenerStockPorId(selectedId);
    }

    // Validar stock disponible
    if (stockItem.cantidad < cantidad) {
      hideLoading(loadingToast);
      alertaAdvertencia("Stock insuficiente", `Solo hay ${stockItem.cantidad} unidades disponibles.`);
      return;
    }

    // Buscar si ya existe el item en el pedido
    const pedidoExistente = pedido.find((p) => p.id === stockItem.id);

    // Calcular cantidad total que se está pidiendo (incluyendo lo que ya está en el pedido)
    const cantidadEnPedido = pedidoExistente ? pedidoExistente.cantidad : 0;
    const cantidadTotalSolicitada = cantidadEnPedido + cantidad;

    // Validar stock disponible contra la cantidad total solicitada
    if (stockItem.cantidad < cantidadTotalSolicitada) {
      hideLoading(loadingToast);
      alertaAdvertencia("Stock insuficiente", 
        `Stock disponible: ${stockItem.cantidad} unidades. ` +
        `Ya tiene ${cantidadEnPedido} en el pedido. ` +
        `Solicita ${cantidad} más. ` +
        `Total: ${cantidadTotalSolicitada} unidades.`);
      return;
    }

    if (pedidoExistente) {
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

    // Ocultar spinner y mostrar el pedido actualizado
    hideLoading(loadingToast);
    mostrarPedidoCargado();

    // Limpiar el formulario y mantener el foco
    document.getElementById("agregarProductoForm").reset();
    document.getElementById("inputProducto").focus();

    // Mostrar total en Guaraníes
    document.getElementById("totalPedido").textContent = formatGs(calcularTotalPedido());
  } catch (error) {
    // Ocultar spinner en caso de error
    hideLoading(loadingToast);
    console.error("Error al agregar producto:", error);
    alertaError("Error", "No se pudo agregar el producto. Por favor, intente nuevamente.");
  }
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
  const efectivo = parseGs(efectivoInput.value);
  const tarjeta = parseGs(tarjetaInput.value);
  const transferencia = parseGs(transferenciaInput.value);

  const diferencia = calcularDiferencia(totalPedido, efectivo, tarjeta, transferencia);

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

// Lógica de cálculo automático de pagos (siempre activa)
if (efectivoInput && tarjetaInput && transferenciaInput) {
  // Cuando se hace focus en efectivoInput, mostrar el total
  efectivoInput.addEventListener("focus", () => {
    const totalPedido = calcularTotalPedido();
    // Si el input está vacío o tiene 0, mostrar el total
    const valorActual = parseGs(efectivoInput.value);
    if (valorActual === 0) {
      efectivoInput.value = totalPedido.toLocaleString("de-DE");
      efectivoInput.dataset.value = totalPedido.toString();
      actualizarCobro();
    }
    // Seleccionar todo el texto para facilitar la edición
    efectivoInput.select();
  });

  // Cuando se hace focus en tarjetaInput, calcular el restante automáticamente
  tarjetaInput.addEventListener("focus", () => {
    const totalPedido = calcularTotalPedido();
    const efectivo = parseGs(efectivoInput.value);
    const transferencia = parseGs(transferenciaInput.value);

    // Calcular el restante: total - efectivo - transferencia
    const restante = Math.max(0, totalPedido - efectivo - transferencia);

    // Solo actualizar si el restante es mayor a 0
    if (restante > 0) {
      tarjetaInput.value = restante.toLocaleString("de-DE");
      tarjetaInput.dataset.value = restante.toString();
      actualizarCobro();
    }
    // Seleccionar todo el texto para facilitar la edición
    tarjetaInput.select();
  });

  // Cuando se hace focus en transferenciaInput, calcular el restante automáticamente
  transferenciaInput.addEventListener("focus", () => {
    const totalPedido = calcularTotalPedido();
    const efectivo = parseGs(efectivoInput.value);
    const tarjeta = parseGs(tarjetaInput.value);

    // Calcular el restante: total - efectivo - tarjeta
    const restante = Math.max(0, totalPedido - efectivo - tarjeta);

    // Solo actualizar si el restante es mayor a 0
    if (restante > 0) {
      transferenciaInput.value = restante.toLocaleString("de-DE");
      transferenciaInput.dataset.value = restante.toString();
      actualizarCobro();
    }
    // Seleccionar todo el texto para facilitar la edición
    transferenciaInput.select();
  });
}

// funcion con modal cobro cliente

const buscarClientePorRuc = debounce(() => {
  const ruc = clienteRucCobro.value.trim();
  if (!ruc) return;
  // Usar cache de clientes en tiempo real si está disponible, sino consultar
  if (clientesCache.length > 0) {
    cliente = clientesCache.find((c) => c.ruc === ruc);
    if (cliente) {
      clienteNombreCobro.value = cliente.nombre;
      clienteDireccionCobro.value = cliente.direccion;
      clienteTelefonoCobro.value = cliente.telefono;
    }
  } else {
    // Si no hay cache, consultar (fallback)
    obtenerClientes().then(clientes => {
      cliente = clientes.find((c) => c.ruc === ruc);
      if (cliente) {
        clienteNombreCobro.value = cliente.nombre;
        clienteDireccionCobro.value = cliente.direccion;
        clienteTelefonoCobro.value = cliente.telefono;
      }
    });
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

  // Validar que el pedido no esté vacío
  if (!pedido || pedido.length === 0) {
    alertaAdvertencia("Pedido vacío", "Debe agregar al menos un producto antes de procesar la venta.");
    btnConfirmarVenta.disabled = false;
    return;
  }

  // Validar estructura del pedido
  const pedidoInvalido = pedido.find(item => 
    !item.id || 
    !item.item || 
    !item.cantidad || 
    Number(item.cantidad) <= 0 || 
    !item.costo || 
    Number(item.costo) < 0 ||
    !item.subTotal ||
    Number(item.subTotal) < 0
  );

  if (pedidoInvalido) {
    alertaError("Pedido inválido", "El pedido contiene items con datos inválidos. Por favor, verifique y vuelva a intentar.");
    btnConfirmarVenta.disabled = false;
    return;
  }

  // Validar que el total calculado coincida con la suma de subtotales
  const totalCalculado = calcularTotalPedido();
  const sumaSubtotales = pedido.reduce((sum, item) => sum + (Number(item.subTotal) || 0), 0);
  
  if (Math.abs(totalCalculado - sumaSubtotales) > 1) { // Permitir diferencia de 1 Gs por redondeos
    console.error("❌ Discrepancia en totales:", { totalCalculado, sumaSubtotales });
    alertaError("Error de cálculo", "Hay una discrepancia en los totales. Por favor, recargue la página y vuelva a intentar.");
    btnConfirmarVenta.disabled = false;
    return;
  }




  // Obtener cajas - usar cache si está disponible (será actualizado en tiempo real)
  // Si no hay cache aún, consultar directamente
  let Cajas;
  if (unsubscribeCajas === null) {
    // Si no hay listener aún, consultar directamente
    Cajas = await obtenerCajas();
  } else {
    // Si hay listener, usar los datos del cache (se actualizará automáticamente)
    // Pero para esta validación necesitamos datos frescos, así que consultamos
    Cajas = await obtenerCajas();
  }

  // Busco si hay alguna caja abierta
  let cajaAbierta = Cajas.find((caja) => caja.estado === "abierta");
  const usuarioLogueado = document.getElementById("usuarioLogueado")?.textContent || "";

  // Datos de la venta actual
  const venta = {
    cliente: cliente, // objeto cliente
    venta: pedido, // array de productos
    fecha: dayjs().format("DD/MM/YYYY HH:mm:ss"), // string legacy conservada
    efectivo: parseGs(efectivoInput.value),
    tarjeta: parseGs(tarjetaInput.value),
    transferencia: parseGs(transferenciaInput.value),
    total: calcularTotalPedido(),
  };


  // Función para validar stock antes de la venta
  const validarStockVenta = async (ventaActual) => {
    try {
      // Validar que venta tenga items
      if (!ventaActual.venta || !Array.isArray(ventaActual.venta) || ventaActual.venta.length === 0) {
        throw new Error("La venta no tiene items");
      }

      // Obtener stock actual de todos los productos en la venta
      const itemsIds = [...new Set(ventaActual.venta.map(i => i.id).filter(id => id))]; // Filtrar IDs nulos/undefined
      
      if (itemsIds.length === 0) {
        throw new Error("No se encontraron IDs válidos en el pedido");
      }

      // Usar cache de stock en tiempo real si está disponible, sino consultar
      const stockActual = stockCache.length > 0 ? stockCache : await obtenerStock();
      
      // Agrupar cantidades por producto en el pedido
      const cantidadesPedido = {};
      ventaActual.venta.forEach(item => {
        if (!item.id) {
          throw new Error(`Item sin ID: ${item.item || 'desconocido'}`);
        }
        if (!cantidadesPedido[item.id]) {
          cantidadesPedido[item.id] = 0;
        }
        const cantidad = Number(item.cantidad) || 0;
        if (cantidad <= 0) {
          throw new Error(`Cantidad inválida para ${item.item}: ${item.cantidad}`);
        }
        cantidadesPedido[item.id] += cantidad;
      });
      
      // Validar que haya stock suficiente para cada producto
      for (const [id, cantidadPedido] of Object.entries(cantidadesPedido)) {
        const producto = stockActual.find(p => p.id === id);
        if (!producto) {
          throw new Error(`Producto con ID ${id} no encontrado en stock`);
        }
        const stockDisponible = Number(producto.cantidad) || 0;
        if (stockDisponible < cantidadPedido) {
          throw new Error(`Stock insuficiente para ${producto.item}: disponible ${stockDisponible}, solicitado ${cantidadPedido}`);
        }
      }
      return { valido: true };
    } catch (err) {
      console.error("Error al validar stock:", err);
      return { valido: false, error: err.message };
    }
  };

  // Función para descontar stock de la venta
  // Descuento transaccional de stock para evitar condiciones de carrera
  const descontarStock = async (ventaActual) => {
    try {
      // Agrupar cantidades por producto (por si hay duplicados)
      const itemsAgrupados = {};
      ventaActual.venta.forEach(item => {
        if (!itemsAgrupados[item.id]) {
          itemsAgrupados[item.id] = 0;
        }
        itemsAgrupados[item.id] += Number(item.cantidad) || 0;
      });
      
      // Convertir a array para la función de descuento
      const itemsDescuento = Object.entries(itemsAgrupados).map(([id, cantidad]) => ({
        id,
        cantidad
      }));
      
      console.log(`📦 Descontando stock para ${itemsDescuento.length} productos...`);
      await descontarStockTransaccional(itemsDescuento);
      console.log(`✅ Stock descontado exitosamente`);
      return { ok: true };
    } catch (err) {
      console.error("❌ Error transaccional al descontar stock:", err);
      return { ok: false, error: err.message };
    }
  };

  // Función auxiliar para validar y calcular pagos
  const validarPago = () => {
    const totalPedido = calcularTotalPedido();
    const efectivo = parseGs(efectivoInput.value);
    const tarjeta = parseGs(tarjetaInput.value);
    const transferencia = parseGs(transferenciaInput.value);
    const diferencia = calcularDiferencia(totalPedido, efectivo, tarjeta, transferencia);

    return { totalPedido, efectivo, tarjeta, transferencia, diferencia };
  };

  if (!cajaAbierta) {
    // No hay caja abierta → creo la primera caja y agrego la venta
    const nuevaCaja = {
      fechaApertura: dayjs().format("DD/MM/YYYY HH:mm:ss"),
      estado: "abierta",
      totalRecaudado: venta.total,
      ventas: [venta], // registro la venta directamente
      usuario: usuarioLogueado || null
    };

    const { diferencia } = validarPago();

    if (diferencia > 0) {
      alertaAdvertencia("Pago insuficiente", "Falta pagar: " + formatGs(diferencia));
      btnConfirmarVenta.disabled = false;
      return;
    }

    // Mostrar spinner durante todo el proceso de venta
    const loadingVenta = showLoading("Procesando venta...");

    try {
      // VALIDAR STOCK ANTES DE REGISTRAR LA VENTA
      const validacionStock = await validarStockVenta(venta);
      if (!validacionStock.valido) {
        hideLoading(loadingVenta);
        btnConfirmarVenta.disabled = false;
        alertaError("Stock insuficiente", validacionStock.error || "No hay suficiente stock para completar la venta.");
        return;
      }

      // DESCONTAR STOCK PRIMERO (antes de registrar la venta)
      // Guardar los items descontados para poder revertir si falla
      const itemsDescontados = venta.venta.map(item => ({
        id: item.id,
        cantidad: Number(item.cantidad) || 0
      }));

      const resultadoDescuento = await descontarStock(venta);
      if (!resultadoDescuento.ok) {
        hideLoading(loadingVenta);
        btnConfirmarVenta.disabled = false;
        alertaError("Error al descontar stock", resultadoDescuento.error || "No se pudo descontar el stock. La venta no se registró.");
        return;
      }

      // AHORA SÍ registrar la venta en la caja (ya se descontó el stock)
      try {
        await registrarCaja(nuevaCaja);
      } catch (error) {
        // ROLLBACK: Si falla registrar la caja, revertir el descuento de stock
        console.error("❌ Error al registrar caja, revirtiendo descuento de stock...", error);
        hideLoading(loadingVenta);
        try {
          await sumarStockTransaccional(itemsDescontados);
          console.log("✅ Stock revertido exitosamente");
        } catch (rollbackError) {
          console.error("❌ CRÍTICO: Error al revertir stock después de fallar registro de caja:", rollbackError);
          alertaError("Error crítico", "La venta falló y no se pudo revertir el stock automáticamente. Por favor, contacte al administrador.");
        }
        btnConfirmarVenta.disabled = false;
        alertaError("Error al registrar venta", "No se pudo registrar la venta en la caja. El stock fue revertido.");
        return;
      }

      hideLoading(loadingVenta);

      // Imprimir según checkbox: ticket o factura legal
      await procesarImpresion(venta);

      // Obtener instancia de modal cobro y cerrar
      const modalCobro = bootstrap.Modal.getInstance(document.getElementById("modalCobro"));
      modalCobro?.hide();
      const badge = document.getElementById("estadoCajaBadge");
      if (badge) {
        badge.textContent = "Caja Abierta";
        badge.classList.remove("bg-danger");
        badge.classList.add("bg-success");
      }
    } catch (error) {
      hideLoading(loadingVenta);
      console.error("Error al procesar venta:", error);
      btnConfirmarVenta.disabled = false;
      alertaError("Error", "No se pudo completar la venta. Por favor, intente nuevamente.");
      return;
    }
  } else {
    // Caja abierta → agrego la venta al array de ventas existente
    const { diferencia } = validarPago();

    if (diferencia > 0) {
      alertaAdvertencia("Pago insuficiente", "Falta pagar: " + formatGs(diferencia));
      btnConfirmarVenta.disabled = false;
      return;
    }

    // Mostrar spinner durante todo el proceso de venta
    const loadingVenta = showLoading("Procesando venta...");

    try {
      btnConfirmarVenta.disabled = true;

      // VALIDAR STOCK ANTES DE REGISTRAR LA VENTA
      const validacionStock = await validarStockVenta(venta);
      if (!validacionStock.valido) {
        hideLoading(loadingVenta);
        btnConfirmarVenta.disabled = false;
        alertaError("Stock insuficiente", validacionStock.error || "No hay suficiente stock para completar la venta.");
        return;
      }

      // DESCONTAR STOCK PRIMERO (antes de registrar la venta)
      // Guardar los items descontados para poder revertir si falla
      const itemsDescontados = venta.venta.map(item => ({
        id: item.id,
        cantidad: Number(item.cantidad) || 0
      }));

      const resultadoDescuento = await descontarStock(venta);
      if (!resultadoDescuento.ok) {
        hideLoading(loadingVenta);
        btnConfirmarVenta.disabled = false;
        alertaError("Error al descontar stock", resultadoDescuento.error || "No se pudo descontar el stock. La venta no se registró.");
        return;
      }

      // AHORA SÍ agregar la venta a la caja (ya se descontó el stock)
      cajaAbierta.ventas.push(venta);
      cajaAbierta.totalRecaudado += venta.total;

      // Actualizar la caja en Firestore
      try {
        await actualizarCajaporId(cajaAbierta.id, cajaAbierta);
      } catch (error) {
        // ROLLBACK: Si falla actualizar la caja, revertir el descuento de stock
        console.error("❌ Error al actualizar caja, revirtiendo descuento de stock...", error);
        hideLoading(loadingVenta);
        try {
          await sumarStockTransaccional(itemsDescontados);
          console.log("✅ Stock revertido exitosamente");
          // Revertir cambios en memoria
          cajaAbierta.ventas.pop();
          cajaAbierta.totalRecaudado -= venta.total;
        } catch (rollbackError) {
          console.error("❌ CRÍTICO: Error al revertir stock después de fallar actualización de caja:", rollbackError);
          alertaError("Error crítico", "La venta falló y no se pudo revertir el stock automáticamente. Por favor, contacte al administrador.");
        }
        btnConfirmarVenta.disabled = false;
        alertaError("Error al registrar venta", "No se pudo actualizar la caja. El stock fue revertido.");
        return;
      }

      hideLoading(loadingVenta);

      // Imprimir según checkbox: ticket o factura legal
      await procesarImpresion(venta);

      // Obtener instancia de modal cobro y cerrar
      const modalCobro = bootstrap.Modal.getInstance(document.getElementById("modalCobro"));
      modalCobro?.hide();
    } catch (error) {
      hideLoading(loadingVenta);
      console.error("Error al procesar venta:", error);
      btnConfirmarVenta.disabled = false;
      alertaError("Error", "No se pudo completar la venta. Por favor, intente nuevamente.");
      return;
    }
  }

  // Limpiar el formulario y resetear el pedido
  pedido = [];
  cliente = null; // Limpiar cliente también
  
  // Limpiar formulario de cobro
  document.getElementById("modalCobrarForm").reset();
  
  // Limpiar formulario de agregar producto
  document.getElementById("agregarProductoForm").reset();
  
  // Limpiar campos de cliente en el modal de cobro
  if (clienteRucCobro) clienteRucCobro.value = '';
  if (clienteNombreCobro) clienteNombreCobro.value = '';
  if (clienteDireccionCobro) clienteDireccionCobro.value = '';
  if (clienteTelefonoCobro) clienteTelefonoCobro.value = '';
  
  // Actualizar la vista del pedido (debe estar vacío)
  mostrarPedidoCargado();
  actualizarCobro();

  // Forzar actualización del stock desde Firebase para asegurar datos frescos
  // El listener en tiempo real ya actualiza automáticamente, pero forzamos una consulta
  // para asegurar que el datalist tenga los datos más recientes
  try {
    const stockActualizado = await obtenerStock();
    actualizarStockDataList(stockActualizado);
    console.log('✅ Stock actualizado después de la venta');
  } catch (error) {
    console.error('⚠️ Error al actualizar stock después de la venta:', error);
    // No es crítico, el listener en tiempo real lo actualizará
  }

  btnConfirmarVenta.disabled = true;
  // Mostrar total en Guaraníes (debe ser 0)
  document.getElementById("totalPedido").textContent = formatGs(0);

  // Notificación de venta registrada eliminada - ya no se usa
});

// Funciones de caché eliminadas - ahora todas las consultas van directo a Firebase
// El stock siempre se consulta desde Firebase para tener datos reales
const invalidarCacheStock = () => {
  // Función obsoleta - ya no se usa caché
};

const actualizarCacheStock = async (productosVendidos) => {
  // Función obsoleta - ya no se usa caché
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
  // Usar cache de clientes en tiempo real si está disponible
  const clientes = clientesCache.length > 0 ? clientesCache : await obtenerClientes();
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
  document.getElementById("formCliente").reset();

  // No es necesario llamar mostrarClientes() - el listener en tiempo real actualiza automáticamente
});

// FUNCION PARA ACTUALIZAR CLIENTES (tiempo real)
const actualizarClientes = (clientes) => {
  clientesCache = clientes; // Actualizar cache
  
  // Solo actualizar la tabla si el modal está visible
  const modalVerClientes = document.getElementById('modalVerClientes');
  if (modalVerClientes && modalVerClientes.classList.contains('show')) {
    // Si DataTables está inicializado, poblar tabla
    if ($.fn.DataTable.isDataTable('#tablaClientes')) {
      poblarTablaClientes(clientes);
    } else {
      // Inicializar DataTable por primera vez
      initClientesDataTable();
      poblarTablaClientes(clientes);
    }
  }
};

// funcion para mostrar los clientes registrados (mantener para compatibilidad inicial)
async function mostrarClientes() {
  const clientes = await obtenerClientes();
  actualizarClientes(clientes);
}

// Configurar eventos de DataTable para eliminar clientes
function configurarEventosClientes() {
  // Usar delegación de eventos para botones dinámicos
  $(document).on('click', '.btn-eliminar-cliente', async function () {
    const id = $(this).data('id');

    // Validar que el ID existe
    if (!id) {
      alertaError("Error", "No se pudo obtener el ID del cliente.");
      return;
    }

    // Buscar el nombre del cliente - usar cache en tiempo real
    const clientes = clientesCache.length > 0 ? clientesCache : await obtenerClientes();
    const cliente = clientes.find(c => c.id === id);
    const nombreCliente = cliente ? cliente.nombre : 'este cliente';

    try {
      // Deshabilitar el botón mientras se procesa
      const btnEliminar = $(this);
      btnEliminar.prop('disabled', true);
      btnEliminar.html('<i class="bi bi-hourglass-split"></i> Eliminando...');
      
      // Eliminar de Firebase directamente
      await eliminarClientePorID(id);
      
      // Actualizar cache local removiendo el cliente eliminado
      clientesCache = clientesCache.filter(c => c.id !== id);
      
      // Intentar eliminar de la tabla (opcional, el listener en tiempo real también lo hará)
      eliminarClienteDeTabla(id);
      
      alertaExito("Cliente eliminado", `${nombreCliente} ha sido eliminado correctamente.`);
      
      // El listener en tiempo real actualizará automáticamente cuando Firebase propague el cambio
    } catch (error) {
      console.error('❌ Error al eliminar cliente:', error);
      alertaError("Error al eliminar", `No se pudo eliminar el cliente: ${error.message || 'Error desconocido'}`);
      
      // Rehabilitar el botón en caso de error
      const btnEliminar = $(this);
      btnEliminar.prop('disabled', false);
      btnEliminar.html('<i class="bi bi-trash3"></i> Eliminar');
    }
  });
}





// FUNCION PARA ACTUALIZAR ESTADO DE CAJA EN TIEMPO REAL
const actualizarEstadoCaja = (cajas) => {
  const cajaAbierta = cajas.find((caja) => caja.estado === "abierta");
  const badge = document.getElementById("estadoCajaBadge");
  
  if (!badge) return;
  
  if (cajaAbierta) {
    badge.innerHTML = '<i class="bi bi-unlock"></i> Caja Abierta';
    badge.classList.remove("bg-danger");
    badge.classList.add("bg-success");
  } else {
    badge.innerHTML = '<i class="bi bi-lock"></i> Caja Cerrada';
    badge.classList.remove("bg-success");
    badge.classList.add("bg-danger");
  }
};

window.addEventListener("DOMContentLoaded", async () => {
  configurarEventosClientes();
  
  let primeraCargaStock = true;
  let primeraCargaClientes = true;
  let primeraCargaCajas = true;

  const spinner = document.getElementById("spinnerCarga");
  const contenido = document.getElementById("contenidoPrincipal");

  // Mostrar spinner usando Bootstrap
  spinner.classList.add("d-flex");

  // Suscribirse a cambios de STOCK en tiempo real
  unsubscribeStock = obtenerStockTiempoReal((stock) => {
    if (primeraCargaStock) {
      primeraCargaStock = false;
      // Primera carga - ocultar spinner si ya se cargaron todos
      if (!primeraCargaClientes && !primeraCargaCajas) {
        spinner.classList.remove("d-flex");
        spinner.classList.add("d-none");
      }
    }
    actualizarStockDataList(stock);
    // Reinicializar datalist mejorado después de actualizar
    mejorarDatalist('inputProducto', 'listaProductos');
  });

  // Suscribirse a cambios de CLIENTES en tiempo real
  unsubscribeClientes = obtenerClientesTiempoReal((clientes) => {
    if (primeraCargaClientes) {
      primeraCargaClientes = false;
      // Primera carga - ocultar spinner si ya se cargaron todos
      if (!primeraCargaStock && !primeraCargaCajas) {
        spinner.classList.remove("d-flex");
        spinner.classList.add("d-none");
      }
    }
    actualizarClientes(clientes);
  });

  // Suscribirse a cambios de CAJAS en tiempo real
  unsubscribeCajas = obtenerCajasTiempoReal((cajas) => {
    if (primeraCargaCajas) {
      primeraCargaCajas = false;
      // Primera carga - ocultar spinner si ya se cargaron todos
      if (!primeraCargaStock && !primeraCargaClientes) {
        spinner.classList.remove("d-flex");
        spinner.classList.add("d-none");
      }
    }
    actualizarEstadoCaja(cajas);
  });

  // Cargar clientes cuando se abra el modal de Ver Clientes (ya estarán en cache)
  const modalVerClientes = document.getElementById('modalVerClientes');
  if (modalVerClientes) {
    modalVerClientes.addEventListener('shown.bs.modal', () => {
      // Usar cache - ya está actualizado en tiempo real
      if (clientesCache.length > 0) {
        actualizarClientes(clientesCache);
      } else {
        // Fallback si no hay cache aún
        mostrarClientes();
      }
    });
  }
});

// Limpiar listeners cuando se cierre la página
window.addEventListener("beforeunload", () => {
  if (unsubscribeStock) {
    console.log("🔌 Desconectando listener de stock en tiempo real...");
    unsubscribeStock();
    unsubscribeStock = null;
  }
  if (unsubscribeClientes) {
    console.log("🔌 Desconectando listener de clientes en tiempo real...");
    unsubscribeClientes();
    unsubscribeClientes = null;
  }
  if (unsubscribeCajas) {
    console.log("🔌 Desconectando listener de cajas en tiempo real...");
    unsubscribeCajas();
    unsubscribeCajas = null;
  }
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
  document.getElementById("factura-cliente-telefono").textContent = cliente.telefono || cliente.celular || "-";
  // Nombre del cajero (usuario logueado) en el encabezado
  const usuario = document.getElementById('usuarioLogueado')?.textContent || '-';
  document.getElementById("factura-cajero").textContent = usuario;

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
