import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { inicioSesion, obtenerUsuario } from "../js/firebase"; // de la librería oficial, no de tu archivo
import { useNavigate } from "react-router-dom";

// /src/componets/Login.jsx

const Login = () => {
  const navigate = useNavigate();
  const [colore, setColore] = useState({
    tipo: "primary",
    mostrar: false,
    text: "",
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const botonSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Por favor ingresa correo y contraseña.");
      return;
    }

    try {
      const userCredential = await inicioSesion(email, password);
      console.log("Usuario autenticado:", userCredential.user.uid);

      const usuarioData = await obtenerUsuario(userCredential.user.uid);
      console.log("Datos del usuario:", usuarioData.rol);
      setColore({
        tipo: "success",
        mostrar: true,
        text: "Inicio de sesión exitoso",
      });

      if (usuarioData.rol === "admin") {
        navigate("/home");
      } else {
        setColore({
          tipo: "warning",
          mostrar: true,
          text: "Acceso denegado: solo usuarios con rol admin pueden acceder al dashboard.",
        });
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error.message);
      setColore({
        tipo: "danger",
        mostrar: true,
        text: "Error al iniciar sesión: " + error.message,
      });

      // Ocultar la alerta después de unos segundos (opcional)
      setTimeout(
        () => setColore((prev) => ({ ...prev, mostrar: false })),
        3000
      );
    }
  };

  return (
    <div
      className="d-flex vh-100 align-items-center justify-content-center"
      style={{ background: "#f6fbff" }}
    >
      <div
        className="card shadow-lg"
        style={{
          maxWidth: 920,
          width: "95%",
          borderRadius: 14,
          overflow: "hidden",
          border: "none",
        }}
      >
        <div className="row g-0">
          {/* Lado del logo / branding */}
          <div
            className="col-md-5 d-flex flex-column align-items-center justify-content-center text-center p-4"
            style={{
              background:
                "linear-gradient(135deg,#7dd3fc 0%,#60a5fa 60%,#3b82f6 100%)",
              color: "#fff",
            }}
          >
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: 0.6,
                fontFamily: "'Segoe UI', Roboto, sans-serif",
              }}
            >
              Tienda
              <div style={{ fontSize: 36, marginTop: -6 }}>Petro Criolla</div>
            </div>
            <p className="mt-3 mb-0" style={{ opacity: 0.95 }}>
              Sistema de gestión para personal informático
            </p>
            <div style={{ marginTop: 18, fontSize: 28 }}>🛒</div>
            <small style={{ opacity: 0.9, marginTop: 10 }}>
              Interfaz amigable y familiar
            </small>
          </div>

          {/* Lado del formulario */}
          <div className="col-md-7 p-4">
            <div className="p-3" style={{ maxWidth: 420, margin: "0 auto" }}>
              <h5 className="mb-3">Iniciar sesión</h5>

              <div
                className={`alert alert-${colore.tipo} ${
                  colore.mostrar ? "d-block" : "d-none"
                }`}
                role="alert"
              >
                {colore.text}
              </div>
              <form
                onSubmit={botonSubmit}
                aria-label="formulario de inicio de sesión"
              >
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Correo
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    placeholder="tu@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-required="true"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Contraseña
                  </label>
                  <div className="input-group">
                    <input
                      id="password"
                      type={showPass ? "text" : "password"}
                      className="form-control"
                      placeholder="Contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      aria-required="true"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPass((s) => !s)}
                      aria-pressed={showPass}
                      aria-label={
                        showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                    >
                      {showPass ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`btn btn-primary w-100`}
                  style={{ background: "#2563eb", border: "none" }}
                >
                  Entrar
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
