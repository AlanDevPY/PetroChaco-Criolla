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
  runTransaction,
  serverTimestamp,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Sistema de caché optimizado
import { FirebaseCache, withCache, invalidateCache } from './firebase-cache.js';

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

// Exportar db, auth y app para uso en otros módulos
export { db, auth, app };

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
    return { success: false, error: mapAuthError(error.code) };
  }
};

export const registrarUsuario = async (usuario) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      usuario.email,
      usuario.password
    );
    const user = userCredential.user;

    // Guardamos TODO el objeto usuario en Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      ...usuario,   // 🔹 Desestructuramos todo el objeto
      estado: "activo" // podemos agregar campos extra si queremos
    });

    return { success: true, user };

  } catch (error) {
    return {
      success: false,
      errorCode: error.code,
      errorMessage: mapAuthError(error.code)
    };
  }
};

// Mapeo de errores de Firebase Auth a mensajes amigables
function mapAuthError(code) {
  const mapa = {
    "auth/invalid-email": "Correo con formato inválido.",
    "auth/user-disabled": "Usuario deshabilitado. Contacta al administrador.",
    "auth/user-not-found": "No existe un usuario con ese correo.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/missing-password": "Debes ingresar una contraseña.",
    "auth/email-already-in-use": "El correo ya está registrado.",
    "auth/weak-password": "La contraseña es demasiado débil.",
    "auth/too-many-requests": "Demasiados intentos fallidos. Intenta más tarde.",
  };
  return mapa[code] || "Error de autenticación. Verifica los datos.";
}

// obtener usuarios en tiempo real
export const obtenerUsuariosEnTiempoReal = (callback) => onSnapshot(collection(db, 'usuarios'), callback)


// Escucha cambios en el estado del usuario
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Usuario no logueado → redirigir a index
    if (!window.location.pathname.endsWith("/index.html") && window.location.pathname !== "/") {
      window.location.href = "../index.html";
    }
    return;
  }

  // Usuario logueado → obtener rol y aplicar permisos
  try {
    const docSnap = await getDoc(doc(db, "usuarios", user.uid));
    if (docSnap.exists()) {
      const rol = docSnap.data().rol;
      const nombre = docSnap.data().nombre;
      console.log("✅ Usuario autenticado - Rol:", rol, "Nombre:", nombre);
      
      // Actualizar nombre de usuario en la UI
      const usuarioLogueadoEl = document.getElementById("usuarioLogueado");
      if (usuarioLogueadoEl) {
        usuarioLogueadoEl.textContent = `${nombre.toUpperCase()}`;
      }

      // Exponer rol en el DOM PRIMERO para que otros scripts lo puedan usar
      try {
        document.body.dataset.rol = rol;
        document.dispatchEvent(new CustomEvent('rol-ready', { detail: { rol } }));
      } catch (e) {
        console.warn('No se pudo propagar rol al DOM:', e);
      }

      // Aplicar permisos DESPUÉS de exponer el rol
      aplicarPermisos(rol);
      
      // Redirigir de la antigua vista de cajaUnica a la nueva unificada
      const paginaActual = window.location.pathname.split("/").pop();
      if (paginaActual === 'cajaUnica.html') {
        window.location.href = 'caja.html';
      }
    } else {
      console.warn("⚠️ Usuario no encontrado en la base de datos");
    }
  } catch (error) {
    console.error("❌ Error al obtener datos del usuario:", error);
  }
});

const aplicarPermisos = (rol) => {
  // Función interna para aplicar los permisos
  const aplicar = () => {
    const elementosAdmin = document.querySelectorAll(".solo-admin");
    console.log(`🔐 Aplicando permisos para rol: ${rol}, elementos encontrados: ${elementosAdmin.length}`);

    if (rol === "admin") {
      // Mostrar botones y secciones exclusivas
      elementosAdmin.forEach(el => {
        // Determinar el display correcto según las clases del elemento
        let displayValue = 'block'; // Por defecto
        
        if (el.classList.contains('d-flex') || el.classList.contains('flex')) {
          displayValue = 'flex';
        } else if (el.classList.contains('d-inline-flex')) {
          displayValue = 'inline-flex';
        } else if (el.classList.contains('d-inline-block')) {
          displayValue = 'inline-block';
        } else if (el.classList.contains('d-inline')) {
          displayValue = 'inline';
        } else if (el.classList.contains('card')) {
          displayValue = 'block';
        }
        
        // Agregar clase para indicar que está visible
        el.classList.add('admin-visible');
        // Establecer el display correcto
        el.style.setProperty('display', displayValue, 'important');
        console.log(`✅ Mostrando elemento admin con display: ${displayValue}`, el.className, el);
      });
    } else {
      // Ocultar todo lo que es solo para administradores
      elementosAdmin.forEach(el => {
        el.classList.remove('admin-visible');
        el.style.setProperty('display', 'none', 'important');
      });

      // 🔒 Lista de páginas restringidas solo para administradores
      const paginasRestringidas = ["stock.html", "usuario.html", "usuario.html"];

      // Detectar en qué página está el usuario
      const paginaActual = window.location.pathname.split("/").pop();

      // Si la página actual está en la lista restringida, redirigir
      if (paginasRestringidas.includes(paginaActual)) {
        window.location.href = "ventas.html"; // o la página que sí puede ver
      }
    }
  };

  // Intentar aplicar inmediatamente
  if (document.readyState === 'loading') {
    // Si el DOM aún no está listo, esperar
    document.addEventListener('DOMContentLoaded', aplicar);
  } else {
    // Si el DOM ya está listo, aplicar inmediatamente
    aplicar();
    // También aplicar después de un pequeño delay por si acaso
    setTimeout(aplicar, 100);
  }
};





// O persistencia de sesión (pierde sesión al cerrar el navegador)
setPersistence(auth, browserSessionPersistence)
  .then(() => {
    console.log("Persistencia de sesión activada");
  })
  .catch((error) => {
    console.error("Error al activar la persistencia de sesión:", error);

  });


//? FUNCION QUE TENGAN QUE VER CON FIRESTORE DATA BASE---------------------------------------------

// * FUNCION QUE TENGA QUE VER CON LA BASE DE DATOS DE STOCK
export const registrarStock = async (stock) => {
  try {
    await addDoc(collection(db, "Stock"), { ...stock, fechaTS: serverTimestamp() });
    console.log("stock registrado con éxito");
    // invalidar caché de stock tras mutación
    _stockCache = null;
    _stockCacheTimestamp = 0;
    invalidateCache('stock'); // 🔥 Nuevo sistema de caché
  } catch (error) {
    console.error("Error al registrar stock:", error);
  }
};

// Cache simple en memoria para evitar lecturas repetidas en una sesión
let _stockCache = null;
let _stockCacheTimestamp = 0;
const STOCK_CACHE_TTL = 30 * 1000; // 30s

// FUNCION PARA OBTENER LOS STOCK (con caché optimizado)
export const obtenerStock = async () => {
  return withCache('stock', async () => {
    try {
      const q = query(
        collection(db, "Stock"),
        orderBy("item"),
        limit(1000) // Límite de seguridad
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id }));
    } catch (error) {
      console.error("Error al obtener stock:", error);
      return [];
    }
  });
};

export const obtenerStockCached = async () => {
  const ahora = Date.now();
  if (_stockCache && (ahora - _stockCacheTimestamp) < STOCK_CACHE_TTL) {
    return _stockCache;
  }
  const data = await obtenerStock();
  _stockCache = data;
  _stockCacheTimestamp = ahora;
  return data;
};

// FUNCION PARA ELIMINAR STOCK
export const eliminarStockPorID = async (id) => {
  try {
    const clienteRef = doc(db, "Stock", id);
    await deleteDoc(clienteRef);
    console.log("Stock eliminado con éxito");
    // invalidar caché de stock tras mutación
    _stockCache = null;
    _stockCacheTimestamp = 0;
    invalidateCache('stock'); // 🔥 Nuevo sistema de caché
  } catch (error) {
    console.error("Error al eliminar Stock:", error);
  }
};

// FUNCION PARA ACTUALIZAR STOCK
export const actualizarStockporId = async (id, stockActualizado) => {
  try {
    const stockRef = doc(db, "Stock", id);
    await updateDoc(stockRef, stockActualizado);
    console.log("Stock actualizado con éxito");
    // invalidar caché de stock tras mutación
    _stockCache = null;
    _stockCacheTimestamp = 0;
    invalidateCache('stock'); // 🔥 Nuevo sistema de caché
  } catch (error) {
    console.error("Error al actualizar stock:", error);
    throw error;
  }
};

// FUNCION PARA OBTENER STOCK POR ID
export const obtenerStockPorId = async (id) => {
  try {
    const ref = doc(db, "Stock", id);
    const snap = await getDoc(ref);
    if (snap.exists()) return { ...snap.data(), id: snap.id };
    console.warn("No se encontró item con el id proporcionado.");
    return null;
  } catch (error) {
    console.error("Error al obtener el item por id:", error);
    throw error;
  }
};

// Descuento transaccional de múltiples items de stock
// items: [{id, cantidad}]
export const descontarStockTransaccional = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return;
  await runTransaction(db, async (transaction) => {
    // FASE 1: Todas las lecturas primero
    const snapshots = [];
    for (const item of items) {
      const ref = doc(db, "Stock", item.id);
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error(`Stock item no existe: ${item.id}`);
      snapshots.push({ ref, snap, cantidad: item.cantidad });
    }
    // FASE 2: Todas las escrituras después
    for (const { ref, snap, cantidad } of snapshots) {
      const data = snap.data();
      const actual = Number(data.cantidad) || 0;
      const desc = Number(cantidad) || 0;
      if (desc <= 0) continue; // ignorar
      if (actual < desc) throw new Error(`Stock insuficiente para ${ref.id} (${actual} < ${desc})`);
      const nuevo = actual - desc;
      console.log(`🔁 Descontando stock para ${ref.id}: ${actual} -> ${nuevo} (desc ${desc})`);
      transaction.update(ref, { cantidad: nuevo });
    }
  });

  // Invalidar caché FUERA de la transacción (asegurarse que la UI pida datos nuevos)
  _stockCache = null;
  _stockCacheTimestamp = 0;
  try {
    invalidateCache('stock');
  } catch (e) {
    console.warn('No se pudo invalidar el cache externo de stock:', e);
  }
};

// Incremento transaccional de stock (reposiciones)
// items: [{id, cantidad, costoCompra?, costo?}]
export const sumarStockTransaccional = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return;
  await runTransaction(db, async (transaction) => {
    // FASE 1: Todas las lecturas primero
    const snapshots = [];
    for (const item of items) {
      const ref = doc(db, "Stock", item.id);
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error(`Stock item no existe: ${item.id}`);
      snapshots.push({
        ref,
        snap,
        cantidad: item.cantidad,
        costoCompra: item.costoCompra,
        costo: item.costo
      });
    }

    // FASE 2: Todas las escrituras después
    for (const { ref, snap, cantidad, costoCompra, costo } of snapshots) {
      const data = snap.data();
      const actual = Number(data.cantidad) || 0;
      const inc = Number(cantidad) || 0;
      if (inc <= 0) continue;

      // Preparar objeto de actualización
      const updateData = { cantidad: actual + inc };

      // Si se proporcionan precios, actualizarlos también
      if (costoCompra !== undefined && costoCompra !== null) {
        updateData.costoCompra = Number(costoCompra);
      }
      if (costo !== undefined && costo !== null) {
        updateData.costo = Number(costo);
      }

      transaction.update(ref, updateData);
    }
  });

  // Invalidar caché FUERA de la transacción
  _stockCache = null;
  _stockCacheTimestamp = 0;
  invalidateCache('stock'); // 🔥 Nuevo sistema de caché
};

// Reposiciones (historial de notas)
export const registrarReposicion = async (nota) => {
  // nota: {fecha, usuario, items:[{id, item, cantidad, costoCompra?, costo?}], totalCompra, totalItems}
  try {
    await addDoc(collection(db, "Reposiciones"), { ...nota, fechaTS: serverTimestamp() });
    invalidateCache('reposiciones'); // 🔥 Nuevo sistema de caché
  } catch (e) {
    console.error('Error al registrar reposición', e);
    throw e;
  }
};

export const obtenerReposiciones = async (max = 50) => {
  return withCache('reposiciones', async () => {
    try {
      const q = query(collection(db, "Reposiciones"), orderBy("fechaTS", "desc"), limit(max));
      const s = await getDocs(q);
      return s.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Error al obtener reposiciones', e);
      return [];
    }
  }, 5 * 60 * 1000); // Caché de 5 minutos
};

// Salidas (historial de notas de salida)
export const registrarSalida = async (nota) => {
  // nota: {fecha, usuario, items:[{id, item, cantidad}], totalItems}
  try {
    await addDoc(collection(db, "Salidas"), { ...nota, fechaTS: serverTimestamp() });
    invalidateCache('salidas');
  } catch (e) {
    console.error('Error al registrar salida', e);
    throw e;
  }
};

export const obtenerSalidas = async (max = 50) => {
  return withCache('salidas', async () => {
    try {
      const q = query(collection(db, "Salidas"), orderBy("fechaTS", "desc"), limit(max));
      const s = await getDocs(q);
      return s.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Error al obtener salidas', e);
      return [];
    }
  }, 5 * 60 * 1000);
};

// Eliminar reposición
export const eliminarReposicion = async (id) => {
  try {
    await deleteDoc(doc(db, "Reposiciones", id));
    invalidateCache('reposiciones');
    console.log("Reposición eliminada con éxito");
  } catch (error) {
    console.error("Error al eliminar reposición:", error);
    throw error;
  }
};

// Eliminar salida
export const eliminarSalida = async (id) => {
  try {
    await deleteDoc(doc(db, "Salidas", id));
    invalidateCache('salidas');
    console.log("Salida eliminada con éxito");
  } catch (error) {
    console.error("Error al eliminar salida:", error);
    throw error;
  }
};

// * FUNCIONES QUE TENGAN QUE VER CON LA BASE DE DATOS DE CLIENTES

// FUNCION PARA REGISTRAR CLIENTE
export const registrarCliente = async (cliente) => {
  try {
    await addDoc(collection(db, "Clientes"), cliente);
    console.log("Cliente registrado con éxito");
    // invalidar caché de clientes tras mutación
    invalidarCacheClientes(); // Invalidar caché interno
    invalidateCache('clientes'); // 🔥 Nuevo sistema de caché
  } catch (error) {
    console.error("Error al registrar cliente:", error);
  }
};

// FUNCION PARA OBTENER CLIENTES (con caché optimizado)
export const obtenerClientes = async () => {
  return withCache('clientes', async () => {
    try {
      const q = query(
        collection(db, "Clientes"),
        limit(500) // Límite de seguridad
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    } catch (error) {
      console.error("Error al obtener clientes:", error);
      return [];
    }
  }, 10 * 60 * 1000); // Caché de 10 minutos
};

// Cache de clientes (evita lecturas en cada pulsación)
let _clientesCache = null;
let _clientesCacheTimestamp = 0;
const CLIENTES_CACHE_TTL = 30 * 1000; // 30s

// Función para invalidar el caché interno de clientes
export const invalidarCacheClientes = () => {
  _clientesCache = null;
  _clientesCacheTimestamp = 0;
};

export const obtenerClientesCached = async (forzarRecarga = false) => {
  const ahora = Date.now();
  // Si se fuerza la recarga o el caché está expirado, recargar
  if (forzarRecarga || !_clientesCache || (ahora - _clientesCacheTimestamp) >= CLIENTES_CACHE_TTL) {
    const data = await obtenerClientes();
    _clientesCache = data;
    _clientesCacheTimestamp = ahora;
    return data;
  }
  return _clientesCache;
};

// FUNCION PARA ELIMINAR CLIENTE
export const eliminarClientePorID = async (id) => {
  try {
    const clienteRef = doc(db, "Clientes", id);
    await deleteDoc(clienteRef);
    console.log("Cliente eliminado con éxito");
    // invalidar caché de clientes tras mutación
    invalidarCacheClientes(); // Invalidar caché interno
    invalidateCache('clientes'); // 🔥 Nuevo sistema de caché
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
    // invalidar caché de clientes tras mutación
    _clientesCache = null;
    _clientesCacheTimestamp = 0;
    invalidateCache('clientes'); // 🔥 Nuevo sistema de caché
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
  }
};

// Opcional: exportar funciones para invalidar caché manualmente si se requiere
export const invalidateStockCache = () => { _stockCache = null; _stockCacheTimestamp = 0; };
export const invalidateClientesCache = () => { _clientesCache = null; _clientesCacheTimestamp = 0; };

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
    await addDoc(collection(db, "Caja"), { ...caja, fechaAperturaTS: serverTimestamp() });
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

// ==========================
// FUNCIONES DE FACTURAS
// ==========================
// Registrar factura y reservar número de timbrado de forma atómica
export const registrarFactura = async ({ venta, cliente, total, cajaId, usuario } = {}, timbradoId) => {
  // usa una transacción para evitar duplicados en la numeración
  try {
    const result = await runTransaction(db, async (transaction) => {
      const timbradoRef = doc(db, 'timbrados', timbradoId);
      const timbradoSnap = await transaction.get(timbradoRef);
      if (!timbradoSnap.exists()) throw new Error('Timbrado no encontrado');

      const timbrado = timbradoSnap.data();
      const current = Number(timbrado.numeroActual || timbrado.rangoDesde || 0);
      if (current > Number(timbrado.rangoHasta)) throw new Error('Rango de facturas agotado');

      // número que vamos a usar para esta factura
      const numeroUsado = current;
      const nuevoNumero = current + 1;

      // actualizar timbrado
      transaction.update(timbradoRef, { numeroActual: nuevoNumero });

      // crear documento de factura con id generado
      const facturaRef = doc(collection(db, 'Facturas'));
      const facturaDoc = {
        venta: venta || {},
        cliente: cliente || {},
        total: total || 0,
        cajaId: cajaId || null,
        usuario: usuario || null,
        timbradoId: timbradoId,
        timbradoNumero: timbrado.numeroTimbrado || null,
        numero: numeroUsado,
        numeroFormateado: `${timbrado.establecimiento}-${timbrado.puntoExpedicion}-${String(numeroUsado).padStart(7, '0')}`,
        estado: 'activa',
        fechaTS: serverTimestamp()
      };

      transaction.set(facturaRef, facturaDoc);

      return { id: facturaRef.id, numero: numeroUsado, numeroFormateado: facturaDoc.numeroFormateado };
    });

    return result;
  } catch (e) {
    console.error('Error al registrar factura:', e);
    throw e;
  }
};

export const obtenerFacturas = async (max = 100) => {
  return withCache('facturas', async () => {
    try {
      const q = query(collection(db, 'Facturas'), orderBy('fechaTS', 'desc'), limit(max));
      const s = await getDocs(q);
      return s.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Error al obtener facturas', e);
      return [];
    }
  }, 5 * 60 * 1000);
};

export const obtenerFacturaPorId = async (id) => {
  try {
    const snap = await getDoc(doc(db, 'Facturas', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (e) {
    console.error('Error al obtener factura por id', e);
    return null;
  }
};

// Anular (soft-delete) factura: cambiar estado a 'anulada' y guardar auditoría
export const anularFactura = async (id, { motivo = null, usuario = null } = {}) => {
  try {
    const ref = doc(db, 'Facturas', id);
    await updateDoc(ref, {
      estado: 'anulada',
      anuladoPor: usuario || null,
      anuladoEn: serverTimestamp(),
      motivoAnulacion: motivo || null
    });
    // invalidar cache de facturas
    try { invalidateCache('facturas'); } catch (e) { /* ignore */ }
  } catch (e) {
    console.error('Error al anular factura', e);
    throw e;
  }
};


