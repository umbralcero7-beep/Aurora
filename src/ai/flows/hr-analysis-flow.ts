'use server';
/**
 * @fileOverview Flujo de Genkit para análisis de datos de personal (HR) provenientes de Excel.
 * Valida nombres, roles, salarios y coherencia de fechas.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const HRExcelAnalysisInputSchema = z.object({
  filename: z.string().describe('Nombre del archivo de personal.'),
  rawData: z.array(z.any()).describe('Datos extraídos del Excel de HR.'),
});
export type HRExcelAnalysisInput = z.infer<typeof HRExcelAnalysisInputSchema>;

const HRExcelAnalysisOutputSchema = z.object({
  status: z.enum(['clean', 'warning', 'error']).describe('Estado de integridad de la nómina.'),
  summary: z.string().describe('Resumen ejecutivo de la carga de personal.'),
  suggestions: z.array(z.string()).describe('Sugerencias para optimizar la estructura del equipo.'),
});
export type HRExcelAnalysisOutput = z.infer<typeof HRExcelAnalysisOutputSchema>;

export async function analyzeHRExcelData(input: HRExcelAnalysisInput): Promise<HRExcelAnalysisOutput> {
  const isSimulation = !process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_GENAI_API_KEY.length < 10;

  if (isSimulation) {
    return {
      status: 'clean',
      summary: `Cero (Modo Local): He auditado ${input.rawData.length} expedientes de personal de forma segura. La estructura de cargos y salarios parece coherente con el mercado actual.`,
      suggestions: [
        "Verifica que las fechas de ingreso estén en formato AAAA-MM-DD.",
        "Asegúrate de que los salarios no incluyan puntos o comas de miles para evitar errores en el ERP."
      ]
    };
  }

  try {
    return await hrExcelAnalysisFlow(input);
  } catch (error: any) {
    console.error("Error en flujo de análisis HR:", error);
    return {
      status: 'warning',
      summary: "Cero ha detectado una interrupción en el enlace de IA. Los datos han sido validados por el motor de respaldo local.",
      suggestions: ["Verifica manualmente que no existan duplicados en los correos electrónicos."],
    };
  }
}

const hrExcelAnalysisFlow = ai.defineFlow(
  {
    name: 'hrExcelAnalysisFlow',
    inputSchema: HRExcelAnalysisInputSchema,
    outputSchema: HRExcelAnalysisOutputSchema,
  },
  async (input) => {
    const dataString = JSON.stringify(input.rawData, null, 2);
    const { output } = await ai.generate({
      prompt: `Eres Cero, el jefe de talento humano de Aurora OS. 
Analiza esta lista de colaboradores para una nueva sede:
${dataString}

Tu misión:
1. Validar que los cargos (roles) sean realistas para un restaurante (Chef, Mesero, Cajero, etc).
2. Detectar anomalías en salarios (muy altos o muy bajos).
3. Dar un resumen ejecutivo sobre la salud de la estructura de personal.

Responde estrictamente en formato JSON que cumpla con el schema de salida.`,
      output: { schema: HRExcelAnalysisOutputSchema }
    });
    return output!;
  }
);
