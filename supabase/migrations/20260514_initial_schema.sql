-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE SEDES (VENUES / BUSINESS)
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tax_id TEXT,
  country TEXT DEFAULT 'Colombia',
  currency TEXT DEFAULT 'COP',
  timezone TEXT DEFAULT 'America/Bogota',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PERFILES DE USUARIO (Vinculados a Auth.users de Supabase)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'WAITER', -- ADMIN, WAITER, CHEF, CASHIER, SUPPORT
  business_id UUID REFERENCES venues(id),
  assigned_venue TEXT DEFAULT 'Sede Central',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PRODUCTOS / MENÚ
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES venues(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  category TEXT,
  available BOOLEAN DEFAULT true,
  image_url TEXT,
  code TEXT, -- Código/SKU para el menú
  stock DECIMAL(12,2) DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ÓRDENES
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES venues(id),
  order_number SERIAL,
  table_number TEXT,
  guest_count INTEGER DEFAULT 1,
  items JSONB DEFAULT '[]'::jsonb, 
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'PENDING', -- PENDING, IN_KITCHEN, READY, DELIVERED, PAID, CANCELLED
  waiter_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. FACTURAS (INVOICES)
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES venues(id),
  order_id UUID REFERENCES orders(id),
  order_number TEXT,
  invoice_number TEXT,
  table_number TEXT,
  customer_name TEXT,
  customer_tax_id TEXT,
  customer_email TEXT,
  customer_address TEXT,
  is_electronic BOOLEAN DEFAULT false,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  cashier_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. INVENTARIO (SUPPLIES)
CREATE TABLE supplies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES venues(id),
  name TEXT NOT NULL,
  sku TEXT,
  unit TEXT,
  price DECIMAL(12,2) DEFAULT 0,
  stock DECIMAL(12,2) DEFAULT 0,
  min_stock DECIMAL(12,2) DEFAULT 10,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. PROVEEDORES (VENDORS)
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES venues(id),
  name TEXT NOT NULL,
  category TEXT,
  rating DECIMAL(3,2) DEFAULT 5.0,
  lead_time INTEGER DEFAULT 2,
  contact_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. NOTIFICACIONES
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES venues(id),
  title TEXT NOT NULL,
  message TEXT,
  type TEXT, -- INFO, WARNING, ALERT
  status TEXT DEFAULT 'unread', -- unread, read
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. CONFIGURACIÓN DE LA APP (APP_CONFIG)
CREATE TABLE app_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID UNIQUE REFERENCES venues(id),
  business_name TEXT,
  tax_id TEXT,
  address TEXT,
  currency TEXT DEFAULT 'COP',
  tax_rate DECIMAL(5,2) DEFAULT 0.15,
  low_stock_threshold DECIMAL(12,2) DEFAULT 10,
  default_invoice_type TEXT DEFAULT 'POS',
  tax_regime TEXT,
  invoice_prefix TEXT,
  resolution_number TEXT,
  legal_footer TEXT,
  dian_tech_key TEXT,
  dian_test_set_id TEXT,
  dian_provider TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en todas las tablas
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE SEGURIDAD (EJEMPLOS BÁSICOS)
-- Nota: En producción, deberías restringir por business_id usando una función que obtenga el business_id del usuario autenticado.

CREATE POLICY "Users can read their own business data" ON menu_items
  FOR SELECT TO authenticated USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can read their own profile" ON user_profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Authenticated users can read venues" ON venues
  FOR SELECT TO authenticated USING (true);
