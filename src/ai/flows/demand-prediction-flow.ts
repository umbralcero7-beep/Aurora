'use server';
/**
 * @fileOverview A Genkit flow for predicting product demand based on historical sales and current stock levels.
 *
 * - predictDemand - A function that handles the demand prediction process.
 * - DemandPredictionInput - The input type for the predictDemand function.
 * - DemandPredictionOutput - The return type for the demand prediction process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DemandPredictionInputSchema = z.object({
  productId: z.string().describe('The unique identifier of the product.'),
  historicalSales: z.array(
    z.object({
      date: z.string().describe('Date of sale in YYYY-MM-DD format.'),
      quantitySold: z.number().int().min(0).describe('Quantity sold on that date.'),
    })
  ).describe('Historical sales data for the product.'),
  currentStockLevel: z.number().int().min(0).describe('The current quantity of the product in stock.'),
  expectedLeadTimeDays: z.number().int().min(1).describe('The number of days ahead for which to predict demand.'),
});
export type DemandPredictionInput = z.infer<typeof DemandPredictionInputSchema>;

const DemandPredictionOutputSchema = z.object({
  predictedDemandQuantity: z.number().int().min(0).describe('The predicted quantity of demand for the product over the next lead time period.'),
  recommendation: z.string().describe('A recommendation for the purchase manager based on the predicted demand and current stock level.'),
});
export type DemandPredictionOutput = z.infer<typeof DemandPredictionOutputSchema>;

export async function predictDemand(input: DemandPredictionInput): Promise<DemandPredictionOutput> {
  try {
    return await demandPredictionFlow(input);
  } catch (error: any) {
    console.error("Error en flujo de predicción de demanda:", error);
    return {
      predictedDemandQuantity: 0,
      recommendation: "Cero no pudo realizar la predicción debido a un problema con la API de IA. Por favor, revisa tus niveles de stock manualmente."
    };
  }
}

const prompt = ai.definePrompt({
  name: 'demandPredictionPrompt',
  input: { schema: DemandPredictionInputSchema },
  output: { schema: DemandPredictionOutputSchema },
  prompt: `You are an AI-powered demand prediction assistant for a purchase manager. Your task is to analyze historical sales data and current inventory to predict future demand and provide a concise purchasing recommendation to optimize inventory levels and minimize carrying costs.

Product ID: {{{productId}}}
Current Stock Level: {{{currentStockLevel}}}
Prediction Horizon (days): {{{expectedLeadTimeDays}}}

Historical Sales Data:
{{#each historicalSales}}- Date: {{{date}}}, Quantity Sold: {{{quantitySold}}}
{{/each}}

Based on this information, predict the demand quantity for the next {{{expectedLeadTimeDays}}} days and provide a recommendation for the purchase manager.`,
});

const demandPredictionFlow = ai.defineFlow(
  {
    name: 'demandPredictionFlow',
    inputSchema: DemandPredictionInputSchema,
    outputSchema: DemandPredictionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
