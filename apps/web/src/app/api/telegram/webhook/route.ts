import { NextResponse } from 'next/server';
import { aiService } from '@snapgad/api/src/services/ai';
import { telegramService } from '@snapgad/api/src/services/telegram';

// Definición básica del Payload que envía Telegram
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    date: number;
    text?: string;
  };
}

export async function POST(req: Request) {
  try {
    const body: TelegramUpdate = await req.json();

    // 1. Extraer el mensaje y el chat
    const message = body.message;
    if (!message || !message.text) {
      // Ignoramos actualizaciones que no sean de texto (ej. imágenes o eventos de estado)
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const chatId = message.chat.id.toString();
    const userQuery = message.text;

    // 2. Seguridad / Identificación del Tenant
    // TODO: Consultar en la base de datos si el 'chatId' está vinculado a un comercio activo.
    // Const tenant = await db.query.tenants.findFirst({ where: eq(tenants.telegramChatId, chatId) });
    // if (!tenant) return ...
    
    // Por ahora para el MVP inyectaremos un contexto "MOCK" simulando que encontramos la sucursal del dueño
    const mockTenantContext = {
      businessName: "Abarrotes La Esperanza",
      branchName: "Matriz Principal",
      todaySalesTotal: 4520.50,
      todayTransactionsCount: 38,
      topSellingProductToday: "Coca-Cola Original 600ml",
      lowStockAlerts: [
        { product: "Aceite Nutrioli 1L", remainingStock: 2 },
        { product: "Jabón Zote", remainingStock: 4 }
      ]
    };

    // 3. Procesar la consulta con Gemini
    const aiResponse = await aiService.processMerchantQuery(userQuery, mockTenantContext);

    // 4. Devolver la respuesta de la IA a través del bot de Telegram
    await telegramService.sendMessage(chatId, aiResponse);

    return NextResponse.json({ status: 'success' }, { status: 200 });

  } catch (error) {
    console.error('Error procesando webhook de Telegram:', error);
    // Siempre devolvemos 200 a Telegram para que no reintente el envío infinitamente si hay un error nuestro
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}
