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
        window.location.href = "html/home.html";
      }, 2000);

    } else {
    //   mostrar modal de error
      const loginErrorModal = new bootstrap.Modal(document.getElementById("loginErrorModal"));
      loginErrorModal.show();
    }
  });