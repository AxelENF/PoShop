# Seguridad Operativa y Segmentación Financiera Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement double-layer authentication (Supabase Auth + cashier PIN), supervisor overrides, blind cash drawer closing drops, and date-segmented financial reports to transform PoShop from a mockup into a secure, production-ready POS system.

**Architecture:** Route Supabase Auth tokens securely to the tRPC context to establish tenant isolation. Implement a local cashier session overlay with supervisor override prompts, and fetch aggregated date-range metrics for P&L reporting in the admin panel.

**Tech Stack:** Next.js 15, Drizzle ORM, tRPC, Supabase, Tailwind CSS, Zod

---

## 🛠️ PLAN DE IMPLEMENTACIÓN DETALLADO

### Task 1: Router de Autenticación tRPC y Verificación de PIN
**Files:**
- Create: `packages/api/src/routers/auth.ts`
- Modify: `packages/api/src/root.ts`

- [ ] **Step 1: Crear el router de autenticación (`packages/api/src/routers/auth.ts`)**
  Implementar dos procedimientos:
  1. `verifyPin`: protectedProcedure que valida si el PIN enviado pertenece a un cajero o administrador activo en el tenant.
  2. `verifySupervisorPin`: protectedProcedure que valida si el PIN pertenece a un administrador/dueño para autorizar overrides.

  ```typescript
  import { z } from 'zod';
  import { createTRPCRouter, protectedProcedure } from '../trpc';
  import { users } from '@snapgad/db';
  import { and, eq } from 'drizzle-orm';
  import { TRPCError } from '@trpc/server';

  export const authRouter = createTRPCRouter({
    verifyPin: protectedProcedure
      .input(z.object({ pin: z.string().length(4, 'El PIN debe ser de 4 dígitos') }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.session.tenantId;
        const [user] = await ctx.db
          .select({
            id: users.id,
            name: users.name,
            role: users.role,
            branchId: users.branchId,
          })
          .from(users)
          .where(
            and(
              eq(users.tenantId, tenantId),
              eq(users.pin, input.pin),
              eq(users.isActive, true)
            )
          )
          .limit(1);

        if (!user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'PIN incorrecto o usuario inactivo.',
          });
        }

        return user;
      }),

    verifySupervisorPin: protectedProcedure
      .input(z.object({ pin: z.string().length(4) }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.session.tenantId;
        const [supervisor] = await ctx.db
          .select({
            id: users.id,
            name: users.name,
            role: users.role,
          })
          .from(users)
          .where(
            and(
              eq(users.tenantId, tenantId),
              eq(users.pin, input.pin),
              eq(users.isActive, true)
            )
          )
          .limit(1);

        if (!supervisor || (supervisor.role !== 'owner' && supervisor.role !== 'admin' && supervisor.role !== 'superadmin')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'PIN incorrecto o no cuenta con permisos de supervisor.',
          });
        }

        return { success: true, supervisor: supervisor.name };
      }),
  });
  ```

- [ ] **Step 2: Registrar el authRouter en el router raíz (`packages/api/src/root.ts`)**
  Importar y registrar `authRouter` bajo la propiedad `auth`.

- [ ] **Step 3: Compilar y verificar tRPC**
  Ejecutar: `npm run build` en la raíz para validar la consistencia de tipos.

- [ ] **Step 4: Commit**
  ```bash
  git add packages/api/src/routers/auth.ts packages/api/src/root.ts
  git commit -m "feat: add authRouter with verifyPin and verifySupervisorPin"
  ```

---

### Task 2: Integración de Supabase Auth Real en el Contexto tRPC
**Files:**
- Modify: `apps/web/src/app/api/trpc/[trpc]/route.ts`

- [ ] **Step 1: Eliminar el bypass de desarrollo y leer el usuario real desde Supabase**
  Modificar el archivo `route.ts` para crear un cliente de Supabase server-side a partir de las cookies de la petición, obtener el usuario real y usar sus claims de base de datos para armar el contexto de sesión de tRPC.

  ```typescript
  import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
  import { appRouter, createTRPCContext } from '@snapgad/api';
  import { createServerClient } from '@supabase/ssr';
  import { db, users } from '@snapgad/db';
  import { eq } from 'drizzle-orm';

  const handler = async (req: Request) => {
    // Si no están configuradas las variables de entorno, regresamos el bypass para desarrollo local
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: appRouter,
        createContext: async () => createTRPCContext({
          session: {
            user: {
              id: 'local-dev-user',
              name: 'Cajero Local',
              email: 'cajero@snapgad.com',
              role: 'admin',
            },
            tenantId: 'tenant-demo',
          }
        }),
      });
    }

    // Inicializar cliente Supabase Server para validar cookies
    const cookieHeader = req.headers.get('cookie') || '';
    const resHeaders = new Headers();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Parsear las cookies del header de la petición
            return cookieHeader.split(';').map(v => v.trim().split('=')).map(([name, value]) => ({ name, value }));
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              let cookieStr = `${name}=${value}`;
              if (options?.path) cookieStr += `; Path=${options.path}`;
              if (options?.maxAge) cookieStr += `; Max-Age=${options.maxAge}`;
              resHeaders.append('Set-Cookie', cookieStr);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    let session = undefined;
    if (user) {
      // Buscar el usuario en la tabla de base de datos para obtener el tenant_id y rol
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (dbUser) {
        session = {
          user: {
            id: dbUser.id,
            name: dbUser.name,
            email: user.email || '',
            role: dbUser.role,
          },
          tenantId: dbUser.tenantId,
          branchId: dbUser.branchId || undefined,
        };
      }
    }

    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: async () => createTRPCContext({ session }),
    });

    // Anexar cookies si Supabase actualizó sesión
    resHeaders.forEach((value, name) => {
      response.headers.append(name, value);
    });

    return response;
  };

  export { handler as GET, handler as POST };
  ```

- [ ] **Step 2: Validar compilación**
  Ejecutar: `npm run build`

- [ ] **Step 3: Commit**
  ```bash
  git add apps/web/src/app/api/trpc/\[trpc\]/route.ts
  git commit -m "feat: integrate real Supabase session into tRPC context resolver"
  ```

---

### Task 3: Login del Dueño (Supabase) y Session Provider en Cliente
**Files:**
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/lib/user-session.tsx`

- [ ] **Step 1: Conectar LoginPage con Supabase Auth**
  Importar `createClient` de `@/utils/supabase/client` y realizar el login real.

  ```typescript
  // Reemplazar handleLogin simulado:
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(false);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push('/pos');
  };
  ```

- [ ] **Step 2: Actualizar `UserSessionProvider` para soportar PIN locking local**
  Modificar `apps/web/src/lib/user-session.tsx` para integrar el inicio de sesión de Supabase Auth del lado del cliente y permitir guardar el cajero activo verificado vía PIN.

- [ ] **Step 3: Commit**
  ```bash
  git add apps/web/src/app/login/page.tsx apps/web/src/lib/user-session.tsx
  git commit -m "feat: connect login to Supabase client and update user-session for PIN login"
  ```

---

### Task 4: Bloqueo de Caja (Teclado PIN), Supervisor Override y Cierre a Ciegas
**Files:**
- Modify: `apps/web/src/app/pos/page.tsx`

- [ ] **Step 1: Componente PinLockScreen**
  Agregar un componente interactivo flotante a pantalla completa si `activeCashier` es nulo en el POS. Debe mostrar un teclado numérico táctil para ingresar el PIN de 4 dígitos.

- [ ] **Step 2: Supervisor Override Modal**
  Al eliminar un artículo de la lista de compra en el POS, si el cajero activo tiene rol `'cashier'`, mostrar un modal solicitando el PIN de supervisor. Validar mediante `auth.verifySupervisorPin`.

- [ ] **Step 3: Cierre a Ciegas (Blind Cash Drawer Drop)**
  Modificar el modal de cierre de turno en la UI del POS:
  1. Ocultar los totales teóricos de venta y efectivo en el cajón.
  2. Ofrecer un formulario de conteo manual:
     - Cantidad declarada de efectivo.
     - Cantidad declarada de tarjeta.
  3. Al enviar, registrar el turno enviando los valores al backend, calcular discrepancias y disparar la alerta al webhook de n8n.

- [ ] **Step 4: Commit**
  ```bash
  git add apps/web/src/app/pos/page.tsx
  git commit -m "feat: add PinLockScreen, supervisor overrides, and blind cash closures in POS page"
  ```

---

### Task 5: Router de Métricas Agregadas por Fecha y Rango Temporal
**Files:**
- Create: `packages/api/src/routers/analytics.ts`
- Modify: `packages/api/src/root.ts`

- [ ] **Step 1: Crear el router de analíticas (`packages/api/src/routers/analytics.ts`)**
  Agregar el procedimiento `getFinancialSummary` que consulta de forma dinámica `sales`, `saleItems` y `expenses` en base al rango de fechas provisto.

  ```typescript
  import { z } from 'zod';
  import { createTRPCRouter, adminProcedure } from '../trpc';
  import { sales, saleItems, expenses } from '@snapgad/db';
  import { and, eq, gte, lte, sql } from 'drizzle-orm';

  export const analyticsRouter = createTRPCRouter({
    getFinancialSummary: adminProcedure
      .input(
        z.object({
          startDate: z.string(), // ISO String
          endDate: z.string(),   // ISO String
          branchId: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const tenantId = ctx.session.tenantId;
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);

        // Condiciones para Ventas
        const salesConditions = [
          eq(sales.tenantId, tenantId),
          gte(sales.createdAt, start),
          lte(sales.createdAt, end),
          eq(sales.status, 'completed'),
        ];
        if (input.branchId) {
          salesConditions.push(eq(sales.branchId, input.branchId));
        }

        // Obtener el total de ventas e ingresos
        const [salesSum] = await ctx.db
          .select({
            totalRevenue: sql<string>`coalesce(sum(${sales.total}), 0)`,
            totalCost: sql<string>`coalesce(sum(${sales.costTotal}), 0)`,
          })
          .from(sales)
          .where(and(...salesConditions));

        // Condiciones para Gastos
        const expensesConditions = [
          eq(expenses.tenantId, tenantId),
          gte(expenses.date, start),
          lte(expenses.date, end),
        ];

        // Obtener el total de gastos operativos
        const [expensesSum] = await ctx.db
          .select({
            totalExpenses: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
          })
          .from(expenses)
          .where(and(...expensesConditions));

        const revenue = parseFloat(salesSum?.totalRevenue || '0');
        const costOfGoodsSold = parseFloat(salesSum?.totalCost || '0');
        const grossProfit = revenue - costOfGoodsSold;
        const opex = parseFloat(expensesSum?.totalExpenses || '0');
        const netProfit = grossProfit - opex;

        return {
          revenue,
          costOfGoodsSold,
          grossProfit,
          opex,
          netProfit,
          marginPct: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        };
      }),
  });
  ```

- [ ] **Step 2: Registrar `analyticsRouter` en el router raíz**
  Añadir `analytics` al index de `root.ts`.

- [ ] **Step 3: Compilar y verificar tRPC**
  Ejecutar: `npm run build`

- [ ] **Step 4: Commit**
  ```bash
  git add packages/api/src/routers/analytics.ts packages/api/src/root.ts
  git commit -m "feat: add analyticsRouter for date-segmented metrics and financials"
  ```

---

### Task 6: Panel Financiero Segmentado en Administración
**Files:**
- Modify: `apps/web/src/app/admin/page.tsx`

- [ ] **Step 1: Agregar el selector de rango temporal interactivo**
  Integrar selectores visuales rápidos (Hoy, Esta semana, Este mes, Personalizado) y inputs de fecha.

- [ ] **Step 2: Conectar cards financieras y Estado de Resultados al query tRPC**
  Consumir `trpc.analytics.getFinancialSummary.useQuery` enviando las fechas seleccionadas. Mostrar cargando con loading skeletons, y desplegar la utilidad neta real y márgenes del negocio.

- [ ] **Step 3: Compilar y verificar final**
  Ejecutar: `npm run build` para garantizar que no existan errores de tipado o imports en Next.js.

- [ ] **Step 4: Commit**
  ```bash
  git add apps/web/src/app/admin/page.tsx
  git commit -m "feat: connect P&L administration dashboard to real date-segmented analytics endpoints"
  ```
