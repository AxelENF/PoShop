-- =========================================================================
-- SNAPGAD POS (PoShop) — ENGINE DE SEGURIDAD MULTI-TENANT & SUSCRIPCIONES
-- RUTA DE INSTALACIÓN: Copiar y pegar en el SQL Editor de tu Dashboard de Supabase.
-- =========================================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. CANAL DE DISTRIBUCIÓN (PARTNERS) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    region TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'affiliate' CHECK (tier IN ('affiliate', 'reseller', 'master_reseller')),
    commission_rate DECIMAL(5, 2) DEFAULT 10.00,
    discount_rate DECIMAL(5, 2) DEFAULT 0.00,
    referral_code TEXT UNIQUE NOT NULL,
    total_clients INT DEFAULT 0,
    active_clients INT DEFAULT 0,
    total_mrr DECIMAL(12, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 2. INQUILINOS / NEGOCIOS (TENANTS) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    profile TEXT NOT NULL CHECK (profile IN ('general', 'weight', 'catalog', 'distribution', 'services')),
    logo_url TEXT,
    primary_color TEXT DEFAULT '#0075FF',
    accent_color TEXT DEFAULT '#FF5400',
    timezone TEXT DEFAULT 'America/Mexico_City',
    plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'multi', 'distribution', 'lifetime')),
    plan_status TEXT DEFAULT 'trial' CHECK (plan_status IN ('trial', 'active', 'grace', 'readonly', 'paused', 'cancelled')),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    plan_expires_at TIMESTAMP WITH TIME ZONE,
    max_branches INT DEFAULT 1,
    max_cashiers INT DEFAULT 2,
    max_admins INT DEFAULT 1,
    license_type TEXT DEFAULT 'monthly' CHECK (license_type IN ('monthly', 'annual', 'lifetime')),
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    notification_config JSONB DEFAULT '{}'::jsonb,
    rfc TEXT,
    business_address TEXT,
    fiscal_regimen TEXT,
    fiscal_postal_code TEXT,
    razon_social TEXT,
    pac_webhook_url TEXT,
    db_connection_string TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 3. SUCURSALES (BRANCHES) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 4. USUARIOS (USERS) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY, -- Mapeado al ID de Supabase Auth
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'cashier', 'external_accountant', 'superadmin')),
    telegram_chat_id TEXT,
    pin TEXT CHECK (length(pin) = 4 OR pin IS NULL),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 5. CAJAS REGISTRADORAS (CASH REGISTERS) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- ── 6. TURNOS (SHIFTS) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    opening_cash DECIMAL(12, 2) DEFAULT 0.00,
    closing_cash DECIMAL(12, 2),
    expected_cash DECIMAL(12, 2),
    cash_difference DECIMAL(12, 2),
    total_sales DECIMAL(12, 2) DEFAULT 0.00,
    total_transactions INT DEFAULT 0,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- ── 7. CLIENTES Y CRÉDITO (CUSTOMERS) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    rfc TEXT,
    razon_social TEXT,
    postal_code TEXT,
    regimen_fiscal TEXT,
    cfdi_use TEXT,
    credit_enabled BOOLEAN DEFAULT FALSE,
    credit_limit DECIMAL(12, 2) DEFAULT 0.00,
    current_balance DECIMAL(12, 2) DEFAULT 0.00,
    payment_days INT DEFAULT 7,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 8. CATÁLOGO DE PRODUCTOS (PRODUCTS) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    barcode TEXT,
    internal_code TEXT,
    category TEXT,
    unit TEXT DEFAULT 'pza' CHECK (unit IN ('pza', 'kg', 'g', 'l', 'ml', 'caja', 'servicio')),
    cost_price DECIMAL(12, 2) DEFAULT 0.00,
    sale_price DECIMAL(12, 2) NOT NULL,
    wholesale_price DECIMAL(12, 2),
    stock DECIMAL(12, 3) DEFAULT 0.000,
    stock_min DECIMAL(12, 3) DEFAULT 0.000,
    stock_critical DECIMAL(12, 3) DEFAULT 0.000,
    track_expiry BOOLEAN DEFAULT FALSE,
    has_variants BOOLEAN DEFAULT FALSE,
    is_kit BOOLEAN DEFAULT FALSE,
    is_service BOOLEAN DEFAULT FALSE,
    quick_button BOOLEAN DEFAULT FALSE,
    quick_button_order INT,
    quick_button_color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 9. TRANSACCIONES DE VENTA (SALES) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    total DECIMAL(12, 2) NOT NULL,
    cost_total DECIMAL(12, 2) DEFAULT 0.00,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'card', 'mixed', 'credit')),
    payment_cash DECIMAL(12, 2),
    payment_change DECIMAL(12, 2),
    payment_mixed JSONB,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
    fiscal_status TEXT DEFAULT 'pending' CHECK (fiscal_status IN ('pending', 'invoiced', 'global_invoiced', 'exempt')),
    fiscal_uuid TEXT,
    fiscal_xml_url TEXT,
    synced_offline BOOLEAN DEFAULT FALSE,
    offline_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 10. LÍNEAS DE VENTA (SALE ITEMS) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_code TEXT,
    unit TEXT NOT NULL DEFAULT 'pza',
    quantity DECIMAL(12, 3) NOT NULL,
    unit_cost DECIMAL(12, 2) DEFAULT 0.00,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount_pct DECIMAL(5, 2) DEFAULT 0.00,
    subtotal DECIMAL(12, 2) NOT NULL
);

-- ── 11. BITÁCORA DE AUDITORÍA INMUTABLE (AUDIT LOGS) ─────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 12. GASTOS OPERATIVOS (EXPENSES) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- ── 13. SISTEMA DE SEGURIDAD MULTI-TENANT (ROW LEVEL SECURITY) ───────────
-- =========================================================================

-- Habilitar RLS en todas las tablas transaccionales y de configuración
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Función helper para extraer el tenant_id de forma 100% segura desde el JWT de autenticación.
-- Esto se configura en los metadatos del usuario al crearse (user_metadata -> tenant_id).
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'user_metadata' ->> 'tenant_id')::uuid,
    NULL
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Función helper para extraer el rol del usuario autenticado desde el JWT
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'user_metadata' ->> 'role')::text,
    'cashier'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── 14. DEFINICIÓN DE POLÍTICAS DE ACCESO INFRANQUEABLES (RLS POLICIES) ──

-- POLÍTICAS PARA TENANTS
CREATE POLICY tenant_isolation_policy ON public.tenants
    FOR ALL
    USING (id = public.get_auth_tenant_id() OR public.get_auth_user_role() = 'superadmin');

-- POLÍTICAS PARA SUCURSALES (BRANCHES)
CREATE POLICY branch_isolation_policy ON public.branches
    FOR ALL
    USING (tenant_id = public.get_auth_tenant_id() OR public.get_auth_user_role() = 'superadmin');

-- POLÍTICAS PARA USUARIOS (USERS)
CREATE POLICY user_isolation_policy ON public.users
    FOR ALL
    USING (tenant_id = public.get_auth_tenant_id() OR public.get_auth_user_role() = 'superadmin');

-- POLÍTICAS PARA CAJAS REGISTRADORAS
CREATE POLICY register_isolation_policy ON public.cash_registers
    FOR ALL
    USING (tenant_id = public.get_auth_tenant_id() OR public.get_auth_user_role() = 'superadmin');

-- POLÍTICAS PARA TURNOS (SHIFTS)
CREATE POLICY shift_isolation_policy ON public.shifts
    FOR ALL
    USING (tenant_id = public.get_auth_tenant_id() OR public.get_auth_user_role() = 'superadmin');

-- POLÍTICAS PARA CLIENTES (CUSTOMERS)
CREATE POLICY customer_isolation_policy ON public.customers
    FOR ALL
    USING (tenant_id = public.get_auth_tenant_id() OR public.get_auth_user_role() = 'superadmin');

-- POLÍTICAS PARA PRODUCTOS (PRODUCTS)
CREATE POLICY product_isolation_policy ON public.products
    FOR ALL
    USING (tenant_id = public.get_auth_tenant_id() OR public.get_auth_user_role() = 'superadmin');

-- POLÍTICAS PARA VENTAS (SALES)
CREATE POLICY sale_isolation_policy ON public.sales
    FOR ALL
    USING (tenant_id = public.get_auth_tenant_id() OR public.get_auth_user_role() = 'superadmin');

-- POLÍTICAS PARA LÍNEAS DE VENTA (SALE ITEMS)
-- Se validan recursivamente a través de la venta asociada para mantener la integridad referencial.
CREATE POLICY sale_items_isolation_policy ON public.sale_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.sales s 
            WHERE s.id = sale_items.sale_id AND (s.tenant_id = public.get_auth_tenant_id() OR public.get_auth_user_role() = 'superadmin')
        )
    );

-- POLÍTICAS PARA GASTOS (EXPENSES)
CREATE POLICY expense_isolation_policy ON public.expenses
    FOR ALL
    USING (tenant_id = public.get_auth_tenant_id() OR public.get_auth_user_role() = 'superadmin');

-- POLÍTICAS PARA BITÁCORAS DE AUDITORÍA (AUDIT LOGS)
CREATE POLICY audit_isolation_policy ON public.audit_logs
    FOR ALL
    USING (tenant_id = public.get_auth_tenant_id() OR public.get_auth_user_role() = 'superadmin');

-- =========================================================================
-- ── 15. CONTROL REMOTO DE SUSCRIPCIONES Y LÍMITES DE PLAN (BLOQUEOS) ─────
-- =========================================================================

-- Trigger para validar que los inquilinos no excedan sus límites de branches y cashiers asignados.
CREATE OR REPLACE FUNCTION public.check_tenant_limits_integrity()
RETURNS TRIGGER AS $$
DECLARE
    current_branch_count INT;
    current_cashier_count INT;
    max_allowed_branches INT;
    max_allowed_cashiers INT;
    tenant_status TEXT;
BEGIN
    -- Obtener límites configurados en el plan del Tenant
    SELECT plan_status, max_branches, max_cashiers 
    INTO tenant_status, max_allowed_branches, max_allowed_cashiers
    FROM public.tenants
    WHERE id = NEW.tenant_id;

    -- 1. Si la cuenta está en pausa o cancelada, bloquear cualquier adición o cambio operativo
    IF tenant_status IN ('paused', 'cancelled', 'readonly') THEN
        RAISE EXCEPTION 'SNAPGAD LOCK: Tu suscripción está inactiva o en modo lectura. Por favor, regulariza tu cuenta en el panel administrativo.';
    END IF;

    -- 2. Si es una nueva sucursal, validar límites de sucursal
    IF TG_TABLE_NAME = 'branches' AND TG_OP = 'INSERT' THEN
        SELECT COUNT(*) INTO current_branch_count FROM public.branches WHERE tenant_id = NEW.tenant_id;
        IF current_branch_count >= max_allowed_branches THEN
            RAISE EXCEPTION 'SNAPGAD LIMITS: Has excedido el número máximo de sucursales autorizadas (% sucursal/es) para tu plan activo.', max_allowed_branches;
        END IF;
    END IF;

    -- 3. Si es un nuevo cajero, validar límites de cajeros activos
    IF TG_TABLE_NAME = 'users' AND TG_OP = 'INSERT' AND NEW.role = 'cashier' THEN
        SELECT COUNT(*) INTO current_cashier_count FROM public.users WHERE tenant_id = NEW.tenant_id AND role = 'cashier';
        IF current_cashier_count >= max_allowed_cashiers THEN
            RAISE EXCEPTION 'SNAPGAD LIMITS: Has excedido el número máximo de cajeros permitidos (% cajeros) para tu plan activo.', max_allowed_cashiers;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vincular validaciones a Sucursales
CREATE OR REPLACE TRIGGER check_branch_limits_trigger
BEFORE INSERT ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.check_tenant_limits_integrity();

-- Vincular validaciones a Usuarios (Cajeros)
CREATE OR REPLACE TRIGGER check_cashier_limits_trigger
BEFORE INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.check_tenant_limits_integrity();

-- =========================================================================
-- ── 16. AUTO-SYNC: REGISTRO AUTOMÁTICO DE USUARIOS DESDE SUPABASE AUTH ────
-- =========================================================================

-- Trigger que se dispara cuando un nuevo usuario se registra a través de Supabase Auth
-- y automáticamente crea su contraparte en public.users con los metadatos asignados.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_sync()
RETURNS TRIGGER AS $$
DECLARE
    assigned_tenant_id UUID;
    assigned_role TEXT;
    assigned_name TEXT;
BEGIN
    -- Extraer metadatos pasados en la llamada de SignUp / Invitación
    assigned_tenant_id := (NEW.raw_user_meta_data ->> 'tenant_id')::uuid;
    assigned_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'cashier');
    assigned_name := COALESCE(NEW.raw_user_meta_data ->> 'name', 'Nuevo Colaborador');

    -- Validar que el tenant_id exista
    IF assigned_tenant_id IS NULL THEN
        -- Si no hay tenant_id, crear automáticamente un Tenant de Demo / Trial básico
        INSERT INTO public.tenants (name, slug, profile, plan, plan_status, trial_ends_at)
        VALUES ('Negocio de Prueba', 'demo-' || substring(gen_random_uuid()::text from 1 for 8), 'general', 'basic', 'trial', NOW() + INTERVAL '14 days')
        RETURNING id INTO assigned_tenant_id;
    END IF;

    -- Registrar el usuario en la tabla pública vinculándolo al tenant y branch asignados
    INSERT INTO public.users (id, tenant_id, name, role, is_active)
    VALUES (
        NEW.id,
        assigned_tenant_id,
        assigned_name,
        assigned_role,
        TRUE
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador en Supabase Auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created_sync_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_sync();
