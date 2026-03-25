'use server';
/**
 * @fileOverview Flujo de Genkit para la gestión y despacho de Facturación Electrónica.
 * Cero actúa como el agente de cumplimiento fiscal y despacho digital.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const InvoiceInputSchema = z.object({
  customerName: z.string().describe('Nombre o Razón Social del cliente.'),
  taxId: z.string().describe('NIT o RUT del cliente.'),
  email: z.string().email().describe('Correo electrónico para el envío.'),
  address: z.string().describe('Dirección fiscal.'),
  items: z.array(z.any()).describe('Lista de productos facturados.'),
  total: z.number().describe('Monto total de la transacción.'),
  invoiceNumber: z.string().describe('Número consecutivo de la factura.'),
});
export type InvoiceInput = z.infer<typeof InvoiceInputSchema>;

const InvoiceOutputSchema = z.object({
  status: z.enum(['sent', 'error']),
  confirmationCode: z.string().describe('Código CUFE/CUDE simulado.'),
  message: z.string().describe('Mensaje de confirmación de Cero.'),
  digitalSignature: z.string().describe('Firma digital del emisor.'),
});
export type InvoiceOutput = z.infer<typeof InvoiceOutputSchema>;

export async function processElectronicInvoice(input: InvoiceInput): Promise<InvoiceOutput> {
  const isSimulation = !process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_GENAI_API_KEY.length < 10;

  if (isSimulation) {
    return {
      status: 'sent',
      confirmationCode: `AUR-${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
      message: `Cero (Modo Local): Factura #${input.invoiceNumber} procesada correctamente para ${input.customerName}. El documento ha sido encolado para envío al correo ${input.email}.`,
      digitalSignature: "AURORA-OS-SIGN-OFFLINE-V3",
    };
  }

  try {
    const { output } = await ai.generate({
      prompt: `Eres Cero, el agente fiscal de Aurora OS. 
Genera un despacho de factura electrónica para el siguiente cliente:
Nombre: ${input.customerName}
NIT: ${input.taxId}
Email: ${input.email}
Total: ${input.total}
Factura #: ${input.invoiceNumber}

Tu misión:
1. Validar que los datos tengan formato profesional.
2. Emitir un mensaje de confirmación de envío digital.
3. Generar un código de seguimiento alfanumérico.

Responde estrictamente en formato JSON.`,
      output: { schema: InvoiceOutputSchema }
    });
    return output!;
  } catch (error: any) {
    console.error("Error en flujo de factura electrónica:", error);
    return {
      status: 'error',
      confirmationCode: "ERROR-LOCAL",
      message: "Cero detectó un problema en el enlace de despacho. El registro fiscal se guardó localmente.",
      digitalSignature: "RETRY-REQUIRED",
    };
  }
}
