import { initTRPC, TRPCError } from '@trpc/server';
import { db, getTenantDb, tenants } from '@snapgad/db';
import { eq } from 'drizzle-orm';
import type { UserRole } from '@snapgad/types';

// In-memory cache mapping tenantId -> dbConnectionString to prevent database roundtrips
const tenantConnStringCache: Record<string, string> = {};

export async function resolveTenantDb(tenantId: string) {
  // If connection is cached, return dynamic DB instance directly
  if (tenantConnStringCache[tenantId]) {
    return getTenantDb(tenantConnStringCache[tenantId]);
  }
  
  // Otherwise, fetch from Central Master Directory Database
  const [tenant] = await db
    .select({ dbConnectionString: tenants.dbConnectionString })
    .from(tenants)
    .where(eq(tenants.id, tenantId));
    
  if (tenant?.dbConnectionString) {
    tenantConnStringCache[tenantId] = tenant.dbConnectionString;
    return getTenantDb(tenant.dbConnectionString);
  }
  
  // Fallback to central DB instance if no dedicated connection is configured
  return db;
}

// Definición de contexto
export interface CreateContextOptions {
  session?: {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
    };
    tenantId: string;
    branchId?: string;
  };
}

export const createTRPCContext = async (opts: CreateContextOptions) => {
  // Resolve dynamic tenant database client if authenticated
  let dynamicDb = db;
  if (opts.session?.tenantId) {
    try {
      dynamicDb = await resolveTenantDb(opts.session.tenantId);
    } catch (e) {
      console.error('Failed to resolve dynamic tenant database connection:', e);
    }
  }

  return {
    db: dynamicDb,
    session: opts.session,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Middleware para validar que el usuario está autenticado y tiene un tenant asignado
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.tenantId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Debes iniciar sesión con un tenant válido.',
    });
  }
  return next({
    ctx: {
      ...ctx,
      // Garantizar que session y tenantId no son nullables para los siguientes procedimientos
      session: ctx.session,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);

// Middleware para validar que el usuario es Administrador, Dueño o Superadmin
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.tenantId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Debes iniciar sesión con un tenant válido.',
    });
  }
  
  const role = ctx.session.user.role;
  if (role !== 'owner' && role !== 'admin' && role !== 'superadmin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Requieres permisos de Administrador o Dueño para realizar esta acción.',
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const adminProcedure = t.procedure.use(isAdmin);
export const mergeRouters = t.mergeRouters;
