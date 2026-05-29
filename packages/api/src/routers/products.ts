import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, adminProcedure } from '../trpc';
import { products } from '@snapgad/db';
import { eq, and, ilike } from 'drizzle-orm';

// Schema de validación Zod para la creación
export const createProductSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio.'),
  description: z.string().optional(),
  barcode: z.string().optional(),
  internalCode: z.string().optional(),
  category: z.string().optional(),
  unit: z.enum(['pza', 'kg', 'g', 'l', 'ml', 'caja', 'servicio']).default('pza'),
  costPrice: z.string().default('0.00'),
  salePrice: z.string().min(1, 'El precio de venta es obligatorio.'),
  wholesalePrice: z.string().optional(),
  stock: z.string().default('0.000'),
  stockMin: z.string().default('0.000'),
  stockCritical: z.string().default('0.000'),
});

export const productsRouter = createTRPCRouter({
  // Lista de productos filtrada por tenant y búsqueda
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        page: z.number().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId;
      const offset = (input.page - 1) * input.limit;

      const conditions = [eq(products.tenantId, tenantId)];

      if (input.search) {
        conditions.push(ilike(products.name, `%${input.search}%`));
      }

      if (input.category) {
        conditions.push(eq(products.category, input.category));
      }

      const items = await ctx.db
        .select()
        .from(products)
        .where(and(...conditions))
        .limit(input.limit)
        .offset(offset);

      return {
        items,
        page: input.page,
        limit: input.limit,
      };
    }),

  // Crear un producto (requiere rol de administrador o superior)
  create: adminProcedure
    .input(createProductSchema)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId;

      const [newProduct] = await ctx.db
        .insert(products)
        .values([{
          tenantId,
          name: input.name,
          description: input.description,
          barcode: input.barcode,
          internalCode: input.internalCode,
          category: input.category,
          unit: input.unit,
          costPrice: input.costPrice,
          salePrice: input.salePrice,
          wholesalePrice: input.wholesalePrice,
          stock: input.stock,
          stockMin: input.stockMin,
          stockCritical: input.stockCritical,
        } as any])
        .returning();

      return newProduct;
    }),
});
