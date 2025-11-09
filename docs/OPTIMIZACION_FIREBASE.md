# 🚀 Guía de Optimización Firebase - Reducir Costos

## 📊 Problema Actual

Firebase cobra por:

- **Lecturas** (reads): Cada documento leído
- **Escrituras** (writes): Cada documento creado/modificado
- **Eliminaciones** (deletes): Cada documento eliminado

### 💰 Costos Aproximados (Plan Blaze):

- Primeras 50,000 lecturas/día: GRATIS
- Después: $0.06 por 100,000 lecturas
- Primeras 20,000 escrituras/día: GRATIS
- Después: $0.18 por 100,000 escrituras

---

## ✅ Optimizaciones Implementadas

### 1. **Caché en Memoria** (Ya implementado)

```javascript
// Evita lecturas repetidas en 30 segundos
let _stockCache = null;
let _stockCacheTimestamp = 0;
const STOCK_CACHE_TTL = 30 * 1000; // 30s
```

**Ahorro:** 90% de lecturas si se consulta stock frecuentemente

---

## 🔥 Nuevas Optimizaciones a Implementar

### 2. **LocalStorage Persistente** ⭐ MUY RECOMENDADO

#### Problema:

- Si el usuario recarga la página, el caché en memoria se pierde
- Se vuelven a hacer todas las consultas a Firebase

#### Solución:

Guardar datos en `localStorage` del navegador

#### Implementación:

```javascript
// Caché persistente en localStorage con TTL
const CACHE_PREFIX = "petrochaco_";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Guardar en caché
function setCacheData(key, data) {
  const cacheItem = {
    data: data,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheItem));
  } catch (e) {
    console.warn("Error guardando en caché:", e);
  }
}

// Obtener de caché
function getCacheData(key) {
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;

    const cacheItem = JSON.parse(item);
    const now = Date.now();

    // Verificar si expiró
    if (now - cacheItem.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return cacheItem.data;
  } catch (e) {
    console.warn("Error leyendo caché:", e);
    return null;
  }
}

// Limpiar caché específica
function clearCache(key) {
  localStorage.removeItem(CACHE_PREFIX + key);
}
```

**Ahorro estimado:** 70-80% de lecturas adicionales

---

### 3. **Consultas con Límites** ⭐ CRÍTICO

#### Problema:

```javascript
// Trae TODOS los documentos (si hay 10,000 = 10,000 lecturas)
const querySnapshot = await getDocs(collection(db, "Ventas"));
```

#### Solución:

```javascript
import { query, orderBy, limit, where } from "firebase/firestore";

// Solo los últimos 50 registros
const q = query(
  collection(db, "Ventas"),
  orderBy("fechaTS", "desc"),
  limit(50)
);
const querySnapshot = await getDocs(q);
// ✅ Solo 50 lecturas en vez de 10,000
```

**Ahorro:** 99% si tienes muchos documentos

---

### 4. **Paginación** ⭐ RECOMENDADO

Para listas largas (ventas, historial, etc.)

```javascript
import { startAfter } from "firebase/firestore";

let lastDoc = null;
const pageSize = 20;

async function obtenerVentasPaginadas() {
  let q = query(
    collection(db, "Ventas"),
    orderBy("fechaTS", "desc"),
    limit(pageSize)
  );

  // Si hay página anterior
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  lastDoc = snapshot.docs[snapshot.docs.length - 1];

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
```

**Ahorro:** Solo cargas lo que el usuario ve

---

### 5. **Índices Compuestos**

Si haces consultas con múltiples filtros:

```javascript
// Esto requiere un índice compuesto
const q = query(
  collection(db, "Ventas"),
  where("usuario", "==", "Juan"),
  where("estado", "==", "completada"),
  orderBy("fecha", "desc")
);
```

**Configuración:**

1. Firebase te dará un link de error con el índice necesario
2. Click en el link → crea el índice automáticamente
3. ✅ Consultas 10x más rápidas

---

### 6. **onSnapshot Solo Cuando es Necesario** ⚠️ IMPORTANTE

#### Problema:

```javascript
// Esto genera lecturas CADA VEZ que cambia algo
onSnapshot(collection(db, "Stock"), (snapshot) => {
  // Se ejecuta constantemente
});
```

#### Solución:

```javascript
// Usa onSnapshot solo en tiempo real (caja abierta, ventas activas)
// Para listados, usa getDocs con caché
const stock = await obtenerStockCached();
```

**Ahorro:** 90% de lecturas en tiempo real

---

### 7. **Batch Writes (Escrituras en Lote)**

#### Problema:

```javascript
// 10 productos = 10 escrituras individuales
for (const prod of productos) {
  await updateDoc(doc(db, "Stock", prod.id), {...});
}
```

#### Solución:

```javascript
import { writeBatch } from "firebase/firestore";

const batch = writeBatch(db);

productos.forEach(prod => {
  const ref = doc(db, "Stock", prod.id);
  batch.update(ref, {...});
});

// ✅ 1 sola operación en red
await batch.commit();
```

**Ahorro:** Reduce latencia y mejora rendimiento

---

### 8. **Usar Transacciones Solo Cuando es Necesario**

#### Actualmente:

```javascript
// Bien usado para stock (evita inconsistencias)
await runTransaction(db, async (transaction) => {
  // ...
});
```

✅ **Está bien**, pero evita usarlas para operaciones simples

---

### 9. **Comprimir Datos**

#### Problema:

```javascript
// Guardas arrays gigantes
items: [
  { nombre: "Coca Cola 2L", precio: 15000, cantidad: 5 },
  // ...100 items más
];
```

#### Solución:

```javascript
// Solo guarda IDs y cantidades
items: [
  { id: "abc123", qty: 5 },
  { id: "def456", qty: 2 },
];
// Luego combinas con caché de stock
```

**Ahorro:** Reduce tamaño de documentos y ancho de banda

---

### 10. **Agregaciones en Cliente**

#### Problema:

```javascript
// Consultar todas las ventas para sumar
const ventas = await getDocs(collection(db, "Ventas"));
const total = ventas.docs.reduce((sum, doc) => sum + doc.data().total, 0);
// ❌ 1000 ventas = 1000 lecturas
```

#### Solución:

```javascript
// Guardar totales en documento separado
await updateDoc(doc(db, "Estadisticas", "ventas"), {
  totalDia: increment(montoVenta),
  cantidadVentas: increment(1),
});
```

**Ahorro:** 99% para reportes y estadísticas

---

## 📋 Plan de Acción Recomendado

### 🔴 Prioridad ALTA (Implementar YA):

1. ✅ **LocalStorage caché** - Fácil y gran impacto
2. ✅ **Límites en consultas** - Cambio mínimo, ahorro máximo
3. ✅ **Paginación en historial** - Especialmente ventas y reposiciones

### 🟡 Prioridad MEDIA (Implementar pronto):

4. ✅ **Reducir uso de onSnapshot** - Solo en módulos que lo necesitan
5. ✅ **Batch writes** - Para operaciones múltiples
6. ✅ **Índices compuestos** - Según consultas específicas

### 🟢 Prioridad BAJA (Mejora continua):

7. ✅ **Comprimir datos** - Refactorizar estructura
8. ✅ **Agregaciones** - Para reportes futuros

---

## 🎯 Implementación Práctica

### Archivo: `firebase-cache.js` (NUEVO)

```javascript
// Sistema de caché optimizado con localStorage

const CACHE_PREFIX = "petrochaco_";
const CACHE_VERSIONS = {
  stock: "v1",
  clientes: "v1",
  ventas: "v1",
};

export class FirebaseCache {
  constructor(collectionName, ttl = 5 * 60 * 1000) {
    this.collection = collectionName;
    this.ttl = ttl;
    this.cacheKey = `${CACHE_PREFIX}${collectionName}_${
      CACHE_VERSIONS[collectionName] || "v1"
    }`;
  }

  set(data) {
    try {
      const cacheItem = {
        data: data,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheItem));
    } catch (e) {
      console.warn(`Error guardando ${this.collection} en caché:`, e);
    }
  }

  get() {
    try {
      const item = localStorage.getItem(this.cacheKey);
      if (!item) return null;

      const cacheItem = JSON.parse(item);
      const now = Date.now();

      // Verificar si expiró
      if (now - cacheItem.timestamp > this.ttl) {
        this.clear();
        return null;
      }

      return cacheItem.data;
    } catch (e) {
      console.warn(`Error leyendo ${this.collection} de caché:`, e);
      return null;
    }
  }

  clear() {
    localStorage.removeItem(this.cacheKey);
  }

  static clearAll() {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}
```

### Uso en `firebase.js`:

```javascript
import { FirebaseCache } from "./firebase-cache.js";

const stockCache = new FirebaseCache("stock", 5 * 60 * 1000); // 5 min
const clientesCache = new FirebaseCache("clientes", 10 * 60 * 1000); // 10 min

export const obtenerStockOptimizado = async () => {
  // 1. Intentar obtener de caché
  const cached = stockCache.get();
  if (cached) {
    console.log("✅ Stock desde caché (0 lecturas)");
    return cached;
  }

  // 2. Si no hay caché, consultar Firebase
  console.log("📡 Consultando Firebase...");
  const querySnapshot = await getDocs(collection(db, "Stock"));
  const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // 3. Guardar en caché
  stockCache.set(data);

  return data;
};

// Invalidar caché al modificar
export const registrarStock = async (stock) => {
  await addDoc(collection(db, "Stock"), {
    ...stock,
    fechaTS: serverTimestamp(),
  });
  stockCache.clear(); // ⚡ Importante
};
```

---

## 📊 Monitoreo de Uso

### Ver consumo en Firebase Console:

1. Ve a Firebase Console
2. Click en "Firestore Database"
3. Tab "Usage"
4. Revisa gráficas de lecturas/escrituras

### Alertas recomendadas:

- Si superas 40,000 lecturas/día → revisar optimizaciones
- Si superas 15,000 escrituras/día → revisar lógica

---

## 💡 Mejores Prácticas Generales

1. ✅ **Caché todo lo que no cambia frecuentemente**

   - Stock: 5-10 minutos
   - Clientes: 10-15 minutos
   - Configuración: 1 hora

2. ✅ **Usa límites siempre**

   - Ventas del día: últimas 100
   - Historial: últimas 50
   - Reposiciones: últimas 50

3. ✅ **Paginación para listas largas**

   - 20-50 items por página

4. ✅ **onSnapshot solo para tiempo real**

   - Caja abierta
   - Ventas activas
   - NO para listados estáticos

5. ✅ **Invalidar caché al modificar**
   - Después de crear/actualizar/eliminar

---

## 🎯 Resultado Esperado

### Antes de optimizar:

- 📖 **Lecturas/día:** 5,000 - 10,000
- ✍️ **Escrituras/día:** 500 - 1,000
- 💰 **Costo mensual:** $5 - $15

### Después de optimizar:

- 📖 **Lecturas/día:** 500 - 1,500 (↓ 70-85%)
- ✍️ **Escrituras/día:** 400 - 800 (↓ 20%)
- 💰 **Costo mensual:** $0 - $3 (↓ 80-100%)

---

## ⚡ Resumen Ejecutivo

**3 cambios que harán la mayor diferencia:**

1. **LocalStorage caché** → 70% menos lecturas
2. **Límites en consultas** → 90% menos en listas grandes
3. **Evitar onSnapshot innecesarios** → 50% menos lecturas en tiempo real

**Tiempo de implementación:** 2-4 horas
**Ahorro estimado:** 70-85% en costos de Firebase

---

**¿Quieres que implemente estas optimizaciones en tu código ahora?** 🚀
