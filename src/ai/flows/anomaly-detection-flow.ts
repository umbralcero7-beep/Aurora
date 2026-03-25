'use server';
/**
 * @fileOverview This file implements a Genkit flow for detecting anomalies in sales data.
 *
 * - detectSalesAnomalies - A function that triggers the anomaly detection process.
 * - AnomalyDetectionInput - The input type for the detectSalesAnomalies function.
 * - AnomalyDetectionOutput - The return type for the detectSalesAnomalies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SalesRecordSchema = z.object({
  date: z.string().describe('The date of the sales record in YYYY-MM-DD format.'),
  amount: z.number().describe('The sales amount for that date.'),
});

const AnomalyDetectionInputSchema = z.object({
  salesData: z.array(SalesRecordSchema).describe('An array of historical sales data records.'),
  context: z.string().optional().describe('Any additional context or specific patterns to look for.'),
});
export type AnomalyDetectionInput = z.infer<typeof AnomalyDetectionInputSchema>;

const AnomalyDetectionOutputSchema = z.object({
  anomaliesDetected: z.boolean().describe('True if any significant anomalies were detected.'),
  description: z.string().describe('Detailed description of the findings.'),
});
export type AnomalyDetectionOutput = z.infer<typeof AnomalyDetectionOutputSchema>;

const AnomalyDetectionPromptInputSchema = z.object({
  dataString: z.string(),
  context: z.string().optional(),
});

export async function detectSalesAnomalies(
  input: AnomalyDetectionInput
): Promise<AnomalyDetectionOutput> {
  try {
    return await anomalyDetectionFlow(input);
  } catch (error: any) {
    console.error("Error en flujo de detección de anomalías:", error);
    return {
      anomaliesDetected: false,
      description: "Cero no pudo completar el escaneo de seguridad debido a que la API de IA está temporalmente fuera de servicio (API Key bloqueada)."
    };
  }
}

const anomalyDetectionPrompt = ai.definePrompt({
  name: 'anomalyDetectionPrompt',
  input: {schema: AnomalyDetectionPromptInputSchema},
  output: {schema: AnomalyDetectionOutputSchema},
  prompt: `You are an expert in sales data analysis, specifically tasked with identifying anomalies and unusual patterns.
Your goal is to review the provided sales data and determine if there are any significant deviations from expected patterns.

Sales Data:
{{{dataString}}}

{{#if context}}
Additional Context: {{{context}}}
{{/if}}

Analyze the sales data provided. Identify any anomalies that might indicate fraud, errors, or unexpected market shifts.
Provide your findings in the specified JSON format.`,
});

const anomalyDetectionFlow = ai.defineFlow(
  {
    name: 'anomalyDetectionFlow',
    inputSchema: AnomalyDetectionInputSchema,
    outputSchema: AnomalyDetectionOutputSchema,
  },
  async input => {
    const dataString = JSON.stringify(input.salesData, null, 2);
    const {output} = await anomalyDetectionPrompt({
      dataString,
      context: input.context,
    });
    return output!;
  }
);
