'use server';

import { CUFEParams, generateCUFE } from "./cufe";

export interface AuroraInvoiceData {
  invoiceNumber: string;
  issueDate: string;   // YYYY-MM-DD
  issueTime: string;   // HH:mm:ss-05:00
  nitOFE: string;      // NIT de tu empresa
  nameOFE: string;     // Razón Social de tu empresa
  claveTecnica: string; // Tu clave técnica DIAN de pruebas
  nitAdquiriente: string;
  nameAdquiriente: string;
  environment: "1" | "2"; // 1 = Prod, 2 = Test
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number; // Precio antes de IVA
    taxRate: number;   // Ej: 19.00
  }>;
}

/**
 * Transforma una venta interna de Aurora OS al estándar UBL 2.1 
 * de la DIAN para despacho digital (Ambiente de Pruebas Activo E-2).
 */
export function buildUBLInvoice(invoice: AuroraInvoiceData): { xmlBase64: string; cufe: string } {
  // 1. Cálculos base de la factura
  let totalBruto = 0;
  let totalTaxIVA = 0;

  const xmlItems = invoice.items.map((item, index) => {
    const subtotal = item.unitPrice * item.quantity;
    const taxValue = subtotal * (item.taxRate / 100);
    totalBruto += subtotal;
    totalTaxIVA += taxValue;

    return `
      <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:LineExtensionAmount currencyID="COP">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
          <cbc:TaxAmount currencyID="COP">${taxValue.toFixed(2)}</cbc:TaxAmount>
        </cac:TaxTotal>
        <cac:Item>
          <cbc:Description>${item.name}</cbc:Description>
        </cac:Item>
        <cac:Price>
          <cbc:PriceAmount currencyID="COP">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
      </cac:InvoiceLine>
    `;
  }).join('');

  const grossTotal = totalBruto + totalTaxIVA;

  // 2. Generar CUFE 
  const cufeParams: CUFEParams = {
    NumFac: invoice.invoiceNumber,
    FecFac: invoice.issueDate,
    HoraFac: invoice.issueTime,
    ValFac: totalBruto,
    CodImp1: "01", // IVA
    ValImp1: totalTaxIVA,
    CodImp2: "04", // INC
    ValImp2: 0,
    CodImp3: "03", // ICA
    ValImp3: 0,
    ValTot: grossTotal,
    NitOFE: invoice.nitOFE,
    NumAdq: invoice.nitAdquiriente,
    ClTec: invoice.claveTecnica,
    TipoAmbiente: invoice.environment,
  };

  const { cufe } = generateCUFE(cufeParams);

  // 3. Estructura XML Base UBL 2.1
  const xmlDocument = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <!-- ESPACIO RESERVADO PARA FIRMA DIGITAL .P12 -->
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>Documentos electronicos</cbc:CustomizationID>
  <cbc:ProfileExecutionID>${invoice.environment}</cbc:ProfileExecutionID>
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:UUID schemeID="${invoice.environment}" schemeName="CUFE-SHA384">${cufe}</cbc:UUID>
  <cbc:IssueDate>${invoice.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${invoice.issueTime}</cbc:IssueTime>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${invoice.nameOFE}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="5" schemeName="31">${invoice.nitOFE}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${invoice.nameAdquiriente}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="3" schemeName="13">${invoice.nitAdquiriente}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${totalBruto.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${totalTaxIVA.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${grossTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${grossTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  ${xmlItems}
</Invoice>`;

  // Encode a Base64 para adjuntar al Request SOAP de la DIAN
  return {
    xmlBase64: Buffer.from(xmlDocument).toString('base64'),
    cufe
  };
}
