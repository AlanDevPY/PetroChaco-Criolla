# Guía rápida de desarrollo

## Estructura de estilos

- `css/main.css`: estilos base (login brand, fondo, glass, variables).
- `css/ventas-ui.css`: estilos específicos de Ventas (paneles, tablas, nav glass). No altera IDs.
- `css/roles.css`: estilos previos del proyecto (se mantienen).

Convenciones:

- Mantener IDs y estructura HTML existentes (evitamos romper JS).
- Preferir clases utilitarias de Bootstrap.

## Utilidades JavaScript (`js/utils.js`)

- `formatGs(value)`: formatea a `1.234.567 Gs`.
- `parseGs(str)`: "12.345" → `12345`.
- `debounce(fn, delay)`: reduce lecturas/escrituras al teclear.
- `mostrarAviso(tipo, mensaje)`: usa modal global si existe; fallback a `alert`.
- `safeNumber`, `calcularVuelto`, `calcularDiferencia` para cálculos comunes.

Uso típico:

```js
import { formatGs, debounce, mostrarAviso } from "../js/utils.js";
```

## Firebase (web v12)

- Capa central en `js/firebase.js` (Auth, Firestore CRUD, cachés y transacciones).
- Caché en memoria con TTL para `Stock` y `Clientes`.
- Invalidación de caché al crear/actualizar/eliminar y al terminar transacciones.
- Transacción para descuento de stock (`descontarStockTransaccional`).
- Timestamps normalizados en nuevas escrituras:
  - `Stock`: `fechaTS: serverTimestamp()`
  - `Caja`: `fechaAperturaTS: serverTimestamp()`
  - Compatibilidad: se conservan campos string existentes (p.ej. `FechaDeRegistro`, `fechaApertura`).

## Navbar reutilizable y marca

- Parcial en `html/partials/navbar.html`.
- Carga automática con `js/navbar.js` en páginas que tengan `#navbar-placeholder`.
- Beneficio: un solo punto de edición para el menú.
- Marca unificada: **Petro Chaco Criolla POS** (títulos y brand).
- Para cambiar la marca en el futuro: editar sólo el parcial y los `<title>`.
- Vista de caja fusionada: ahora sólo `caja.html`. Filtrado por rol (admin ve todas las cajas; cajero sólo la abierta). Eliminados archivos `cajaUnica.html` y `cajaUnica.js`.

## Errores de autenticación (mejorados)

- `iniciarSesion` y `registrarUsuario` devuelven mensajes en español (mapa por `error.code`).
- `index.js` muestra el detalle en el modal de error (`#loginErrorMensaje`).

## Próximos pasos sugeridos

- Migrar fechas internas de ventas a `Timestamp` (en arrays) con Cloud Functions o sentinels controlados.
- Validar esquema de `ventas[]` en reglas (estructura de items, números ≥ 0).
- Spinner o fallback mientras carga navbar parcial.
- Tests mínimos de UI con Playwright (opcional).
