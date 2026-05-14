/**
 * Aurora OS - Supabase Data Service
 * Reemplaza los hooks de Firestore con operaciones CRUD en Supabase.
 * Importar el cliente según el contexto:
 *   - En componentes cliente: import { createClient } from '@/lib/supabase/client'
 *   - En Server Actions / Route Handlers: import { createClient } from '@/lib/supabase/server'
 */

import { createClient } from '@/lib/supabase/client';
import type {
  MenuItem, Order, Invoice, Supply, Customer,
  Delivery, Staff, Expense, Vendor, FiscalReport,
  Notification, AppConfig,
} from '@/types/aurora';

// ─── MENU ITEMS ──────────────────────────────────────────────────────────────

export async function getMenuItems() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function addMenuItem(item: Omit<MenuItem, 'businessId'>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: profile } = await supabase
    .from('user_profiles').select('business_id').eq('id', user.id).single();

  const { data, error } = await supabase.from('menu_items').insert({
    business_id: profile?.business_id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    available: item.available,
    image_url: item.imageUrl,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateMenuItem(id: string, updates: Partial<MenuItem>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .update({
      name: updates.name,
      description: updates.description,
      price: updates.price,
      category: updates.category,
      available: updates.available,
      image_url: updates.imageUrl,
    })
    .eq('id', id)
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteMenuItem(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) throw error;
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

export async function getOrders(status?: string) {
  const supabase = createClient();
  let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createOrder(order: Omit<Order, 'businessId' | 'orderNumber'>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: profile } = await supabase
    .from('user_profiles').select('business_id').eq('id', user.id).single();

  const { data, error } = await supabase.from('orders').insert({
    business_id: profile?.business_id,
    table_number: order.tableNumber,
    guest_count: order.guestCount,
    items: order.items,
    total: order.total,
    status: order.status,
    waiter_name: order.waiterName,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateOrderStatus(id: string, status: Order['status']) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────

export async function getInvoices(limit = 50) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function createInvoice(invoice: Omit<Invoice, 'businessId'>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: profile } = await supabase
    .from('user_profiles').select('business_id').eq('id', user.id).single();

  const { data, error } = await supabase.from('invoices').insert({
    business_id: profile?.business_id,
    order_id: invoice.orderId,
    order_number: invoice.orderNumber,
    invoice_number: invoice.invoiceNumber,
    table_number: invoice.tableNumber,
    customer_name: invoice.customerName,
    customer_tax_id: invoice.customerTaxId,
    customer_email: invoice.customerEmail,
    customer_address: invoice.customerAddress,
    is_electronic: invoice.isElectronic,
    items: invoice.items,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    payment_method: invoice.paymentMethod,
    cashier_name: invoice.cashierName,
  }).select().single();
  if (error) throw error;
  return data;
}

// ─── SUPPLIES (Inventario) ────────────────────────────────────────────────────

export async function getSupplies() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('supplies').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function upsertSupply(supply: Omit<Supply, 'businessId'> & { id?: string }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: profile } = await supabase
    .from('user_profiles').select('business_id').eq('id', user.id).single();

  const payload = {
    business_id: profile?.business_id,
    name: supply.name,
    sku: supply.sku,
    unit: supply.unit,
    price: supply.price,
    stock: supply.stock,
    category: supply.category,
  };

  const { data, error } = supply.id
    ? await supabase.from('supplies').update(payload).eq('id', supply.id).select().single()
    : await supabase.from('supplies').insert(payload).select().single();

  if (error) throw error;
  return data;
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────

export async function getCustomers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('customers').select('*').order('name');
  if (error) throw error;
  return data;
}

// ─── DELIVERIES ────────────────────────────────────────────────────────────────

export async function getDeliveries() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('deliveries').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateDeliveryStatus(
  id: string,
  status: Delivery['status'],
  extras?: Pick<Delivery, 'cancellationReason' | 'cancelledBy'>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('deliveries')
    .update({
      status,
      updated_at: new Date().toISOString(),
      cancellation_reason: extras?.cancellationReason,
      cancelled_by: extras?.cancelledBy,
      cancelled_at: status === 'Anulado' ? new Date().toISOString() : undefined,
    })
    .eq('id', id)
    .select().single();
  if (error) throw error;
  return data;
}

// ─── STAFF ────────────────────────────────────────────────────────────────────

export async function getStaff() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('staff').select('*').order('full_name');
  if (error) throw error;
  return data;
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export async function getExpenses() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('expenses').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ─── VENDORS ─────────────────────────────────────────────────────────────────

export async function getVendors() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vendors').select('*').order('name');
  if (error) throw error;
  return data;
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function getUnreadNotifications() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('status', 'unread')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function markNotificationRead(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications').update({ status: 'read' }).eq('id', id);
  if (error) throw error;
}

// ─── APP CONFIG ───────────────────────────────────────────────────────────────

export async function getAppConfig() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('app_config').select('*').single();
  if (error) throw error;
  return data;
}

export async function updateAppConfig(config: Partial<AppConfig>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: profile } = await supabase
    .from('user_profiles').select('business_id').eq('id', user.id).single();

  const { data, error } = await supabase
    .from('app_config')
    .upsert({
      business_id: profile?.business_id,
      business_name: config.businessName,
      tax_id: config.taxId,
      address: config.address,
      currency: config.currency,
      tax_rate: config.taxRate,
      low_stock_threshold: config.lowStockThreshold,
      default_invoice_type: config.defaultInvoiceType,
      tax_regime: config.taxRegime,
      invoice_prefix: config.invoicePrefix,
      resolution_number: config.resolutionNumber,
      legal_footer: config.legalFooter,
      dian_tech_key: config.dianTechKey,
      dian_test_set_id: config.dianTestSetId,
      dian_provider: config.dianProvider,
    }, { onConflict: 'business_id' })
    .select().single();
  if (error) throw error;
  return data;
}

// ─── REALTIME SUBSCRIPTIONS ───────────────────────────────────────────────────

/**
 * Suscribirse a cambios en tiempo real de órdenes.
 * Equivalente a onSnapshot de Firestore.
 * 
 * @example
 * const unsub = subscribeToOrders((orders) => setOrders(orders));
 * // Para limpiar: unsub();
 */
export function subscribeToOrders(callback: (orders: any[]) => void) {
  const supabase = createClient();

  const channel = supabase
    .channel('orders-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      async () => {
        // Recarga completa al detectar cambios (simple y seguro con RLS)
        const { data } = await supabase
          .from('orders').select('*').order('created_at', { ascending: false });
        if (data) callback(data);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToNotifications(callback: (notifications: any[]) => void) {
  const supabase = createClient();

  const channel = supabase
    .channel('notifications-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      async () => {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('status', 'unread')
          .order('created_at', { ascending: false });
        if (data) callback(data);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
