// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore"; // ✅ Firestore
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"; // ✅ Auth


const firebaseConfig = {
    apiKey: "AIzaSyCQsOTPjzFk7xZfZL8BiQ4fIDBXKPssBNw",
    authDomain: "petrochaco-criolla.firebaseapp.com",
    projectId: "petrochaco-criolla",
    storageBucket: "petrochaco-criolla.firebasestorage.app",
    messagingSenderId: "418269470247",
    appId: "1:418269470247:web:dc72b4ed57d98322027802"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta servicios que vayas a usar
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;


export const inicioSesion = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential;
    } catch (error) {
        throw new Error("Error al iniciar sesión: " + error.message);
    }
};


// Función para obtener usuario desde Firestore
export const obtenerUsuario = async (uid) => {
    const docRef = doc(db, "usuarios", uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        throw new Error("Usuario no encontrado");
    }

    return docSnap.data(); // devuelve todos los datos del usuario
}
