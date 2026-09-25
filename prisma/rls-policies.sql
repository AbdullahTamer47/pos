-- ============================================================================
-- PostgreSQL Row Level Security (RLS) Policies
-- Multi-Tenant Data Isolation for Smart POS Next
-- ============================================================================
--
-- This file enables RLS on all tenant-scoped tables and creates policies
-- that restrict row access to the current tenant only.
--
-- Usage:
--   1. Run this SQL after running Prisma migrations.
--   2. At the start of each database session (or per-request), call:
--        SELECT set_tenant_id('tenant-uuid-here');
--   3. For SUPER_ADMIN bypass, check if the user is a super admin in your
--      application middleware and skip calling set_tenant_id() to allow
--      full access.
--
-- Tables protected by RLS (all tables that have a tenant_id column):
--   subscriptions, feature_flags, users, branches, warehouses,
--   categories, products, price_lists, stock_levels, inventory_movements,
--   stock_alerts, customers, customer_ledgers, loyalty_configs,
--   loyalty_transactions, gift_cards, suppliers, supplier_ledgers,
--   purchase_orders, invoices, invoice_holds, payments, cash_shifts,
--   expenses, revenues, tax_configs, coupons, promotions, audit_logs,
--   notifications, support_tickets, backups, webhook_endpoints,
--   api_keys, exchange_rates
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper function: set_tenant_id
-- Sets the current tenant context for the session.
-- Call this at the beginning of each request after authenticating the user.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_tenant_id(tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Helper function: clear_tenant_id
-- Clears the tenant context (useful for super admin operations).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION clear_tenant_id()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', '', true);
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Helper function: get_tenant_id
-- Returns the current tenant ID from the session.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  tenant_id_text text;
BEGIN
  tenant_id_text := current_setting('app.current_tenant_id', true);
  IF tenant_id_text IS NULL OR tenant_id_text = '' THEN
    RETURN NULL;
  END IF;
  RETURN tenant_id_text::uuid;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Helper function: is_super_admin
-- Checks if the current session has super admin privileges.
-- Super admins bypass all RLS policies.
-- Set this via: PERFORM set_config('app.is_super_admin', 'true', true);
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  flag text;
BEGIN
  flag := current_setting('app.is_super_admin', true);
  RETURN flag IS NOT NULL AND flag = 'true';
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Helper function: set_super_admin
-- Grants super admin bypass for the current session.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_super_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM set_config('app.is_super_admin', 'true', true);
END;
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
-- Each table with a tenant_id column gets:
--   1. RLS enabled
--   2. A SELECT policy: tenant_isolation_select
--   3. An INSERT policy: tenant_isolation_insert
--   4. An UPDATE policy: tenant_isolation_update
--   5. A DELETE policy: tenant_isolation_delete
--
-- All policies check:
--   (tenant_id = get_tenant_id()) OR is_super_admin() = true
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Subscriptions
-- ----------------------------------------------------------------------------
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON subscriptions
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON subscriptions
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON subscriptions
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON subscriptions
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- FeatureFlags
-- ----------------------------------------------------------------------------
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON feature_flags
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON feature_flags
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON feature_flags
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON feature_flags
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Users
-- ----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON users
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON users
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON users
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON users
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Branches
-- ----------------------------------------------------------------------------
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON branches
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON branches
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON branches
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON branches
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Warehouses
-- ----------------------------------------------------------------------------
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON warehouses
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON warehouses
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON warehouses
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON warehouses
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Categories
-- ----------------------------------------------------------------------------
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON categories
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON categories
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON categories
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON categories
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Products
-- ----------------------------------------------------------------------------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON products
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON products
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON products
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON products
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- PriceLists
-- ----------------------------------------------------------------------------
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON price_lists
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON price_lists
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON price_lists
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON price_lists
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- StockLevels
-- ----------------------------------------------------------------------------
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON stock_levels
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON stock_levels
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON stock_levels
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON stock_levels
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- InventoryMovements
-- ----------------------------------------------------------------------------
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON inventory_movements
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON inventory_movements
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON inventory_movements
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON inventory_movements
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- StockAlerts
-- ----------------------------------------------------------------------------
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON stock_alerts
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON stock_alerts
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON stock_alerts
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON stock_alerts
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Customers
-- ----------------------------------------------------------------------------
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON customers
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON customers
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON customers
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON customers
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- CustomerLedgers
-- ----------------------------------------------------------------------------
ALTER TABLE customer_ledgers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON customer_ledgers
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON customer_ledgers
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON customer_ledgers
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON customer_ledgers
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- LoyaltyConfigs
-- ----------------------------------------------------------------------------
ALTER TABLE loyalty_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON loyalty_configs
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON loyalty_configs
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON loyalty_configs
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON loyalty_configs
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- LoyaltyTransactions
-- ----------------------------------------------------------------------------
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON loyalty_transactions
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON loyalty_transactions
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON loyalty_transactions
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON loyalty_transactions
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- GiftCards
-- ----------------------------------------------------------------------------
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON gift_cards
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON gift_cards
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON gift_cards
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON gift_cards
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Suppliers
-- ----------------------------------------------------------------------------
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON suppliers
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON suppliers
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON suppliers
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON suppliers
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- SupplierLedgers
-- ----------------------------------------------------------------------------
ALTER TABLE supplier_ledgers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON supplier_ledgers
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON supplier_ledgers
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON supplier_ledgers
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON supplier_ledgers
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- PurchaseOrders
-- ----------------------------------------------------------------------------
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON purchase_orders
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON purchase_orders
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON purchase_orders
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON purchase_orders
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Invoices
-- ----------------------------------------------------------------------------
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON invoices
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON invoices
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON invoices
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON invoices
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- InvoiceHolds
-- ----------------------------------------------------------------------------
ALTER TABLE invoice_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON invoice_holds
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON invoice_holds
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON invoice_holds
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON invoice_holds
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Payments
-- ----------------------------------------------------------------------------
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON payments
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON payments
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON payments
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON payments
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- CashShifts
-- ----------------------------------------------------------------------------
ALTER TABLE cash_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON cash_shifts
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON cash_shifts
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON cash_shifts
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON cash_shifts
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Expenses
-- ----------------------------------------------------------------------------
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON expenses
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON expenses
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON expenses
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON expenses
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Revenues
-- ----------------------------------------------------------------------------
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON revenues
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON revenues
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON revenues
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON revenues
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- TaxConfigs
-- ----------------------------------------------------------------------------
ALTER TABLE tax_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON tax_configs
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON tax_configs
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON tax_configs
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON tax_configs
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Coupons
-- ----------------------------------------------------------------------------
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON coupons
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON coupons
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON coupons
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON coupons
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Promotions
-- ----------------------------------------------------------------------------
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON promotions
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON promotions
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON promotions
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON promotions
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- AuditLogs
-- ----------------------------------------------------------------------------
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON audit_logs
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON audit_logs
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON audit_logs
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON audit_logs
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON notifications
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON notifications
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON notifications
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON notifications
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- SupportTickets
-- ----------------------------------------------------------------------------
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON support_tickets
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON support_tickets
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON support_tickets
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON support_tickets
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- Backups
-- ----------------------------------------------------------------------------
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON backups
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON backups
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON backups
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON backups
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- WebhookEndpoints
-- ----------------------------------------------------------------------------
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON webhook_endpoints
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON webhook_endpoints
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON webhook_endpoints
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON webhook_endpoints
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- ApiKeys
-- ----------------------------------------------------------------------------
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON api_keys
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON api_keys
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON api_keys
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON api_keys
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

-- ----------------------------------------------------------------------------
-- ExchangeRates
-- ----------------------------------------------------------------------------
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON exchange_rates
  FOR SELECT
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_insert ON exchange_rates
  FOR INSERT
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_update ON exchange_rates
  FOR UPDATE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true)
  WITH CHECK ((tenant_id = get_tenant_id()) OR is_super_admin() = true);

CREATE POLICY tenant_isolation_delete ON exchange_rates
  FOR DELETE
  USING ((tenant_id = get_tenant_id()) OR is_super_admin() = true);