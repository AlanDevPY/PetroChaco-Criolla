import { registrarUsuario, obtenerUsuariosEnTiempoReal } from "./firebase.js";



function mostrarAviso(tipo, mensaje) {
    const modalTitulo = document.getElementById("modalAvisoTitulo");
    const modalMensaje = document.getElementById("modalAvisoMensaje");
    const modalHeader = document.getElementById("modalAvisoHeader");

    // Limpiar clases previas
    modalHeader.className = "modal-header";

    // Ajustar estilo según tipo
    if (tipo === "success") {
        modalHeader.classList.add("bg-success", "text-white");
        modalTitulo.textContent = "✅ Éxito";
    } else if (tipo === "warning") {
        modalHeader.classList.add("bg-warning", "text-dark");
        modalTitulo.textContent = "⚠️ Advertencia";
    } else {
        modalHeader.classList.add("bg-secondary", "text-white");
        modalTitulo.textContent = "ℹ️ Aviso";
    }

    modalMensaje.textContent = mensaje;

    const modal = new bootstrap.Modal(document.getElementById("modalAviso"));
    modal.show();

    //   OCULATAR MODAL LUEGO DE 2 SEGUNDOS
    setTimeout(() => {
        modal.hide();
    }, 3200);
}

document.getElementById("formUsuario").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("usuarioNombre").value.trim();
    const apellido = document.getElementById("usuarioApellido").value.trim();
    const correoGenerado = `${nombre.toLowerCase()}.${apellido.toLowerCase()}@petrocriolla.com`;

    const usuario = {
        nombre: nombre,
        apellido: apellido,
        email: correoGenerado,
        password: document.getElementById("usuarioContrasena").value.trim(),
        telefono: document.getElementById("usuarioTelefono").value.trim(),
        rol: document.getElementById("usuarioRol").value,
        fechaCreacion: dayjs().format("DD/MM/YYYY hh:mm:ss A"),
    };

    const modalElement = document.getElementById("modalUsuario");
    const modal = bootstrap.Modal.getInstance(modalElement);

    try {
        const resultado = await registrarUsuario(usuario);

        if (resultado.success) {
            modal.hide();
            mostrarAviso("success", "Usuario registrado correctamente.");
            //   resetear formulario
            document.getElementById("formUsuario").reset();


        } else {
            // Aquí hacemos el switch para errores de Firebase
            let mensaje;
            switch (resultado.errorCode) {
                case "auth/email-already-in-use":
                    mensaje = "El correo electrónico ya está registrado.";
                    break;
                case "auth/invalid-email":
                    mensaje = "El formato del correo electrónico no es válido.";
                    break;
                case "auth/weak-password":
                    mensaje = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
                    break;
                case "auth/missing-password":
                    mensaje = "Debe ingresar una contraseña.";
                    break;
                case "auth/operation-not-allowed":
                    mensaje = "El método de autenticación está deshabilitado.";
                    break;
                default:
                    mensaje = "Ocurrió un error desconocido: " + resultado.errorMessage;
                    break;
            }
            mostrarAviso("warning", mensaje);
        }

    } catch (error) {
        mostrarAviso("danger", "Ocurrió un error inesperado: " + error.message);
        console.error(error);
    }
});

// FUNCION DE MOSTRAR LOS USUARIO REGISTRADOS EN TIEMPO REAL
const mostrarUsuariosEnTiempoReal = () => {
    const tablaUsuarios = document.getElementById("tablaUsuarios");

    obtenerUsuariosEnTiempoReal((querySnapshot) => {
        tablaUsuarios.innerHTML = ""; // limpiar tabla antes de mostrar

        querySnapshot.forEach((doc) => {
            const usuario = doc.data();
            console.log(usuario);



            const fila = document.createElement("tr");
            fila.innerHTML = `
  <td>${usuario.nombre || ""}</td>
  <td>${usuario.apellido || ""}</td>
  <td>${usuario.email || ""}</td>
  <td>${usuario.telefono || ""}</td>
  <td>${usuario.rol || ""}</td>
  <td>
    <button class="btn btn-sm btn-warning">✏️ Editar</button>
    <button class="btn btn-sm btn-danger">🗑️ Eliminar</button>
  </td>
`;


            tablaUsuarios.appendChild(fila);
        });
    });
};







window.addEventListener("DOMContentLoaded", async () => {
    mostrarUsuariosEnTiempoReal()
})



