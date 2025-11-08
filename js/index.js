import { iniciarSesion } from "./firebase.js";


const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const result = await iniciarSesion(email, password);

  if (result.success) {
    //mostrar modal de inicio de sesion exitoso
    const loginSuccessModal = new bootstrap.Modal(document.getElementById("loginSuccessModal"));
    loginSuccessModal.show();

    setTimeout(() => {
      loginSuccessModal.hide();
      window.location.href = "html/ventas.html";
    }, 2000);

  } else {
    // Mostrar modal de error y detallar mensaje
    const mensajeEl = document.getElementById("loginErrorMensaje");
    if (mensajeEl) mensajeEl.textContent = result.error || "Error al iniciar sesión.";
    const loginErrorModal = new bootstrap.Modal(document.getElementById("loginErrorModal"));
    loginErrorModal.show();
  }
});