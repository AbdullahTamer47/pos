// ──────────────────────────────────────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  TRADER = "TRADER",
  MANAGER = "MANAGER",
  CASHIER = "CASHIER",
}

export enum InvoiceType {
  SALE = "SALE",
  PURCHASE = "PURCHASE",
  RETURN_SALE = "RETURN_SALE",
  RETURN_PURCHASE = "RETURN_PURCHASE",
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
  HELD = "HELD",
}

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  CREDIT = "CREDIT",
  WALLET = "WALLET",
  INSTAPAY = "INSTAPAY",
  VODAFONE_CASH = "VODAFONE_CASH",
  MEEZA = "MEEZA",
  GIFT_CARD = "GIFT_CARD",
  SPLIT = "SPLIT",
}

export enum InventoryMovementType {
  IN = "IN",
  OUT = "OUT",
  TRANSFER = "TRANSFER",
  STOCKTAKING = "STOCKTAKING",
  DAMAGE = "DAMAGE",
  EXPIRED = "EXPIRED",
}

export enum PurchaseOrderStatus {
  DRAFT = "DRAFT",
  APPROVED = "APPROVED",
  RECEIVED = "RECEIVED",
  CANCELLED = "CANCELLED",
}

export enum TicketPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum TicketStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}

export enum SubscriptionInterval {
  TRIAL = "TRIAL",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export enum NotificationType {
  INFO = "INFO",
  WARNING = "WARNING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export enum CustomerTier {
  REGULAR = "REGULAR",
  SILVER = "SILVER",
  GOLD = "GOLD",
  PLATINUM = "PLATINUM",
}

export enum UnitType {
  PIECE = "PIECE",
  KG = "KG",
  LITER = "LITER",
  BOX = "BOX",
  CARTON = "CARTON",
  METER = "METER",
  DOZEN = "DOZEN",
  PACK = "PACK",
  SET = "SET",
}

export enum CouponType {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
}

export enum PriceListType {
  RETAIL = "RETAIL",
  WHOLESALE = "WHOLESALE",
  SEMI = "SEMI",
  VIP = "VIP",
  CUSTOM = "CUSTOM",
}

export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

// ──────────────────────────────────────────────────────────────────────────────
// Common / Utility Interfaces
// ──────────────────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  cursor?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  pagination?: PaginationMeta;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
  details?: Record<string, string[]>;
  timestamp: string;
}

export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export interface Revenue {
  date: string;
  totalSales: number;
  totalPurchases: number;
  netRevenue: number;
  grossProfit: number;
  transactionCount: number;
  averageOrderValue: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Tenant & Branding
// ──────────────────────────────────────────────────────────────────────────────

export interface TenantBranding {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  companyNameAr: string;
  companyNameEn: string;
}

export interface TenantSettings {
  defaultLanguage: string;
  defaultCurrency: string;
  timezone: string;
  dateFormat: string;
  vatNumber: string;
  commercialRegister: string;
  printFooterAr: string;
  printFooterEn: string;
  enableZatca: boolean;
  enableWhatsapp: boolean;
  enableLoyalty: boolean;
  enableMultiCurrency: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Subscription
// ──────────────────────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: SubscriptionInterval;
  maxBranches: number;
  maxUsers: number;
  maxProducts: number;
  maxInvoices: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED" | "PAST_DUE" | "TRIALING";
  startDate: string;
  endDate: string;
  trialEndDate: string | null;
  autoRenew: boolean;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// User & Permissions
// ──────────────────────────────────────────────────────────────────────────────

export interface CashierPermission {
  can_sell: boolean;
  can_return: boolean;
  can_apply_discount: boolean;
  max_discount_percent: number;
  can_view_cost_price: boolean;
  can_edit_price: boolean;
  can_cancel_invoice: boolean;
  can_view_all_invoices: boolean;
  can_manage_customers: boolean;
  can_view_reports: boolean;
  can_manage_inventory: boolean;
  can_hold_invoice: boolean;
  can_open_close_shift: boolean;
}

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  nameAr: string | null;
  role: UserRole;
  tenantId: string;
  branchId: string | null;
  permissions: CashierPermission | null;
  isActive: boolean;
  lastLoginAt: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Customer
// ──────────────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  tenantId: string;
  fullName: string;
  nameAr: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  tier: CustomerTier;
  balance: number;
  creditLimit: number;
  loyaltyPoints: number;
  totalSpent: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Product & Category
// ──────────────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  tenantId: string;
  nameAr: string;
  nameEn: string;
  parentId: string | null;
  parent: Category | null;
  children: Category[];
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  nameAr: string;
  nameEn: string;
  sku: string;
  barcode: string;
  image: string | null;
  costPrice: number;
  sellingPrice: number;
  unit: UnitType;
  hasExpiry: boolean;
  isComposite: boolean;
  isActive: boolean;
  categoryId: string;
  category: Category | null;
  variants: ProductVariant[];
  compositeItems: ProductCompositeItem[];
  prices: ProductPrice[];
  stock: number;
  minStock: number;
  maxStock: number;
  descriptionAr: string | null;
  descriptionEn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCompositeItem {
  id: string;
  productId: string;
  componentId: string;
  component: Product;
  quantity: number;
  unit: UnitType;
}

export interface ProductPrice {
  id: string;
  productId: string;
  priceListId: string;
  price: number;
  priceList: PriceList;
}

export interface ProductVariant {
  id: string;
  productId: string;
  nameAr: string;
  nameEn: string;
  sku: string;
  barcode: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  isActive: boolean;
  options: ProductVariantOption[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariantOption {
  id: string;
  variantId: string;
  nameAr: string;
  nameEn: string;
  value: string;
}

export interface PriceList {
  id: string;
  tenantId: string;
  name: string;
  type: PriceListType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Branch & Warehouse
// ──────────────────────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  tenantId: string;
  nameAr: string;
  nameEn: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  isMain: boolean;
  warehouseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  branchId: string;
  branch: Branch | null;
  nameAr: string;
  nameEn: string;
  code: string;
  address: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Invoice, InvoiceItem & Payment
// ──────────────────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  product: Product;
  variantId: string | null;
  variant: ProductVariant | null;
  nameAr: string;
  nameEn: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountPercent: number;
  discountAmount: number;
  vatPercent: number;
  vatAmount: number;
  totalBeforeVat: number;
  totalAfterVat: number;
  lineTotal: number;
  createdAt: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  branchId: string;
  branch: Branch | null;
  warehouseId: string | null;
  warehouse: Warehouse | null;
  userId: string;
  user: User | null;
  customerId: string | null;
  customer: Customer | null;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  currency: string;
  exchangeRate: number;
  paymentMethod: PaymentMethod;
  notes: string | null;
  items: InvoiceItem[];
  payments: Payment[];
  couponId: string | null;
  coupon: Coupon | null;
  giftCardId: string | null;
  giftCard: GiftCard | null;
  heldAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  irn: string | null;
  qrCode: string | null;
  xmlHash: string | null;
  isZatcaReported: boolean;
  zatcaStatus: string | null;
  zatcaErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  cardLastFour: string | null;
  giftCardId: string | null;
  notes: string | null;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// CashShift
// ──────────────────────────────────────────────────────────────────────────────

export interface CashShift {
  id: string;
  tenantId: string;
  branchId: string;
  branch: Branch | null;
  userId: string;
  user: User | null;
  openingAmount: number;
  closingAmount: number;
  expectedAmount: number;
  difference: number;
  totalCashSales: number;
  totalCardSales: number;
  totalCreditSales: number;
  totalWalletSales: number;
  totalGiftCardSales: number;
  totalRefunds: number;
  totalExpenses: number;
  invoiceCount: number;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Expense
// ──────────────────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  tenantId: string;
  branchId: string;
  branch: Branch | null;
  userId: string;
  user: User | null;
  category: string;
  description: string;
  amount: number;
  receiptUrl: string | null;
  shiftId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Supplier
// ──────────────────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  tenantId: string;
  nameAr: string;
  nameEn: string;
  code: string;
  phone: string;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  balance: number;
  creditLimit: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// PurchaseOrder
// ──────────────────────────────────────────────────────────────────────────────

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  total: number;
  receivedQuantity: number;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  branchId: string;
  branch: Branch | null;
  warehouseId: string;
  warehouse: Warehouse | null;
  supplierId: string;
  supplier: Supplier;
  userId: string;
  user: User | null;
  orderNumber: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  expectedDate: string | null;
  receivedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Coupon, Loyalty, GiftCard
// ──────────────────────────────────────────────────────────────────────────────

export interface Coupon {
  id: string;
  tenantId: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyConfig {
  id: string;
  tenantId: string;
  pointsPerCurrency: number;
  currencyPerPoint: number;
  minPointsToRedeem: number;
  pointsExpiryDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GiftCard {
  id: string;
  tenantId: string;
  code: string;
  customerId: string | null;
  customer: Customer | null;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// StockAlert
// ──────────────────────────────────────────────────────────────────────────────

export interface StockAlert {
  id: string;
  tenantId: string;
  productId: string;
  product: Product;
  variantId: string | null;
  variant: ProductVariant | null;
  warehouseId: string;
  warehouse: Warehouse | null;
  currentStock: number;
  minStock: number;
  maxStock: number;
  isResolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// AuditLog
// ──────────────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  user: User | null;
  action: string;
  entity: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Notification
// ──────────────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  type: NotificationType;
  isRead: boolean;
  actionUrl: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// SupportTicket
// ──────────────────────────────────────────────────────────────────────────────

export interface SupportTicket {
  id: string;
  tenantId: string;
  userId: string;
  user: User | null;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string | null;
  assignedUser: User | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// FeatureFlag, Webhook, ApiKey, Backup
// ──────────────────────────────────────────────────────────────────────────────

export interface FeatureFlag {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  rolloutPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  key: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Backup {
  id: string;
  tenantId: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  type: "MANUAL" | "AUTOMATIC";
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// TaxConfig
// ──────────────────────────────────────────────────────────────────────────────

export interface TaxConfig {
  id: string;
  tenantId: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Inventory Movement
// ──────────────────────────────────────────────────────────────────────────────

export interface InventoryMovement {
  id: string;
  tenantId: string;
  warehouseId: string;
  warehouse: Warehouse | null;
  productId: string;
  product: Product;
  variantId: string | null;
  variant: ProductVariant | null;
  type: InventoryMovementType;
  quantity: number;
  unit: UnitType;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  userId: string;
  user: User | null;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Auth
// ──────────────────────────────────────────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterTenantDto {
  companyNameAr: string;
  companyNameEn: string;
  email: string;
  phone: string;
  password: string;
  planId: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — User
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateUserDto {
  email: string;
  phone: string;
  fullName: string;
  nameAr?: string;
  password: string;
  role: UserRole;
  branchId?: string;
  permissions?: CashierPermission;
  isActive?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  phone?: string;
  fullName?: string;
  nameAr?: string;
  password?: string;
  role?: UserRole;
  branchId?: string;
  permissions?: CashierPermission;
  isActive?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Customer
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateCustomerDto {
  fullName: string;
  nameAr?: string;
  phone: string;
  email?: string;
  address?: string;
  tier?: CustomerTier;
  creditLimit?: number;
  notes?: string;
}

export interface UpdateCustomerDto {
  fullName?: string;
  nameAr?: string;
  phone?: string;
  email?: string;
  address?: string;
  tier?: CustomerTier;
  creditLimit?: number;
  notes?: string;
  isActive?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Product
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateProductDto {
  nameAr: string;
  nameEn: string;
  sku: string;
  barcode: string;
  image?: string;
  costPrice: number;
  sellingPrice: number;
  unit: UnitType;
  hasExpiry?: boolean;
  isComposite?: boolean;
  isActive?: boolean;
  categoryId: string;
  minStock?: number;
  maxStock?: number;
  descriptionAr?: string;
  descriptionEn?: string;
}

export interface UpdateProductDto {
  nameAr?: string;
  nameEn?: string;
  sku?: string;
  barcode?: string;
  image?: string;
  costPrice?: number;
  sellingPrice?: number;
  unit?: UnitType;
  hasExpiry?: boolean;
  isComposite?: boolean;
  isActive?: boolean;
  categoryId?: string;
  minStock?: number;
  maxStock?: number;
  descriptionAr?: string;
  descriptionEn?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Category
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateCategoryDto {
  nameAr: string;
  nameEn: string;
  parentId?: string;
  image?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateCategoryDto {
  nameAr?: string;
  nameEn?: string;
  parentId?: string;
  image?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Invoice
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateInvoiceItemDto {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  vatPercent?: number;
}

export interface CreateInvoiceDto {
  branchId: string;
  warehouseId?: string;
  customerId?: string;
  type: InvoiceType;
  paymentMethod: PaymentMethod;
  currency?: string;
  exchangeRate?: number;
  items: CreateInvoiceItemDto[];
  couponCode?: string;
  giftCardCode?: string;
  paidAmount?: number;
  notes?: string;
}

export interface UpdateInvoiceDto {
  status?: InvoiceStatus;
  notes?: string;
  paidAmount?: number;
}

export interface HoldInvoiceDto {
  notes?: string;
}

export interface AddPaymentDto {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  cardLastFour?: string;
  giftCardId?: string;
  notes?: string;
}

export interface CreatePaymentDto {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  cardLastFour?: string;
  giftCardId?: string;
  notes?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Branch & Warehouse
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateBranchDto {
  nameAr: string;
  nameEn: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  isMain?: boolean;
  warehouseId?: string;
}

export interface UpdateBranchDto {
  nameAr?: string;
  nameEn?: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  isMain?: boolean;
  warehouseId?: string;
}

export interface CreateWarehouseDto {
  branchId: string;
  nameAr: string;
  nameEn: string;
  code: string;
  address?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdateWarehouseDto {
  branchId?: string;
  nameAr?: string;
  nameEn?: string;
  code?: string;
  address?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Supplier
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateSupplierDto {
  nameAr: string;
  nameEn: string;
  code: string;
  phone: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  creditLimit?: number;
  notes?: string;
}

export interface UpdateSupplierDto {
  nameAr?: string;
  nameEn?: string;
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  creditLimit?: number;
  notes?: string;
  isActive?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — PurchaseOrder
// ──────────────────────────────────────────────────────────────────────────────

export interface CreatePurchaseOrderItemDto {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseOrderDto {
  branchId: string;
  warehouseId: string;
  supplierId: string;
  items: CreatePurchaseOrderItemDto[];
  expectedDate?: string;
  notes?: string;
}

export interface UpdatePurchaseOrderDto {
  status?: PurchaseOrderStatus;
  expectedDate?: string;
  notes?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Coupon & GiftCard
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateCouponDto {
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  validFrom: string;
  validUntil: string;
  description?: string;
}

export interface UpdateCouponDto {
  code?: string;
  type?: CouponType;
  value?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  validFrom?: string;
  validUntil?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateGiftCardDto {
  code: string;
  customerId?: string;
  initialBalance: number;
  currency?: string;
  expiresAt?: string;
}

export interface UpdateGiftCardDto {
  code?: string;
  customerId?: string;
  initialBalance?: number;
  currentBalance?: number;
  currency?: string;
  expiresAt?: string;
  isActive?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — CashShift
// ──────────────────────────────────────────────────────────────────────────────

export interface OpenShiftDto {
  branchId: string;
  openingAmount: number;
  notes?: string;
}

export interface CloseShiftDto {
  closingAmount: number;
  notes?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Expense
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateExpenseDto {
  branchId: string;
  category: string;
  description: string;
  amount: number;
  receiptUrl?: string;
  shiftId?: string;
}

export interface UpdateExpenseDto {
  category?: string;
  description?: string;
  amount?: number;
  receiptUrl?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — ProductVariant
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateProductVariantDto {
  nameAr: string;
  nameEn: string;
  sku: string;
  barcode: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  options: CreateVariantOptionDto[];
}

export interface UpdateProductVariantDto {
  nameAr?: string;
  nameEn?: string;
  sku?: string;
  barcode?: string;
  costPrice?: number;
  sellingPrice?: number;
  stock?: number;
  isActive?: boolean;
}

export interface CreateVariantOptionDto {
  nameAr: string;
  nameEn: string;
  value: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — PriceList
// ──────────────────────────────────────────────────────────────────────────────

export interface CreatePriceListDto {
  name: string;
  type: PriceListType;
  isActive?: boolean;
}

export interface UpdatePriceListDto {
  name?: string;
  type?: PriceListType;
  isActive?: boolean;
}

export interface SetProductPriceDto {
  priceListId: string;
  price: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — InventoryMovement
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateInventoryMovementDto {
  warehouseId: string;
  productId: string;
  variantId?: string;
  type: InventoryMovementType;
  quantity: number;
  unit: UnitType;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — StockAlert
// ──────────────────────────────────────────────────────────────────────────────

export interface ResolveStockAlertDto {
  resolved: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Loyalty
// ──────────────────────────────────────────────────────────────────────────────

export interface UpdateLoyaltyConfigDto {
  pointsPerCurrency?: number;
  currencyPerPoint?: number;
  minPointsToRedeem?: number;
  pointsExpiryDays?: number;
  isActive?: boolean;
}

export interface RedeemPointsDto {
  customerId: string;
  points: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Tenant
// ──────────────────────────────────────────────────────────────────────────────

export interface UpdateTenantBrandingDto {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  companyNameAr?: string;
  companyNameEn?: string;
}

export interface UpdateTenantSettingsDto {
  defaultLanguage?: string;
  defaultCurrency?: string;
  timezone?: string;
  dateFormat?: string;
  vatNumber?: string;
  commercialRegister?: string;
  printFooterAr?: string;
  printFooterEn?: string;
  enableZatca?: boolean;
  enableWhatsapp?: boolean;
  enableLoyalty?: boolean;
  enableMultiCurrency?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Subscription
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateSubscriptionPlanDto {
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: SubscriptionInterval;
  maxBranches: number;
  maxUsers: number;
  maxProducts: number;
  maxInvoices: number;
  features: string[];
}

export interface UpdateSubscriptionPlanDto {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  interval?: SubscriptionInterval;
  maxBranches?: number;
  maxUsers?: number;
  maxProducts?: number;
  maxInvoices?: number;
  features?: string[];
  isActive?: boolean;
}

export interface SubscribeDto {
  planId: string;
  autoRenew?: boolean;
}

export interface CancelSubscriptionDto {
  reason?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — SupportTicket
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateTicketDto {
  subject: string;
  description: string;
  priority: TicketPriority;
}

export interface UpdateTicketDto {
  subject?: string;
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  assignedTo?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — FeatureFlag
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateFeatureFlagDto {
  key: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  rolloutPercent?: number;
}

export interface UpdateFeatureFlagDto {
  name?: string;
  description?: string;
  isEnabled?: boolean;
  rolloutPercent?: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Webhook
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateWebhookDto {
  url: string;
  events: string[];
  isActive?: boolean;
}

export interface UpdateWebhookDto {
  url?: string;
  events?: string[];
  isActive?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — ApiKey
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateApiKeyDto {
  name: string;
  scopes: string[];
  expiresAt?: string;
}

export interface UpdateApiKeyDto {
  name?: string;
  scopes?: string[];
  isActive?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — TaxConfig
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateTaxConfigDto {
  name: string;
  rate: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateTaxConfigDto {
  name?: string;
  rate?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Report
// ──────────────────────────────────────────────────────────────────────────────

export interface SalesReportQueryDto {
  startDate: string;
  endDate: string;
  branchId?: string;
  userId?: string;
  productId?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  groupBy?: "day" | "week" | "month" | "year";
}

export interface InventoryReportQueryDto {
  warehouseId?: string;
  categoryId?: string;
  onlyLowStock?: boolean;
  onlyActive?: boolean;
}

export interface ProfitReportQueryDto {
  startDate: string;
  endDate: string;
  branchId?: string;
  groupBy?: "day" | "week" | "month" | "year";
}

export interface CustomerReportQueryDto {
  startDate: string;
  endDate: string;
  tier?: CustomerTier;
  sortBy?: "totalSpent" | "invoiceCount" | "loyaltyPoints";
  sortOrder?: SortOrder;
}

export interface ShiftReportQueryDto {
  startDate: string;
  endDate: string;
  branchId?: string;
  userId?: string;
}

export interface TaxReportQueryDto {
  startDate: string;
  endDate: string;
  format?: "pdf" | "csv" | "json";
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Bulk Operations
// ──────────────────────────────────────────────────────────────────────────────

export interface BulkImportProductsDto {
  products: CreateProductDto[];
}

export interface BulkUpdatePricesDto {
  priceListId: string;
  updates: {
    productId: string;
    price: number;
  }[];
}

export interface BulkStockAdjustmentDto {
  warehouseId: string;
  adjustments: {
    productId: string;
    variantId?: string;
    quantity: number;
    type: InventoryMovementType;
    notes?: string;
  }[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — ZATCA
// ──────────────────────────────────────────────────────────────────────────────

export interface ZatcaReportInvoiceDto {
  invoiceId: string;
}

export interface ZatcaBatchReportDto {
  invoiceIds: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Backup
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateBackupDto {
  tenantId: string;
  type?: "MANUAL" | "AUTOMATIC";
}

export interface RestoreBackupDto {
  backupId: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Transfer
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateTransferDto {
  fromWarehouseId: string;
  toWarehouseId: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
  }[];
  notes?: string;
}

export interface UpdateTransferDto {
  status?: "PENDING" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
  notes?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — AuditLog Query
// ──────────────────────────────────────────────────────────────────────────────

export interface AuditLogQueryDto {
  userId?: string;
  entity?: string;
  entityId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Notification
// ──────────────────────────────────────────────────────────────────────────────

export interface MarkNotificationReadDto {
  notificationIds: string[];
}

export interface MarkAllNotificationsReadDto {
  userId: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Request DTOs — Dashboard
// ──────────────────────────────────────────────────────────────────────────────

export interface DashboardStatsDto {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalRevenue: number;
  averageOrderValue: number;
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  salesByDay: {
    date: string;
    total: number;
    count: number;
  }[];
  salesByPaymentMethod: {
    method: PaymentMethod;
    total: number;
    count: number;
  }[];
  lowStockProducts: number;
  pendingOrders: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Query Filters
// ──────────────────────────────────────────────────────────────────────────────

export interface ProductQueryFilters extends PaginationParams {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  hasExpiry?: boolean;
  isComposite?: boolean;
  minPrice?: number;
  maxPrice?: number;
  lowStock?: boolean;
}

export interface InvoiceQueryFilters extends PaginationParams {
  status?: InvoiceStatus;
  type?: InvoiceType;
  paymentMethod?: PaymentMethod;
  customerId?: string;
  userId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CustomerQueryFilters extends PaginationParams {
  search?: string;
  tier?: CustomerTier;
  isActive?: boolean;
  minBalance?: number;
  maxBalance?: number;
}

export interface UserQueryFilters extends PaginationParams {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  branchId?: string;
}

export interface SupplierQueryFilters extends PaginationParams {
  search?: string;
  isActive?: boolean;
}

export interface PurchaseOrderQueryFilters extends PaginationParams {
  status?: PurchaseOrderStatus;
  supplierId?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

export interface InventoryMovementQueryFilters extends PaginationParams {
  type?: InventoryMovementType;
  productId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseQueryFilters extends PaginationParams {
  branchId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export interface NotificationQueryFilters extends PaginationParams {
  type?: NotificationType;
  isRead?: boolean;
}

export interface TicketQueryFilters extends PaginationParams {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
}

export interface CouponQueryFilters extends PaginationParams {
  isActive?: boolean;
  search?: string;
}

export interface GiftCardQueryFilters extends PaginationParams {
  isActive?: boolean;
  customerId?: string;
  search?: string;
}

export interface StockAlertQueryFilters extends PaginationParams {
  isResolved?: boolean;
  productId?: string;
  warehouseId?: string;
}

export interface WebhookQueryFilters extends PaginationParams {
  isActive?: boolean;
}

export interface ApiKeyQueryFilters extends PaginationParams {
  isActive?: boolean;
}

export interface AuditLogQueryFilters extends PaginationParams {
  userId?: string;
  entity?: string;
  entityId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export interface BackupQueryFilters extends PaginationParams {
  type?: "MANUAL" | "AUTOMATIC";
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

export interface PriceListQueryFilters extends PaginationParams {
  type?: PriceListType;
  isActive?: boolean;
}