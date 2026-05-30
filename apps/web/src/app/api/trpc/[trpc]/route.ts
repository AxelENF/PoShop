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
          return cookieHeader.split(';').map(v => v.trim().split('=')).map(([name, value]) => ({ name: name || '', value: value || '' }));
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
          role: dbUser.role as any,
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
