/**
 * Aurora OS - Domain Type Definitions
 * Centralized type system for all Firestore collections and shared types.
 */

import { Timestamp } from 'firebase/firestore';

// ─── ENUMS / UNION TYPES ──────────────────────────────────────────

export type UserRole = 'ADMIN' | 'HR' | 'INVENTORY' | 'CHEF' | 'WAITER' | 'CASHIER' | 'RECEPTIONIST' | 'SUPPORT' | 'FINANCE';

export type OrderStatus = 'Open' | 'Preparing' | 'Ready' | 'Closed';

export type DeliveryStatus = 'Pendiente' | 'En Camino' | 'Entregado' | 'Anulado';

export type MenuCategory = 'Entradas' | 'Platos Fuertes' | 'Bebidas' | 'Postres' | 'Otros' | 'General';

export type PaymentMethod = 'Efectivo' | 'Datafono' | 'Nequi';

export type CustomerTier = 'Regular' | 'VIP';

export type NotificationType = 'ORDER_READY';

export type NotificationStatus = 'unread' | 'read';

export type StaffRole = 'CHEF' | 'COOK' | 'WAITER' | 'CASHIER' | 'CLEANER';

export type ContractType = 'INDETERMINADO' | 'TERMINO_FIJO' | 'PRESTACION_SERVICIOS';

export type StaffStatus = 'ACTIVO' | 'VACACIONES' | 'RETIRADO';

export type FiscalReportType = 'X' | 'Z';

// ─── SHARED SUB-INTERFACES ────────────────────────────────────────

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ItemSale {
  name: string;
  quantity: number;
  total: number;
}

export interface PaymentBreakdown {
  cash: number;
  card: number;
  digital: number;
}

// ─── BASE MULTI-TENANT FIELDS ─────────────────────────────────────

interface MultiTenantFields {
  businessId: string;
  assignedVenue?: string;
  venueId?: string;
}

// ─── FIRESTORE COLLECTION INTERFACES ──────────────────────────────

export interface UserProfile {
  email: string;
  displayName: string;
  role: UserRole;
  businessId: string;
  assignedVenue: string;
  updatedAt: Timestamp;
}

export interface MenuItem extends MultiTenantFields {
  name: string;
  description?: string;
  price: number;
  category: MenuCategory;
  available: boolean;
  imageUrl?: string;
  createdAt?: string;
}

export interface Order extends MultiTenantFields {
  orderNumber: number;
  tableNumber: string;
  guestCount?: number;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  waiterName: string;
}

export interface Invoice extends MultiTenantFields {
  orderId: string;
  orderNumber: string;
  invoiceNumber: string;
  tableNumber: string;
  customerName: string;
  customerTaxId: string;
  customerEmail: string;
  customerAddress: string;
  isElectronic: boolean;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  timestamp: string;
  cashierName: string;
  dianSent?: boolean;
  dianStatus?: string;
  dianResponse?: string;
  sentAt?: string;
}

export interface Supply extends MultiTenantFields {
  name: string;
  sku: string;
  unit: string;
  price: number;
  stock: number;
  category: string;
  createdAt?: string;
}

export interface Business {
  name: string;
  address: string;
  updatedAt: Timestamp;
  createdAt?: Timestamp;
}

export interface Customer extends MultiTenantFields {
  name: string;
  tier: CustomerTier;
  points: number;
  ltv: number;
  loyaltyScore: number;
  lastVisit: string;
  createdAt: string;
  phone?: string;
  address?: string;
}

export interface Notification extends MultiTenantFields {
  type: NotificationType;
  message: string;
  tableNumber: string;
  status: NotificationStatus;
  createdAt: string;
}

export interface Delivery extends MultiTenantFields {
  orderNumber: number;
  customerName: string;
  phone: string;
  address: string;
  notes: string;
  items: CartItem[];
  total: number;
  status: DeliveryStatus;
  createdAt: string;
  registeredBy: string;
  updatedAt?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

export interface Staff extends MultiTenantFields {
  fullName: string;
  role: StaffRole;
  contractType: ContractType;
  salary: number;
  hireDate: string;
  emergencyContact: string;
  status: StaffStatus;
  performanceScore: number;
  createdAt: Timestamp;
}

export interface FiscalReport extends MultiTenantFields {
  type: FiscalReportType;
  reportNumber: number;
  timestamp: string;
  totalGross: number;
  posCount: number;
  posTotal: number;
  deliveryCount: number;
  cancelledDeliveryCount: number;
  deliveryTotal: number;
  expensesTotal: number;
  itemSales: ItemSale[];
  breakdown: PaymentBreakdown;
  generatedBy: string;
  cashBase?: number;
  actualCashCount?: number;
  discrepancy?: number;
}

export interface Expense extends MultiTenantFields {
  description: string;
  amount: number;
  category: string;
  createdAt: string;
}

export interface Vendor extends MultiTenantFields {
  name: string;
  category: string;
  rating: string;
  leadTime: string;
}

export interface AppConfig {
  businessName: string;
  taxId: string;
  address: string;
  currency: string;
  taxRate: number;
  lowStockThreshold: number;
  defaultInvoiceType: string;
  taxRegime: string;
  invoicePrefix: string;
  resolutionNumber: string;
  legalFooter: string;
  dianTechKey: string;
  dianTestSetId: string;
  dianProvider: string;
}
