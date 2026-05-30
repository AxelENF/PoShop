import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { tenants, branches, cashRegisters, users, products as productsTable } from '@snapgad/db';
import { eq } from 'drizzle-orm';
import { db } from '@snapgad/db';
import { TRPCError } from '@trpc/server';

export const setupTenantSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido.'),
  businessName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  profile: z.enum(['general', 'weight', 'catalog', 'distribution', 'services']).default('general'),
  branchName: z.string().min(1).default('Matriz Principal'),
  cashRegisterName: z.string().min(1).default('Caja 01'),
  telegramChatId: z.string().optional(),
  preloadSeedData: z.boolean().default(false),
});

// Semillero de productos básicos para onboarding express
const ONBOARDING_SEED_PRODUCTS = [
  { name: 'Coca-Cola Original 600ml', barcode: '7501055300075', category: 'Bebidas', costPrice: '13.50', salePrice: '19.00', unit: 'pza' as const },
  { name: 'Aceite Nutrioli 1L', barcode: '7501017006090', category: 'Abarrotes', costPrice: '32.00', salePrice: '42.00', unit: 'pza' as const },
  { name: 'Leche Alpura Clásica 1L', barcode: '7501000111207', category: 'Lácteos', costPrice: '19.50', salePrice: '26.00', unit: 'pza' as const },
  { name: 'Pan Bimbo Blanco Grande', barcode: '7501000153122', category: 'Panadería', costPrice: '28.00', salePrice: '38.00', unit: 'pza' as const },
  { name: 'Jabón Roma 250g', barcode: '7501003000145', category: 'Limpieza', costPrice: '8.00', salePrice: '12.00', unit: 'pza' as const },
];

export const onboardingRouter = createTRPCRouter({
  // Verificar si un usuario ya completó el onboarding
  checkStatus: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      const [userRow] = await db
        .select({ tenantId: users.tenantId, name: users.name, role: users.role })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!userRow) {
        return { completed: false, tenantId: null };
      }

      const [tenantRow] = await db
        .select({ id: tenants.id, name: tenants.name, planStatus: tenants.planStatus, settings: tenants.settings })
        .from(tenants)
        .where(eq(tenants.id, userRow.tenantId))
        .limit(1);

      const settings = (tenantRow?.settings as Record<string, unknown>) ?? {};
      const onboardingCompleted = settings?.onboardingCompleted === true;

      return {
        completed: onboardingCompleted,
        tenantId: tenantRow?.id ?? null,
        tenantName: tenantRow?.name ?? null,
      };
    }),

  // Configuración completa del comercio — persiste en Supabase PostgreSQL
  setup: publicProcedure
    .input(setupTenantSchema)
    .mutation(async ({ input }) => {
      // 1. Buscar el usuario en public.users (fue creado por el trigger de auth)
      const [existingUser] = await db
        .select({ tenantId: users.tenantId, role: users.role })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!existingUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuario no encontrado. Verifica que tu cuenta de autenticación esté correctamente vinculada.',
        });
      }

      const tenantId = existingUser.tenantId;

      // 2. Actualizar el nombre del negocio y perfil en la tabla tenants
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const slug = input.businessName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString().slice(-6);

      await db
        .update(tenants)
        .set({
          name: input.businessName,
          profile: input.profile,
          slug,
          settings: { onboardingCompleted: true, setupAt: new Date().toISOString() },
          updatedAt: new Date(),
        } as any)
        .where(eq(tenants.id, tenantId));

      // 3. Crear la primera sucursal
      const [branch] = await db
        .insert(branches)
        .values({
          tenantId,
          name: input.branchName,
          isActive: true,
        } as any)
        .returning({ id: branches.id, name: branches.name });

      // 4. Crear la primera caja registradora
      const [cashRegister] = await db
        .insert(cashRegisters)
        .values({
          tenantId,
          branchId: branch.id,
          name: input.cashRegisterName,
          isActive: true,
        } as any)
        .returning({ id: cashRegisters.id, name: cashRegisters.name });

      // 5. Actualizar usuario con branchId y telegramChatId si aplica
      await db
        .update(users)
        .set({
          branchId: branch.id,
          ...(input.telegramChatId ? { telegramChatId: input.telegramChatId } : {}),
        } as any)
        .where(eq(users.id, input.userId));

      // 6. Precargar semillero básico de productos si fue solicitado
      if (input.preloadSeedData) {
        await db.insert(productsTable).values(
          ONBOARDING_SEED_PRODUCTS.map((p) => ({
            tenantId,
            name: p.name,
            barcode: p.barcode,
            category: p.category,
            costPrice: p.costPrice,
            salePrice: p.salePrice,
            unit: p.unit,
            stock: '10.000',
            stockMin: '2.000',
            stockCritical: '0.000',
          })) as any[]
        );
      }

      return {
        success: true,
        tenantId,
        branchId: branch.id,
        cashRegisterId: cashRegister.id,
        businessName: input.businessName,
        branchName: branch.name,
        cashRegisterName: cashRegister.name,
        productsSeeded: input.preloadSeedData ? ONBOARDING_SEED_PRODUCTS.length : 0,
      };
    }),
});
