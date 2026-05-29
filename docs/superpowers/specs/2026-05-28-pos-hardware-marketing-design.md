# Especificación de Diseño: Impresión Corporativa y Motor Contable Fiscal de Inventarios PoShop

## 1. Objetivo General

Profesionalizar la plataforma SNAPGAD POS de un simulador limitado ("juguetito") a un sistema enterprise altamente funcional y adaptado a las tienditas mexicanas. Esto se logra mediante el desarrollo de dos pilares:
1. **Native Spooler Electron Bridge (Enfoque A):** Un puente local WebSocket robusto con autenticación por token secreto, diseño responsivo basado en CSS Flexbox para impresión térmica perfecta (80mm/58mm) sin desalineaciones y render de imágenes/códigos QR fijos.
2. **Motor Fiscal e Inventario Realista Mexicano:**
   * Soporte dual para impuestos de México: **IVA (0% o 16%)** e **IEPS (0% u 8% para comida chatarra)**.
   * Calculadora de Ganancia Neta Real descontando impuestos trasladados en la hoja de inventario.
   * Sistema rápido de **Desensamble de Cajas ("Unpack")** con copias de seguridad instantáneas automáticas.
   * **Descuento automatizado por Lotes FEFO** durante el cobro en la caja registradora.

---

## 2. Arquitectura de Impresión Físico-Digital (Enfoque A)

### A. Handshake Seguro del WebSocket
Para evitar que aplicaciones web no autorizadas manden impresiones spam al puerto `9099` o abran el cajón de dinero:
1. En el arranque de la aplicación Electron (`apps/mobile-bridge/main.js`), se genera un token dinámico aleatorio UUIDv4.
2. El bridge guarda este token en un archivo JSON local seguro temporal (`.bridge_auth.json`) dentro del workspace.
3. El frontend de Next.js lee este archivo temporal durante el inicio y envía el token en el primer payload de WebSocket:
   ```json
   { "type": "AUTH", "token": "SECRET_UUID" }
   ```
4. El bridge valida la conexión; si falla o no se envía, desconecta inmediatamente el socket.

### B. Diseño Responsivo CSS Flexbox (Cero Desalineación)
En lugar de contar espacios a mano con caracteres planos (`padJustify`), formatearemos el ticket en HTML utilizando una rejilla CSS Flexbox nativa dentro del `BrowserWindow` invisible de Electron:
* **Grid de Columnas:** Las columnas ocuparán un ancho porcentual exacto (`.qty` 15%, `.concept` 60%, `.total` 25%) con propiedad `text-overflow: ellipsis` para recortar descripciones largas elegantemente sin romper el renglón.
* **Soporte Multi-Ancho:** Lógicas independientes para **80mm** (280px efectivos de render) y **58mm** (200px efectivos de render) con escala tipográfica proporcional.
* **QR Fijo de Operación:** En lugar de sistemas de marketing hiper-complejos no viables para el sector de abarrotes, el ticket renderizará un QR fijo funcional y minimalista para el rastreo del folio de la orden de compra o enlace del comercio.

---

## 3. Motor Fiscal Contable (IVA + IEPS Dual)

Para reflejar la realidad del comercio de abarrotes mexicano:
1. **Esquema de Impuestos en Producto:**
   * `ivaPercent`: `0` o `16`
   * `iepsPercent`: `0` o `8` (comida chatarra de alta densidad calórica)
2. **Cálculo de Ganancia Neta Real (Inventarios):**
   Para asegurar que el comerciante conozca sus ganancias reales después del traslado de impuestos:
   $$\text{Precio Venta Neto} = \frac{\text{Precio Venta Mostrador}}{1 + (\text{IVA}\% / 100) + (\text{IEPS}\% / 100)}$$
   $$\text{Ganancia Neta} = \text{Precio Venta Neto} - \text{Costo Compra}$$
   El panel de inventario y la calculadora de márgenes mostrarán este desglose con badges de salud de ganancia basados en el margen neto real.
3. **Desglose en Caja y Ticket:**
   En cada transacción, se calcularán y desglosarán por separado los impuestos trasladados correspondientes a cada concepto, mostrándolos antes del total final.

---

## 4. Gestión de Existencias e Inventario Avanzado

### A. Desensamble de Cajas / Paquetes Mayoristas ("Unpack")
* **Acción:** Un botón interactivo en la tabla de inventario que permite "abrir" una caja o pack al instante.
* **Flujo Operativo:**
  1. El sistema genera una instantánea de seguridad automática (`localStorage`) con el prefijo `PRE-DESENSAMBLE-[ID_PRODUCTO]` para revertir errores.
  2. Resta `1` unidad al stock del producto empaque (ej. Caja de Coca-Cola).
  3. Suma el multiplicador `packQuantity` (ej. `24` piezas) al stock del producto individual suelto correspondiente.

### B. Sincronización Real de Lote FEFO al Vender
* **Acción:** Al confirmar una venta en la caja registradora (`/pos`):
  1. Filtra los lotes de caducidad activos del producto en `expirationBatch`.
  2. Los ordena ascendentemente por `expiryDate` (el más antiguo primero).
  3. Descuenta la cantidad vendida del lote con fecha de caducidad más próxima.
  4. Si se agota, pasa al siguiente lote secuencialmente.
  5. Sincroniza el stock global como la suma de todos los lotes restantes.

---

## 5. Plan de Cambios de Código

### A. Componente 1: WebSocket & Spooler CSS en Bridge
* **`apps/mobile-bridge/main.js`**:
  * Implementar verificación de Handshake Token.
  * Cambiar lógica de generación de HTML para usar Flexbox y maquetado de tablas profesionales.
  * Autogenerar archivo de autenticación temporal al bootear.

### B. Componente 2: Modelos SAT e Impuestos en Inventario
* **`apps/web/src/app/inventario/page.tsx`**:
  * Añadir selectores de `IVA` y `IEPS` en los formularios de creación y edición.
  * Integrar fórmulas fiscales en la calculadora de márgenes y panel de costos.
  * Añadir el botón de desensamble de cajas ("Unpack") con automatización de snapshots.

### C. Componente 3: Lógica FEFO y Desglose SAT en Caja POS
* **`apps/web/src/app/pos/page.tsx`**:
  * Incorporar lógica de descuento recursivo de lotes por caducidad (FEFO) al procesar la venta.
  * Calcular desglose de IVA/IEPS trasladados en el checkout.
  * Enviar payload estructurado de impresión al bridge incluyendo el token de seguridad.

---

## 6. Plan de Verificación

### Pruebas de Compilación
* Compilar el monorepo ejecutando `npm run build` para asegurar cero fallos de tipado o empaquetado.

### Pruebas de Operación Física
1. Levantar el bridge de Electron y la app web.
2. Confirmar en consola la sincronización del WebSocket mediante el token generado.
3. Modificar un producto a IVA 16% + IEPS 8%, verificar el cálculo exacto de ganancia neta.
4. Desensamblar una caja en el inventario; validar que se reste del empaque, se sume al suelto y se cree la copia de restauración correspondiente.
5. Realizar una venta en `/pos` y comprobar que se descuente del lote de caducidad más viejo (FEFO).
