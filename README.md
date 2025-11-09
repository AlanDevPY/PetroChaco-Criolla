# 🍔 Sistema POS - Petro Chaco Criolla

## 📋 Índice

- [Descripción General](#-descripción-general)
- [Características Principales](#-características-principales)
- [Módulos del Sistema](#-módulos-del-sistema)
- [Actualizaciones Recientes](#-actualizaciones-recientes)
- [Requisitos Técnicos](#-requisitos-técnicos)
- [Guía de Uso](#-guía-de-uso)
- [Sistema de Roles](#-sistema-de-roles)
- [Soporte Técnico](#-soporte-técnico)

---

## 🎯 Descripción General

**Petro Chaco Criolla POS** es un sistema completo de punto de venta diseñado específicamente para restaurantes y negocios gastronómicos. El sistema permite gestionar ventas, inventario, facturación, control de caja y usuarios de manera eficiente y profesional.

### ✨ Ventajas del Sistema

- ✅ **100% en la nube** - Accesible desde cualquier dispositivo con internet
- ✅ **Tiempo real** - Todos los cambios se sincronizan automáticamente
- ✅ **Seguro** - Sistema de autenticación y roles de usuario
- ✅ **Rápido** - Interfaz optimizada para ventas ágiles
- ✅ **Completo** - Gestión integral del negocio desde un solo lugar

---

## 🚀 Características Principales

### 💰 Sistema de Ventas

- Interfaz intuitiva tipo calculadora para registro rápido de ventas
- Búsqueda rápida de productos por nombre o código de barras
- Cálculo automático de totales y cambio
- Registro de cliente (opcional)
- Generación automática de tickets de venta
- Historial completo de transacciones

### 📦 Gestión de Stock

- Control de inventario en tiempo real
- **Notas de Reposición inteligentes** (actualización más reciente)
- Actualización simultánea de cantidades y precios
- Categorización de productos
- Códigos de barras
- Alertas de stock bajo
- Historial de reposiciones

### 🧾 Facturación

- Creación de facturas profesionales
- Asignación de facturas a clientes
- Registro de pagos
- Control de facturas pendientes y pagadas
- Reportes de facturación

### 💵 Control de Caja

- Apertura y cierre de caja
- Registro de ingresos y egresos
- Cortes de caja parciales y finales
- Impresión de tickets de corte
- Conciliación automática
- Historial de movimientos

### 👥 Gestión de Usuarios

- Sistema de roles (Admin / Empleado)
- Control de acceso por funcionalidad
- Registro de actividad por usuario
- Perfiles personalizados

### 👨‍💼 Gestión de Clientes

- Registro de clientes
- Historial de compras por cliente
- Datos de contacto y ubicación
- Vinculación automática con ventas

---

## 📱 Módulos del Sistema

### 1. **Ventas** (`ventas.html`)

**Funcionalidad principal del sistema**

- Pantalla de punto de venta con diseño intuitivo
- Calculadora integrada para montos
- Búsqueda rápida de productos
- Carrito de compra visual
- Generación de tickets
- Registro opcional de cliente

**Acceso:** Todos los usuarios

---

### 2. **Gestión de Stock** (`stock.html`)

**Control completo del inventario**

#### Características:

- **Agregar Productos Nuevos**

  - Nombre del producto
  - Categoría (11 categorías disponibles)
  - Stock inicial
  - Precio de compra
  - Precio de venta
  - Código de barras

- **Actualizar Productos Existentes**

  - Modificación de precio de venta
  - Los precios de compra se actualizan mediante reposiciones

- **⭐ Sistema de Reposición (Actualización Reciente)**

  - Creación de notas de reposición
  - Agregar múltiples productos a la nota
  - **Actualización automática de precios** al reponer
  - El sistema autocompleta los precios actuales
  - Modificación opcional de precios antes de confirmar
  - Historial completo de todas las reposiciones
  - Cálculo automático del total de compra

- **Tabla de Productos**
  - Vista completa del inventario
  - Información de stock en tiempo real
  - Precios de compra y venta
  - Acciones rápidas (editar/eliminar)

**Acceso:** Solo administradores

---

### 3. **Facturación** (`facturacion.html`)

**Gestión de facturas y cobros**

- Creación de facturas manuales
- Asignación a clientes
- Control de estado (pendiente/pagada)
- Registro de fechas de pago
- Montos y detalles

**Acceso:** Solo administradores

---

### 4. **Control de Caja** (`caja.html`)

**Gestión del efectivo del negocio**

#### Funciones:

- **Apertura de Caja**

  - Registro de monto inicial
  - Fecha y hora automática
  - Usuario responsable

- **Movimientos**

  - Registro automático de ventas
  - Ingresos adicionales
  - Egresos (gastos)
  - Categorización de movimientos

- **Cierre de Caja**
  - Corte parcial o final
  - Cálculo automático de totales
  - Conciliación (esperado vs real)
  - Impresión de ticket de cierre

**Acceso:** Todos los usuarios

---

### 5. **Gestión de Usuarios** (`usuario.html`)

**Administración del personal**

- Registro de nuevos usuarios
- Asignación de roles
- Activación/desactivación de cuentas
- Control de acceso por módulo

**Acceso:** Solo administradores

---

## 🆕 Actualizaciones Recientes

### ✅ Versión 2.1 - Sistema de Reposición Mejorado (Noviembre 2024)

#### Problema Resuelto:

Anteriormente, cuando se hacía una reposición de stock, solo se podía agregar cantidad. Si los precios habían cambiado, había que actualizar cada producto manualmente uno por uno, lo cual era muy tedioso.

#### Solución Implementada:

**Sistema de Reposición Inteligente con Actualización de Precios**

1. **Auto-completado de Precios**

   - Al seleccionar un producto, el sistema carga automáticamente los precios actuales
   - Permite ver y comparar los precios antes de modificarlos

2. **Actualización Simultánea**

   - Ahora puedes modificar el precio de compra y precio de venta al mismo tiempo que agregas cantidad
   - Los campos son opcionales: si no modificas el precio, mantiene el actual

3. **Vista Previa en la Tabla**

   - Antes de confirmar la reposición, puedes ver:
     - Producto
     - Cantidad a reponer
     - Precio de compra actualizado
     - Precio de venta actualizado

4. **Confirmación en un Solo Paso**
   - Al confirmar la reposición:
     - ✅ Se suma la cantidad al stock
     - ✅ Se actualizan los precios de compra
     - ✅ Se actualizan los precios de venta
     - ✅ Se registra en el historial

#### Beneficios:

- ⏱️ **Ahorro de tiempo:** No más ediciones una por una
- 🎯 **Mayor precisión:** Actualizas todo en el momento de la reposición
- 📊 **Mejor control:** Historial completo de cambios de precios
- 💼 **Más eficiente:** Proceso simplificado y rápido

---

## 💻 Requisitos Técnicos

### Para Usar el Sistema:

- ✅ Navegador web moderno (Chrome, Firefox, Edge, Safari)
- ✅ Conexión a Internet estable
- ✅ Resolución mínima: 1024x768 (se adapta a tablets y móviles)

### Tecnologías Utilizadas:

- **Frontend:** HTML5, CSS3, Bootstrap 5
- **Backend:** Firebase (Base de datos en la nube)
- **Autenticación:** Firebase Authentication
- **Hosting:** Configurable (GitHub Pages, Firebase Hosting, etc.)

---

## 📖 Guía de Uso

### 🔐 Inicio de Sesión

1. Accede a la URL del sistema
2. Ingresa tu correo electrónico
3. Ingresa tu contraseña
4. El sistema te redirigirá según tu rol:
   - **Admin:** Acceso completo a todos los módulos
   - **Empleado:** Acceso a ventas y caja

---

### 💰 Realizar una Venta

1. **Accede al módulo de Ventas**

   - Click en "Ventas" en el menú principal

2. **Agregar Productos**

   - Busca el producto por nombre o escanea el código de barras
   - Click en el producto para agregarlo al carrito
   - Especifica la cantidad si es necesario

3. **Cliente (Opcional)**

   - Click en "Cliente" para asociar la venta
   - Selecciona un cliente existente o registra uno nuevo

4. **Procesar Pago**

   - Ingresa el monto recibido del cliente
   - El sistema calcula automáticamente el cambio
   - Click en "Procesar Venta"
   - Se genera un ticket automáticamente

5. **Finalizar**
   - El sistema registra la venta
   - Actualiza el stock automáticamente
   - Registra el movimiento en caja

---

### 📦 Reposición de Stock (Actualizado)

#### Proceso Recomendado:

1. **Preparar la Nota de Reposición**

   - Ve al módulo "Gestión de Stock"
   - Click en "Armar Nota" en la sección de Reposición

2. **Agregar Productos**

   - Busca/selecciona el producto
   - El sistema carga automáticamente los precios actuales
   - Ingresa la cantidad a reponer
   - **Modifica los precios si han cambiado** (opcional)
   - Click en "➕ Agregar"

3. **Revisar la Nota**

   - Verifica todos los productos en la tabla
   - Confirma cantidades y precios
   - Elimina productos si es necesario

4. **Confirmar Reposición**

   - Click en "✅ Confirmar Reposición"
   - El sistema actualiza:
     - Stock (suma la cantidad)
     - Precio de compra (si lo modificaste)
     - Precio de venta (si lo modificaste)
   - Se guarda en el historial con fecha, usuario y totales

5. **Consultar Historial**
   - Click en "Historial" para ver todas las reposiciones
   - Revisa fechas, usuarios, items y totales

---

### 💵 Control de Caja

#### Apertura de Caja:

1. Al inicio del turno, ve a "Control de Caja"
2. Click en "Abrir Caja"
3. Ingresa el monto inicial en efectivo
4. Confirma la apertura

#### Durante el Turno:

- Las ventas se registran automáticamente
- Registra ingresos adicionales si los hay
- Registra egresos (gastos, retiros, etc.)

#### Cierre de Caja:

1. Click en "Cerrar Caja"
2. El sistema muestra:
   - Monto inicial
   - Total de ventas
   - Ingresos adicionales
   - Egresos
   - **Esperado en caja**
3. Ingresa el monto real contado
4. El sistema calcula la diferencia
5. Imprime el ticket de cierre

---

### 🧾 Gestión de Facturas

1. **Crear Factura**

   - Ve a "Facturación"
   - Click en "➕ Nueva Factura"
   - Completa los datos:
     - Cliente
     - Monto
     - Descripción
     - Fecha de vencimiento
   - Guarda la factura

2. **Registrar Pago**

   - Busca la factura en la lista
   - Click en "Registrar Pago"
   - Ingresa fecha y monto del pago
   - La factura cambia a estado "Pagada"

3. **Consultar Pendientes**
   - Filtra por estado "Pendiente"
   - Revisa facturas por vencer
   - Realiza seguimiento

---

## 👮 Sistema de Roles

### 👑 Administrador

**Acceso completo al sistema**

Puede acceder a:

- ✅ Ventas
- ✅ Gestión de Stock
- ✅ Facturación
- ✅ Control de Caja
- ✅ Gestión de Usuarios
- ✅ Configuración del sistema

### 👤 Empleado

**Acceso limitado a operaciones diarias**

Puede acceder a:

- ✅ Ventas
- ✅ Control de Caja (solo su turno)
- ❌ Gestión de Stock
- ❌ Facturación
- ❌ Gestión de Usuarios

---

## 🎨 Características de Diseño

- **Responsive:** Se adapta a computadoras, tablets y móviles
- **Interfaz moderna:** Diseño limpio con Bootstrap 5
- **Colores corporativos:** Esquema visual coherente
- **Iconos visuales:** Facilita la navegación e identificación
- **Modales informativos:** Feedback visual de las acciones
- **Formato de moneda:** Formato paraguayo (Guaraníes)
- **Fechas localizadas:** Formato DD/MM/YYYY

---

## 📊 Reportes y Consultas

El sistema registra automáticamente:

- 📈 Todas las ventas (fecha, hora, usuario, cliente, productos, total)
- 📦 Movimientos de stock (entradas, salidas, fechas)
- 💵 Movimientos de caja (ingresos, egresos, responsables)
- 🧾 Facturas (creación, pagos, estados)
- 👥 Actividad de usuarios

---

## 🔒 Seguridad

- **Autenticación obligatoria:** Solo usuarios registrados pueden acceder
- **Roles y permisos:** Control de acceso por funcionalidad
- **Datos encriptados:** Comunicación segura con Firebase
- **Backup automático:** Los datos se guardan en la nube
- **Trazabilidad:** Registro de quién hizo cada acción

---

## 🆘 Soporte Técnico

### Problemas Comunes

#### No puedo iniciar sesión

- Verifica tu correo y contraseña
- Asegúrate de tener conexión a Internet
- Contacta al administrador si olvidaste tu contraseña

#### Los productos no se cargan

- Verifica tu conexión a Internet
- Recarga la página (F5)
- Si persiste, contacta a soporte

#### El stock no se actualiza

- Verifica que hayas confirmado la reposición
- Revisa el historial de reposiciones
- Recarga la página

#### Error al procesar venta

- Verifica que haya stock disponible
- Verifica que la caja esté abierta
- Revisa los datos del cliente (si aplica)

---

## 📞 Contacto

**Desarrollador:** AlanDevPy  
**Sistema:** Petro Chaco Criolla POS  
**Versión:** 2.1  
**Última actualización:** Noviembre 2024

---

## 📝 Notas Importantes

- ⚠️ **Siempre cierra la caja al final del turno** para mantener el control exacto
- ⚠️ **Confirma las reposiciones inmediatamente** después de recibir la mercadería
- ⚠️ **Revisa los precios antes de confirmar** las notas de reposición
- ⚠️ **Capacita a los empleados** en el uso correcto del sistema
- ⚠️ **Mantén actualizado el stock** para evitar ventas sin inventario
- ⚠️ **Realiza respaldos periódicos** (el sistema lo hace automáticamente, pero es bueno verificar)

---

## 🎯 Próximas Funcionalidades (En Desarrollo)

- 📊 Reportes y estadísticas avanzadas
- 📱 Notificaciones móviles
- 🖨️ Impresión térmica directa
- 📧 Envío de facturas por correo
- 🔔 Alertas de stock bajo automáticas
- 📈 Dashboard con métricas del negocio
- 💳 Integración con pasarelas de pago

---

**© 2024-2025 AlanDevPy. Todos los derechos reservados.**

_Este sistema fue desarrollado específicamente para Petro Chaco Criolla con tecnología moderna y escalable._
