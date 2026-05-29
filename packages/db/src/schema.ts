import { pgTable, text, timestamp, boolean, integer, decimal, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. CANAL DE DISTRIBUCIÓN (PARTNERS)
export const partners = pgTable('partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  region: text('region').notNull(),
  tier: text('tier', { enum: ['affiliate', 'reseller', 'master_reseller'] }).notNull().default('affiliate'),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).default('10.00'),
  discountRate: decimal('discount_rate', { precision: 5, scale: 2 }).default('0.00'),
  referralCode: text('referral_code').unique().notNull(),
  totalClients: integer('total_clients').default(0),
  activeClients: integer('active_clients').default(0),
  totalMrr: decimal('total_mrr', { precision: 12, scale: 2 }).default('0.00'),
  status: text('status', { enum: ['active', 'inactive', 'suspended'] }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. INQUILINOS / NEGOCIOS (TENANTS)
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  profile: text('profile', { enum: ['general', 'weight', 'catalog', 'distribution', 'services'] }).notNull(),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').default('#0075FF'),
  accentColor: text('accent_color').default('#FF5400'),
  timezone: text('timezone').default('America/Mexico_City'),
  plan: text('plan', { enum: ['basic', 'pro', 'multi', 'distribution', 'lifetime'] }).notNull().default('basic'),
  planStatus: text('plan_status', { enum: ['trial', 'active', 'grace', 'readonly', 'paused', 'cancelled'] }).default('trial'),
  trialEndsAt: timestamp('trial_ends_at'),
  planExpiresAt: timestamp('plan_expires_at'),
  maxBranches: integer('max_branches').default(1),
  maxCashiers: integer('max_cashiers').default(2),
  maxAdmins: integer('max_admins').default(1),
  licenseType: text('license_type', { enum: ['monthly', 'annual', 'lifetime'] }).default('monthly'),
  partnerId: uuid('partner_id').references(() => partners.id),
  settings: jsonb('settings').default({}),
  notificationConfig: jsonb('notification_config').default({}),
  rfc: text('rfc'),
  businessAddress: text('business_address'),
  fiscalRegimen: text('fiscal_regimen'),
  fiscalPostalCode: text('fiscal_postal_code'),
  razonSocial: text('razon_social'),
  pacWebhookUrl: text('pac_webhook_url'),
  dbConnectionString: text('db_connection_string'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 3. SUCURSALES (BRANCHES)
export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. USUARIOS (USERS)
// Se vincula a auth.users de Supabase Auth
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  branchId: uuid('branch_id').references(() => branches.id),
  name: text('name').notNull(),
  role: text('role', { enum: ['owner', 'admin', 'cashier', 'external_accountant', 'superadmin'] }).notNull(),
  telegramChatId: text('telegram_chat_id'),
  pin: text('pin'), // PIN de 4 dígitos para acceso rápido en POS
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. CAJAS REGISTRADORAS (CASH REGISTERS)
export const cashRegisters = pgTable('cash_registers', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true),
});

// 6. TURNOS (SHIFTS)
export const shifts = pgTable('shifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  cashRegisterId: uuid('cash_register_id').notNull().references(() => cashRegisters.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  openingCash: decimal('opening_cash', { precision: 12, scale: 2 }).default('0.00'),
  closingCash: decimal('closing_cash', { precision: 12, scale: 2 }),
  expectedCash: decimal('expected_cash', { precision: 12, scale: 2 }),
  cashDifference: decimal('cash_difference', { precision: 12, scale: 2 }),
  totalSales: decimal('total_sales', { precision: 12, scale: 2 }).default('0.00'),
  totalTransactions: integer('total_transactions').default(0),
  openedAt: timestamp('opened_at').defaultNow(),
  closedAt: timestamp('closed_at'),
  notes: text('notes'),
});

// 7. CLIENTES Y CRÉDITO (CUSTOMERS)
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  rfc: text('rfc'),
  razonSocial: text('razon_social'),
  postalCode: text('postal_code'),
  regimenFiscal: text('regimen_fiscal'),
  cfdiUse: text('cfdi_use'),
  creditEnabled: boolean('credit_enabled').default(false),
  creditLimit: decimal('credit_limit', { precision: 12, scale: 2 }).default('0.00'),
  currentBalance: decimal('current_balance', { precision: 12, scale: 2 }).default('0.00'),
  paymentDays: integer('payment_days').default(7),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. CATÁLOGO DE PRODUCTOS (PRODUCTS)
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  description: text('description'),
  barcode: text('barcode'),
  internalCode: text('internal_code'),
  category: text('category'),
  unit: text('unit', { enum: ['pza', 'kg', 'g', 'l', 'ml', 'caja', 'servicio'] }).default('pza'),
  costPrice: decimal('cost_price', { precision: 12, scale: 2 }).default('0.00'),
  salePrice: decimal('sale_price', { precision: 12, scale: 2 }).notNull(),
  wholesalePrice: decimal('wholesale_price', { precision: 12, scale: 2 }),
  stock: decimal('stock', { precision: 12, scale: 3 }).default('0.000'),
  stockMin: decimal('stock_min', { precision: 12, scale: 3 }).default('0.000'),
  stockCritical: decimal('stock_critical', { precision: 12, scale: 3 }).default('0.000'),
  trackExpiry: boolean('track_expiry').default(false),
  hasVariants: boolean('has_variants').default(false),
  isKit: boolean('is_kit').default(false),
  isService: boolean('is_service').default(false),
  quickButton: boolean('quick_button').default(false),
  quickButtonOrder: integer('quick_button_order'),
  quickButtonColor: text('quick_button_color'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 9. TRANSACCIONES DE VENTA (SALES)
export const sales = pgTable('sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  cashRegisterId: uuid('cash_register_id').references(() => cashRegisters.id),
  shiftId: uuid('shift_id').references(() => shifts.id),
  userId: uuid('user_id').references(() => users.id),
  customerId: uuid('customer_id').references(() => customers.id),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0.00'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  costTotal: decimal('cost_total', { precision: 12, scale: 2 }).default('0.00'),
  paymentMethod: text('payment_method', { enum: ['cash', 'transfer', 'card', 'mixed', 'credit'] }).notNull(),
  paymentCash: decimal('payment_cash', { precision: 12, scale: 2 }),
  paymentChange: decimal('payment_change', { precision: 12, scale: 2 }),
  paymentMixed: jsonb('payment_mixed'), // {cash: X, card: Y}
  status: text('status', { enum: ['completed', 'cancelled', 'refunded'] }).default('completed'),
  fiscalStatus: text('fiscal_status', { enum: ['pending', 'invoiced', 'global_invoiced', 'exempt'] }).default('pending'),
  fiscalUuid: text('fiscal_uuid'),
  fiscalXmlUrl: text('fiscal_xml_url'),
  syncedOffline: boolean('synced_offline').default(false),
  offlineId: text('offline_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. LÍNEAS DE VENTA (SALE ITEMS)
export const saleItems = pgTable('sale_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  saleId: uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id),
  productName: text('product_name').notNull(), // snapshot del nombre en el momento de venta
  productCode: text('product_code'),
  unit: text('unit').notNull().default('pza'),
  quantity: decimal('quantity', { precision: 12, scale: 3 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 12, scale: 2 }).default('0.00'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  discountPct: decimal('discount_pct', { precision: 5, scale: 2 }).default('0.00'),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
});

// 11. BITÁCORA DE AUDITORÍA INMUTABLE (AUDIT LOGS)
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(), // e.g. 'PRODUCT_EDIT', 'SALE_CANCEL', 'STOCK_ADJUST'
  details: jsonb('details').notNull(),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 12. GASTOS OPERATIVOS (EXPENSES)
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  category: text('category').notNull(), // e.g. 'Renta', 'Sueldos', 'Servicios', 'Otros'
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  date: timestamp('date').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// RELACIONES DRIZZLE
export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  partner: one(partners, { fields: [tenants.partnerId], references: [partners.id] }),
  branches: many(branches),
  users: many(users),
  products: many(products),
  sales: many(sales),
}));

export const productsRelations = relations(products, ({ one }) => ({
  tenant: one(tenants, { fields: [products.tenantId], references: [tenants.id] }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  tenant: one(tenants, { fields: [sales.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [sales.branchId], references: [branches.id] }),
  shift: one(shifts, { fields: [sales.shiftId], references: [shifts.id] }),
  customer: one(customers, { fields: [sales.customerId], references: [customers.id] }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shifts.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [shifts.branchId], references: [branches.id] }),
  cashRegister: one(cashRegisters, { fields: [shifts.cashRegisterId], references: [cashRegisters.id] }),
  user: one(users, { fields: [shifts.userId], references: [users.id] }),
  sales: many(sales),
}));
