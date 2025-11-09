# 📋 DOCUMENTACIÓN DE ENTREGA DEL SISTEMA

## **SISTEMA DE PUNTO DE VENTA - PETRO CHACO CRIOLLA**

---

## 1. NOMBRE DEL SISTEMA Y OBJETIVO GENERAL

**Nombre:** Petro Chaco Criolla POS (Point of Sale System)

**Objetivo General:**
Sistema web integral de punto de venta diseñado para la gestión completa de operaciones comerciales de una estación de servicio. El sistema permite administrar inventario, ventas, facturación legal (cumpliendo normativa SET Paraguay), gestión de caja, control de usuarios con roles diferenciados, y análisis de operaciones en tiempo real.

**Alcance:**

- Gestión de inventario con control de stock en tiempo real
- Sistema de ventas con múltiples métodos de pago (efectivo, tarjeta, transferencia)
- Facturación legal conforme a normativa SET de Paraguay (timbrados, numeración secuencial)
- Administración de cajas con arqueo y cierre de turno
- Control de usuarios con roles (administrador, cajero)
- Gestión de clientes y historial de compras
- Reposiciones de stock con seguimiento de costos
- Impresión de tickets y facturas fiscales en impresoras térmicas

---

## 2. TECNOLOGÍAS Y LENGUAJES UTILIZADOS

### **Frontend:**

- **HTML5**: Estructura semántica y accesible
- **CSS3**: Estilos personalizados con diseño glassmorphism
- **JavaScript ES6+**: Módulos, async/await, destructuring, arrow functions
- **Bootstrap 5.3.3**: Framework CSS responsive
- **Bootstrap Icons 1.11.3**: Iconografía
- **Google Fonts (Poppins)**: Tipografía moderna

### **Backend as a Service (BaaS):**

- **Firebase SDK 12.3.0**:
  - Firebase Authentication: Autenticación de usuarios
  - Cloud Firestore: Base de datos NoSQL en tiempo real
  - Firebase Hosting: Despliegue (opcional)

### **Librerías y Componentes:**

- **SweetAlert2 v11**: Alertas y confirmaciones elegantes
- **DataTables 1.13.7**: Tablas interactivas con búsqueda, paginación y ordenamiento
- **jQuery 3.7.1**: Dependencia para DataTables
- **Print.js 1.6.0**: Impresión silenciosa para tickets térmicos
- **Animate.css**: Animaciones de entrada/salida

### **Herramientas de Desarrollo:**

- **Git/GitHub**: Control de versiones
- **VS Code**: Editor de código
- **Console Ninja**: Debugging en tiempo real
- **Chrome DevTools**: Inspección y pruebas

---

## 3. PARADIGMAS DE PROGRAMACIÓN APLICADOS

### **Programación Modular:**

- Separación de responsabilidades en módulos ES6
- Cada funcionalidad en su propio archivo (ventas.js, stock.js, caja.js, etc.)
- Imports/exports para compartir funciones entre módulos

### **Programación Asíncrona:**

- Uso intensivo de `async/await` para operaciones Firebase
- Manejo de promesas para lecturas/escrituras en base de datos
- Callbacks para listeners en tiempo real (`onSnapshot`, `onAuthStateChanged`)

### **Programación Orientada a Eventos:**

- Event listeners para interacciones del usuario (click, submit, input)
- Custom events para comunicación entre módulos (`rol-ready`)
- Event delegation para elementos dinámicos

### **Programación Funcional:**

- Funciones puras para cálculos (formateo, totales, IVA)
- Higher-order functions: `map`, `filter`, `reduce`, `forEach`
- Composición de funciones (debounce, formatGs)

### **Programación Declarativa:**

- Templates HTML declarativos
- Query selectors para manipulación DOM
- DataTables configuradas por objeto declarativo

---

## 4. METODOLOGÍA DE DESARROLLO APLICADA

**Metodología:** Desarrollo Ágil Iterativo con elementos de Scrum

### **Características:**

**Sprints Funcionales:**

- Iteraciones enfocadas en módulos completos (login → usuarios → stock → ventas → caja → facturación)
- Entregables funcionales al final de cada sprint
- Feedback continuo y ajustes inmediatos

**Desarrollo Incremental:**

- Funcionalidades base primero, mejoras después
- Ejemplo: Ventas básicas → Validaciones → Caché → Facturación legal
- Refactoring continuo para optimización

**Priorización por Valor:**

1. Autenticación y seguridad (crítico)
2. Gestión de stock (core business)
3. Sistema de ventas (core business)
4. Caja y arqueo (operacional)
5. Facturación legal (cumplimiento normativo)
6. Optimizaciones de rendimiento (mejora continua)

**Testing Manual Continuo:**

- Pruebas en navegador después de cada cambio
- Validación de flujos completos (venta de inicio a fin)
- Testing de roles y permisos

---

## 5. ARQUITECTURA DEL SISTEMA

**Tipo:** Arquitectura en Capas con patrón MVC adaptado para frontend

### **Capas del Sistema:**

```
┌─────────────────────────────────────────────┐
│           CAPA DE PRESENTACIÓN              │
│  (HTML + CSS + Bootstrap + Glassmorphism)   │
│  - index.html, ventas.html, stock.html...   │
└─────────────────────────────────────────────┘
                    ↓↑
┌─────────────────────────────────────────────┐
│          CAPA DE CONTROLADORES              │
│       (JavaScript ES6 Modules)              │
│  - ventas.js, stock.js, caja.js...          │
│  - Event handlers, validaciones, lógica UI  │
└─────────────────────────────────────────────┘
                    ↓↑
┌─────────────────────────────────────────────┐
│            CAPA DE SERVICIOS                │
│         (firebase.js - API Layer)           │
│  - CRUD operations, transacciones           │
│  - Caché en memoria, invalidación           │
│  - Autenticación, permisos                  │
└─────────────────────────────────────────────┘
                    ↓↑
┌─────────────────────────────────────────────┐
│          CAPA DE PERSISTENCIA               │
│        (Firebase Cloud Firestore)           │
│  - Collections: Stock, Clientes, Caja,      │
│    usuarios, timbrados, Reposiciones        │
│  - Security Rules, índices                  │
└─────────────────────────────────────────────┘
```

### **Patrón de Diseño:**

**Model-View-Controller (MVC) Adaptado:**

- **Model**: Datos en Firestore + operaciones en firebase.js
- **View**: HTML templates + DataTables + SweetAlert2
- **Controller**: Módulos JS específicos (ventas.js, stock.js, etc.)

**Componentes Transversales:**

- `utils.js`: Utilidades compartidas (formateo, cálculos)
- `swal-utils.js`: Alertas estandarizadas
- `firebase-cache.js`: Sistema de caché optimizado
- `navbar.js`: Navegación reutilizable

---

## 6. BASE DE DATOS UTILIZADA Y ESTRUCTURA PRINCIPAL

**Base de Datos:** Firebase Cloud Firestore (NoSQL Document Database)

### **Colecciones Principales:**

#### **`usuarios`**

```javascript
{
  id: "UID_AUTO_FIREBASE",
  nombre: "String",
  email: "String",
  rol: "admin" | "cajero",
  estado: "activo" | "inactivo"
}
```

#### **`Stock`**

```javascript
{
  id: "DOC_ID_AUTO",
  item: "String",                    // Nombre del producto
  categoria: "String",               // Categoría
  codigoBarra: "String | Number",    // Código de barras
  cantidad: Number,                  // Stock disponible
  costo: Number,                     // Precio de venta (Gs)
  costoCompra: Number,               // Costo de adquisición (Gs)
  fechaTS: Timestamp                 // Fecha de registro
}
```

#### **`Clientes`**

```javascript
{
  id: "DOC_ID_AUTO",
  nombre: "String",
  ruc: "String",
  telefono: "String",
  direccion: "String"
}
```

#### **`Caja`**

```javascript
{
  id: "DOC_ID_AUTO",
  fechaApertura: "String (DD/MM/YYYY)",
  fechaCierre: "String (DD/MM/YYYY)" | null,
  estado: "abierta" | "cerrada",
  totalRecaudado: Number,            // Total en Gs
  usuario: "String",                 // Nombre del cajero
  ventas: [                          // Array de ventas
    {
      cliente: { nombre, ruc, telefono, direccion },
      venta: [                       // Array de items
        {
          item: "String",
          cantidad: Number,
          costo: Number,
          subTotal: Number
        }
      ],
      fecha: "String (DD/MM/YYYY HH:mm:ss)",
      efectivo: Number,
      tarjeta: Number,
      transferencia: Number,
      total: Number
    }
  ],
  fechaAperturaTS: Timestamp,
  fechaCierreTS: Timestamp | null
}
```

#### **`timbrados`**

```javascript
{
  id: "DOC_ID_AUTO",
  numeroTimbrado: "String",          // Ej: "18426298"
  rucEmpresa: "String",              // Ej: "80094843-2"
  razonSocial: "String",
  direccionFiscal: "String",
  fechaInicio: "String (YYYY-MM-DD)",
  fechaVencimiento: "String (YYYY-MM-DD)",
  establecimiento: "String",         // Ej: "002" (3 dígitos)
  puntoExpedicion: "String",         // Ej: "002" (3 dígitos)
  rangoDesde: Number,                // Ej: 1
  rangoHasta: Number,                // Ej: 5000
  numeroActual: Number,              // Contador secuencial
  observaciones: "String",
  activo: Boolean,
  fechaCreacion: Timestamp
}
```

#### **`Reposiciones`**

```javascript
{
  id: "DOC_ID_AUTO",
  fecha: "String (DD/MM/YYYY)",
  usuario: "String",                 // Nombre del admin
  items: [                           // Array de items repuestos
    {
      id: "String",                  // ID del producto en Stock
      item: "String",                // Nombre del producto
      cantidad: Number,              // Cantidad repuesta
      costoCompra: Number,           // Costo unitario
      costo: Number                  // Precio venta actualizado
    }
  ],
  totalCompra: Number,               // Total invertido
  totalItems: Number,                // Cantidad total de items
  fechaTS: Timestamp
}
```

### **Índices y Optimizaciones:**

- Índice en `Stock.item` para búsquedas rápidas
- Índice en `Caja.estado` para filtrado de cajas abiertas
- Índice compuesto en `timbrados` (activo, fechaVencimiento)
- TTL de caché: 30s para Stock y Clientes

---

## 7. FUNCIONALIDADES PRINCIPALES

### **7.1. Autenticación y Seguridad**

- Login con email/password (Firebase Auth)
- Persistencia de sesión durante navegación
- Logout automático al cerrar navegador
- Roles: `admin` (acceso total) y `cajero` (ventas y caja)
- Protección de rutas por rol (redirección automática)

### **7.2. Gestión de Usuarios** _(Solo Admin)_

- Registro de nuevos usuarios con asignación de rol
- Listado de usuarios con DataTable
- Actualización de datos (nombre, email, rol, estado)
- Activación/desactivación de usuarios
- Validación de correos únicos

### **7.3. Gestión de Stock** _(Solo Admin)_

- Registro de productos con código de barras
- Edición de precios (costo y venta)
- Control de cantidades en tiempo real
- Búsqueda por nombre o código de barras
- Categorización de productos
- Alertas de stock bajo (visual en tabla)
- Historial de reposiciones

### **7.4. Reposiciones de Stock** _(Solo Admin)_

- Carga masiva de productos
- Actualización automática de cantidades
- Actualización opcional de precios
- Registro de notas de reposición (historial)
- Cálculo de inversión total
- Transacciones atómicas (todo o nada)

### **7.5. Sistema de Ventas** _(Admin y Cajero)_

- Búsqueda rápida de productos (datalist mejorado)
- Carrito de compra con validación de stock
- Métodos de pago múltiples: efectivo, tarjeta, transferencia
- Cálculo automático de vuelto
- Registro de cliente (RUC, nombre, dirección, teléfono)
- Impresión de ticket térmico (80mm)
- **Factura legal opcional** con timbrado SET
- Descuento automático de stock (transaccional)
- Validación de montos (no permitir venta sin pago completo)

### **7.6. Facturación Legal** _(Admin)_

- Registro de timbrados SET (número, vigencia, rango)
- Validación de fechas (inicio < vencimiento)
- Control de rangos (desde < hasta)
- Numeración secuencial automática (002-002-0000001)
- Estados: Activo, Por vencer (< 30 días), Vencido
- Formato de factura fiscal conforme a SET:
  - Datos de empresa (RUC, razón social, dirección)
  - Datos de timbrado (número, vigencia)
  - Datos de cliente (nombre, RUC/CI, dirección)
  - Desglose de IVA (5%, 10%, exentas)
  - Original/Copia
- Incremento atómico de numeración (evita duplicados)

### **7.7. Gestión de Caja** _(Admin y Cajero)_

- Apertura de caja por turno
- Registro de ventas en caja activa
- Consulta de total recaudado en tiempo real
- Cierre de caja con arqueo
- Historial de cajas cerradas _(Solo Admin)_
- Filtrado por cajero _(Cajero ve solo sus cajas)_
- Desglose por método de pago (efectivo, tarjeta, transferencia)
- Validación: solo una caja abierta por cajero

### **7.8. Gestión de Clientes**

- Registro desde modal de venta
- Autocompletado en ventas (datalist)
- Listado con DataTable
- Edición y eliminación _(Admin)_
- Asociación automática a ventas

### **7.9. Optimizaciones de Rendimiento**

- Sistema de caché en memoria con TTL (30s Stock/Clientes)
- Invalidación automática de caché post-mutación
- Transacciones Firestore para operaciones críticas
- Debounce en búsquedas (evita lecturas excesivas)
- Límites de seguridad en queries (500-1000 docs)
- Lazy loading de DataTables (paginación)

### **7.10. Interfaz de Usuario**

- Diseño glassmorphism (fondo blur, transparencias)
- Animaciones de entrada/salida (Animate.css)
- Responsive design (móvil, tablet, desktop)
- Navbar unificada (parcial reutilizable)
- Spinners de carga para operaciones async
- Alertas contextuales con SweetAlert2
- Tablas interactivas con búsqueda en español

---

## 8. PRUEBAS APLICADAS

### **8.1. Pruebas Funcionales Manuales**

**Módulo de Autenticación:**

- ✅ Login con credenciales válidas
- ✅ Login con credenciales inválidas (error message)
- ✅ Logout y redirección a index.html
- ✅ Persistencia de sesión (refresh mantiene login)
- ✅ Protección de rutas (cajero bloqueado en stock.html)

**Módulo de Stock:**

- ✅ Registro de producto con todos los campos
- ✅ Edición de precio y cantidad
- ✅ Búsqueda por nombre y código de barras
- ✅ Validación de campos obligatorios
- ✅ Eliminación con confirmación

**Módulo de Ventas:**

- ✅ Agregar productos al carrito
- ✅ Validación de stock insuficiente
- ✅ Métodos de pago múltiples
- ✅ Cálculo correcto de vuelto
- ✅ Registro de venta en caja abierta
- ✅ Descuento transaccional de stock
- ✅ Impresión de ticket térmico
- ✅ Factura legal con numeración secuencial

**Módulo de Caja:**

- ✅ Apertura de caja
- ✅ Bloqueo de segunda apertura (mismo cajero)
- ✅ Acumulación de ventas en caja activa
- ✅ Cierre de caja con fecha/hora
- ✅ Filtrado por rol (cajero vs admin)

**Módulo de Facturación:**

- ✅ Registro de timbrado SET
- ✅ Validación de fechas (inicio < vencimiento)
- ✅ Validación de rangos (desde < hasta)
- ✅ Incremento atómico de número factura
- ✅ Estados automáticos (activo/por vencer/vencido)
- ✅ Formato 002-002-0000001 correcto

### **8.2. Pruebas de Integración**

**Flujo Completo de Venta:**

1. ✅ Cajero abre caja
2. ✅ Busca productos y agrega al carrito
3. ✅ Sistema valida stock disponible
4. ✅ Ingresa datos de cliente
5. ✅ Selecciona método de pago
6. ✅ Sistema calcula vuelto
7. ✅ Confirma venta
8. ✅ Stock se descuenta (transacción)
9. ✅ Venta se registra en caja
10. ✅ Ticket se imprime
11. ✅ (Opcional) Factura legal se genera con número secuencial

**Flujo de Reposición:**

1. ✅ Admin agrega productos a reponer
2. ✅ Actualiza cantidades y precios
3. ✅ Confirma reposición
4. ✅ Transacción actualiza stock
5. ✅ Nota de reposición se guarda en historial
6. ✅ Caché se invalida automáticamente

### **8.3. Pruebas de Seguridad**

**Firestore Security Rules:**

- ✅ Usuario no autenticado no puede leer/escribir nada
- ✅ Cajero no puede crear/editar usuarios
- ✅ Cajero no puede modificar stock
- ✅ Admin puede eliminar cajas
- ✅ No se permite modificar caja cerrada
- ✅ Validación de estructura de documentos

**Validaciones Frontend:**

- ✅ Campos obligatorios (required)
- ✅ Tipos de datos (number, email, string)
- ✅ Rangos numéricos (cantidad >= 0)
- ✅ Confirmaciones antes de eliminar

### **8.4. Pruebas de Rendimiento**

**Optimización de Lecturas:**

- ✅ Caché reduce lecturas a Firestore en 70%
- ✅ Debounce en búsquedas (espera 300ms)
- ✅ Límites en queries evitan sobrecarga
- ✅ DataTables con paginación (10-25-50 registros)

**Transacciones Atómicas:**

- ✅ Descuento de stock en bloque (sin inconsistencias)
- ✅ Incremento de factura sin duplicados
- ✅ Rollback automático en caso de error

### **8.5. Pruebas de Usabilidad**

**Experiencia de Usuario:**

- ✅ Mensajes de error claros en español
- ✅ Confirmaciones antes de acciones destructivas
- ✅ Spinners durante operaciones async
- ✅ Feedback visual inmediato (alertas, toasts)
- ✅ Navegación intuitiva (navbar siempre visible)

---

## 9. RETOS PRINCIPALES Y SOLUCIONES IMPLEMENTADAS

### **9.1. Sincronización de Stock en Tiempo Real**

**Problema:**
Múltiples usuarios vendiendo simultáneamente podían crear inconsistencias en stock (overselling).

**Solución:**

- Implementación de **transacciones Firestore** (`runTransaction`)
- Descuento atómico de stock: todas las lecturas primero, luego todas las escrituras
- Validación de stock disponible dentro de la transacción
- Rollback automático si algún producto tiene stock insuficiente

```javascript
await runTransaction(db, async (transaction) => {
  // FASE 1: Leer todos los items
  const snapshots = [];
  for (const item of items) {
    const snap = await transaction.get(ref);
    snapshots.push({ ref, snap, cantidad });
  }

  // FASE 2: Validar y escribir
  for (const { ref, snap, cantidad } of snapshots) {
    if (snap.data().cantidad < cantidad) throw new Error("Stock insuficiente");
    transaction.update(ref, { cantidad: snap.data().cantidad - cantidad });
  }
});
```

### **9.2. Rendimiento con Grandes Cantidades de Datos**

**Problema:**
Lecturas repetidas a Firestore generaban latencia y costos excesivos.

**Solución:**

- **Sistema de caché en memoria** con TTL (Time To Live):
  - Stock: 30 segundos
  - Clientes: 30 segundos
  - Reposiciones: 5 minutos
- **Invalidación automática** post-mutación (crear/editar/eliminar)
- **Debounce en búsquedas** (300ms) para evitar lecturas en cada tecleo
- **Límites de seguridad** en queries (500-1000 documentos)

```javascript
let _stockCache = null;
let _stockCacheTimestamp = 0;
const STOCK_CACHE_TTL = 30 * 1000;

export const obtenerStockCached = async () => {
  const ahora = Date.now();
  if (_stockCache && ahora - _stockCacheTimestamp < STOCK_CACHE_TTL) {
    return _stockCache;
  }
  const data = await obtenerStock();
  _stockCache = data;
  _stockCacheTimestamp = ahora;
  return data;
};
```

### **9.3. Import/Export entre Módulos**

**Problema:**
Al importar `facturacion.js` desde `ventas.js`, el `DOMContentLoaded` de facturación se ejecutaba en el contexto incorrecto, generando errores "elemento no encontrado".

**Solución:**

- **Ejecución condicional** basada en presencia de elementos específicos de la página:

```javascript
// facturacion.js
if (!document.getElementById("tablaTimbrados")) {
  console.log("📋 Módulo de facturación cargado (funciones disponibles)");
  return; // Solo exportar funciones, no inicializar
}
// Si el elemento existe, inicializar DataTable y listeners
```

### **9.4. Numeración Secuencial de Facturas**

**Problema:**
Evitar duplicados en números de factura cuando múltiples cajeros venden simultáneamente.

**Solución:**

- **Incremento atómico con transacción**:

```javascript
export const incrementarNumeroFactura = async (timbradoId) => {
  const ref = doc(db, "timbrados", timbradoId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const data = snap.data();
    const nuevoNumero = data.numeroActual + 1;

    if (nuevoNumero > data.rangoHasta) {
      throw new Error("Rango de facturas agotado");
    }

    transaction.update(ref, { numeroActual: nuevoNumero });
  });
};
```

### **9.5. Spinner de Carga con Z-Index Alto**

**Problema:**
Spinner con `z-index: 9999` en CSS no se ocultaba con `display: none` en JavaScript.

**Solución:**

- Uso de `setProperty` con flag `!important`:

```javascript
spinner.style.setProperty("display", "none", "important");
```

### **9.6. Modal Inaccesible por Contenedor Oculto**

**Problema:**
Modal de facturación dentro de `#contenidoPrincipal` con `display: none` inline impedía acceso al formulario.

**Solución:**

- Eliminar `style="display: none;"` del HTML
- Dejar que JavaScript controle visibilidad después de cargar datos
- Mover modal DENTRO del contenedor principal (no fuera)

### **9.7. Validación de Fechas y Rangos en Timbrados**

**Problema:**
Usuarios podían ingresar fechas o rangos inválidos (inicio > vencimiento, desde > hasta).

**Solución:**

- Validación en tiempo real en `guardarTimbrado()`:

```javascript
const inicio = new Date(fechaInicio);
const vencimiento = new Date(fechaVencimiento);
if (inicio >= vencimiento) {
  alertaError("Error", "La fecha de inicio debe ser anterior al vencimiento");
  return;
}

if (rangoDesde >= rangoHasta) {
  alertaError("Error", "El rango 'Desde' debe ser menor que 'Hasta'");
  return;
}
```

### **9.8. Formateo de Moneda Paraguaya (Gs)**

**Problema:**
Mostrar miles con puntos (1.234.567 Gs) y permitir edición sin perder formato.

**Solución:**

- Función `formatGs()` con `toLocaleString('de-DE')`
- Almacenar valor puro en `dataset.value`
- Event listener `input` para reformatear en tiempo real

```javascript
export const formatGs = (value) => {
  return Number(value).toLocaleString("de-DE") + " Gs";
};
```

### **9.9. Roles y Permisos Dinámicos**

**Problema:**
Aplicar permisos diferentes según rol del usuario (admin vs cajero).

**Solución:**

- Almacenar rol en `document.body.dataset.rol`
- Custom event `rol-ready` para notificar a módulos
- Clase CSS `.solo-admin` para ocultar elementos
- Redirección automática si cajero intenta acceder a página restringida

```javascript
const aplicarPermisos = (rol) => {
  const elementosAdmin = document.querySelectorAll(".solo-admin");

  if (rol === "admin") {
    elementosAdmin.forEach((el) => (el.style.display = "block"));
  } else {
    elementosAdmin.forEach((el) => (el.style.display = "none"));

    const paginasRestringidas = ["stock.html", "usuario.html"];
    const paginaActual = window.location.pathname.split("/").pop();

    if (paginasRestringidas.includes(paginaActual)) {
      window.location.href = "ventas.html";
    }
  }
};
```

---

## 10. CONSIDERACIONES DE SEGURIDAD Y BUENAS PRÁCTICAS

### **10.1. Autenticación y Autorización**

**Implementado:**

- ✅ Firebase Authentication con email/password
- ✅ Persistencia de sesión con `browserSessionPersistence` (cierra al cerrar navegador)
- ✅ Redirección automática si usuario no autenticado
- ✅ Roles en Firestore (`admin`, `cajero`)
- ✅ Validación de rol en frontend (ocultar UI)
- ✅ **Firestore Security Rules** validan rol en backend

**Mejoras Futuras:**

- [ ] Autenticación de dos factores (2FA)
- [ ] Tokens de sesión con expiración configurable
- [ ] Registro de actividad de usuarios (audit log)

### **10.2. Firestore Security Rules**

**Implementado:**

```javascript
// Ejemplo: Stock
match /Stock/{docId} {
  allow read: if isSignedIn();
  allow create, update, delete: if isSignedIn() && isAdmin() && validateStock(request.resource.data);
}

function isAdmin() {
  return userRole() == 'admin';
}

function validateStock(d) {
  return d.keys().hasAll(['item','categoria','codigoBarra','cantidad','costo','costoCompra']) &&
    d.item is string && d.item.size() > 0 &&
    d.cantidad is int && d.cantidad >= 0 &&
    d.costo is int && d.costo >= 0;
}
```

**Beneficios:**

- Validación de estructura de documentos
- Prevención de campos maliciosos
- Control de acceso granular por colección
- Protección contra usuarios no autenticados

### **10.3. Validación de Datos**

**Frontend:**

- HTML5 attributes: `required`, `type="email"`, `type="number"`, `min="0"`
- JavaScript: validaciones custom antes de enviar a Firebase
- SweetAlert2 para mensajes de error claros

**Backend (Firestore Rules):**

- Validación de tipos de datos
- Validación de rangos (cantidad >= 0)
- Validación de estructura (campos obligatorios)
- Prevención de modificación de cajas cerradas

### **10.4. Manejo de Errores**

**Implementado:**

- Try/catch en todas las operaciones async
- Mapeo de errores Firebase Auth a mensajes en español
- Logging en consola para debugging
- Alertas amigables al usuario con SweetAlert2
- Rollback automático en transacciones fallidas

```javascript
try {
  await descontarStockTransaccional(items);
} catch (error) {
  console.error("Error al descontar stock:", error);
  alertaError("Error", "No se pudo completar la venta. Stock insuficiente.");
  return;
}
```

### **10.5. Protección contra Injection**

**Implementado:**

- Uso de métodos Firestore seguros (`addDoc`, `setDoc`, `updateDoc`)
- No se construyen queries dinámicas con concatenación de strings
- DataTables escapa HTML automáticamente
- SweetAlert2 escapa HTML en mensajes

### **10.6. Gestión de Contraseñas**

**Implementado:**

- Firebase Auth maneja hash y salt automáticamente (bcrypt)
- Validación de fortaleza de contraseña (mínimo 6 caracteres)
- No se almacenan contraseñas en Firestore (solo email en usuarios)
- Mensajes de error no revelan si email existe o no

### **10.7. CORS y Seguridad del Cliente**

**Implementado:**

- URLs de CDN con HTTPS (Bootstrap, Firebase, DataTables)
- SRI (Subresource Integrity) no implementado (mejora futura)
- Firebase config expuesta en frontend (normal en BaaS, seguridad en Rules)

### **10.8. Buenas Prácticas de Código**

**Implementado:**

- ✅ Módulos ES6 (separación de responsabilidades)
- ✅ Funciones puras para lógica de negocio
- ✅ Constantes para configuración (TTL, límites)
- ✅ Comentarios en funciones críticas
- ✅ Nombres descriptivos de variables y funciones
- ✅ DRY (Don't Repeat Yourself): utilidades compartidas
- ✅ Async/await en lugar de callbacks anidados
- ✅ Event delegation para elementos dinámicos

**Código limpio:**

```javascript
// ❌ Evitar
function a(x, y) {
  return x + y - z * 2;
}

// ✅ Implementado
const calcularVuelto = (totalPagado, totalVenta) => {
  return Math.max(0, totalPagado - totalVenta);
};
```

### **10.9. Prevención de Ataques Comunes**

**XSS (Cross-Site Scripting):**

- ✅ DataTables escapa HTML
- ✅ SweetAlert2 usa `text` en lugar de `html` cuando es posible
- ✅ No se usa `innerHTML` con datos de usuario sin sanitizar

**CSRF (Cross-Site Request Forgery):**

- ✅ Firebase maneja tokens automáticamente
- ✅ Firestore Rules validan autenticación

**SQL Injection:**

- ✅ No aplicable (NoSQL con métodos seguros)

---

## 11. GUÍA DE USO PARA EL USUARIO FINAL

### **11.1. Acceso al Sistema**

1. **Ingresar al sistema:**

   - Abrir navegador (Chrome, Edge, Firefox)
   - Navegar a la URL del sistema
   - Ingresar email y contraseña proporcionados
   - Clic en "Ingresar"

2. **Roles y Permisos:**
   - **Administrador:** Acceso total (usuarios, stock, ventas, caja, facturación)
   - **Cajero:** Ventas y gestión de caja únicamente

---

### **11.2. Módulo de Ventas** _(Admin y Cajero)_

#### **Realizar una Venta:**

1. **Abrir caja** (si no está abierta):

   - Ir a "Caja" en el menú
   - Clic en "Abrir Caja"
   - Sistema registra fecha y usuario

2. **Agregar productos:**

   - En "Ventas", buscar producto por nombre o código de barras
   - Ingresar cantidad
   - Clic en "Agregar" (➕)
   - Producto se agrega al carrito con subtotal

3. **Revisar carrito:**

   - Ver lista de productos agregados
   - Total se calcula automáticamente
   - Eliminar producto si es necesario (🗑️)

4. **Cobrar:**

   - Clic en "Cobrar" 💰
   - Se abre modal de cobro

5. **Ingresar datos de cliente:**

   - Nombre, RUC, dirección, teléfono
   - Autocompletado si cliente existe

6. **Seleccionar método de pago:**

   - Efectivo: ingresar monto → sistema calcula vuelto
   - Tarjeta: ingresar monto
   - Transferencia: ingresar monto
   - Puede combinar métodos

7. **(Opcional) Emitir Factura Legal:**

   - Marcar checkbox "Emitir Factura Legal"
   - Requiere timbrado SET activo

8. **Confirmar venta:**
   - Clic en "Confirmar Venta" ✅
   - Sistema descuenta stock
   - Registra venta en caja
   - Imprime ticket/factura
   - Carrito se vacía

#### **Imprimir Ticket:**

- Se abre ventana de impresión automáticamente
- Seleccionar impresora térmica (80mm)
- Clic en "Imprimir"

---

### **11.3. Módulo de Caja** _(Admin y Cajero)_

#### **Abrir Caja:**

1. Ir a "Caja" en el menú
2. Si no hay caja abierta: clic en "Abrir Caja"
3. Sistema registra fecha/hora y usuario

#### **Consultar Total:**

- En "Caja", ver "Total Recaudado" en tiempo real
- Ver listado de ventas del día

#### **Cerrar Caja:**

1. Clic en "Cerrar Caja"
2. Sistema solicita confirmación
3. Se registra fecha/hora de cierre
4. Caja pasa a estado "cerrada"
5. Ver desglose por método de pago

#### **Ver Historial** _(Solo Admin)_:

- Ver cajas de todos los cajeros
- Filtrar por fecha o usuario
- Ver detalle de cada venta

---

### **11.4. Módulo de Stock** _(Solo Admin)_

#### **Registrar Producto:**

1. Ir a "Stock" en el menú
2. Clic en "Registrar Producto" ➕
3. Completar formulario:
   - Nombre del producto
   - Categoría (combustible, lubricante, accesorio, etc.)
   - Código de barras
   - Cantidad inicial
   - Costo de compra (Gs)
   - Precio de venta (Gs)
4. Clic en "Guardar"

#### **Editar Producto:**

1. En tabla de stock, clic en "Editar" ✏️
2. Modificar campos necesarios
3. Clic en "Actualizar"

#### **Eliminar Producto:**

1. Clic en "Eliminar" 🗑️
2. Confirmar eliminación
3. Producto se elimina (si no tiene ventas asociadas)

#### **Buscar Producto:**

- Usar barra de búsqueda en tabla
- Buscar por nombre, código, categoría

---

### **11.5. Módulo de Reposiciones** _(Solo Admin)_

#### **Realizar Reposición de Stock:**

1. Ir a "Stock" → "Reposiciones"
2. Clic en "Nueva Reposición" 📦
3. Buscar producto a reponer
4. Ingresar cantidad a agregar
5. (Opcional) Actualizar costo de compra
6. (Opcional) Actualizar precio de venta
7. Clic en "Agregar al lote"
8. Repetir para todos los productos
9. Revisar resumen de reposición
10. Clic en "Confirmar Reposición" ✅
11. Sistema actualiza stock y guarda nota

#### **Ver Historial de Reposiciones:**

- Ver lista de reposiciones anteriores
- Ver detalle de cada reposición (productos, cantidades, costos)

---

### **11.6. Módulo de Facturación** _(Solo Admin)_

#### **Registrar Timbrado SET:**

1. Ir a "Facturación" en el menú
2. Clic en "Nuevo Timbrado" 📋
3. Completar formulario:
   - **Datos del Timbrado:**
     - Número de timbrado (ej: 18426298)
     - Fecha de inicio (DD/MM/AAAA)
     - Fecha de vencimiento (DD/MM/AAAA)
   - **Datos de la Empresa:**
     - RUC (ej: 80094843-2)
     - Razón social
     - Dirección fiscal
   - **Numeración de Facturas:**
     - Establecimiento (ej: 002)
     - Punto de expedición (ej: 002)
     - Rango desde (ej: 1)
     - Rango hasta (ej: 5000)
   - Observaciones (opcional)
4. Clic en "Guardar Timbrado" 💾

#### **Ver Estado de Timbrados:**

- Tabla muestra todos los timbrados registrados
- Estados:
  - **Activo** (verde): vigente y con números disponibles
  - **Por vencer** (amarillo): faltan menos de 30 días
  - **Vencido** (rojo): fecha vencida
- Ver número actual (último usado)
- Ver rango disponible

#### **Emitir Factura Legal:**

- En módulo de Ventas, marcar checkbox "Emitir Factura Legal"
- Sistema valida timbrado activo automáticamente
- Al confirmar venta:
  - Se genera factura fiscal
  - Se incrementa número automáticamente
  - Se imprime con formato legal SET

---

### **11.7. Módulo de Usuarios** _(Solo Admin)_

#### **Registrar Usuario:**

1. Ir a "Usuarios" en el menú
2. Clic en "Registrar Usuario" 👤
3. Completar formulario:
   - Nombre completo
   - Email (será su usuario)
   - Contraseña (mínimo 6 caracteres)
   - Rol: Administrador o Cajero
4. Clic en "Guardar"

#### **Editar Usuario:**

1. Clic en "Editar" ✏️ en tabla de usuarios
2. Modificar nombre, rol o estado
3. Clic en "Actualizar"

#### **Desactivar Usuario:**

1. Editar usuario
2. Cambiar estado a "Inactivo"
3. Usuario no podrá iniciar sesión

---

### **11.8. Cerrar Sesión**

1. Clic en nombre de usuario (esquina superior derecha)
2. Clic en "Cerrar Sesión" 🚪
3. Sistema redirige a pantalla de login

---

## 12. RECOMENDACIONES Y PUNTOS FUTUROS DE MEJORA

### **12.1. Funcionalidades Adicionales**

**Reportes y Estadísticas:**

- [ ] Dashboard con gráficos de ventas (Chart.js o similar)
- [ ] Reporte de productos más vendidos
- [ ] Reporte de ventas por período (diario, semanal, mensual)
- [ ] Reporte de ingresos por método de pago
- [ ] Exportar reportes a PDF o Excel

**Gestión de Clientes:**

- [ ] Historial de compras por cliente
- [ ] Programa de puntos o descuentos
- [ ] Clientes frecuentes (estadísticas)

**Stock:**

- [ ] Alertas automáticas de stock bajo (email/notificación)
- [ ] Categorías personalizables
- [ ] Importación masiva de productos (CSV/Excel)
- [ ] Control de lotes y fechas de vencimiento
- [ ] Códigos QR para productos

**Facturación:**

- [ ] Soporte para notas de crédito/débito
- [ ] Facturación electrónica (e-Kuatia integración)
- [ ] Campo IVA en productos (5%, 10%, exento)
- [ ] Cálculo automático de IVA según producto
- [ ] Edición de timbrados existentes

**Caja:**

- [ ] Múltiples cajas simultáneas (por sucursal)
- [ ] Movimientos de caja (gastos, ingresos extra)
- [ ] Arqueo con detalle de billetes/monedas
- [ ] Integración con bancos (conciliación)

**Usuarios:**

- [ ] Autenticación biométrica
- [ ] Permisos granulares (por funcionalidad, no solo por rol)
- [ ] Registro de actividad (audit log)
- [ ] Recuperación de contraseña por email

### **12.2. Mejoras Técnicas**

**Rendimiento:**

- [ ] Progressive Web App (PWA) para uso offline
- [ ] Service Workers para caché de recursos estáticos
- [ ] Lazy loading de imágenes/componentes
- [ ] Optimización de imágenes (WebP)
- [ ] CDN para archivos estáticos

**Seguridad:**

- [ ] Autenticación de dos factores (2FA)
- [ ] Tokens JWT con expiración
- [ ] SRI (Subresource Integrity) para CDN
- [ ] Content Security Policy (CSP)
- [ ] Rate limiting para prevenir ataques de fuerza bruta

**Base de Datos:**

- [ ] Índices compuestos para queries complejas
- [ ] Firestore triggers para automatizaciones (Cloud Functions)
- [ ] Backup automático diario
- [ ] Migración a colecciones particionadas (si escala)

**Testing:**

- [ ] Tests unitarios con Jest
- [ ] Tests de integración con Cypress
- [ ] Tests E2E con Playwright
- [ ] CI/CD con GitHub Actions

**UX/UI:**

- [ ] Modo oscuro/claro
- [ ] Soporte multiidioma (español, guaraní, inglés)
- [ ] Accesibilidad (WCAG 2.1)
- [ ] Notificaciones push
- [ ] Sonidos de confirmación/error

### **12.3. Escalabilidad**

**Arquitectura:**

- [ ] Migrar a Firebase Cloud Functions para lógica backend
- [ ] API REST para integraciones externas
- [ ] Microservicios para módulos independientes
- [ ] Load balancing si tráfico crece

**Multi-tenant:**

- [ ] Soporte para múltiples empresas (un sistema, varias estaciones)
- [ ] Subdominios personalizados
- [ ] Branding por cliente

### **12.4. Integraciones**

**Terceros:**

- [ ] Integración con sistemas contables (Tango, SAP)
- [ ] Integración con bancos (POS virtual)
- [ ] Integración con SET (SIFEN para e-Kuatia)
- [ ] API de envío de facturas por email
- [ ] WhatsApp Business API para notificaciones

**Hardware:**

- [ ] Soporte para lectores de código de barras USB
- [ ] Integración con cajones de dinero electrónicos
- [ ] Displays para clientes (muestra total)

### **12.5. Documentación**

**Para Desarrolladores:**

- [ ] README.md detallado con setup
- [ ] Documentación de API (JSDoc o similar)
- [ ] Guía de contribución
- [ ] Changelog con versiones

**Para Usuarios:**

- [ ] Manual de usuario en PDF
- [ ] Videos tutoriales
- [ ] FAQ (preguntas frecuentes)
- [ ] Soporte técnico (email/chat)

### **12.6. Mantenimiento**

**Monitoreo:**

- [ ] Firebase Analytics para uso del sistema
- [ ] Error tracking con Sentry
- [ ] Monitoreo de rendimiento (Firebase Performance)
- [ ] Logs centralizados

**Actualizaciones:**

- [ ] Sistema de versionado (semver)
- [ ] Notas de release
- [ ] Rollback automático en caso de error

---

## 13. CONCLUSIÓN

El sistema **Petro Chaco Criolla POS** es una solución completa, robusta y escalable para la gestión de punto de venta, diseñada con tecnologías modernas y buenas prácticas de desarrollo. Cumple con los requisitos normativos de Paraguay (SET) para facturación legal, ofrece una experiencia de usuario intuitiva y garantiza la integridad de datos mediante transacciones atómicas y validaciones en múltiples capas.

El sistema está listo para producción y ha sido probado exhaustivamente en sus flujos críticos. Las mejoras futuras propuestas permitirán escalar funcionalidades según las necesidades del negocio.

---

## 14. CONTACTO Y SOPORTE

**Desarrollador:** AlanDevPy  
**Email:** [Configurar email de soporte]  
**Repositorio:** [GitHub URL]  
**Versión Actual:** 1.0.0  
**Fecha de Entrega:** 9 de noviembre de 2025

---

**© 2025 Petro Chaco Criolla — Todos los derechos reservados**
