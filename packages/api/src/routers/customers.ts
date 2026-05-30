import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, adminProcedure } from '../trpc';
import { customers, auditLogs } from '@snapgad/db';
import { eq, and, ilike, sql, desc } from 'drizzle-orm';

// Schema de validación Zod para la creación y edición
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'El nombre del cliente es obligatorio.'),
  phone: z.string().optional(),
  email: z.string().email('Debe ser un correo válido.').optional().or(z.literal('')),
  address: z.string().optional(),
  rfc: z.string().optional(),
  creditEnabled: z.boolean().default(false),
  creditLimit: z.number().default(0),
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

      // Mapear saldos y límites de decimal a number para simplificar en UI
      const formattedItems = items.map(c => ({
        ...c,
        creditLimit: parseFloat(c.creditLimit || '0.00'),
        currentBalance: parseFloat(c.currentBalance || '0.00'),
      }));

      return {
        items: formattedItems,
        page: input.page,
        limit: input.limit,
      };
    }),

  // Crear un nuevo cliente
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
          email: input.email || null,
          address: input.address || null,
          rfc: input.rfc || null,
          creditEnabled: input.creditEnabled,
          creditLimit: input.creditLimit.toFixed(2),
          paymentDays: input.paymentDays,
          currentBalance: '0.00',
        } as any])
        .returning();

      // Log action in audit logs
      await ctx.db.insert(auditLogs).values([{
        tenantId,
        userId: ctx.session.user.id,
        action: 'CUSTOMER_CREATE',
        details: {
          customerId: newCustomer.id,
          customerName: newCustomer.name,
          creditEnabled: newCustomer.creditEnabled,
          creditLimit: input.creditLimit,
        },
      } as any]);

      return {
        ...newCustomer,
        creditLimit: parseFloat(newCustomer.creditLimit || '0.00'),
        currentBalance: parseFloat(newCustomer.currentBalance || '0.00'),
      };
    }),

  // Modificar límites de crédito (Requiere permisos de Admin)
  toggleCredit: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      creditEnabled: z.boolean(),
      creditLimit: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId;

      const [updatedCustomer] = await ctx.db
        .update(customers)
        .set({
          creditEnabled: input.creditEnabled,
          creditLimit: input.creditLimit.toFixed(2),
        } as any)
        .where(and(eq(customers.id, input.id), eq(customers.tenantId, tenantId)))
        .returning();

      if (!updatedCustomer) {
        throw new Error('Cliente no encontrado');
      }

      // Log in audit logs
      await ctx.db.insert(auditLogs).values([{
        tenantId,
        userId: ctx.session.user.id,
        action: 'CUSTOMER_CREDIT_UPDATE',
        details: {
          customerId: updatedCustomer.id,
          customerName: updatedCustomer.name,
          creditEnabled: input.creditEnabled,
          creditLimit: input.creditLimit,
        },
      } as any]);

      return {
        ...updatedCustomer,
        creditLimit: parseFloat(updatedCustomer.creditLimit || '0.00'),
        currentBalance: parseFloat(updatedCustomer.currentBalance || '0.00'),
      };
    }),

  // Registrar abonos y cargos manuales ("fiados")
  adjustBalance: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      type: z.enum(['cargo', 'abono']),
      amount: z.number().positive('El monto debe ser mayor a cero.'),
      details: z.string().min(1, 'El detalle del movimiento es obligatorio.'),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId;

      // Obtener saldo actual
      const [customer] = await ctx.db
        .select()
        .from(customers)
        .where(and(eq(customers.id, input.id), eq(customers.tenantId, tenantId)));

      if (!customer) {
        throw new Error('Cliente no encontrado');
      }

      const currentBal = parseFloat(customer.currentBalance || '0.00');
      const limit = parseFloat(customer.creditLimit || '0.00');
      
      let nextBalance = currentBal;
      if (input.type === 'cargo') {
        nextBalance += input.amount;
        if (customer.creditEnabled && nextBalance > limit) {
          throw new Error(`Operación inválida: El cargo excede el límite de crédito disponible por $${(nextBalance - limit).toFixed(2)} MXN.`);
        }
      } else {
        nextBalance = Math.max(0, currentBal - input.amount);
      }

      const [updatedCustomer] = await ctx.db
        .update(customers)
        .set({
          currentBalance: nextBalance.toFixed(2),
        } as any)
        .where(and(eq(customers.id, input.id), eq(customers.tenantId, tenantId)))
        .returning();

      // Log in audit logs
      await ctx.db.insert(auditLogs).values([{
        tenantId,
        userId: ctx.session.user.id,
        action: input.type === 'cargo' ? 'CUSTOMER_DEBT_INCREASE' : 'CUSTOMER_PAYMENT',
        details: {
          customerId: customer.id,
          customerName: customer.name,
          type: input.type,
          amount: input.amount,
          previousBalance: currentBal,
          newBalance: nextBalance,
          description: input.details,
        },
      } as any]);

      return {
        ...updatedCustomer,
        creditLimit: parseFloat(updatedCustomer.creditLimit || '0.00'),
        currentBalance: parseFloat(updatedCustomer.currentBalance || '0.00'),
      };
    }),

  // Obtener el historial de movimientos de crédito/pagos
  getLedger: protectedProcedure
    .input(z.object({
      customerId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.session.tenantId;

      const logs = await ctx.db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.tenantId, tenantId),
            sql`details->>'customerId' = ${input.customerId}`
          )
        )
        .orderBy(desc(auditLogs.createdAt));

      // Mapear logs de auditoría al formato del ledger
      return logs.map(log => {
        const details = log.details as any;
        return {
          id: log.id,
          customerId: details.customerId,
          type: details.type || (log.action === 'CUSTOMER_DEBT_INCREASE' ? 'cargo' : 'abono'),
          amount: parseFloat(details.amount || '0.00'),
          balance: parseFloat(details.newBalance || '0.00'),
          date: log.createdAt ? new Date(log.createdAt).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A',
          details: details.description || (log.action === 'CUSTOMER_DEBT_INCREASE' ? 'Cargo por venta fiada' : 'Abono manual registrado'),
        };
      });
    }),
});
