import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, adminProcedure } from '../trpc';
import { products, auditLogs } from '@snapgad/db';
import { eq, and, ilike, sql } from 'drizzle-orm';

// Schema de validación Zod para la creación
export const createProductSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio.'),
  description: z.string().optional(),
  barcode: z.string().optional(),
  internalCode: z.string().optional(),
  category: z.string().optional(),
  unit: z.enum(['pza', 'kg', 'g', 'l', 'ml', 'caja', 'servicio']).default('pza'),
  costPrice: z.number().default(0),
  salePrice: z.number().min(0.01, 'El precio de venta es obligatorio.'),
  wholesalePrice: z.number().optional(),
  stock: z.number().default(0),
  stockMin: z.number().default(0),
  stockCritical: z.number().default(0),
});

export const productsRouter = createTRPCRouter({
  // Lista de productos filtrada por tenant y búsqueda
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().min(1).max(250).default(100),
        page: z.number().min(1).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId;
      const offset = (input.page - 1) * input.limit;

      const conditions = [eq(products.tenantId, tenantId)];

      if (input.search) {
        conditions.push(
          ilike(products.name, `%${input.search}%`)
        );
      }

      if (input.category && input.category !== 'Todos') {
        conditions.push(eq(products.category, input.category));
      }

      const items = await ctx.db
        .select()
        .from(products)
        .where(and(...conditions))
        .limit(input.limit)
        .offset(offset);

      // Mapear Decimal a Number
      const formattedItems = items.map(p => ({
        ...p,
        costPrice: parseFloat(p.costPrice || '0.00'),
        salePrice: parseFloat(p.salePrice || '0.00'),
        wholesalePrice: p.wholesalePrice ? parseFloat(p.wholesalePrice) : undefined,
        stock: parseFloat(p.stock || '0.000'),
        stockMin: parseFloat(p.stockMin || '0.000'),
        stockCritical: parseFloat(p.stockCritical || '0.000'),
      }));

      return {
        items: formattedItems,
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
          description: input.description || null,
          barcode: input.barcode || null,
          internalCode: input.internalCode || null,
          category: input.category || 'Abarrotes',
          unit: input.unit,
          costPrice: input.costPrice.toFixed(2),
          salePrice: input.salePrice.toFixed(2),
          wholesalePrice: input.wholesalePrice ? input.wholesalePrice.toFixed(2) : null,
          stock: input.stock.toFixed(3),
          stockMin: input.stockMin.toFixed(3),
          stockCritical: input.stockCritical.toFixed(3),
        } as any])
        .returning();

      // Log action in audit logs
      await ctx.db.insert(auditLogs).values([{
        tenantId,
        userId: ctx.session.user.id,
        action: 'PRODUCT_CREATE',
        details: {
          productId: newProduct.id,
          name: newProduct.name,
          internalCode: newProduct.internalCode,
          salePrice: input.salePrice,
          stock: input.stock,
        },
      } as any]);

      return {
        ...newProduct,
        costPrice: parseFloat(newProduct.costPrice || '0.00'),
        salePrice: parseFloat(newProduct.salePrice || '0.00'),
        wholesalePrice: newProduct.wholesalePrice ? parseFloat(newProduct.wholesalePrice) : undefined,
        stock: parseFloat(newProduct.stock || '0.000'),
        stockMin: parseFloat(newProduct.stockMin || '0.000'),
        stockCritical: parseFloat(newProduct.stockCritical || '0.000'),
      };
    }),

  // Actualizar un producto
  updateProduct: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      costPrice: z.number(),
      salePrice: z.number(),
      stock: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId;

      const [updated] = await ctx.db
        .update(products)
        .set({
          costPrice: input.costPrice.toFixed(2),
          salePrice: input.salePrice.toFixed(2),
          stock: input.stock.toFixed(3),
        } as any)
        .where(and(eq(products.id, input.id), eq(products.tenantId, tenantId)))
        .returning();

      if (!updated) {
        throw new Error('Producto no encontrado');
      }

      // Log in audit logs
      await ctx.db.insert(auditLogs).values([{
        tenantId,
        userId: ctx.session.user.id,
        action: 'PRODUCT_EDIT',
        details: {
          productId: updated.id,
          name: updated.name,
          costPrice: input.costPrice,
          salePrice: input.salePrice,
          stock: input.stock,
        },
      } as any]);

      return {
        ...updated,
        costPrice: parseFloat(updated.costPrice || '0.00'),
        salePrice: parseFloat(updated.salePrice || '0.00'),
        wholesalePrice: updated.wholesalePrice ? parseFloat(updated.wholesalePrice) : undefined,
        stock: parseFloat(updated.stock || '0.000'),
        stockMin: parseFloat(updated.stockMin || '0.000'),
        stockCritical: parseFloat(updated.stockCritical || '0.000'),
      };
    }),

  // Desensamblar Caja (Unpack) en base de datos transaccional
  unpackBox: adminProcedure
    .input(z.object({
      parentId: z.string().uuid(),
      childId: z.string().uuid(),
      multiplier: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId;

      return await ctx.db.transaction(async (tx) => {
        // Obtener el producto padre (caja)
        const [parent] = await tx
          .select()
          .from(products)
          .where(and(eq(products.id, input.parentId), eq(products.tenantId, tenantId)));

        if (!parent) {
          throw new Error('El producto de caja padre no fue encontrado.');
        }

        const parentStock = parseFloat(parent.stock || '0.000');
        if (parentStock < 1) {
          throw new Error(`Existencias insuficientes: La caja "${parent.name}" tiene stock de ${parentStock} (mínimo requerido: 1.000)`);
        }

        // Obtener el producto hijo (pieza individual)
        const [child] = await tx
          .select()
          .from(products)
          .where(and(eq(products.id, input.childId), eq(products.tenantId, tenantId)));

        if (!child) {
          throw new Error('El producto de pieza individual hijo no fue encontrado.');
        }

        const childStock = parseFloat(child.stock || '0.000');

        // Actualizar stocks
        const nextParentStock = parentStock - 1;
        const nextChildStock = childStock + input.multiplier;

        const [updatedParent] = await tx
          .update(products)
          .set({ stock: nextParentStock.toFixed(3) } as any)
          .where(eq(products.id, parent.id))
          .returning();

        const [updatedChild] = await tx
          .update(products)
          .set({ stock: nextChildStock.toFixed(3) } as any)
          .where(eq(products.id, child.id))
          .returning();

        // Registrar auditoría
        await tx.insert(auditLogs).values([{
          tenantId,
          userId: ctx.session.user.id,
          action: 'BOX_UNPACK',
          details: {
            parentId: parent.id,
            parentName: parent.name,
            childId: child.id,
            childName: child.name,
            multiplier: input.multiplier,
            parentOldStock: parentStock,
            parentNewStock: nextParentStock,
            childOldStock: childStock,
            childNewStock: nextChildStock,
          },
        } as any]);

        return {
          parent: {
            ...updatedParent,
            costPrice: parseFloat(updatedParent.costPrice || '0.00'),
            salePrice: parseFloat(updatedParent.salePrice || '0.00'),
            stock: parseFloat(updatedParent.stock || '0.000'),
          },
          child: {
            ...updatedChild,
            costPrice: parseFloat(updatedChild.costPrice || '0.00'),
            salePrice: parseFloat(updatedChild.salePrice || '0.00'),
            stock: parseFloat(updatedChild.stock || '0.000'),
          }
        };
      });
    }),

  // bulkSeed: Upsert masivo de catálogo presets
  bulkSeed: adminProcedure
    .input(z.object({
      items: z.array(z.object({
        name: z.string(),
        category: z.string(),
        barcode: z.string(),
        internalCode: z.string(),
        unit: z.string(),
        costPrice: z.number(),
        salePrice: z.number(),
        stock: z.number(),
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId;

      let addedCount = 0;
      let updatedCount = 0;

      for (const item of input.items) {
        // Buscar por código o barcode
        const [existing] = await ctx.db
          .select()
          .from(products)
          .where(
            and(
              eq(products.tenantId, tenantId),
              sql`(${products.barcode} = ${item.barcode} OR ${products.internalCode} = ${item.internalCode})`
            )
          );

        if (existing) {
          const currentStock = parseFloat(existing.stock || '0.000');
          const newStock = currentStock + item.stock;
          await ctx.db
            .update(products)
            .set({ stock: newStock.toFixed(3) } as any)
            .where(eq(products.id, existing.id));
          updatedCount++;
        } else {
          await ctx.db.insert(products).values({
            tenantId,
            name: item.name,
            category: item.category,
            barcode: item.barcode,
            internalCode: item.internalCode,
            unit: item.unit as any,
            costPrice: item.costPrice.toFixed(2),
            salePrice: item.salePrice.toFixed(2),
            stock: item.stock.toFixed(3),
            stockMin: '10.000',
            stockCritical: '3.000',
          } as any);
          addedCount++;
        }
      }

      return {
        addedCount,
        updatedCount,
      };
    }),

  // updateThresholds: Actualizar alertas globales de stock mínimo y crítico por categoría
  updateThresholds: adminProcedure
    .input(z.object({
      category: z.string(),
      stockMin: z.number(),
      stockCritical: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId;

      const conditions = [eq(products.tenantId, tenantId)];

      if (input.category && input.category !== 'Todos') {
        conditions.push(eq(products.category, input.category));
      }

      await ctx.db
        .update(products)
        .set({
          stockMin: input.stockMin.toFixed(3),
          stockCritical: input.stockCritical.toFixed(3),
        } as any)
        .where(and(...conditions));

      // Log in audit logs
      await ctx.db.insert(auditLogs).values([{
        tenantId,
        userId: ctx.session.user.id,
        action: 'PRODUCT_THRESHOLDS_UPDATE',
        details: {
          category: input.category,
          stockMin: input.stockMin,
          stockCritical: input.stockCritical,
        },
      } as any]);

      return { success: true };
    }),
});

