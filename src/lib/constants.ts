/**
 * Aurora Operating System - Constants Registry
 * Centralized business logic tokens.
 */

// Tasa de Impuesto / Autopropina (Sugerida por defecto en Colombia 15% o 8% INC)
export const AURORA_TAX_RATE = 0.15; // Usamos 0.15 para mantener consistencia con el 1.15 actual

export const getTaxRate = () => AURORA_TAX_RATE;
export const calculateTotalWithTax = (subtotal: number) => subtotal * (1 + AURORA_TAX_RATE);
export const calculateSubtotalFromTotal = (total: number) => total / (1 + AURORA_TAX_RATE);
export const calculateTaxAmount = (total: number) => total - calculateSubtotalFromTotal(total);

// Configuración de Facturación POS
export const POS_PREFIX = "AUR-";
export const POS_RESOLUTION_NUMBER = "1876400000"; // Mock Resolution

// Super Users - Single source of truth
const SUPER_USER_EMAILS: string[] = [
  'umbralcero7@gmail.com',
  'amaroisaias611@gmail.com',
];

const SUPER_USER_SET = new Set(SUPER_USER_EMAILS.map(e => e.toLowerCase()));

export function isSuperUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_USER_SET.has(email.toLowerCase());
}

// Default menu items for fallback/offline mode
export const DEFAULT_MENU_ITEMS = [
  { id: 'p1', code: '01', name: 'Hamburguesa Aurora', price: 35000, category: 'Platos Fuertes', available: true, description: 'Carne Angus 200g, queso azul, cebolla caramelizada y pan brioche.', imageUrl: 'https://picsum.photos/seed/aurora_h1/600/400', businessId: 'default' },
  { id: 'p2', code: '02', name: 'Empanadas de Carne (3)', price: 15000, category: 'Entradas', available: true, description: 'Crujientes empanadas tradicionales con ají de la casa.', imageUrl: 'https://picsum.photos/seed/aurora_e1/600/400', businessId: 'default' },
  { id: 'p3', code: '03', name: 'Limonada de Coco', price: 12000, category: 'Bebidas', available: true, description: 'Refrescante mezcla de limón y crema de coco natural.', imageUrl: 'https://picsum.photos/seed/aurora_l1/600/400', businessId: 'default' },
  { id: 'p4', code: '04', name: 'Cerveza Club Colombia', price: 10000, category: 'Bebidas', available: true, description: 'Cerveza nacional tipo Lager.', imageUrl: 'https://picsum.photos/seed/aurora_b1/600/400', businessId: 'default' },
  { id: 'p5', code: '05', name: 'Torta de Chocolate', price: 14000, category: 'Postres', available: true, description: 'Húmeda y deliciosa con fudge de chocolate 70% cacao.', imageUrl: 'https://picsum.photos/seed/aurora_c1/600/400', businessId: 'default' },
];

// Menu categories for filtering
export const MENU_CATEGORIES = ["Todos", "Entradas", "Platos Fuertes", "Bebidas", "Postres", "Otros"] as const;

// Table identifiers for comandas/POS
export const TABLE_NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
