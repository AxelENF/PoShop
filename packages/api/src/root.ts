import { createTRPCRouter } from './trpc';
import { productsRouter } from './routers/products';
import { customersRouter } from './routers/customers';
import { onboardingRouter } from './routers/onboarding';
import { telegramRouter } from './routers/telegram';

export const appRouter = createTRPCRouter({
  products: productsRouter,
  customers: customersRouter,
  onboarding: onboardingRouter,
  telegram: telegramRouter,
});

// Exponer la definición de tipos para el frontend
export type AppRouter = typeof appRouter;
export type { CreateContextOptions } from './trpc';
export { createTRPCContext } from './trpc';
export { createProductSchema } from './routers/products';
