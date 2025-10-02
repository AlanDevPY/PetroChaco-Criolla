import { obtenerCajas } from "./firebase.js";

window.addEventListener("DOMContentLoaded", async () => {
    await mostrarCajas();
});

// FUNCION DE MOSTRAR LAS CAJAS EN TABLA
const mostrarCajas = async () => {
    const cajas = await obtenerCajas();
    const tablaCajas = document.getElementById("cajasTable");
    let contador = 1;

    tablaCajas.innerHTML = "";
    cajas.forEach((caja) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <tr>
            <td>${contador++}</td>
            <td>${caja.fechaApertura}</td>
            <td>${caja.fechaCierre || "--"}</td>
            <td>${caja.totalRecaudado.toLocaleString("es-PY") + " Gs"}</td>
            <td><span class="badge bg-success">${caja.estado}</span></td>
            <td>
              <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#detalleCajaModal">
                Ver detalle
              </button>
            </td>
          </tr>
        `;

        tablaCajas.innerHTML += fila.outerHTML;
        
    });
}

// FUNCION PARA REALIZAR CIERRE DE CAJA
