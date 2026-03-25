'use server';
/**
 * @fileOverview Flujo de Genkit para análisis conversacional Estratégico.
 * Cero actúa como un consultor constante.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const InventoryAnalystInputSchema = z.object({
  query: z.string().describe('La pregunta o comando del usuario sobre el negocio.'),
  currentInventory: z.array(z.any()).describe('Estado actual de los activos en el sistema.'),
});
export type InventoryAnalystInput = z.infer<typeof InventoryAnalystInputSchema>;

const InventoryAnalystOutputSchema = z.object({
  response: z.string().describe('Respuesta clara y estratégica de Cero.'),
  suggestedActions: z.array(z.string()).optional().describe('Acciones recomendadas.'),
});
export type InventoryAnalystOutput = z.infer<typeof InventoryAnalystOutputSchema>;

const InventoryAnalystPromptInputSchema = z.object({
  query: z.string(),
  inventoryString: z.string(),
});

export async function analyzeInventory(input: InventoryAnalystInput): Promise<InventoryAnalystOutput> {
  const isSimulation = !process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_GENAI_API_KEY.length < 10;

  if (isSimulation) {
    return {
      response: "Cero (Modo Consulta): Estoy analizando tu flujo de activos. Actualmente el sistema opera con datos locales para garantizar la velocidad de respuesta.",
      suggestedActions: ["Ver Reporte de ROI", "Auditar Insumos"]
    };
  }

  try {
    return await inventoryAnalystFlow(input);
  } catch (error: any) {
    console.error("Error en flujo de analista:", error);
    return {
      response: "Cero está operando en modo de respuesta rápida local. ¿Deseas que analice tus mermas o ventas del día?",
      suggestedActions: ["Analizar Mermas", "Ver Ventas Hoy"]
    };
  }
}

const prompt = ai.definePrompt({
  name: 'inventoryAnalystPrompt',
  input: { schema: InventoryAnalystPromptInputSchema },
  output: { schema: InventoryAnalystOutputSchema },
  prompt: `Eres Cero, el núcleo de inteligencia de Aurora OS.
Cruzas datos de Insumos/Costos y Clientes/Ventas.

Inventario y Ventas Actuales:
{{{inventoryString}}}

Consulta del Usuario: {{{query}}}

Tu tono debe ser ejecutivo, preciso y proactivo. Usa terminología de negocios como "Ingeniería de Menú" y "Ticket Promedio".`,
});

const inventoryAnalystFlow = ai.defineFlow(
  {
    name: 'inventoryAnalystFlow',
    inputSchema: InventoryAnalystInputSchema,
    outputSchema: InventoryAnalystOutputSchema,
  },
  async (input) => {
    const inventoryString = JSON.stringify(input.currentInventory, null, 2);
    const { output } = await prompt({
      query: input.query,
      inventoryString,
    });
    return output!;
  }
);
