import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, adminProcedure } from '../trpc';
import { customers } from '@snapgad/db';
import { eq, and, ilike } from 'drizzle-orm';

// Schema de validación Zod para la creación y edición
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'El nombre del cliente es obligatorio.'),
  phone: z.string().optional(),
  email: z.string().email('Debe ser un correo válido.').optional().or(z.literal('')),
  address: z.string().optional(),
  rfc: z.string().optional(),
  creditEnabled: z.boolean().default(false),
  creditLimit: z.string().default('0.00'),
  paymentDays: z.number().int().min(0).default(7),
});

export const customersRouter = createTRPCRouter({
  // Lista de clientes filtrada por tenant y búsqueda
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        page: z.number().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId;
      const offset = (input.page - 1) * input.limit;

      const conditions = [eq(customers.tenantId, tenantId)];

      if (input.search) {
        // Búsqueda por nombre o RFC
        conditions.push(
          ilike(customers.name, `%${input.search}%`)
        );
      }

      const items = await ctx.db
        .select()
        .from(customers)
        .where(and(...conditions))
        .limit(input.limit)
        .offset(offset);

      return {
        items,
        page: input.page,
        limit: input.limit,
      };
    }),

  // Crear un nuevo cliente (Cajero puede crear, pero límite de crédito requiere admin usualmente; aquí lo permitimos global por demo)
  create: protectedProcedure
    .input(createCustomerSchema)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId;

      const [newCustomer] = await ctx.db
        .insert(customers)
        .values([{
          tenantId,
          name: input.name,
          phone: input.phone,
          email: input.email,
          address: input.address,
          rfc: input.rfc,
          creditEnabled: input.creditEnabled,
          creditLimit: input.creditLimit,
          paymentDays: input.paymentDays,
          currentBalance: '0.00',
        } as any]) // bypass Drizzle string-to-decimal inference for now
        .returning();

      return newCustomer;
    }),
});
