
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número como moneda con el estilo de punto para miles y coma para decimales.
 * @param amount El número a formatear.
 * @returns String formateado (ej: $ 18.000,00)
 */
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('COP', '$').trim();
}

/**
 * Versión con decimales si es necesario.
 */
export function formatCurrencyDetailed(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('COP', '$').trim();
}
