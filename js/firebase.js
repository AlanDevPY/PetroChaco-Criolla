// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
// Importa las funciones específicas para la autenticación
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
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
  appId: "1:418269470247:web:dc72b4ed57d98322027802",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// 2. Obtén una referencia al servicio de autenticación
const auth = getAuth(app);
// 3. Obtén una referencia al servicio de Firestore
const db = getFirestore(app);

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

//? FUNCION QUE TENGAN QUE VER CON FIRESTORE DATA BASE---------------------------------------------

// FUNCION PARA REGISTRAR STOCK
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
    const querySnapshot = await getDocs(collection(db, 'Stock'));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error al obtener stock:", error);
  }
};

// FUNCION PARA ELIMINAR STOCK
export const eliminarStockPorID = async (id) => {
  try {
    const clienteRef = doc(db, 'Stock', id);
    await deleteDoc(clienteRef);
    console.log("Stock eliminado con éxito");
  } catch (error) {
    console.error("Error al eliminar Stock:", error);
  }
};

// FUNCION PARA ACTUALIZAR STOCK
export const actualizarStockporId = async (id, stockActualizado ) => {
  try {
    const clienteRef = doc(db, 'Stock', id);
    await updateDoc(clienteRef, stockActualizado);
    console.log("Stock actualizado conxito");
  } catch (error) {
    console.error("Error al actualizar stock:", error);
  }
};
