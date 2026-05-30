import { z } from 'zod';
import { createTRPCRouter, adminProcedure } from '../trpc';
import { sales, expenses } from '@snapgad/db';
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

      try {
        // Condiciones para Ventas
        const salesConditions = [
          eq(sales.tenantId, tenantId),
          gte(sales.createdAt, start),
          lte(sales.createdAt, end),
          eq(sales.status, 'completed'),
        ];
        if (input.branchId && input.branchId !== 'all') {
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
          isReal: true,
        };
      } catch (error) {
        console.warn('⚡ [PoShop Offline fallback] DATABASE OFFLINE O ECONNREFUSED DETECTADO. Usando simulación de datos:', error);
        
        // Simular datos para que la interfaz cargue correctamente
        const defaultRevenue = 18240.00;
        const defaultCOGS = 13394.50;
        const defaultExpenses = 8550.00;
        const grossProfit = defaultRevenue - defaultCOGS;
        const netProfit = grossProfit - defaultExpenses;

        return {
          revenue: defaultRevenue,
          costOfGoodsSold: defaultCOGS,
          grossProfit,
          opex: defaultExpenses,
          netProfit,
          marginPct: defaultRevenue > 0 ? (grossProfit / defaultRevenue) * 100 : 0,
          isReal: false,
        };
      }
    }),
});
