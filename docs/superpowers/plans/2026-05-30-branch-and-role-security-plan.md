# Plan de Implementación de Seguridad de Sucursales y Playground de Perfiles PoShop V2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar una gobernanza robusta en el cambio de sucursales acoplada a turnos de caja, junto a un panel ("Playground") e inicio de sesión rápido para simulación de 5 perfiles dev con el PIN unificado `0000` y contrastes premium de alta gama.

**Architecture:** Modificaremos la infraestructura de sesión y turnos para sincronizar datos dinámicos del cajero, crearemos el Portal de Lanzamiento `/pos/turno`, rediseñaremos la pantalla `/login` y el componente `<Sidebar />` con controles reactivos y barrido estético de contraste CSS en todas las vistas protegidas.

**Tech Stack:** React, Next.js 15, Tailwind CSS, Lucide Icons, LocalStorage.

---

### Task 1: Contexto de Configuración y Roles predefinidos

**Files:**
- Modify: `apps/web/src/components/theme-context.tsx`
- Modify: `apps/web/src/lib/user-session.tsx`

- [x] **Step 1: Modificar el PIN predeterminado a '0000' en `theme-context.tsx`**
  Cambiar la inicialización de `adminPin` de `'9999'` a `'0000'`.
- [x] **Step 2: Ampliar definición de roles y perfiles mocks en `user-session.tsx`**
  Asegurar que los roles `cobranza` y `guest` estén declarados con sus permisos restrictivos, y que el mapa `DEV_USERS` exponga las 5 cuentas predefinidas completas.
- [x] **Step 3: Compilar y verificar**
  Correr: `npm run build` en `@snapgad/web` para asegurar que compila correctamente.

---

### Task 2: Vinculación Dinámica de Cajero en Turno Contable

**Files:**
- Modify: `apps/web/src/lib/shift-context.tsx`

- [x] **Step 1: Modificar `openShift` para leer la sesión en caliente**
  Importar `useUserSession` y sustituir las credenciales estáticas de caja (`usr-001`, `Cajero Activo`) por el `session.id` y `session.name` del usuario activo.
- [x] **Step 2: Verificar consistencia en consola**
  Revisar que no existan errores de typescript ni dependencias circulares.

---

### Task 3: Rediseño Premium de la Pantalla de Login (`/login`)

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`

- [x] **Step 1: Implementar Quick Login Cards (Tarjetas de Acceso 1-Clic)**
  Maquetar una rejilla clara debajo del formulario principal que muestre cada uno de los 5 usuarios simulados (iniciales de avatar en círculo colorido, nombre y badge de rol).
- [x] **Step 2: Sincronizar acción de clic con el mutador de sesión**
  Al hacer clic, llamar a `setRoleForDev(role)` y redirigir inmediatamente a `/pos/turno`.
- [x] **Step 3: Eliminar selector manual obsoleto de modo oscuro local.**

---

### Task 4: Portal de Lanzamiento de Turnos (`/pos/turno`)

**Files:**
- Create: `apps/web/src/app/pos/turno/page.tsx`

- [x] **Step 1: Crear la página del Launchpad**
  Desarrollar una interfaz limpia y atractiva (`bg-slate-50`) con:
  - Selectores para elegir Sucursal (Matriz/Poniente) y Caja (01/02).
  - Campo numérico para Monto Inicial de Caja.
  - Teclado/Input de PIN de Supervisor/Cajero (Validar contra el PIN `0000`).
  - Botón de apertura contable que dispare `openShift(monto, sucursal, caja)`.
- [x] **Step 2: Redirección automática**
  Al confirmar PIN `0000` y crear el turno exitosamente, redirigir a `/pos`.

---

### Task 5: Sidebar Inteligente con Selector Bloqueado y Playground Drawer

**Files:**
- Modify: `apps/web/src/components/Sidebar.tsx`

- [x] **Step 1: Proteger selector de sucursal**
  - Deshabilitar el selector de sucursal si hay un turno activo (`activeShift !== null`) y el rol del usuario es `cashier`.
  - Añadir enlace `"🔓 Bypass"` al lado que abra un popup o modal de PIN rápido. Si ingresa `0000`, desbloquea temporamente el selector.
- [x] **Step 2: Integrar Playground Drawer**
  - Diseñar el botón `"🧪 MODO PRUEBAS"` al final del Sidebar.
  - Diseñar el componente lateral deslizante (Drawer) para alternar roles dev en caliente, inyectando la sesión correspondiente.
  - Implementar la gobernanza activa: al alternar a un rol sin permisos en la vista actual, expulsar inmediatamente al POS (`/pos`).

---

### Task 6: Barrido Estético de Contraste CSS (PC y Bajo Brillo)

**Files:**
- Modify: `apps/web/src/app/pos/page.tsx`
- Modify: `apps/web/src/app/clientes/page.tsx`
- Modify: `apps/web/src/app/inventario/page.tsx`
- Modify: `apps/web/src/app/admin/page.tsx`
- Modify: `apps/web/src/app/ajustes/page.tsx`

- [x] **Step 1: Limpiar inputs y checkboxes**
  Reemplazar elementos oscuros por inputs y checks con fondo blanco, bordes limpios (`border-slate-200`) y destaque Azul Eléctrico (`#0066FF`) en estado activo.
- [x] **Step 2: Asegurar redirección preventiva en POS**
  Si el usuario no tiene un turno abierto (`activeShift === null`), forzar redirección en `/pos` hacia `/pos/turno`.

---

### Task 7: Compilación y Verificación de Aseguramiento

- [x] **Step 1: Compilar la aplicación**
  Ejecutar: `npm run build`
- [x] **Step 2: Validar en Navegador**
  Probar todo el flujo operativo de cambio de roles, bloqueo de sucursales, simulación y visualización de contrastes óptimos.
