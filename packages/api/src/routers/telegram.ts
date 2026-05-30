import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { telegramService } from '../services/telegram';

export const telegramRouter = createTRPCRouter({
  
  // Endpoint para enviar un mensaje de prueba para verificar que el chat ID es correcto
  sendTestMessage: protectedProcedure
    .input(z.object({
      chatId: z.string().min(1, 'Se requiere el ID del Chat de Telegram'),
      botToken: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const success = await telegramService.sendMessage(
        input.chatId,
        '🤖 <b>SNAPGAD POS</b>\n¡Conexión exitosa! Este canal recibirá las alertas de cortes de caja y existencias de tu negocio.',
        input.botToken
      );

      return {
        success,
        message: success ? 'Mensaje enviado correctamente.' : 'Fallo al enviar. Revisa el Token y el Chat ID.',
      };
    }),

});
