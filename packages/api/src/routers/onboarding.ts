import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { tenants, branches, cashRegisters, products } from '@snapgad/db';

export const setupTenantSchema = z.object({
  businessName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  profile: z.enum(['general', 'weight', 'catalog', 'distribution', 'services']).default('general'),
  branchName: z.string().default('Matriz Principal'),
  cashRegisterName: z.string().default('Caja 01'),
  preloadData: z.boolean().default(true),
});

export const onboardingRouter = createTRPCRouter({
  // Configuración Inicial del Comercio
  setup: protectedProcedure
    .input(setupTenantSchema)
    .mutation(async ({ ctx, input }) => {
      // NOTA: En el futuro esto estará envuelto en una ctx.db.transaction()
      
      // 1. Validar si el usuario ya tiene un tenant configurado de manera real
      // (Por ahora permitimos la ejecución mock)

      // 2. Aquí irían las inserciones a base de datos (tenants, branches, cashRegisters)
      // simularemos éxito devolviendo los parámetros por ahora para el MVP
      
      const mockResult = {
        success: true,
        tenantName: input.businessName,
        branch: input.branchName,
        cashRegister: input.cashRegisterName,
        preloaded: input.preloadData,
      };

      return mockResult;
    }),
});
