-- =============================================================================
-- AURORA OS - Migración Inicial de Esquema
-- Convierte colecciones de Firestore a tablas PostgreSQL (Supabase)
-- Ejecutar en el SQL Editor del dashboard de Supabase
-- =============================================================================

-- =============================================================================
-- 0. TIPOS ENUMERADOS (ENUMS)
-- =============================================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'HR', 'INVENTORY', 'CHEF', 'WAITER', 'CASHIER', 'RECEPTIONIST', 'SUPPORT', 'FINANCE');
CREATE TYPE order_status AS ENUM ('Open', 'Preparing', 'Ready', 'Closed');
CREATE TYPE delivery_status AS ENUM ('Pendiente', 'En Camino', 'Entregado', 'Anulado');
CREATE TYPE menu_category AS ENUM ('Entradas', 'Platos Fuertes', 'Bebidas', 'Postres', 'Otros', 'General');
CREATE TYPE payment_method AS ENUM ('Efectivo', 'Datafono', 'Nequi');
CREATE TYPE customer_tier AS ENUM ('Regular', 'VIP');
CREATE TYPE notification_type AS ENUM ('ORDER_READY');
CREATE TYPE notification_status AS ENUM ('unread', 'read');
CREATE TYPE staff_role AS ENUM ('CHEF', 'COOK', 'WAITER', 'CASHIER', 'CLEANER');
CREATE TYPE contract_type AS ENUM ('INDETERMINADO', 'TERMINO_FIJO', 'PRESTACION_SERVICIOS');
CREATE TYPE staff_status AS ENUM ('ACTIVO', 'VACACIONES', 'RETIRADO');
CREATE TYPE fiscal_report_type AS ENUM ('X', 'Z');

-- =============================================================================
-- 1. BUSINESSES (Multi-tenant root)
-- =============================================================================

CREATE TABLE businesses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. USER PROFILES
-- Linked to auth.users via id
-- =============================================================================

CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'CASHIER',
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  assigned_venue  TEXT,
  venue_id        TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. APP CONFIG
-- =============================================================================

CREATE TABLE app_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id             UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  business_name           TEXT NOT NULL,
  tax_id                  TEXT NOT NULL,
  address                 TEXT NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'COP',
  tax_rate                NUMERIC(5, 2) NOT NULL DEFAULT 19,
  low_stock_threshold     INTEGER NOT NULL DEFAULT 5,
  default_invoice_type    TEXT NOT NULL DEFAULT 'ELECTRONICA',
  tax_regime              TEXT,
  invoice_prefix          TEXT NOT NULL DEFAULT 'FE',
  resolution_number       TEXT,
  legal_footer            TEXT,
  dian_tech_key           TEXT,
  dian_test_set_id        TEXT,
  dian_provider           TEXT,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. MENU ITEMS
-- =============================================================================

CREATE TABLE menu_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  venue_id    TEXT,
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(12, 2) NOT NULL,
  category    menu_category NOT NULL DEFAULT 'General',
  available   BOOLEAN NOT NULL DEFAULT TRUE,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. ORDERS
-- items stored as JSONB array of CartItem
-- =============================================================================

CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  venue_id      TEXT,
  order_number  SERIAL,
  table_number  TEXT NOT NULL,
  guest_count   INTEGER,
  items         JSONB NOT NULL DEFAULT '[]',
  total         NUMERIC(12, 2) NOT NULL,
  status        order_status NOT NULL DEFAULT 'Open',
  waiter_name   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6. INVOICES
-- =============================================================================

CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  venue_id          TEXT,
  order_id          TEXT,
  order_number      TEXT,
  invoice_number    TEXT NOT NULL,
  table_number      TEXT NOT NULL,
  customer_name     TEXT NOT NULL,
  customer_tax_id   TEXT,
  customer_email    TEXT,
  customer_address  TEXT,
  is_electronic     BOOLEAN NOT NULL DEFAULT FALSE,
  items             JSONB NOT NULL DEFAULT '[]',
  subtotal          NUMERIC(12, 2) NOT NULL,
  tax               NUMERIC(12, 2) NOT NULL,
  total             NUMERIC(12, 2) NOT NULL,
  payment_method    payment_method NOT NULL DEFAULT 'Efectivo',
  cashier_name      TEXT NOT NULL,
  dian_sent         BOOLEAN DEFAULT FALSE,
  dian_status       TEXT,
  dian_response     TEXT,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 7. SUPPLIES (Inventario)
-- =============================================================================

CREATE TABLE supplies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  venue_id    TEXT,
  name        TEXT NOT NULL,
  sku         TEXT NOT NULL,
  unit        TEXT NOT NULL,
  price       NUMERIC(12, 2) NOT NULL,
  stock       NUMERIC(12, 3) NOT NULL DEFAULT 0,
  category    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, sku)
);

-- =============================================================================
-- 8. CUSTOMERS
-- =============================================================================

CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  venue_id        TEXT,
  name            TEXT NOT NULL,
  tier            customer_tier NOT NULL DEFAULT 'Regular',
  points          INTEGER NOT NULL DEFAULT 0,
  ltv             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  loyalty_score   NUMERIC(5, 2) NOT NULL DEFAULT 0,
  last_visit      TIMESTAMPTZ,
  phone           TEXT,
  address         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 9. NOTIFICATIONS
-- =============================================================================

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  venue_id      TEXT,
  type          notification_type NOT NULL DEFAULT 'ORDER_READY',
  message       TEXT NOT NULL,
  table_number  TEXT NOT NULL,
  status        notification_status NOT NULL DEFAULT 'unread',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 10. DELIVERIES
-- =============================================================================

CREATE TABLE deliveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  venue_id            TEXT,
  order_number        SERIAL,
  customer_name       TEXT NOT NULL,
  phone               TEXT NOT NULL,
  address             TEXT NOT NULL,
  notes               TEXT,
  items               JSONB NOT NULL DEFAULT '[]',
  total               NUMERIC(12, 2) NOT NULL,
  status              delivery_status NOT NULL DEFAULT 'Pendiente',
  registered_by       TEXT NOT NULL,
  cancellation_reason TEXT,
  cancelled_at        TIMESTAMPTZ,
  cancelled_by        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

-- =============================================================================
-- 11. STAFF (Recursos Humanos)
-- =============================================================================

CREATE TABLE staff (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  venue_id            TEXT,
  full_name           TEXT NOT NULL,
  role                staff_role NOT NULL,
  contract_type       contract_type NOT NULL,
  salary              NUMERIC(12, 2) NOT NULL,
  hire_date           DATE NOT NULL,
  emergency_contact   TEXT,
  status              staff_status NOT NULL DEFAULT 'ACTIVO',
  performance_score   NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 12. EXPENSES (Gastos)
-- =============================================================================

CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  venue_id    TEXT,
  description TEXT NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL,
  category    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 13. VENDORS (Proveedores)
-- =============================================================================

CREATE TABLE vendors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  venue_id    TEXT,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  rating      TEXT,
  lead_time   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 14. FISCAL REPORTS
-- item_sales y breakdown almacenados como JSONB
-- =============================================================================

CREATE TABLE fiscal_reports (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id               UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  venue_id                  TEXT,
  type                      fiscal_report_type NOT NULL,
  report_number             INTEGER NOT NULL,
  total_gross               NUMERIC(12, 2) NOT NULL,
  pos_count                 INTEGER NOT NULL DEFAULT 0,
  pos_total                 NUMERIC(12, 2) NOT NULL DEFAULT 0,
  delivery_count            INTEGER NOT NULL DEFAULT 0,
  cancelled_delivery_count  INTEGER NOT NULL DEFAULT 0,
  delivery_total            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  expenses_total            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  item_sales                JSONB NOT NULL DEFAULT '[]',
  breakdown                 JSONB NOT NULL DEFAULT '{"cash":0,"card":0,"digital":0}',
  generated_by              TEXT NOT NULL,
  cash_base                 NUMERIC(12, 2),
  actual_cash_count         NUMERIC(12, 2),
  discrepancy               NUMERIC(12, 2),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ÍNDICES para rendimiento
-- =============================================================================

CREATE INDEX idx_menu_items_business ON menu_items(business_id);
CREATE INDEX idx_orders_business ON orders(business_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_invoices_business ON invoices(business_id);
CREATE INDEX idx_invoices_created ON invoices(created_at DESC);
CREATE INDEX idx_supplies_business ON supplies(business_id);
CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_deliveries_business ON deliveries(business_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_staff_business ON staff(business_id);
CREATE INDEX idx_expenses_business ON expenses(business_id);
CREATE INDEX idx_fiscal_reports_business ON fiscal_reports(business_id);
CREATE INDEX idx_notifications_business_status ON notifications(business_id, status);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Los usuarios solo pueden ver datos de su propio business_id
-- =============================================================================

ALTER TABLE businesses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff           ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_reports  ENABLE ROW LEVEL SECURITY;

-- Función helper para obtener el business_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Políticas genéricas de acceso por business_id
CREATE POLICY "tenant_isolation" ON menu_items
  USING (business_id = get_user_business_id());

CREATE POLICY "tenant_isolation" ON orders
  USING (business_id = get_user_business_id());

CREATE POLICY "tenant_isolation" ON invoices
  USING (business_id = get_user_business_id());

CREATE POLICY "tenant_isolation" ON supplies
  USING (business_id = get_user_business_id());

CREATE POLICY "tenant_isolation" ON customers
  USING (business_id = get_user_business_id());

CREATE POLICY "tenant_isolation" ON notifications
  USING (business_id = get_user_business_id());

CREATE POLICY "tenant_isolation" ON deliveries
  USING (business_id = get_user_business_id());

CREATE POLICY "tenant_isolation" ON staff
  USING (business_id = get_user_business_id());

CREATE POLICY "tenant_isolation" ON expenses
  USING (business_id = get_user_business_id());

CREATE POLICY "tenant_isolation" ON vendors
  USING (business_id = get_user_business_id());

CREATE POLICY "tenant_isolation" ON fiscal_reports
  USING (business_id = get_user_business_id());

CREATE POLICY "tenant_isolation" ON app_config
  USING (business_id = get_user_business_id());

-- Políticas para user_profiles
CREATE POLICY "users_own_profile" ON user_profiles
  FOR SELECT USING (id = auth.uid() OR business_id = get_user_business_id());

CREATE POLICY "users_update_own" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- Políticas para businesses
CREATE POLICY "users_own_business" ON businesses
  FOR SELECT USING (id = get_user_business_id());
