'use server';

import { createHash } from 'crypto';

export interface CUFEParams {
  NumFac: string;
  FecFac: string; // YYYY-MM-DD
  HoraFac: string; // HH:mm:ss-05:00
  ValFac: number; // Suma del valor bruto antes de impuestos
  CodImp1: string; // "01" IVA
  ValImp1: number; // Total IVA
  CodImp2: string; // "04" INC
  ValImp2: number; // Total INC
  CodImp3: string; // "03" ICA
  ValImp3: number; // Total ICA
  ValTot: number; // Total factura (ValFac + Impuestos)
  NitOFE: string; // NIT Facturador Electrónico sin digito verificacion
  NumAdq: string; // NIT Adquiriente sin digito verificacion
  ClTec: string; // Clave Técnica (Dada por DIAN en resolución)
  TipoAmbiente: string; // "1" Producción, "2" Pruebas
}

/**
 * Motor Generador de Código Único de Facturación Electrónica (CUFE)
 * Implementación del Anexo Técnico 1.9 DIAN (Colombia) usando SHA-384.
 */
export function generateCUFE(params: CUFEParams): { rawString: string, cufe: string } {
  const formatNum = (num: number) => num.toFixed(2);
  
  const rawString = 
    params.NumFac +
    params.FecFac +
    params.HoraFac +
    formatNum(params.ValFac) +
    params.CodImp1 +
    formatNum(params.ValImp1) +
    params.CodImp2 +
    formatNum(params.ValImp2) +
    params.CodImp3 +
    formatNum(params.ValImp3) +
    formatNum(params.ValTot) +
    params.NitOFE +
    params.NumAdq +
    params.ClTec +
    params.TipoAmbiente;

  // DIAN Anexo Técnico 1.8 exige SHA-384 hexadecimal
  const cufeHash = createHash('sha384').update(rawString).digest('hex');

  return { rawString, cufe: cufeHash };
}
