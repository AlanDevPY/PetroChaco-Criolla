import { obtenerCajas, obtenerReposiciones, obtenerStock } from "./firebase.js";
import { formatGs } from "./utils.js";
import Toastify from "https://cdn.jsdelivr.net/npm/toastify-js/src/toastify-es.js";

// Variables globales
let graficoPie = null;
let graficoBar = null;
let graficoProductos = null;

// Inicializar fechas por defecto (hoy)
const inicializarFechas = () => {
  const hoy = new Date();
  const fechaHasta = hoy.toISOString().split('T')[0];
  const fechaDesde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  
  document.getElementById('fechaDesde').value = fechaDesde;
  document.getElementById('fechaHasta').value = fechaHasta;
};

// Función para parsear fechas en formato DD/MM/YYYY
const parsearFecha = (fechaStr) => {
  if (!fechaStr) return null;
  
  // Si tiene hora (DD/MM/YYYY HH:mm:ss)
  const partes = fechaStr.split(' ');
  const fechaParte = partes[0];
  const [dia, mes, anio] = fechaParte.split('/');
  
  if (!dia || !mes || !anio) return null;
  
  return new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
};

// Función para crear fecha local sin problemas de zona horaria
const crearFechaLocal = (fechaStr) => {
  // Si viene en formato YYYY-MM-DD (del input date)
  if (fechaStr.includes('-')) {
    const [anio, mes, dia] = fechaStr.split('-').map(Number);
    return new Date(anio, mes - 1, dia, 0, 0, 0, 0);
  }
  // Si viene en otro formato, intentar parsearlo
  return new Date(fechaStr);
};

// Función para verificar si una fecha está en el rango
const estaEnRango = (fechaStr, fechaDesde, fechaHasta) => {
  const fecha = parsearFecha(fechaStr);
  if (!fecha) return false;
  
  // Crear fechas locales sin problemas de zona horaria
  const desde = crearFechaLocal(fechaDesde);
  desde.setHours(0, 0, 0, 0);
  
  const hasta = crearFechaLocal(fechaHasta);
  hasta.setHours(23, 59, 59, 999);
  
  fecha.setHours(0, 0, 0, 0);
  
  return fecha >= desde && fecha <= hasta;
};

// Función para obtener fecha desde Timestamp
const obtenerFechaDesdeTimestamp = (timestamp) => {
  if (!timestamp) return null;
  
  if (timestamp.seconds) {
    // Firestore Timestamp
    return new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    return timestamp;
  }
  
  return null;
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

// Función para calcular reporte
const calcularReporte = async (fechaDesde, fechaHasta) => {
  try {
    // Obtener todas las cajas, reposiciones y stock
    const [cajas, reposiciones, stock] = await Promise.all([
      obtenerCajas(),
      obtenerReposiciones(1000), // Obtener más reposiciones para el reporte
      obtenerStock()
    ]);

    // Filtrar ventas por rango de fechas
    let totalVentas = 0;
    let cantidadVentas = 0;
    let totalItemsVendidos = 0;
    const ventasPorDia = {};
    const productosVendidos = {}; // { nombreProducto: { cantidad: 0, totalVendido: 0 } }

    cajas.forEach(caja => {
      if (!caja.ventas || !Array.isArray(caja.ventas)) return;

      caja.ventas.forEach(venta => {
        if (!venta.fecha || !venta.total) return;

        // Verificar si la venta está en el rango
        if (estaEnRango(venta.fecha, fechaDesde, fechaHasta)) {
          totalVentas += venta.total || 0;
          cantidadVentas++;

          // Procesar items de la venta
          if (venta.venta && Array.isArray(venta.venta)) {
            venta.venta.forEach(item => {
              const nombreProducto = item.item || 'Producto sin nombre';
              const cantidad = item.cantidad || 0;
              const subTotal = item.subTotal || 0;

              totalItemsVendidos += cantidad;

              // Agrupar por producto
              if (!productosVendidos[nombreProducto]) {
                productosVendidos[nombreProducto] = {
                  cantidad: 0,
                  totalVendido: 0,
                  vecesVendido: 0 // Cuántas veces se vendió este producto
                };
              }
              productosVendidos[nombreProducto].cantidad += cantidad;
              productosVendidos[nombreProducto].totalVendido += subTotal;
              productosVendidos[nombreProducto].vecesVendido += 1;
            });
          }

          // Agrupar por día
          const fechaVenta = parsearFecha(venta.fecha);
          if (fechaVenta) {
            const fechaKey = formatearFecha(fechaVenta);
            if (!ventasPorDia[fechaKey]) {
              ventasPorDia[fechaKey] = {
                ventas: 0,
                cantidad: 0
              };
            }
            ventasPorDia[fechaKey].ventas += venta.total || 0;
            ventasPorDia[fechaKey].cantidad++;
          }
        }
      });
    });

    // Filtrar reposiciones por rango de fechas
    let totalGastos = 0;
    let cantidadReposiciones = 0;
    const gastosPorDia = {};

    reposiciones.forEach(repo => {
      let fechaRepo = null;

      // Intentar obtener fecha desde Timestamp primero
      if (repo.fechaTS) {
        fechaRepo = obtenerFechaDesdeTimestamp(repo.fechaTS);
      }

      // Si no hay Timestamp, usar el campo fecha (string)
      if (!fechaRepo && repo.fecha) {
        fechaRepo = parsearFecha(repo.fecha);
      }

      if (fechaRepo) {
        // Crear fechas locales sin problemas de zona horaria
        const fechaDesdeObj = crearFechaLocal(fechaDesde);
        fechaDesdeObj.setHours(0, 0, 0, 0);
        
        const fechaHastaObj = crearFechaLocal(fechaHasta);
        fechaHastaObj.setHours(23, 59, 59, 999);

        fechaRepo.setHours(0, 0, 0, 0);

        if (fechaRepo >= fechaDesdeObj && fechaRepo <= fechaHastaObj) {
          const gasto = repo.totalCompra || 0;
          totalGastos += gasto;
          cantidadReposiciones++;

          // Agrupar por día
          const fechaKey = formatearFecha(fechaRepo);
          if (!gastosPorDia[fechaKey]) {
            gastosPorDia[fechaKey] = 0;
          }
          gastosPorDia[fechaKey] += gasto;
        }
      }
    });

    // Calcular ganancia
    const ganancia = totalVentas - totalGastos;
    const porcentajeGanancia = totalVentas > 0 
      ? ((ganancia / totalVentas) * 100).toFixed(1) 
      : 0;

    // Calcular rentabilidad por producto
    const productosConRentabilidad = Object.entries(productosVendidos)
      .map(([nombre, datos]) => {
        const producto = stock.find(p => p.item === nombre);
        const costoCompra = producto?.costoCompra || 0;
        const costoTotal = costoCompra * datos.cantidad;
        const ganancia = datos.totalVendido - costoTotal;
        const margenGanancia = datos.totalVendido > 0 
          ? ((ganancia / datos.totalVendido) * 100).toFixed(1) 
          : 0;
        const rentabilidad = datos.totalVendido > 0 ? (ganancia / datos.totalVendido) * 100 : 0;

        return {
          nombre,
          cantidad: datos.cantidad,
          totalVendido: datos.totalVendido,
          vecesVendido: datos.vecesVendido,
          costoCompra,
          costoTotal,
          ganancia,
          margenGanancia: parseFloat(margenGanancia),
          rentabilidad: parseFloat(rentabilidad)
        };
      });

    // Ordenar productos por cantidad vendida (más vendidos primero)
    const productosOrdenados = productosConRentabilidad
      .sort((a, b) => b.cantidad - a.cantidad);

    // Ordenar productos por rentabilidad (más rentables primero)
    const productosMasRentables = [...productosConRentabilidad]
      .filter(p => p.totalVendido > 0)
      .sort((a, b) => b.rentabilidad - a.rentabilidad);

    // Combinar datos por día
    const todasLasFechas = new Set([
      ...Object.keys(ventasPorDia),
      ...Object.keys(gastosPorDia)
    ]);

    const resumenPorDia = Array.from(todasLasFechas).map(fecha => {
      const ventas = ventasPorDia[fecha]?.ventas || 0;
      const gastos = gastosPorDia[fecha] || 0;
      const gananciaDia = ventas - gastos;
      const cantidad = ventasPorDia[fecha]?.cantidad || 0;

      return {
        fecha,
        ventas,
        gastos,
        ganancia: gananciaDia,
        cantidad
      };
    }).sort((a, b) => {
      // Ordenar por fecha (más reciente primero)
      const fechaA = parsearFecha(a.fecha);
      const fechaB = parsearFecha(b.fecha);
      return fechaB - fechaA;
    });

    return {
      totalVentas,
      totalGastos,
      ganancia,
      porcentajeGanancia,
      cantidadVentas,
      cantidadReposiciones,
      totalItemsVendidos,
      productosVendidos: productosOrdenados,
      productosMasRentables: productosMasRentables.slice(0, 20), // Top 20 más rentables
      resumenPorDia
    };
  } catch (error) {
    console.error('Error al calcular reporte:', error);
    throw error;
  }
};

// Función para mostrar reporte
const mostrarReporte = async (fechaDesde, fechaHasta) => {
  const spinner = document.getElementById('spinnerReporte');
  const contenedor = document.getElementById('contenedorReporte');
  const mensajeSinDatos = document.getElementById('mensajeSinDatos');

  spinner.classList.remove('d-none');
  contenedor.classList.add('d-none');
  mensajeSinDatos.classList.add('d-none');

  try {
    const reporte = await calcularReporte(fechaDesde, fechaHasta);

    spinner.classList.add('d-none');

    // Verificar si hay datos
    if (reporte.cantidadVentas === 0 && reporte.cantidadReposiciones === 0) {
      mensajeSinDatos.classList.remove('d-none');
      return;
    }

    // Mostrar resumen en tarjetas
    document.getElementById('totalVentas').textContent = formatGs(reporte.totalVentas);
    document.getElementById('totalGastos').textContent = formatGs(reporte.totalGastos);
    document.getElementById('totalGanancia').textContent = formatGs(reporte.ganancia);
    document.getElementById('cantidadVentas').textContent = reporte.cantidadVentas;
    document.getElementById('cantidadReposiciones').textContent = reporte.cantidadReposiciones;
    document.getElementById('porcentajeGanancia').textContent = `${reporte.porcentajeGanancia}%`;
    document.getElementById('totalItemsVendidos').textContent = reporte.totalItemsVendidos || 0;

    // Actualizar color de ganancia según si es positiva o negativa
    const gananciaElement = document.getElementById('totalGanancia');
    const cardGanancia = document.querySelector('.card-ganancia');
    if (reporte.ganancia >= 0) {
      gananciaElement.classList.remove('text-danger');
      gananciaElement.classList.add('text-success');
      cardGanancia.classList.remove('border-danger');
      cardGanancia.classList.add('border-success');
    } else {
      gananciaElement.classList.remove('text-success');
      gananciaElement.classList.add('text-danger');
      cardGanancia.classList.remove('border-success');
      cardGanancia.classList.add('border-danger');
    }

    // Mostrar tabla de resumen por día
    const tbody = document.getElementById('tbodyResumenDiario');
    tbody.innerHTML = '';

    reporte.resumenPorDia.forEach(dia => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${dia.fecha}</td>
        <td class="text-end">${formatGs(dia.ventas)}</td>
        <td class="text-end">${formatGs(dia.gastos)}</td>
        <td class="text-end ${dia.ganancia >= 0 ? 'text-success' : 'text-danger'}">
          ${formatGs(dia.ganancia)}
        </td>
        <td class="text-end">${dia.cantidad}</td>
      `;
      tbody.appendChild(fila);
    });

    // Actualizar totales del footer
    document.getElementById('footerTotalVentas').textContent = formatGs(reporte.totalVentas);
    document.getElementById('footerTotalGastos').textContent = formatGs(reporte.totalGastos);
    document.getElementById('footerTotalGanancia').textContent = formatGs(reporte.ganancia);
    document.getElementById('footerTotalTransacciones').textContent = reporte.cantidadVentas;

    // Crear/actualizar gráficos
    crearGraficos(reporte);

    // Mostrar productos más vendidos
    mostrarProductosVendidos(reporte.productosVendidos);

    // Mostrar análisis de rentabilidad
    mostrarRentabilidad(reporte.productosMasRentables || []);

    // Mostrar contenedor
    contenedor.classList.remove('d-none');
  } catch (error) {
    spinner.classList.add('d-none');
    Toastify({
      text: "Error al generar el reporte. Intenta nuevamente.",
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "linear-gradient(to right, #ff6b6b, #ee5a6f)" }
    }).showToast();
    console.error('Error:', error);
  }
};

// Función para mostrar productos vendidos
const mostrarProductosVendidos = (productos) => {
  const tbody = document.getElementById('tbodyProductosVendidos');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!productos || productos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay productos vendidos en este período</td></tr>';
    return;
  }

  // Mostrar top 20 productos
  const topProductos = productos.slice(0, 20);
  
  topProductos.forEach((producto, index) => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${index + 1}</td>
      <td>${producto.nombre}</td>
      <td class="text-end">${producto.cantidad}</td>
      <td class="text-end">${formatGs(producto.totalVendido)}</td>
    `;
    tbody.appendChild(fila);
  });

  // Crear gráfico de productos más vendidos
  crearGraficoProductos(topProductos.slice(0, 10)); // Top 10 para el gráfico
};

// Función para mostrar análisis de rentabilidad
const mostrarRentabilidad = (productos) => {
  const tbody = document.getElementById('tbodyRentabilidad');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!productos || productos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay datos de rentabilidad para este período</td></tr>';
    return;
  }

  productos.forEach((producto, index) => {
    const fila = document.createElement('tr');
    const colorMargen = producto.margenGanancia >= 30 ? 'text-success' 
      : producto.margenGanancia >= 15 ? 'text-warning' 
      : 'text-danger';
    
    fila.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${producto.nombre}</strong></td>
      <td class="text-end">${producto.cantidad}</td>
      <td class="text-end">${formatGs(producto.totalVendido)}</td>
      <td class="text-end">${formatGs(producto.costoTotal)}</td>
      <td class="text-end ${producto.ganancia >= 0 ? 'text-success' : 'text-danger'}">
        <strong>${formatGs(producto.ganancia)}</strong>
      </td>
      <td class="text-end ${colorMargen}">
        <strong>${producto.margenGanancia}%</strong>
      </td>
    `;
    tbody.appendChild(fila);
  });
};

// Función para crear gráfico de productos más vendidos
const crearGraficoProductos = (productos) => {
  // Destruir gráfico anterior si existe
  if (graficoProductos) graficoProductos.destroy();

  const ctxProductos = document.getElementById('graficoProductos');
  if (!ctxProductos) return;

  const labels = productos.map(p => {
    // Truncar nombres largos
    return p.nombre.length > 20 ? p.nombre.substring(0, 20) + '...' : p.nombre;
  });
  const cantidades = productos.map(p => p.cantidad);

  graficoProductos = new Chart(ctxProductos.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Cantidad Vendida',
        data: cantidades,
        backgroundColor: 'rgba(40, 167, 69, 0.8)',
        borderColor: '#28a745',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: 'y', // Gráfico horizontal
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const producto = productos[context.dataIndex];
              return `Cantidad: ${producto.cantidad} | Total: ${formatGs(producto.totalVendido)}`;
            }
          }
        }
      }
    }
  });
};

// Función para crear gráficos
const crearGraficos = (reporte) => {
  // Destruir gráficos anteriores si existen
  if (graficoPie) graficoPie.destroy();
  if (graficoBar) graficoBar.destroy();

  // Gráfico de Pie (Distribución)
  const ctxPie = document.getElementById('graficoPie').getContext('2d');
  graficoPie = new Chart(ctxPie, {
    type: 'pie',
    data: {
      labels: ['Ventas', 'Gastos'],
      datasets: [{
        data: [reporte.totalVentas, reporte.totalGastos],
        backgroundColor: ['#28a745', '#dc3545'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${formatGs(value)}`;
            }
          }
        }
      }
    }
  });

  // Gráfico de Barras (Comparación)
  const ctxBar = document.getElementById('graficoBar').getContext('2d');
  graficoBar = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: ['Ventas', 'Gastos', 'Ganancia'],
      datasets: [{
        label: 'Monto (Gs)',
        data: [reporte.totalVentas, reporte.totalGastos, reporte.ganancia],
        backgroundColor: [
          'rgba(40, 167, 69, 0.8)',
          'rgba(220, 53, 69, 0.8)',
          reporte.ganancia >= 0 
            ? 'rgba(0, 123, 255, 0.8)' 
            : 'rgba(255, 193, 7, 0.8)'
        ],
        borderColor: [
          '#28a745',
          '#dc3545',
          reporte.ganancia >= 0 ? '#007bff' : '#ffc107'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatGs(value);
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${formatGs(context.parsed.y)}`;
            }
          }
        }
      }
    }
  });
};

// Event listeners
window.addEventListener('DOMContentLoaded', () => {
  console.log('📊 Módulo de Reportes Cargado');

  // Inicializar fechas
  inicializarFechas();

  // Formulario de filtro
  document.getElementById('formFiltroReporte').addEventListener('submit', (e) => {
    e.preventDefault();
    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;

    if (!fechaDesde || !fechaHasta) {
      Toastify({
        text: "Por favor selecciona ambas fechas",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "linear-gradient(to right, #ff6b6b, #ee5a6f)" }
      }).showToast();
      return;
    }

    if (fechaDesde > fechaHasta) {
      Toastify({
        text: "La fecha desde debe ser anterior a la fecha hasta",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "linear-gradient(to right, #ff6b6b, #ee5a6f)" }
      }).showToast();
      return;
    }

    mostrarReporte(fechaDesde, fechaHasta);
  });

  // Botones de período rápido
  document.getElementById('btnHoy').addEventListener('click', () => {
    const hoy = new Date();
    const fecha = hoy.toISOString().split('T')[0];
    document.getElementById('fechaDesde').value = fecha;
    document.getElementById('fechaHasta').value = fecha;
    mostrarReporte(fecha, fecha);
  });

  document.getElementById('btnSemana').addEventListener('click', () => {
    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - hoy.getDay() + 1); // Lunes de esta semana
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6); // Domingo de esta semana

    document.getElementById('fechaDesde').value = lunes.toISOString().split('T')[0];
    document.getElementById('fechaHasta').value = domingo.toISOString().split('T')[0];
    mostrarReporte(
      lunes.toISOString().split('T')[0],
      domingo.toISOString().split('T')[0]
    );
  });

  document.getElementById('btnMes').addEventListener('click', () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    document.getElementById('fechaDesde').value = primerDia.toISOString().split('T')[0];
    document.getElementById('fechaHasta').value = ultimoDia.toISOString().split('T')[0];
    mostrarReporte(
      primerDia.toISOString().split('T')[0],
      ultimoDia.toISOString().split('T')[0]
    );
  });

  document.getElementById('btnMesAnterior').addEventListener('click', () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

    document.getElementById('fechaDesde').value = primerDia.toISOString().split('T')[0];
    document.getElementById('fechaHasta').value = ultimoDia.toISOString().split('T')[0];
    mostrarReporte(
      primerDia.toISOString().split('T')[0],
      ultimoDia.toISOString().split('T')[0]
    );
  });

  // Generar reporte inicial (mes actual)
  const hoy = new Date();
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  mostrarReporte(
    primerDia.toISOString().split('T')[0],
    ultimoDia.toISOString().split('T')[0]
  );
});

