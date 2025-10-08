// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
// Importa las funciones específicas para la autenticación
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged, // Muy útil para saber el estado de la sesión del usuario
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  setDoc,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCQsOTPjzFk7xZfZL8BiQ4fIDBXKPssBNw",
    authDomain: "petrochaco-criolla.firebaseapp.com",
    projectId: "petrochaco-criolla",
    storageBucket: "petrochaco-criolla.firebasestorage.app",
    messagingSenderId: "418269470247",
    appId: "1:418269470247:web:dc72b4ed57d98322027802"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);
// 2. Obtén una referencia al servicio de autenticación
const auth = getAuth(app);
// 3. Obtén una referencia al servicio de Firestore
const db = getFirestore(app);

// ? FUNCIONES QUE TENGAN QUE VER CON LA AUTENTICACIÓN--------------------------------------------
// Para iniciar sesión con correo y contraseña
export const iniciarSesion = async function (email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Para registrar un nuevo usuario
export const registrarUsuario = async function (email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Escucha cambios en el estado del usuario
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Usuario logueado, opcionalmente obtener datos y aplicar permisos
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const rol = docSnap.data().rol;
      aplicarPermisos(rol);
    }
  } else {
    // Usuario no logueado
    const estaEnIndex = window.location.pathname.endsWith("/index.html") || window.location.pathname === "/";

    if (!estaEnIndex) {
      // Redirigir solo si no está ya en index.html
      window.location.href = "../index.html";
    }
    // Si ya está en index.html, no hacer nada
  }
});

// O persistencia de sesión (pierde sesión al cerrar el navegador)
setPersistence(auth, browserSessionPersistence)
  .then(() => {
    console.log("Persistencia de sesión activada");
    
  });


//? FUNCION QUE TENGAN QUE VER CON FIRESTORE DATA BASE---------------------------------------------

// * FUNCION QUE TENGA QUE VER CON LA BASE DE DATOS DE STOCK
export const registrarStock = async (stock) => {
  try {
    await addDoc(collection(db, "Stock"), stock);
    console.log("stock registrado con éxito");
  } catch (error) {
    console.error("Error al registrar stock:", error);
  }
};

// FUNCION PARA OBTENER LOS STOCK
export const obtenerStock = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "Stock"));
    return querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error al obtener stock:", error);
  }
};

// FUNCION PARA ELIMINAR STOCK
export const eliminarStockPorID = async (id) => {
  try {
    const clienteRef = doc(db, "Stock", id);
    await deleteDoc(clienteRef);
    console.log("Stock eliminado con éxito");
  } catch (error) {
    console.error("Error al eliminar Stock:", error);
  }
};

// FUNCION PARA ACTUALIZAR STOCK
export const actualizarStockporId = async (id, stockActualizado) => {
  try {
    const clienteRef = doc(db, "Stock", id);
    await updateDoc(clienteRef, stockActualizado);
    console.log("Stock actualizado conxito");
  } catch (error) {
    console.error("Error al actualizar stock:", error);
  }
};

// FUNCION PARA OBTENER STOCK POR ID
export const obtenerStockPorId = async (id) => {
  try {
    const servicioRef = doc(db, "Stock", id); // Referencia al documento con el id proporcionado
    const servicioSnapshot = await getDoc(servicioRef);

    if (servicioSnapshot.exists()) {
      return { ...servicioSnapshot.data(), id: servicioSnapshot.id };
    } else {
      console.error("No se encontró item con el id proporcionado.");
      return null;
    }
  } catch (error) {
    console.error("Error al obtener el item por id:", error);
  }
};

// * FUNCIONES QUE TENGAN QUE VER CON LA BASE DE DATOS DE CLIENTES

// FUNCION PARA REGISTRAR CLIENTE
export const registrarCliente = async (cliente) => {
  try {
    await addDoc(collection(db, "Clientes"), cliente);
    console.log("Cliente registrado con éxito");
  } catch (error) {
    console.error("Error al registrar cliente:", error);
  }
};

// FUNCION PARA OBTENER CLIENTES
export const obtenerClientes = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "Clientes"));
    return querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error al obtener clientes:", error);
  }
};

// FUNCION PARA ELIMINAR CLIENTE
export const eliminarClientePorID = async (id) => {
  try {
    const clienteRef = doc(db, "Clientes", id);
    await deleteDoc(clienteRef);
    console.log("Cliente eliminado con éxito");
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
  }
};

// FUNCION PARA ACTUALIZAR CLIENTE
export const actualizarClienteporId = async (id, clienteActualizado) => {
  try {
    const clienteRef = doc(db, "Clientes", id);
    await updateDoc(clienteRef, clienteActualizado);
    console.log("Cliente actualizado conxito");
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
  }
};

// FUNCION PARA OBTENER CLIENTE POR ID
export const obtenerClientePorId = async (id) => {
  try {
    const servicioRef = doc(db, "Clientes", id); // Referencia al documento con el id proporcionado
    const servicioSnapshot = await getDoc(servicioRef);

    if (servicioSnapshot.exists()) {
      return { ...servicioSnapshot.data(), id: servicioSnapshot.id };
    } else {
      console.error("No se encontró item con el id proporcionado.");
      return null;
    }
  } catch (error) {
    console.error("Error al obtener el item por id:", error);
  }
};

// *FUNCIONES QUE TENGAN QUE VER CON LA CAJA
export const registrarCaja = async (caja) => {
  try {
    await addDoc(collection(db, "Caja"), caja);
    console.log("Caja registrada con éxito");
  } catch (error) {
    console.error("Error al registrar caja:", error);
  }
};

// FUNCION PARA OBTENER CAJAS
export const obtenerCajas = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "Caja"));
    return querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error al obtener cajas:", error);
  }
};

// FUNCION PARA ELIMINAR CAJA
export const eliminarCajaPorID = async (id) => {
  try {
    const cajaRef = doc(db, "Caja", id);
    await deleteDoc(cajaRef);
    console.log("Caja eliminada con éxito");
  } catch (error) {
    console.error("Error al eliminar caja:", error);
  }
};

// FUNCION PARA ACTUALIZAR CAJA
export const actualizarCajaporId = async (id, cajaActualizado) => {
  try {
    const cajaRef = doc(db, "Caja", id);
    await updateDoc(cajaRef, cajaActualizado);
    console.log("Caja actualizada conxito");
  } catch (error) {
    console.error("Error al actualizar caja:", error);
  }
};

// FUNCION PARA OBTENER CAJA POR ID
export const obtenerCajaPorId = async (id) => {
  try {
    const servicioRef = doc(db, "Caja", id); // Referencia al documento con el id proporcionado
    const servicioSnapshot = await getDoc(servicioRef);

    if (servicioSnapshot.exists()) {
      return { ...servicioSnapshot.data(), id: servicioSnapshot.id };
    } else {
      console.error("No se encontró item con el id proporcionado.");
      return null;
    }
  } catch (error) {
    console.error("Error al obtener el item por id:", error);
  }
};
