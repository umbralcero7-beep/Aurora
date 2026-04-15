"use client"

import { AURORA_TAX_RATE } from '@/lib/constants'

// ── Types ──────────────────────────────────────────────
export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  modifiers?: string[]
}

export interface PendingAccount {
  id: string
  clientNumber: number
  clientName: string | null
  items: CartItem[]
  total: number
  note: string
  createdAt: string
  createdBy: string | undefined
  updatedAt?: number
}

export interface CustomerData {
  name: string
  taxId: string
  email: string
  address: string
}

export type PaymentMethod = 'Efectivo' | 'Datafono' | 'Nequi'

export interface SplitPayment {
  method1: PaymentMethod
  amount1: number
  method2: PaymentMethod
  amount2: number
}

export interface CierreStats {
  cash: number
  card: number
  transfer: number
  totalSales: number
  salesCount: number
  expensesTotal: number
  expectedCash: number
  physicalCash: number
}

// ── Calculations ───────────────────────────────────────
export const TAX_RATE = AURORA_TAX_RATE  // 0.19

export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((acc, i) => acc + (i.price * i.quantity), 0)
}

export function calculateTax(subtotal: number): number {
  return subtotal * TAX_RATE
}

export function calculateTotal(subtotal: number): number {
  return subtotal + calculateTax(subtotal)
}

export function calculateChange(received: number, total: number): number {
  return Math.max(0, received - total)
}

export function calculateCierreStats(
  invoices: any[],
  expenses: any[],
  baseCaja: number,
  efectivoContado: number
): CierreStats {
  const cash = invoices
    .filter(inv => inv.paymentMethod === 'Efectivo')
    .reduce((a, inv) => a + (Number(inv.total) || 0), 0)
  const card = invoices
    .filter(inv => inv.paymentMethod === 'Datafono')
    .reduce((a, inv) => a + (Number(inv.total) || 0), 0)
  const transfer = invoices
    .filter(inv => inv.paymentMethod === 'Nequi')
    .reduce((a, inv) => a + (Number(inv.total) || 0), 0)
  const expensesTotal = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0)

  return {
    cash,
    card,
    transfer,
    totalSales: cash + card + transfer,
    salesCount: invoices.length,
    expensesTotal,
    expectedCash: cash - expensesTotal - baseCaja,
    physicalCash: efectivoContado,
  }
}

// ── Modifiers ──────────────────────────────────────────
export const PRODUCT_MODIFIERS = [
  { id: 'sin_cebolla', label: 'Sin Cebolla' },
  { id: 'sin_tomate', label: 'Sin Tomate' },
  { id: 'sin_lechuga', label: 'Sin Lechuga' },
  { id: 'termo_medio', label: 'Término Medio' },
  { id: 'tres_cuartos', label: 'Tres Cuartos' },
  { id: 'bien_cocido', label: 'Bien Cocido' },
  { id: 'con_queso', label: 'Con Queso Extra' },
  { id: 'sin_salsa', label: 'Sin Salsa' },
] as const
