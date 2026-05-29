import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createTRPCContext } from '@snapgad/api';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => {
      // Mock Bypass: Forzamos una sesión local para que tRPC funcione mientras construimos el Auth
      return createTRPCContext({
        session: {
          user: {
            id: 'local-dev-user',
            name: 'Cajero Local',
            email: 'cajero@snapgad.com',
            role: 'admin',
          },
          tenantId: 'tenant-demo',
        }
      });
    },
  });

export { handler as GET, handler as POST };
