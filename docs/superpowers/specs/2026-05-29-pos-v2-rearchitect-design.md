# Documento de Especificación de Diseño: Reestructuración Integral PoShop V2

Este documento detalla la especificación del diseño técnico, visual y de seguridad para la reestructuración completa del Punto de Venta (PoShop V2), migrando la plataforma a una arquitectura de Tema Claro corporativo (estilo Odoo/CONTPAQi/Aspel), integrando navegación vertical unificada, separación de inventario por sucursal, y resguardando operaciones sensibles mediante autenticación obligatoria por PIN de Administrador.

---

## 1. Lineamientos Visuales y Estética de Diseño (Tema Claro Premium)

Para proyectar una identidad corporativa y refinada que inspire confianza empresarial, se elimina por completo el soporte para modos oscuros, canalizando los esfuerzos visuales en una interfaz clara de alta densidad de datos.

### 1.1 Paleta de Colores Corporativa
*   **Fondo de Pantalla Principal:** `#F8FAFC` (Slate 50). Aporta frescura y limpieza al espacio de trabajo.
*   **Paneles y Tarjetas:** `#FFFFFF` puro (White). Proporciona elevación y foco sobre los elementos dinámicos.
*   **Bordes y Líneas Divisorias:** `#E2E8F0` (Slate 200) o `#F1F5F9` (Slate 100). Evita el ruido visual.
*   **Texto Primario:** `#0F172A` (Slate 900). Nitidez absoluta para códigos y precios.
*   **Texto Secundario / Descriptivo:** `#475569` (Slate 600).
*   **Color Primario (Azul Eléctrico):** `#0066FF`. Empleado en botones de acción principal (como Cobrar, Buscar), totales del carrito y selecciones activas del menú.
*   **Color Secundario (Naranja Eléctrico):** `#FF6600`. Destinado a alertar sobre niveles de inventario mínimo/crítico, diferencias en caja y saldos de crédito vencidos.
*   **Color de Confirmación / Éxito:** `#10B981` (Emerald 500). Indica turnos de caja activos y transacciones finalizadas correctamente.

### 1.2 Iconografía Vectorial (Cero Emojis)
*   Se prohibe el uso de caracteres Emoji informales en botones, menús y alertas.
*   Toda la iconografía se renderiza mediante vectores SVG estilizados de trazo fino (estilo Lucide React) con un grosor constante de 1.75px y tamaño uniforme (18px o 20px) para mantener coherencia visual en cada resolución.

---

## 2. Estructura de Navegación Vertical Unificada (Sidebar)

El Punto de Venta reemplaza los menús superiores por una barra de navegación lateral fija (Sidebar) en el extremo izquierdo de la pantalla, con un ancho fijo de 240px.

```
+-----------------------------------------------------------+
| PoShop [Sucursal Matriz]  |  [Buscador / POS]             |
|                           |                               |
|   - Punto de Venta (POS)  |  [Catálogo de Productos]      |
|   - Inventario            |                               |
|   - Clientes y Créditos   |                               |
|   - Control Admin (PIN)   |                               |
|   - Ajustes SAT (PIN)     |                               |
|                           |                               |
|   Cajero: Axel ENF        |                               |
|   Turno: Activo (02h 15m) |  [Carrito de Compras]         |
|   [Cerrar Caja (PIN)]     |                               |
+-----------------------------------------------------------+
```

### 2.1 Elementos del Sidebar
1.  **Cabecera de Marca (Branding):** Logotipo minimalista de PoShop acompañado de un chip que muestra el nombre de la sucursal activa y caja registradora asignada.
2.  **Menú de Rutas:**
    *   *Punto de Venta:* Terminal de cobro activo.
    *   *Inventario:* Gestión de existencias y traspasos.
    *   *Clientes:* Catálogo de crédito y balance.
    *   *Control Administrativo:* Reportes de caja y gobernanza (protegido por PIN).
    *   *Ajustes SAT:* Facturación CFDI y periféricos (protegido por PIN).
3.  **Pie de Sesión:**
    *   Nombre del operador logueado.
    *   Estatus de la red (En Línea / Sin Conexión).
    *   Botón para **Cerrar Turno / Caja** (protegido por PIN) y **Cerrar Sesión**.

---

## 3. Control Multisucursal y Separación de Almacenes

Para permitir un control exacto de mermas e inventarios físicos, la aplicación divide el stock por almacén.

### 3.1 Modelo de Datos del Producto
El modelo de datos extiende el stock plano a una estructura distribuida por sucursal:
```typescript
interface ProductSeed {
  id: string;
  name: string;
  barcode: string;
  internalCode: string;
  salePrice: number;
  costPrice: number;
  stockPerBranch: {
    'Sucursal Matriz': number;
    'Sucursal Poniente': number;
  };
  unit: string;
  category: string;
  wholesalePrice?: number;
  ivaPercent?: number;
  iepsPercent?: number;
}
```

### 3.2 Lógica de Resta en Venta
*   El POS consulta la sucursal seleccionada en el Sidebar (`localStorage.getItem('snapgad_active_branch')`).
*   Al concretar una venta, el decremento de existencias afecta exclusivamente a la llave correspondiente en `stockPerBranch`.
*   Si el stock es inferior a la cantidad solicitada en la sucursal activa, el botón de agregar producto se deshabilita y se muestra una advertencia visual en Naranja Eléctrico.

### 3.3 Módulo de Transferencias entre Sucursales
Dentro del Panel de Inventario, se habilita un diálogo especializado para traspasos físicos:
*   **Campos:** Sucursal Origen (selección), Sucursal Destino (selección), Producto (búsqueda por lector o manual), Cantidad.
*   **Lógica:** Resta del stock de origen y suma al stock de destino, registrando el movimiento en una bitácora local (`snapgad_warehouse_log`) para su posterior auditoría.

---

## 4. Gestión de Caja y Seguridad Anti-Idiotez por PIN

Se establece una estricta jerarquía de roles para salvaguardar el dinero de la caja y evitar modificaciones accidentales en los catálogos.

### 4.1 Pantalla de Bloqueo / Autorización por PIN
Cuando un cajero intente abrir una ventana protegida o ejecutar un cierre de turno, se despliega una modal modal (`AdminPinModal`) que requiere la clave del supervisor para proceder.

```
+------------------------------------------+
|  Autorización de Supervisor Requerida    |
|                                          |
|  Ingrese su PIN de 4 dígitos para        |
|  autorizar esta operación:               |
|                                          |
|                [ * * * * ]               |
|                                          |
|          [1]       [2]       [3]         |
|          [4]       [5]       [6]         |
|          [7]       [8]       [9]         |
|          [C]       [0]      [OK]         |
+------------------------------------------+
```

*   **PIN por Defecto:** `9999` (almacenado localmente bajo la llave `snapgad_admin_pin`).
*   **Modificaciones:** Solo un usuario con rol de Dueño o Superadmin puede redefinir el PIN en la sección de seguridad de `/admin`.

### 4.2 Corte y Arqueo Contable de Caja
El arqueo de caja se realiza al finalizar cada turno y calcula discrepancias en tiempo real:
1.  **Dinero Esperado:**
    $$\text{Expected} = \text{Fondo Inicial} + \text{Ventas en Efectivo} + \text{Ingresos} - \text{Retiros}$$
2.  **Captura del Cajero:** El supervisor cuenta físicamente las monedas y billetes en el cajón e ingresa el total en el sistema.
3.  **Cuadre de Caja:**
    *   Si $\text{Físico} = \text{Esperado}$: Caja cuadrada (Verde Emerald).
    *   Si $\text{Físico} < \text{Esperado}$: Faltante de dinero (Naranja Eléctrico).
    *   Si $\text{Físico} > \text{Esperado}$: Sobrante de dinero (Naranja Eléctrico).
4.  **Bitácora:** El registro de cierres de caja se guarda en `localStorage.getItem('snapgad_shift_logs')` para revisión del administrador en `/admin`.
