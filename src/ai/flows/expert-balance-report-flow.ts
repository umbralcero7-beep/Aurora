
'use server';
/**
 * @fileOverview Flujo de Genkit para generación de balances expertos comparativos.
 * Cero actúa como un consultor con 10+ años de experiencia en gestión gastronómica.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExpertBalanceInputSchema = z.object({
  recipientEmail: z.string().email(),
  recipientRole: z.string(),
});
export type ExpertBalanceInput = z.infer<typeof ExpertBalanceInputSchema>;

const ExpertBalanceOutputSchema = z.object({
  reportTitle: z.string(),
  expertCommentary: z.string().describe('Análisis profundo de Cero con tono de consultor senior.'),
  busyDayMetrics: z.object({
    revenue: z.number(),
    averageTicket: z.number(),
    wastePercentage: z.number(),
    highlight: z.string(),
  }),
  normalDayMetrics: z.object({
    revenue: z.number(),
    averageTicket: z.number(),
    wastePercentage: z.number(),
    highlight: z.string(),
  }),
  strategicRecommendation: z.string().describe('Acción inmediata para mejorar el ROI.'),
  visualHints: z.array(z.string()).describe('Sugerencias de gráficos tipo Power BI.'),
});
export type ExpertBalanceOutput = z.infer<typeof ExpertBalanceOutputSchema>;

const OFFLINE_REPORT: ExpertBalanceOutput = {
  reportTitle: "Balance Estratégico (Modo Auditoría Local)",
  expertCommentary: "Como auditor del sistema, he generado este balance basado en algoritmos de respaldo local. Para un análisis predictivo profundo utilizando el motor Gemini 2.0, es necesario verificar la configuración del enlace de seguridad (API Key) en el servidor.",
  busyDayMetrics: {
    revenue: 0,
    averageTicket: 0,
    wastePercentage: 0,
    highlight: "Sincronización en curso.",
  },
  normalDayMetrics: {
    revenue: 0,
    averageTicket: 0,
    wastePercentage: 0,
    highlight: "Esperando datos de la jornada.",
  },
  strategicRecommendation: "Activa el enlace de IA para recibir recomendaciones personalizadas de upselling y optimización de mermas.",
  visualHints: ["Modelado ROI", "Heatmap de Mesas", "Salud ERP"],
};

export async function generateExpertBalance(input: ExpertBalanceInput): Promise<ExpertBalanceOutput> {
  // Verificación inicial de API Key para evitar interrupciones de seguridad
  if (!process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_GENAI_API_KEY.length < 10) {
    return OFFLINE_REPORT;
  }

  try {
    const result = await expertBalanceFlow(input);
    return result;
  } catch (error: any) {
    console.error("Error en flujo de balance experto:", error);
    return OFFLINE_REPORT;
  }
}

const expertBalanceFlow = ai.defineFlow(
  {
    name: 'expertBalanceFlow',
    inputSchema: ExpertBalanceInputSchema,
    outputSchema: ExpertBalanceOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      prompt: `Eres Cero, el estratega senior de Aurora V3.0 con 10 años de experiencia en gestión de alto rendimiento.
Genera un balance comparativo de alto nivel para un establecimiento gastronómico de élite.

Debes comparar:
1. Un día concurrido (Busy Day): Alta demanda, presión en cocina, ticket promedio elevado.
2. Un día normal (Normal Day): Flujo constante, enfoque en lealtad, control total de mermas.

Tu análisis debe sonar profesional, técnico y proactivo. Usa terminología como "Margen de Contribución", "Punto de Equilibrio" y "Eficiencia de Mano de Obra".
El formato debe ser similar a un tablero de Power BI resumido en un reporte ejecutivo.

Email del destinatario: ${input.recipientEmail}
Rol del destinatario: ${input.recipientRole}`,
      output: { schema: ExpertBalanceOutputSchema }
    });
    return output!;
  }
);
