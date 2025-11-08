# Reglas de seguridad Firestore

Este proyecto usa Firebase Firestore con estas colecciones:

- `usuarios` (minúscula)
- `Stock`
- `Clientes`
- `Caja`

Se incluye un archivo de reglas recomendado en `firestore.rules` con:

- Autenticación obligatoria para cualquier lectura/escritura.
- Roles por documento: un usuario es `admin` si su doc `usuarios/{uid}` tiene `rol == "admin"`.
- `usuarios`: solo admin puede escribir; cualquier usuario puede leer su propio documento.
- `Stock`: lectura para autenticados; escritura solo admin, con validaciones de tipos y `cantidad >= 0`.
- `Clientes`: lectura para autenticados; escritura para autenticados (permite que cajeros registren clientes) con validaciones básicas.
- `Caja`: lectura para autenticados; creación solo en estado `abierta`; no se permite editar una caja `cerrada`; en update el `totalRecaudado` no puede disminuir y se validan ventas.

> Nota: Los IDs de colección distinguen mayúsculas y minúsculas, y en este proyecto se usan tal cual arriba.

## Cómo aplicar las reglas

Puedes aplicar estas reglas de dos formas: por consola o con la CLI.

### Opción A: Consola de Firebase (rápida)

1. Entra a Firebase Console → Firestore Database → pestaña "Rules".
2. Copia el contenido de `firestore.rules` y pégalo en el editor.
3. Guarda y publica.

### Opción B: Firebase CLI (versionado)

1. Instala la CLI si no la tienes:
   ```powershell
   npm i -g firebase-tools
   ```
2. Inicia sesión:
   ```powershell
   firebase login
   ```
3. Inicializa (si aún no tienes `firebase.json`):
   ```powershell
   firebase init firestore
   ```
   - Cuando te pregunte por las reglas, selecciona `firestore.rules` del repo.
4. Despliega reglas:
   ```powershell
   firebase deploy --only firestore:rules
   ```

## Campos esperados por colección (resumen)

- Stock:

  - item (string, requerido)
  - categoria (string, requerido)
  - codigoBarra (string o int)
  - cantidad (int >= 0)
  - costo (int >= 0)
  - costoCompra (int >= 0)

- Clientes:

  - nombre (string, requerido)
  - ruc (string, requerido)
  - telefono (string, opcional)
  - direccion (string, opcional)

- Caja:
  - fechaApertura (string)
  - estado ("abierta" | "cerrada")
  - totalRecaudado (int >= 0)
  - ventas (array de mapas con: cliente, venta, fecha, efectivo, tarjeta, transferencia, total)
  - usuario (string, nombre del usuario que abrió la caja)
  - fechaCierre (string, requerido al cerrar)

## Ajustes recomendados a futuro

- Migrar fechas a `Timestamp` de Firestore en nuevas escrituras (facilita validación y ordenación).
- Añadir custom claims para roles (más eficiente que leer `usuarios/{uid}` en reglas).
- Endurecer validación de `ventas` (validar estructura de items y del cliente si se desea).
- Flujo atómico de venta con Cloud Functions (venta + caja + stock).
