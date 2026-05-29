# Especificación de Diseño: Seguridad Operativa Multi-Inquilino, Autenticación Doble Capa y Segmentación de Métricas

## 1. Objetivo General

Profesionalizar e integrar en producción el sistema **PoShop (SnapGad POS)** transformando sus simulaciones en una arquitectura real de seguridad y gobernanza financiera. Los objetivos específicos son:
1. **Doble Capa de Autenticación (Owner + Cajero):** Iniciar sesión en el navegador con credenciales de Supabase del Dueño (Inquilino), y posteriormente asegurar la caja registradora con un PIN de 4 dígitos rápido para los cajeros.
2. **Mitigación de Pérdidas y Control de Fraudes (Antirrobos):** Implementar **Supervisor Overrides** (PIN de autorización de gerente para acciones críticas) y **Cierre de Turno a Ciegas** (el cajero declara efectivo sin conocer el teórico esperado).
3. **Métricas y P&L GAAP Segmentado por Fechas:** Reemplazar el panel financiero de administración estático por consultas tRPC agregadas reales basadas en filtros de rangos de fechas personalizables.
4. **Notificaciones de Control mediante Webhook (n8n):** Alertas de cierre de turno y gastos a Telegram/n8n.

---

## 2. Arquitectura de Seguridad y Autenticación (Doble Capa)

```
[ Dueño/Admin ] -> Login Supabase Auth (Email + Password) -> Genera JWT
                               |
                               v
                     [ Carga de Inquilino / Tenant ]
                               |
                               v
                    [ Lock Screen de POS ] -> Ingresa PIN de 4 dígitos (Cajero)
                               |
                               v
              [ POS Desbloqueado con Rol de Cajero ]
```

### A. Capa 1: Login de Inquilino (Supabase Auth)
- El dueño inicia sesión con correo y contraseña.
- Se crea la sesión de Supabase y las cookies seguras correspondientes.
- La Next.js Middleware (`middleware.ts`) valida este JWT y redirige a `/pos` o `/admin`.

### B. Capa 2: Lock Screen de POS y Verificación de PIN
- Al entrar a `/pos`, si no hay un cajero activo en el estado de sesión local (`localStorage` / Context), se despliega el componente `<PinLockScreen />` a pantalla completa.
- El usuario ingresa un PIN de 4 dígitos.
- Se llama al procedimiento tRPC seguro `auth.verifyPin` enviando:
  ```json
  { "pin": "1234" }
  ```
- El backend resuelve el `tenantId` de la sesión del JWT de Supabase, realiza la consulta a la tabla `users` buscando coincidencia en el hash/texto plano del PIN, y devuelve el perfil del cajero (`id`, `name`, `role`, `branchId`).
- Si la verificación es exitosa, se guarda la sesión operativa del cajero en el contexto global `UserSessionContext`.

### C. Supervisor Override (Contramarca)
- Acciones restringidas para rol `cashier`:
  * Eliminar un artículo del carrito.
  * Cambiar el precio de venta o aplicar descuentos > 10%.
  * Cancelar o suspender una venta completa.
- Al intentar realizar cualquiera de estas acciones, la UI despliega un modal `<SupervisorOverrideModal />` que solicita el PIN de un usuario con rol `'admin'` u `'owner'`.
- La autorización se valida en caliente mediante una llamada tRPC rápida. Si se valida, la acción se completa y se genera un registro en la bitácora `audit_logs` con la relación del cajero que lo solicitó y el administrador que lo autorizó.

---

## 3. Control de Fraude en Caja: Cierre a Ciegas y Webhooks

Para evitar colusiones o manipulación del dinero en caja por parte de los cajeros:
1. **Flujo de Cierre de Caja (Cierre a Ciegas):**
   * El cajero solicita "Cerrar Turno".
   * El POS **no muestra** el total acumulado en caja (ej. "$3,420.50 en efectivo").
   * El sistema le pide al cajero ingresar los montos físicos contados:
     * Cantidad de billetes/monedas de cada denominación, o
     * Suma total de efectivo físico en caja.
     * Monto reportado en terminales (tarjetas, transferencias).
   * Al dar clic en "Confirmar Cierre", el backend calcula la diferencia:
     $$\text{Diferencia} = \text{Monto Reportado} - \text{Monto Teórico Esperado}$$
   * Se cierra el turno (`shifts`) guardando la diferencia (`cashDifference`), y bloqueando la caja.
2. **Notificación Directa por Webhook:**
   * El backend dispara un HTTP POST asíncrono a la URL configurada en el perfil del tenant (`pacWebhookUrl` o similar, o una variable de entorno de n8n):
     ```json
     {
       "event": "shift.closed",
       "tenantId": "tenant-001",
       "branch": "Matriz Centro",
       "cashier": "Ana González",
       "closedAt": "2026-05-29T10:00:00Z",
       "reportedCash": 2400.00,
       "expectedCash": 2500.00,
       "difference": -100.00,
       "totalSales": 3800.00
     }
     ```
   * Esto permite la integración directa con n8n para enviar la alerta formateada con colores (ej: 🔴 ALERTA: Faltante de $100 en Matriz Centro por Ana González) al Telegram del Dueño.

---

## 4. Segmentación Temporal de Métricas y P&L (GAAP)

Se reestructurará el panel `/admin` para leer de la base de datos agrupando por fechas:

1. **Rango de Fechas (Filtros):**
   * Preestablecidos: Hoy, Esta Semana, Este Mes, Últimos 30 días, Año Actual.
   * Personalizado: Entrada de fechas `startDate` y `endDate` (ISO Strings).
2. **Cálculos de Analíticas en Backend (`analyticsRouter`):**
   * **Ingresos (Ventas Totales):** Sumatoria de `salePrice * quantity` de los `saleItems` asociados a ventas completadas en el rango.
   * **Costo de Ventas (COGS):** Sumatoria de `costPrice * quantity` de los mismos `saleItems`.
   * **Margen Bruto:** $\text{Ingresos} - \text{Costo de Ventas}$.
   * **Gastos Operativos (OPEX):** Sumatoria de la tabla `expenses` en el mismo rango de fechas.
   * **Utilidad Neta (EBITDA / Ganancia Neta):** $\text{Margen Bruto} - \text{Gastos Operativos}$.
3. **Balance y Flujo de Caja:**
   * Entradas de efectivo por ventas vs. Salidas por gastos y compras registradas.

---

## 5. Plan de Cambios de Código

### A. Base de Datos & Drizzle Schema
* **`packages/db/src/schema.ts`**:
  * Añadir relaciones Drizzle para `auditLogs` y `expenses` con `users`.
  * Asegurar campos `pin` en `users` y `cashDifference` en `shifts`.

### B. Rutas de API y Middlewares tRPC
* **`packages/api/src/routers/auth.ts`**:
  * Crear `verifyPin` (protectedProcedure) para validar el PIN de cajero en el tenant activo.
  * Crear `verifySupervisorPin` (protectedProcedure) para overrides.
* **`packages/api/src/routers/analytics.ts`**:
  * Crear `getFinancialSummary` (adminProcedure) con input Zod de rango de fechas y sucursal.
* **`apps/web/src/app/api/trpc/[trpc]/route.ts`**:
  * Obtener el usuario autenticado real desde la sesión de Supabase (`supabase.auth.getUser()`) en el headers/cookie de la petición y pasarlo al contexto de tRPC (removiendo el bypass de desarrollo).

### C. Vistas del Frontend
* **`apps/web/src/app/login/page.tsx`**:
  * Conectar el formulario a `supabase.auth.signInWithPassword()`.
  * Redirigir a `/pos` o `/admin` según el rol guardado en la base de datos.
* **`apps/web/src/app/pos/page.tsx`**:
  * Implementar el bloqueo de pantalla del cajero.
  * Integrar las alertas de confirmación/override ante borrados o cancelaciones.
  * Diseñar la UI del cierre de caja contada a ciegas.
* **`apps/web/src/app/admin/page.tsx`**:
  * Sustituir los gráficos y tarjetas estáticos por selectores de fecha que gatillen `trpc.analytics.getFinancialSummary.useQuery()`.

---

## 6. Plan de Verificación

1. **Pruebas de Compilación:**
   * `npm run build` en el workspace root para asegurar compatibilidad de tipos tRPC y Drizzle.
2. **Pruebas de Seguridad de Endpoint:**
   * Validar que si no se provee la cookie de Supabase Auth en `/api/trpc`, el endpoint devuelva `UNAUTHORIZED` (eliminado el mock bypass).
3. **Simulación de Ataque Local:**
   * Tratar de modificar el `localStorage` en un perfil de Cajero para ver si el backend sigue bloqueando acciones críticas (debe bloquearlas porque la validación ocurre del lado servidor).
4. **Validación de Métricas:**
   * Crear una venta de $100 (con costo de $60) y un gasto de $10 en el mismo día. Filtrar por ese día en `/admin` y verificar que muestre:
     * Venta: $100
     * Costo: $60
     * Gasto: $10
     * Utilidad Neta: $30
   * Ampliar el filtro a otro rango y verificar que no se contaminen las métricas.
