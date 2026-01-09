import { obtenerCajas, obtenerStock } from "./firebase.js";
import { formatGs } from "./utils.js";
import Toastify from "https://cdn.jsdelivr.net/npm/toastify-js/src/toastify-es.js";

// Variables globales
let graficoSemanal = null;

// Función para parsear fecha DD/MM/YYYY
const parsearFecha = (fechaStr) => {
  if (!fechaStr) return null;
  const partes = fechaStr.split(' ');
  const fechaParte = partes[0];
  const [dia, mes, anio] = fechaParte.split('/');
  if (!dia || !mes || !anio) return null;
  return new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
};

// Función para formatear fecha a DD/MM/YYYY
const formatearFecha = (fecha) => {
  if (!fecha) return '';
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
};

// Función para obtener fecha de hoy
const obtenerFechaHoy = () => {
  const hoy = new Date();
  return formatearFecha(hoy);
};

// Función para obtener fecha de ayer
const obtenerFechaAyer = () => {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  return formatearFecha(ayer);
};

// Función para calcular ventas del día
const calcularVentasDia = async (fecha) => {
  try {
    const cajas = await obtenerCajas();
    let totalVentas = 0;
    let cantidadVentas = 0;
    const productosVendidos = {};

    cajas.forEach(caja => {
      if (!caja.ventas || !Array.isArray(caja.ventas)) return;

      caja.ventas.forEach(venta => {
        if (!venta.fecha || !venta.total) return;

        const fechaVenta = parsearFecha(venta.fecha);
        if (fechaVenta && formatearFecha(fechaVenta) === fecha) {
          totalVentas += venta.total || 0;
          cantidadVentas++;

          // Contar productos vendidos
          if (venta.venta && Array.isArray(venta.venta)) {
            venta.venta.forEach(item => {
              const nombre = item.item || 'Sin nombre';
              if (!productosVendidos[nombre]) {
                productosVendidos[nombre] = { cantidad: 0, total: 0 };
              }
              productosVendidos[nombre].cantidad += item.cantidad || 0;
              productosVendidos[nombre].total += item.subTotal || 0;
            });
          }
        }
      });
    });

    return { totalVentas, cantidadVentas, productosVendidos };
  } catch (error) {
    console.error('Error al calcular ventas del día:', error);
    return { totalVentas: 0, cantidadVentas: 0, productosVendidos: {} };
  }
};

// Función para calcular ganancia del día
const calcularGananciaDia = async (fecha) => {
  try {
    const stock = await obtenerStock();
    const { productosVendidos } = await calcularVentasDia(fecha);

    let totalGanancia = 0;
    let totalVentas = 0;

    Object.entries(productosVendidos).forEach(([nombre, datos]) => {
      const producto = stock.find(p => p.item === nombre);
      if (producto && producto.costoCompra) {
        const costoTotal = (producto.costoCompra || 0) * datos.cantidad;
        const ganancia = datos.total - costoTotal;
        totalGanancia += ganancia;
      }
      totalVentas += datos.total;
    });

    const margen = totalVentas > 0 ? ((totalGanancia / totalVentas) * 100).toFixed(1) : 0;

    return { ganancia: totalGanancia, margen };
  } catch (error) {
    console.error('Error al calcular ganancia:', error);
    return { ganancia: 0, margen: 0 };
  }
};

// Función para obtener ventas de la semana
const obtenerVentasSemana = async () => {
  try {
    const cajas = await obtenerCajas();
    const hoy = new Date();
    const ventasPorDia = {};

    // Inicializar los últimos 7 días
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      const fechaKey = formatearFecha(fecha);
      ventasPorDia[fechaKey] = 0;
    }

    cajas.forEach(caja => {
      if (!caja.ventas || !Array.isArray(caja.ventas)) return;

      caja.ventas.forEach(venta => {
        if (!venta.fecha || !venta.total) return;

        const fechaVenta = parsearFecha(venta.fecha);
        if (fechaVenta) {
          const fechaKey = formatearFecha(fechaVenta);
          const fechaObj = new Date(fechaVenta);
          const diasAtras = Math.floor((hoy - fechaObj) / (1000 * 60 * 60 * 24));

          if (diasAtras >= 0 && diasAtras <= 6) {
            ventasPorDia[fechaKey] = (ventasPorDia[fechaKey] || 0) + (venta.total || 0);
          }
        }
      });
    });

    return ventasPorDia;
  } catch (error) {
    console.error('Error al obtener ventas de la semana:', error);
    return {};
  }
};

// Función para obtener productos con stock bajo
const obtenerProductosStockBajo = async () => {
  try {
    const stock = await obtenerStock();
    
    return stock.filter(producto => {
      const stockActual = producto.cantidad || 0;
      const stockMinimo = producto.stockMinimo || 10; // Default 10 si no está definido
      return stockActual <= stockMinimo;
    }).sort((a, b) => {
      const stockA = a.cantidad || 0;
      const stockB = b.cantidad || 0;
      return stockA - stockB; // Ordenar por menor stock primero
    });
  } catch (error) {
    console.error('Error al obtener productos con stock bajo:', error);
    return [];
  }
};

// Función para mostrar alertas de stock
const mostrarAlertasStock = (productosBajoStock) => {
  const contenedor = document.getElementById('alertasStock');
  contenedor.innerHTML = '';

  if (productosBajoStock.length === 0) return;

  const alerta = document.createElement('div');
  alerta.className = 'alert alert-warning alerta-stock d-flex align-items-center';
  alerta.innerHTML = `
    <i class="bi bi-exclamation-triangle-fill me-2" style="font-size: 1.5rem;"></i>
    <div class="flex-grow-1">
      <strong>¡Atención!</strong> Tienes <strong>${productosBajoStock.length}</strong> producto(s) con stock bajo.
      <a href="stock.html" class="alert-link ms-2">Ver detalles</a>
    </div>
  `;
  contenedor.appendChild(alerta);
};

// Función para mostrar productos con stock bajo
const mostrarProductosStockBajo = (productos) => {
  const card = document.getElementById('cardStockBajo');
  const tbody = document.getElementById('tbodyStockBajo');

  if (productos.length === 0) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  tbody.innerHTML = '';

  productos.forEach(producto => {
    const stockActual = producto.cantidad || 0;
    const stockMinimo = producto.stockMinimo || 10;
    const porcentaje = stockMinimo > 0 ? ((stockActual / stockMinimo) * 100).toFixed(0) : 0;
    
    let badgeClass = 'badge-stock-normal';
    let estadoTexto = 'Normal';
    
    if (stockActual === 0) {
      badgeClass = 'badge-stock-critico';
      estadoTexto = 'Agotado';
    } else if (stockActual <= stockMinimo * 0.5) {
      badgeClass = 'badge-stock-critico';
      estadoTexto = 'Crítico';
    } else if (stockActual <= stockMinimo) {
      badgeClass = 'badge-stock-bajo';
      estadoTexto = 'Bajo';
    }

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td><strong>${producto.item || 'Sin nombre'}</strong></td>
      <td>${producto.categoria || '-'}</td>
      <td class="text-end"><strong>${stockActual}</strong></td>
      <td class="text-end">${stockMinimo}</td>
      <td class="text-center">
        <span class="badge ${badgeClass}">${estadoTexto}</span>
      </td>
    `;
    tbody.appendChild(fila);
  });
};

// Función para mostrar top productos del día
const mostrarTopProductos = (productosVendidos) => {
  const contenedor = document.getElementById('topProductosHoy');
  
  if (!productosVendidos || Object.keys(productosVendidos).length === 0) {
    contenedor.innerHTML = '<p class="text-muted text-center">No hay productos vendidos hoy</p>';
    return;
  }

  const top5 = Object.entries(productosVendidos)
    .map(([nombre, datos]) => ({ nombre, ...datos }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  contenedor.innerHTML = '';

  top5.forEach((producto, index) => {
    const item = document.createElement('div');
    item.className = 'top-producto-item d-flex align-items-center';
    item.innerHTML = `
      <div class="top-producto-numero top-${index + 1} me-3">${index + 1}</div>
      <div class="flex-grow-1">
        <div class="fw-bold">${producto.nombre}</div>
        <small class="text-muted">${producto.cantidad} unidades</small>
      </div>
      <div class="text-end">
        <div class="fw-bold text-success">${formatGs(producto.total)}</div>
      </div>
    `;
    contenedor.appendChild(item);
  });
};

// Función para crear gráfico semanal
const crearGraficoSemanal = (ventasSemana) => {
  if (graficoSemanal) graficoSemanal.destroy();

  const ctx = document.getElementById('graficoSemanal');
  if (!ctx) return;

  const labels = Object.keys(ventasSemana).map(fecha => {
    const [dia, mes] = fecha.split('/');
    return `${dia}/${mes}`;
  });
  const datos = Object.values(ventasSemana);

  graficoSemanal = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ventas (Gs)',
        data: datos,
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Ventas: ${formatGs(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatGs(value);
            }
          }
        }
      }
    }
  });
};

// Función principal para cargar dashboard
const cargarDashboard = async () => {
  const spinner = document.getElementById('spinnerDashboard');
  const contenedor = document.getElementById('contenedorDashboard');

  spinner.classList.remove('d-none');
  contenedor.classList.add('d-none');

  try {
    const fechaHoy = obtenerFechaHoy();
    const fechaAyer = obtenerFechaAyer();

    // Calcular métricas del día
    const [ventasHoy, ventasAyer, gananciaHoy, stock, productosBajoStock, ventasSemana] = await Promise.all([
      calcularVentasDia(fechaHoy),
      calcularVentasDia(fechaAyer),
      calcularGananciaDia(fechaHoy),
      obtenerStock(),
      obtenerProductosStockBajo(),
      obtenerVentasSemana()
    ]);

    // Mostrar métricas
    document.getElementById('ventasHoy').textContent = formatGs(ventasHoy.totalVentas);
    document.getElementById('transaccionesHoy').textContent = ventasHoy.cantidadVentas;
    document.getElementById('gananciaHoy').textContent = formatGs(gananciaHoy.ganancia);
    document.getElementById('margenHoy').textContent = `${gananciaHoy.margen}%`;
    document.getElementById('totalProductos').textContent = stock.length;
    document.getElementById('productosBajoStock').textContent = productosBajoStock.length;

    // Comparación con ayer
    const diferencia = ventasAyer.totalVentas > 0 
      ? (((ventasHoy.totalVentas - ventasAyer.totalVentas) / ventasAyer.totalVentas) * 100).toFixed(1)
      : ventasHoy.totalVentas > 0 ? 100 : 0;
    
    const comparacionElement = document.getElementById('comparacionAyer');
    const textoComparacion = document.getElementById('textoComparacion');
    
    if (ventasAyer.totalVentas === 0 && ventasHoy.totalVentas === 0) {
      comparacionElement.textContent = '-';
      textoComparacion.innerHTML = '<i class="bi bi-dash-circle me-1"></i>Sin datos';
    } else {
      comparacionElement.textContent = `${diferencia >= 0 ? '+' : ''}${diferencia}%`;
      comparacionElement.className = diferencia >= 0 ? 'fw-bold text-success' : 'fw-bold text-danger';
      textoComparacion.innerHTML = diferencia >= 0
        ? '<i class="bi bi-arrow-up-circle text-success me-1"></i>Mejor que ayer'
        : '<i class="bi bi-arrow-down-circle text-danger me-1"></i>Menor que ayer';
    }

    // Mostrar alertas y productos con stock bajo
    mostrarAlertasStock(productosBajoStock);
    mostrarProductosStockBajo(productosBajoStock);

    // Mostrar top productos
    mostrarTopProductos(ventasHoy.productosVendidos);

    // Crear gráfico semanal
    crearGraficoSemanal(ventasSemana);

    spinner.classList.add('d-none');
    contenedor.classList.remove('d-none');
  } catch (error) {
    console.error('Error al cargar dashboard:', error);
    spinner.classList.add('d-none');
    Toastify({
      text: "Error al cargar el dashboard. Intenta nuevamente.",
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "linear-gradient(to right, #ff6b6b, #ee5a6f)" }
    }).showToast();
  }
};

// Event listeners
window.addEventListener('DOMContentLoaded', () => {
  console.log('📊 Dashboard Cargado');
  cargarDashboard();

  // Botón actualizar
  document.getElementById('btnActualizar')?.addEventListener('click', () => {
    cargarDashboard();
    Toastify({
      text: "Dashboard actualizado",
      duration: 2000,
      gravity: "top",
      position: "right",
      style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }
    }).showToast();
  });

  // Auto-actualizar cada 5 minutos
  setInterval(() => {
    cargarDashboard();
  }, 5 * 60 * 1000);
});

