import { GoogleGenAI } from '@google/genai';

export class AIService {
  private readonly client: GoogleGenAI | null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    } else {
      this.client = null;
      console.warn('⚠️ GEMINI_API_KEY no configurado. El bot interactivo no funcionará.');
    }
  }

  /**
   * Procesa una pregunta del usuario a través de Gemini 2.5 Flash
   * @param text La pregunta en lenguaje natural enviada vía Telegram
   * @param contextData Datos en crudo (ej. resumen de ventas del día) para que la IA responda
   */
  async processMerchantQuery(text: string, contextData: any): Promise<string> {
    if (!this.client) {
      return "Lo siento, la inteligencia artificial no está configurada en este entorno (Falta GEMINI_API_KEY).";
    }

    const systemPrompt = `
Eres SNAPGAD Nexus, el asistente financiero y operativo del dueño de este comercio.
Tu objetivo es responder de forma concisa, profesional y directa basándote ÚNICAMENTE en el contexto de datos proporcionado.
Si el usuario pregunta algo sobre sus ventas, inventario o negocio, usa el JSON proporcionado para darle la respuesta exacta.
Si el usuario pregunta algo que no está en el contexto, indícale amablemente que no tienes esa información actualmente.
NO inventes datos. Formatea tu respuesta usando negritas de HTML (<b>texto</b>) y cursivas (<i>texto</i>) para que se vea bien en Telegram.

CONTEXTO ACTUAL DEL NEGOCIO (JSON):
${JSON.stringify(contextData, null, 2)}
    `;

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: text,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1, // Baja temperatura para mantener respuestas factuales
        }
      });

      return response.text || "Lo siento, no pude procesar tu solicitud en este momento.";
    } catch (error) {
      console.error('Error al procesar query con Gemini:', error);
      return "Hubo un error de conexión con los servidores de Inteligencia Artificial de SNAPGAD.";
    }
  }
}

export const aiService = new AIService();
