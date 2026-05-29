export class TelegramService {
  private readonly botToken: string | undefined;
  private readonly baseUrl: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Enviar un mensaje de texto simple a un chat de Telegram
   */
  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.botToken) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN no configurado. Mensaje ignorado:', text);
      return false; // Simulación de bypass local
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Error enviando mensaje a Telegram:', errorBody);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Fallo en la comunicación con Telegram API:', error);
      return false;
    }
  }

  /**
   * Plantilla: Resumen Financiero Diario
   */
  async sendDailyReport(chatId: string, data: { branchName: string; totalSales: number; transactions: number }): Promise<boolean> {
    const text = `
<b>📊 RESUMEN DIARIO - SNAPGAD</b>
🏢 <i>${data.branchName}</i>

💰 <b>Venta Total:</b> $${data.totalSales.toFixed(2)}
🧾 <b>Transacciones:</b> ${data.transactions}

<i>"La gestión proactiva es la clave del éxito."</i>
    `;
    return this.sendMessage(chatId, text);
  }

  /**
   * Plantilla: Alerta Crítica de Inventario
   */
  async sendCriticalStockAlert(chatId: string, productName: string, stock: number): Promise<boolean> {
    const text = `
<b>⚠️ ALERTA DE INVENTARIO CRÍTICO</b>
El producto <b>${productName}</b> ha llegado a su nivel crítico de existencias.
📦 <b>Restantes:</b> ${stock}

Por favor, reabastece este producto a la brevedad.
    `;
    return this.sendMessage(chatId, text);
  }
}

// Singleton export para usar a lo largo del backend
export const telegramService = new TelegramService();
