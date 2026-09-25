import { get, post, put, patch, del, uploadFile, uploadMultipleFiles } from './client';

// ─── Type Definitions ───────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantId?: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    avatar?: string;
    role: string;
    tenantId: string;
    branchId?: string;
    isActive: boolean;
    lastLoginAt?: string;
    twoFactorEnabled: boolean;
    createdAt: string;
    tenant?: { id: string; name: string; subdomain: string; isActive: boolean };
    branch?: { id: string; nameAr: string; nameEn: string; code: string; isActive: boolean; isMain: boolean };
    cashierProfile?: { id: string; isOnShift: boolean; shiftId?: string; permissions?: unknown };
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface Setup2FAResponse {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface Verify2FARequest {
  token: string;
}

export interface Verify2FAResponse {
  enabled: boolean;
  recoveryCodes: string[];
}

export interface VerifyEmailRequest {
  token: string;
}

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role: string;
  permissions: string[];
  branchId?: string;
  branchName?: string;
  tenantId: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: string;
  permissions?: string[];
  branchId?: string;
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  phone?: string;
  role?: string;
  permissions?: string[];
  branchId?: string;
  isActive?: boolean;
}

export interface UpdatePermissionsRequest {
  permissions: string[];
}

export interface AssignBranchRequest {
  branchId: string;
}

export interface TenantResponse {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  legalName?: string;
  taxNumber?: string;
  commercialRegister?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  logo?: string;
  favicon?: string;
  planId?: string;
  subscriptionStatus?: string;
  isActive: boolean;
  settings?: Record<string, unknown>;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTenantRequest {
  name: string;
  nameAr?: string;
  nameEn?: string;
  email: string;
  phone?: string;
  planId?: string;
}

export interface UpdateTenantRequest {
  name?: string;
  nameAr?: string;
  nameEn?: string;
  legalName?: string;
  taxNumber?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  isActive?: boolean;
}

export interface UpdateBrandingRequest {
  logo?: string;
  favicon?: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
}

export interface PlanResponse {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  price: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  currency?: string;
  billingCycle?: string;
  features: string[];
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  maxProducts: number;
  maxInvoices: number;
  maxCustomers: number;
  maxSuppliers: number;
  includesPOS: boolean;
  includesInventory: boolean;
  includesAccounting: boolean;
  includesReports: boolean;
  includesAPI: boolean;
  includesCustomBranding: boolean;
  includesPrioritySupport: boolean;
  isActive: boolean;
  isRecommended: boolean;
  trialDays: number;
  setupFee?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePlanRequest {
  name: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  price: number;
  currency?: string;
  features?: string[];
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  maxProducts: number;
  maxInvoices: number;
  maxCustomers: number;
  maxSuppliers: number;
  isActive?: boolean;
  trialDays?: number;
}

export interface UpdatePlanRequest extends Partial<CreatePlanRequest> {}

export interface SubscriptionResponse {
  id: string;
  tenantId: string;
  planId: string;
  planName?: string;
  status: string;
  startDate: string;
  endDate: string;
  daysRemaining?: number;
  trialEnd?: string;
  nextBilling?: string;
  billingAmount?: number;
  paymentMethod?: string;
  autoRenew: boolean;
  usage?: {
    products: number;
    maxProducts: number;
    branches: number;
    maxBranches: number;
    users: number;
    maxUsers: number;
  };
  features?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSubscriptionRequest {
  tenantId: string;
  planId: string;
  paymentMethod?: string;
  autoRenew?: boolean;
  discountCode?: string;
}

export interface BranchResponse {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  isActive: boolean;
  isMain: boolean;
  managerId?: string;
  managerName?: string;
  tenantId: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBranchRequest {
  name: string;
  nameAr?: string;
  nameEn?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  isMain?: boolean;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface UpdateBranchRequest extends Partial<CreateBranchRequest> {
  isActive?: boolean;
}

export interface WarehouseResponse {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  code?: string;
  branchId?: string;
  branchName?: string;
  address?: string;
  isActive: boolean;
  isDefault: boolean;
  managerId?: string;
  managerName?: string;
  tenantId: string;
  type?: string;
  capacity?: number;
  usedCapacity?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWarehouseRequest {
  name: string;
  nameAr?: string;
  nameEn?: string;
  branchId?: string;
  address?: string;
  isDefault?: boolean;
  type?: string;
  capacity?: number;
}

export interface UpdateWarehouseRequest extends Partial<CreateWarehouseRequest> {
  isActive?: boolean;
}

export interface ProductResponse {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  sku: string;
  barcode?: string;
  categoryId?: string;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  minPrice?: number;
  maxDiscount?: number;
  stock: number;
  lowStockAlert?: number;
  minStock?: number;
  maxStock?: number;
  hasExpiry: boolean;
  expiryDate?: string;
  isActive: boolean;
  isService: boolean;
  isDigital: boolean;
  taxable: boolean;
  taxRate: number;
  description?: string;
  image?: string;
  images?: string[];
  variants?: VariantResponse[];
  supplierIds?: string[];
  dimensions?: {
    weight?: number;
    width?: number;
    height?: number;
    length?: number;
  };
  totalSales?: number;
  totalRevenue?: number;
  lastSold?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductRequest {
  name: string;
  nameAr?: string;
  nameEn?: string;
  sku: string;
  barcode?: string;
  categoryId?: string;
  brandId?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  minPrice?: number;
  maxDiscount?: number;
  stock?: number;
  lowStockAlert?: number;
  minStock?: number;
  maxStock?: number;
  hasExpiry?: boolean;
  expiryDate?: string;
  isActive?: boolean;
  isService?: boolean;
  isDigital?: boolean;
  taxable?: boolean;
  taxRate?: number;
  description?: string;
  dimensions?: {
    weight?: number;
    width?: number;
    height?: number;
    length?: number;
  };
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface BulkImportRequest {
  products: CreateProductRequest[];
  overwrite?: boolean;
}

export interface CategoryResponse {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  parentId?: string;
  parentName?: string;
  description?: string;
  image?: string;
  isActive: boolean;
  productCount?: number;
  sortOrder?: number;
  slug?: string;
  tenantId: string;
  children?: CategoryResponse[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryRequest {
  name: string;
  nameAr?: string;
  nameEn?: string;
  parentId?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

export interface VariantResponse {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  type: string;
  options: VariantOption[];
  productId?: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface VariantOption {
  id?: string;
  name: string;
  value: string;
  sku?: string;
  price?: number;
  stock?: number;
}

export interface CreateVariantRequest {
  name: string;
  nameAr?: string;
  nameEn?: string;
  type: string;
  options: VariantOption[];
  productId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateVariantRequest extends Partial<CreateVariantRequest> {}

export interface PriceListResponse {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  markupType: 'markup' | 'markdown';
  roundTo?: string;
  isActive: boolean;
  isDefault: boolean;
  applyToAll: boolean;
  categoryIds?: string[];
  productIds?: string[];
  customerGroupIds?: string[];
  startDate?: string;
  endDate?: string;
  priority?: number;
  tenantId: string;
  priceCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePriceListRequest {
  name: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  markupType?: 'markup' | 'markdown';
  isActive?: boolean;
  isDefault?: boolean;
  applyToAll?: boolean;
  categoryIds?: string[];
  productIds?: string[];
  customerGroupIds?: string[];
  startDate?: string;
  endDate?: string;
  priority?: number;
}

export interface UpdatePriceListRequest extends Partial<CreatePriceListRequest> {}

export interface UpdatePricesRequest {
  prices: Array<{
    productId: string;
    currentPrice: number;
    newPrice: number;
  }>;
  overrideExisting?: boolean;
}

export interface StockResponse {
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint?: number;
  reservedStock?: number;
  availableStock: number;
  lastUpdated?: string;
}

export interface AdjustStockRequest {
  productId: string;
  warehouseId: string;
  quantity: number;
  type: 'in' | 'out';
  reason?: string;
  batchNumber?: string;
  serialNumber?: string;
  reference?: string;
}

export interface TransferStockRequest {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  reason?: string;
  reference?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  type: string;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  reference?: string;
  reason?: string;
  userId?: string;
  userName?: string;
  createdAt: string;
}

export interface StockAlert {
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  minStock: number;
  alertType: 'low' | 'out' | 'over' | 'expiring';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CustomerResponse {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  code?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  tier?: string;
  balance: number;
  creditLimit: number;
  loyaltyPoints: number;
  totalSpent: number;
  totalOrders: number;
  lastPurchase?: string;
  company?: string;
  position?: string;
  taxNumber?: string;
  birthday?: string;
  gender?: string;
  notes?: string;
  isActive: boolean;
  tags?: string[];
  tenantId: string;
  customerSince?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomerRequest {
  name: string;
  nameAr?: string;
  nameEn?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  creditLimit?: number;
  taxNumber?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  isActive?: boolean;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  type: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  date: string;
  description?: string;
}

export interface CustomerStatistics {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastPurchase?: string;
  favoriteCategories?: Array<{ name: string; count: number }>;
  favoriteProducts?: Array<{ name: string; count: number }>;
  paymentMethods?: Array<{ method: string; count: number }>;
  purchaseFrequency?: string;
}

export interface LoyaltyConfig {
  programName: string;
  isEnabled: boolean;
  pointsPerCurrency: number;
  currencyPerPoint: number;
  minPointsToRedeem: number;
  maxPointsPerOrder: number;
  pointsExpiryDays: number;
  birthdayBonus: number;
  referralBonus: number;
  signupBonus: number;
  tiers?: Array<{
    name: string;
    threshold: number;
    benefits: string[];
  }>;
}

export interface UpdateLoyaltyConfigRequest {
  programName?: string;
  isEnabled?: boolean;
  pointsPerCurrency?: number;
  currencyPerPoint?: number;
  minPointsToRedeem?: number;
  maxPointsPerOrder?: number;
  pointsExpiryDays?: number;
  birthdayBonus?: number;
  referralBonus?: number;
  signupBonus?: number;
  tiers?: Array<{
    name: string;
    threshold: number;
    benefits: string[];
  }>;
}

export interface LoyaltyPointsRequest {
  points: number;
  customerId: string;
  description?: string;
}

export interface GiftCardResponse {
  id: string;
  code: string;
  name?: string;
  initialBalance: number;
  currentBalance: number;
  expiryDate?: string;
  isActive: boolean;
  customerId?: string;
  customerName?: string;
  purchaseDate?: string;
  lastUsed?: string;
  tenantId: string;
  createdAt?: string;
}

export interface CreateGiftCardRequest {
  name?: string;
  code?: string;
  initialBalance: number;
  expiryDate?: string;
  customerId?: string;
}

export interface UpdateGiftCardRequest {
  name?: string;
  expiryDate?: string;
  isActive?: boolean;
}

export interface ValidateGiftCardResponse {
  valid: boolean;
  balance: number;
  code: string;
  name?: string;
  expiryDate?: string;
}

export interface SupplierResponse {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  code?: string;
  contactPerson?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  paymentTerms?: string;
  creditLimit: number;
  balance: number;
  bankName?: string;
  bankAccount?: string;
  iban?: string;
  notes?: string;
  isActive: boolean;
  tenantId: string;
  productIds?: string[];
  totalOrders?: number;
  totalSpent?: number;
  lastOrder?: string;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSupplierRequest {
  name: string;
  nameAr?: string;
  nameEn?: string;
  contactPerson?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  paymentTerms?: string;
  creditLimit?: number;
  bankName?: string;
  bankAccount?: string;
  iban?: string;
  notes?: string;
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {
  isActive?: boolean;
}

export interface PurchaseOrderResponse {
  id: string;
  poNumber: string;
  poDate: string;
  expectedDate?: string;
  supplierId: string;
  supplierName?: string;
  warehouseId?: string;
  warehouseName?: string;
  items: POItem[];
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  status: string;
  notes?: string;
  terms?: string;
  reference?: string;
  tenantId: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface POItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  total: number;
  taxRate: number;
}

export interface CreatePORequest {
  supplierId: string;
  warehouseId?: string;
  expectedDate?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
  }>;
  discount?: number;
  shipping?: number;
  notes?: string;
  terms?: string;
  reference?: string;
}

export interface UpdatePORequest extends Partial<CreatePORequest> {
  status?: string;
}

export interface InvoiceResponse {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  discountType: string;
  tax: number;
  shipping: number;
  total: number;
  paid: number;
  balance: number;
  status: string;
  type: string;
  terms?: string;
  notes?: string;
  footer?: string;
  reference?: string;
  branchId?: string;
  branchName?: string;
  cashierId?: string;
  cashierName?: string;
  shiftId?: string;
  tenantId: string;
  payments?: PaymentResponse[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: string;
  taxRate: number;
  total: number;
  variantName?: string;
}

export interface CreateInvoiceRequest {
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: string;
    taxRate?: number;
    variantId?: string;
  }>;
  discount?: number;
  discountType?: string;
  shipping?: number;
  notes?: string;
  terms?: string;
  branchId?: string;
  payments?: Array<{
    method: string;
    amount: number;
    reference?: string;
  }>;
  couponCode?: string;
  giftCardCode?: string;
  loyaltyPoints?: number;
}

export interface UpdateInvoiceRequest {
  items?: CreateInvoiceRequest['items'];
  discount?: number;
  discountType?: string;
  shipping?: number;
  notes?: string;
  terms?: string;
}

export interface PaymentResponse {
  id: string;
  invoiceId: string;
  method: string;
  amount: number;
  date: string;
  reference?: string;
  note?: string;
  status: string;
  cardNumber?: string;
  transactionId?: string;
  createdAt?: string;
}

export interface AddPaymentRequest {
  invoiceId: string;
  method: string;
  amount: number;
  reference?: string;
  note?: string;
  date?: string;
}

export interface CouponResponse {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usagePerCustomer?: number;
  usedCount: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
  excludedProductIds?: string[];
  excludedCategoryIds?: string[];
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCouponRequest {
  code: string;
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usagePerCustomer?: number;
  startDate?: string;
  endDate?: string;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
  excludedProductIds?: string[];
  excludedCategoryIds?: string[];
}

export interface UpdateCouponRequest extends Partial<CreateCouponRequest> {
  isActive?: boolean;
}

export interface ValidateCouponResponse {
  valid: boolean;
  discountType: string;
  discountValue: number;
  maxDiscount?: number;
  calculatedDiscount: number;
  message?: string;
}

export interface PromotionResponse {
  id: string;
  name: string;
  type: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  conditions?: unknown;
  rewards?: unknown;
  priority?: number;
  applyAutomatically?: boolean;
  stackable?: boolean;
  eligibleCustomerIds?: string[];
  eligibleProductIds?: string[];
  banner?: string;
  usageCount?: number;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePromotionRequest {
  name: string;
  type: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  conditions?: unknown;
  rewards?: unknown;
  priority?: number;
  applyAutomatically?: boolean;
  stackable?: boolean;
  eligibleCustomerIds?: string[];
  eligibleProductIds?: string[];
}

export interface UpdatePromotionRequest extends Partial<CreatePromotionRequest> {
  isActive?: boolean;
}

export interface ReportRequest {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  warehouseId?: string;
  categoryId?: string;
  productId?: string;
  customerId?: string;
  supplierId?: string;
  userId?: string;
  cashierId?: string;
  shiftId?: string;
  groupBy?: string;
  sortBy?: string;
  limit?: number;
  format?: 'pdf' | 'excel' | 'csv';
}

export interface ShiftResponse {
  id: string;
  shiftNumber: string;
  branchId: string;
  branchName: string;
  openedBy: string;
  openedByName?: string;
  closedBy?: string;
  closedByName?: string;
  startTime: string;
  endTime?: string;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  difference?: number;
  cashSales: number;
  cardSales: number;
  creditSales: number;
  totalSales: number;
  totalInvoices: number;
  returns: number;
  refunds: number;
  expenses: number;
  cashIn: number;
  cashOut: number;
  notes?: string;
  status: string;
  tenantId: string;
  createdAt?: string;
}

export interface OpenShiftRequest {
  openingBalance: number;
  branchId?: string;
  notes?: string;
}

export interface CloseShiftRequest {
  closingBalance: number;
  notes?: string;
}

export interface ExpenseResponse {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  amount: number;
  paymentMethod?: string;
  date: string;
  reference?: string;
  notes?: string;
  attachment?: string;
  attachments?: string[];
  isRecurring?: boolean;
  frequency?: string;
  status?: string;
  branchId?: string;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateExpenseRequest {
  name: string;
  categoryId?: string;
  amount: number;
  paymentMethod?: string;
  date: string;
  reference?: string;
  notes?: string;
  isRecurring?: boolean;
  frequency?: string;
  branchId?: string;
}

export interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {
  status?: string;
}

export interface RevenueResponse {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  amount: number;
  paymentMethod?: string;
  date: string;
  reference?: string;
  notes?: string;
  attachment?: string;
  isRecurring?: boolean;
  frequency?: string;
  branchId?: string;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRevenueRequest {
  name: string;
  categoryId?: string;
  amount: number;
  paymentMethod?: string;
  date: string;
  reference?: string;
  notes?: string;
  isRecurring?: boolean;
  frequency?: string;
  branchId?: string;
}

export interface UpdateRevenueRequest extends Partial<CreateRevenueRequest> {}

export interface TaxConfigResponse {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  rate: number;
  taxNumber?: string;
  type: 'inclusive' | 'exclusive' | 'compound';
  isDefault: boolean;
  isActive: boolean;
  appliesToAll: boolean;
  productIds?: string[];
  categoryIds?: string[];
  displayName?: string;
  taxCode?: string;
  effectiveDate?: string;
  regions?: Array<{ name: string; rate: number }>;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaxConfigRequest {
  name: string;
  nameAr?: string;
  nameEn?: string;
  rate: number;
  taxNumber?: string;
  type?: 'inclusive' | 'exclusive' | 'compound';
  isDefault?: boolean;
  appliesToAll?: boolean;
  productIds?: string[];
  categoryIds?: string[];
  displayName?: string;
  taxCode?: string;
  effectiveDate?: string;
  regions?: Array<{ name: string; rate: number }>;
}

export interface UpdateTaxConfigRequest extends Partial<CreateTaxConfigRequest> {
  isActive?: boolean;
}

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  entityId?: string;
  entityType?: string;
  userId: string;
  tenantId: string;
  createdAt: string;
}

export interface AuditLogResponse {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  tenantId: string;
  createdAt: string;
}

export interface TicketResponse {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  assignedToId?: string;
  assignedToName?: string;
  createdById: string;
  createdByName?: string;
  messages?: TicketMessage[];
  attachments?: string[];
  resolvedAt?: string;
  closedAt?: string;
  tenantId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  type: string;
  priority?: string;
  attachments?: string[];
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  status?: string;
  assignedToId?: string;
}

export interface AddTicketMessageRequest {
  message: string;
  attachments?: string[];
}

export interface BackupResponse {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  storageLocation: string;
  includeFiles: boolean;
  includeDatabase: boolean;
  isEncrypted: boolean;
  tenantId: string;
  createdBy?: string;
  createdAt: string;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  scope: string;
  lastUsed?: string;
  expiresAt?: string;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions?: string[];
  scope?: string;
  expiresAt?: string;
}

export interface UpdateApiKeyRequest {
  name?: string;
  permissions?: string[];
  scope?: string;
  expiresAt?: string;
}

export interface ApiKeyCreatedResponse extends ApiKeyResponse {
  secretKey: string;
}

export interface WebhookResponse {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  headers?: Record<string, string>;
  contentType?: string;
  lastTriggered?: string;
  lastStatus?: string;
  retryCount?: number;
  tenantId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  secret?: string;
  events: string[];
  headers?: Record<string, string>;
  contentType?: string;
}

export interface UpdateWebhookRequest extends Partial<CreateWebhookRequest> {
  isActive?: boolean;
}

export interface HealthResponse {
  status: string;
  uptime: number;
  version: string;
  environment: string;
  timestamp: string;
}

export interface DetailedHealthResponse extends HealthResponse {
  services: {
    database: { status: string; latency?: number };
    cache: { status: string; latency?: number };
    storage: { status: string };
    queue: { status: string };
  };
  resources: {
    memory: { used: number; total: number; percent: number };
    cpu: { percent: number };
    disk: { used: number; total: number; percent: number };
  };
}

export interface MetricsResponse {
  uptime: number;
  responseTime: { avg: number; max: number; min: number };
  errorRate: number;
  requestRate: number;
  activeConnections: number;
  totalRequests: number;
  totalErrors: number;
}

export interface UploadResponse {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

// ─── Auth Endpoints ──────────────────────────────────────────────────

const auth = {
  login: (data: LoginRequest) => post<LoginResponse>('/auth/login', data),
  register: (data: RegisterRequest) => post<unknown>('/auth/register', data),
  refreshToken: (data: RefreshTokenRequest) => post<RefreshTokenResponse>('/auth/refresh', data),
  logout: (refreshToken: string) => post<void>('/auth/logout', { refreshToken }),
  getProfile: () => get<unknown>('/auth/me'),
  changePassword: (data: ChangePasswordRequest) => post<void>('/auth/change-password', data),
  forgotPassword: (data: ForgotPasswordRequest) => post<void>('/auth/forgot-password', data),
  resetPassword: (data: ResetPasswordRequest) => post<void>('/auth/reset-password', data),
  setup2FA: () => post<Setup2FAResponse>('/auth/2fa/setup', {}),
  verify2FA: (data: Verify2FARequest) => post<Verify2FAResponse>('/auth/2fa/verify', data),
  disable2FA: () => post<void>('/auth/2fa/disable'),
  sendVerificationEmail: () => post<void>('/auth/send-verification-email'),
  verifyEmail: (data: VerifyEmailRequest) => post<void>('/auth/verify-email', data),
};

// ─── Users Endpoints ────────────────────────────────────────────────

const users = {
  getUsers: (params?: PaginationParams) => get<PaginatedResponse<UserResponse>>('/users', { params }),
  getUser: (id: string) => get<UserResponse>(`/users/${id}`),
  createUser: (data: CreateUserRequest) => post<UserResponse>('/users', data),
  updateUser: (id: string, data: UpdateUserRequest) => put<UserResponse>(`/users/${id}`, data),
  deleteUser: (id: string) => del<void>(`/users/${id}`),
  updatePermissions: (id: string, data: UpdatePermissionsRequest) => put<void>(`/users/${id}/permissions`, data),
  toggleActive: (id: string) => patch<UserResponse>(`/users/${id}/toggle-active`),
  assignBranch: (id: string, data: AssignBranchRequest) => put<void>(`/users/${id}/assign-branch`, data),
};

// ─── Tenants Endpoints ──────────────────────────────────────────────

const tenants = {
  getTenants: (params?: PaginationParams) => get<PaginatedResponse<TenantResponse>>('/tenants', { params }),
  getTenant: (id: string) => get<TenantResponse>(`/tenants/${id}`),
  createTenant: (data: CreateTenantRequest) => post<TenantResponse>('/tenants', data),
  updateTenant: (id: string, data: UpdateTenantRequest) => put<TenantResponse>(`/tenants/${id}`, data),
  deleteTenant: (id: string) => del<void>(`/tenants/${id}`),
  toggleTenantActive: (id: string) => patch<TenantResponse>(`/tenants/${id}/toggle-active`),
  updateBranding: (id: string, data: UpdateBrandingRequest) => put<TenantResponse>(`/tenants/${id}/branding`, data),
  updateSettings: (id: string, data: Record<string, unknown>) => put<TenantResponse>(`/tenants/${id}/settings`, data),
};

// ─── Plans Endpoints ────────────────────────────────────────────────

const plans = {
  getPlans: (params?: PaginationParams) => get<PaginatedResponse<PlanResponse>>('/plans', { params }),
  getPlan: (id: string) => get<PlanResponse>(`/plans/${id}`),
  createPlan: (data: CreatePlanRequest) => post<PlanResponse>('/plans', data),
  updatePlan: (id: string, data: UpdatePlanRequest) => put<PlanResponse>(`/plans/${id}`, data),
  deletePlan: (id: string) => del<void>(`/plans/${id}`),
};

// ─── Subscriptions Endpoints ────────────────────────────────────────

const subscriptions = {
  getSubscriptions: (params?: PaginationParams) => get<PaginatedResponse<SubscriptionResponse>>('/subscriptions', { params }),
  getCurrentSubscription: (tenantId?: string) =>
    get<SubscriptionResponse>(tenantId ? `/subscriptions/current/${tenantId}` : '/subscriptions/current'),
  createSubscription: (data: CreateSubscriptionRequest) => post<SubscriptionResponse>('/subscriptions', data),
  cancelSubscription: (id: string) => post<void>(`/subscriptions/${id}/cancel`),
  renewSubscription: (id: string) => post<SubscriptionResponse>(`/subscriptions/${id}/renew`),
};

// ─── Branches Endpoints ─────────────────────────────────────────────

const branches = {
  getBranches: (params?: PaginationParams) => get<PaginatedResponse<BranchResponse>>('/branches', { params }),
  getBranch: (id: string) => get<BranchResponse>(`/branches/${id}`),
  createBranch: (data: CreateBranchRequest) => post<BranchResponse>('/branches', data),
  updateBranch: (id: string, data: UpdateBranchRequest) => put<BranchResponse>(`/branches/${id}`, data),
  deleteBranch: (id: string) => del<void>(`/branches/${id}`),
  toggleBranchActive: (id: string) => patch<BranchResponse>(`/branches/${id}/toggle-active`),
};

// ─── Warehouses Endpoints ───────────────────────────────────────────

const warehouses = {
  getWarehouses: (params?: PaginationParams) => get<PaginatedResponse<WarehouseResponse>>('/warehouses', { params }),
  getWarehouse: (id: string) => get<WarehouseResponse>(`/warehouses/${id}`),
  createWarehouse: (data: CreateWarehouseRequest) => post<WarehouseResponse>('/warehouses', data),
  updateWarehouse: (id: string, data: UpdateWarehouseRequest) => put<WarehouseResponse>(`/warehouses/${id}`, data),
  deleteWarehouse: (id: string) => del<void>(`/warehouses/${id}`),
};

// ─── Products Endpoints ─────────────────────────────────────────────

const products = {
  getProducts: (params?: PaginationParams) => get<PaginatedResponse<ProductResponse>>('/products', { params }),
  getProduct: (id: string) => get<ProductResponse>(`/products/${id}`),
  createProduct: (data: CreateProductRequest) => post<ProductResponse>('/products', data),
  updateProduct: (id: string, data: UpdateProductRequest) => put<ProductResponse>(`/products/${id}`, data),
  deleteProduct: (id: string) => del<void>(`/products/${id}`),
  searchProducts: (query: string, params?: PaginationParams) => get<PaginatedResponse<ProductResponse>>(`/products/search/${encodeURIComponent(query)}`, { params }),
  toggleActive: (id: string) => patch<ProductResponse>(`/products/${id}/toggle-active`),
  bulkImport: (data: BulkImportRequest) => post<{ success: number; failed: number; errors?: string[] }>('/products/bulk-import', data),
};

// ─── Categories Endpoints ───────────────────────────────────────────

const categories = {
  getCategories: (params?: PaginationParams) => get<CategoryResponse[]>('/categories', { params }),
  getCategory: (id: string) => get<CategoryResponse>(`/categories/${id}`),
  createCategory: (data: CreateCategoryRequest) => post<CategoryResponse>('/categories', data),
  updateCategory: (id: string, data: UpdateCategoryRequest) => put<CategoryResponse>(`/categories/${id}`, data),
  deleteCategory: (id: string) => del<void>(`/categories/${id}`),
};

// ─── Variants Endpoints ─────────────────────────────────────────────

const variants = {
  getVariants: (productId: string) => get<VariantResponse[]>(`/products/${productId}/variants`),
  createVariant: (productId: string, data: CreateVariantRequest) => post<VariantResponse>(`/products/${productId}/variants`, data),
  updateVariant: (productId: string, variantId: string, data: UpdateVariantRequest) => put<VariantResponse>(`/products/${productId}/variants/${variantId}`, data),
  deleteVariant: (productId: string, variantId: string) => del<void>(`/products/${productId}/variants/${variantId}`),
};

// ─── Price Lists Endpoints ──────────────────────────────────────────

const priceLists = {
  getPriceLists: (params?: PaginationParams) => get<PriceListResponse[]>('/price-lists', { params }),
  getPriceList: (id: string) => get<PriceListResponse>(`/price-lists/${id}`),
  createPriceList: (data: CreatePriceListRequest) => post<PriceListResponse>('/price-lists', data),
  updatePriceList: (id: string, data: UpdatePriceListRequest) => put<PriceListResponse>(`/price-lists/${id}`, data),
  deletePriceList: (id: string) => del<void>(`/price-lists/${id}`),
  updatePrices: (id: string, data: UpdatePricesRequest) => put<PriceListResponse>(`/price-lists/${id}/prices`, data),
};

// ─── Inventory Endpoints ────────────────────────────────────────────

const inventory = {
  getStock: (params?: PaginationParams & { warehouseId?: string }) => get<PaginatedResponse<StockResponse>>('/inventory/stock', { params }),
  getProductStock: (productId: string) => get<StockResponse[]>(`/inventory/stock/${productId}`),
  adjustStock: (data: AdjustStockRequest) => post<StockResponse>('/inventory/adjust', data),
  transferStock: (data: TransferStockRequest) => post<{ from: StockResponse; to: StockResponse }>('/inventory/transfer', data),
  getMovements: (params?: PaginationParams) => get<PaginatedResponse<StockMovement>>('/inventory/movements', { params }),
  getAlerts: () => get<StockAlert[]>('/inventory/alerts'),
};

// ─── Customers Endpoints ────────────────────────────────────────────

const customers = {
  getCustomers: (params?: PaginationParams) => get<PaginatedResponse<CustomerResponse>>('/customers', { params }),
  getCustomer: (id: string) => get<CustomerResponse>(`/customers/${id}`),
  createCustomer: (data: CreateCustomerRequest) => post<CustomerResponse>('/customers', data),
  updateCustomer: (id: string, data: UpdateCustomerRequest) => put<CustomerResponse>(`/customers/${id}`, data),
  deleteCustomer: (id: string) => del<void>(`/customers/${id}`),
  getLedger: (id: string, params?: PaginationParams) => get<PaginatedResponse<CustomerLedgerEntry>>(`/customers/${id}/ledger`, { params }),
  getStatistics: (id: string) => get<CustomerStatistics>(`/customers/${id}/statistics`),
  addPayment: (id: string, data: { amount: number; note?: string; paymentMethod?: string; referenceNumber?: string }) => post<{ message: string; newBalance: number }>(`/customers/${id}/payment`, data),
};

// ─── Loyalty Endpoints ──────────────────────────────────────────────

const loyalty = {
  getLoyaltyConfig: () => get<LoyaltyConfig>('/loyalty/config'),
  updateLoyaltyConfig: (data: UpdateLoyaltyConfigRequest) => put<LoyaltyConfig>('/loyalty/config', data),
  earnPoints: (data: LoyaltyPointsRequest) => post<{ earned: number; balance: number }>('/loyalty/earn', data),
  redeemPoints: (data: LoyaltyPointsRequest) => post<{ redeemed: number; balance: number; amount: number }>('/loyalty/redeem', data),
};

// ─── Gift Cards Endpoints ───────────────────────────────────────────

const giftCards = {
  getGiftCards: (params?: PaginationParams) => get<PaginatedResponse<GiftCardResponse>>('/gift-cards', { params }),
  createGiftCard: (data: CreateGiftCardRequest) => post<GiftCardResponse>('/gift-cards', data),
  getGiftCard: (id: string) => get<GiftCardResponse>(`/gift-cards/${id}`),
  updateGiftCard: (id: string, data: UpdateGiftCardRequest) => put<GiftCardResponse>(`/gift-cards/${id}`, data),
  deactivateGiftCard: (id: string) => patch<void>(`/gift-cards/${id}/deactivate`),
  validateGiftCard: (code: string) => post<ValidateGiftCardResponse>('/gift-cards/validate', { code }),
};

// ─── Suppliers Endpoints ────────────────────────────────────────────

const suppliers = {
  getSuppliers: (params?: PaginationParams) => get<PaginatedResponse<SupplierResponse>>('/suppliers', { params }),
  getSupplier: (id: string) => get<SupplierResponse>(`/suppliers/${id}`),
  createSupplier: (data: CreateSupplierRequest) => post<SupplierResponse>('/suppliers', data),
  updateSupplier: (id: string, data: UpdateSupplierRequest) => put<SupplierResponse>(`/suppliers/${id}`, data),
  deleteSupplier: (id: string) => del<void>(`/suppliers/${id}`),
  getLedger: (id: string, params?: PaginationParams) => get<PaginatedResponse<CustomerLedgerEntry>>(`/suppliers/${id}/ledger`, { params }),
};

// ─── Purchase Orders Endpoints ──────────────────────────────────────

const purchaseOrders = {
  getPOs: (params?: PaginationParams) => get<PaginatedResponse<PurchaseOrderResponse>>('/purchase-orders', { params }),
  getPO: (id: string) => get<PurchaseOrderResponse>(`/purchase-orders/${id}`),
  createPO: (data: CreatePORequest) => post<PurchaseOrderResponse>('/purchase-orders', data),
  updatePO: (id: string, data: UpdatePORequest) => put<PurchaseOrderResponse>(`/purchase-orders/${id}`, data),
  changePOStatus: (id: string, status: string) => patch<PurchaseOrderResponse>(`/purchase-orders/${id}/status`, { status }),
  deletePO: (id: string) => del<void>(`/purchase-orders/${id}`),
};

// ─── Invoices Endpoints ─────────────────────────────────────────────

const invoices = {
  getInvoices: (params?: PaginationParams & { type?: string; status?: string }) => get<PaginatedResponse<InvoiceResponse>>('/invoices', { params }),
  getInvoice: (id: string) => get<InvoiceResponse>(`/invoices/${id}`),
  createInvoice: (data: CreateInvoiceRequest | Record<string, unknown>) => post<InvoiceResponse>('/invoices', data),
  updateInvoice: (id: string, data: UpdateInvoiceRequest) => put<InvoiceResponse>(`/invoices/${id}`, data),
  cancelInvoice: (id: string) => put<InvoiceResponse>(`/invoices/${id}/cancel`),
  returnInvoice: (id: string, data?: { items?: Array<{ productId: string; quantity: number }>; reason?: string }) => post<InvoiceResponse>(`/invoices/${id}/return`, data),
  holdInvoice: (data: Record<string, unknown>) => post<unknown>('/invoices/hold', data),
  getHeldInvoices: (params?: PaginationParams) => get<unknown[]>('/invoices/hold', { params }),
  resumeInvoice: (id: string) => post<{ message: string; cartData: unknown }>(`/invoices/hold/${id}/resume`),
  deleteHeldInvoice: (id: string) => del<void>(`/invoices/hold/${id}`),
  convertToSale: (id: string, data?: { payments?: unknown[]; cashierId?: string; shiftId?: string }) => post<InvoiceResponse>(`/invoices/${id}/convert-to-sale`, data || {}),
  searchInvoices: (query: string, params?: PaginationParams) => get<PaginatedResponse<InvoiceResponse>>(`/invoices/search/${encodeURIComponent(query)}`, { params }),
};

// ─── Payments Endpoints ─────────────────────────────────────────────

const payments = {
  addPayment: (data: AddPaymentRequest) => post<PaymentResponse>('/payments', data),
  getPayments: (invoiceId: string) => get<PaymentResponse[]>(`/payments/invoice/${invoiceId}`),
  deletePayment: (id: string) => del<void>(`/payments/${id}`),
};

// ─── Coupons Endpoints ──────────────────────────────────────────────

const coupons = {
  getCoupons: (params?: PaginationParams) => get<PaginatedResponse<CouponResponse>>('/coupons', { params }),
  getCoupon: (id: string) => get<CouponResponse>(`/coupons/${id}`),
  createCoupon: (data: CreateCouponRequest) => post<CouponResponse>('/coupons', data),
  updateCoupon: (id: string, data: UpdateCouponRequest) => put<CouponResponse>(`/coupons/${id}`, data),
  deleteCoupon: (id: string) => del<void>(`/coupons/${id}`),
  validateCoupon: (code: string, orderAmount?: number) => post<ValidateCouponResponse>('/coupons/validate', { code, orderAmount }),
};

// ─── Promotions Endpoints ───────────────────────────────────────────

const promotions = {
  getPromotions: (params?: PaginationParams) => get<PaginatedResponse<PromotionResponse>>('/promotions', { params }),
  getPromotion: (id: string) => get<PromotionResponse>(`/promotions/${id}`),
  createPromotion: (data: CreatePromotionRequest) => post<PromotionResponse>('/promotions', data),
  updatePromotion: (id: string, data: UpdatePromotionRequest) => put<PromotionResponse>(`/promotions/${id}`, data),
  deletePromotion: (id: string) => del<void>(`/promotions/${id}`),
};

// ─── Reports Endpoints ──────────────────────────────────────────────

const reports = {
  salesReport: (params?: ReportRequest) => get<unknown>('/reports/sales', { params }),
  profitLossReport: (params?: ReportRequest) => get<unknown>('/reports/profit-loss', { params }),
  inventoryStatusReport: (params?: ReportRequest) => get<unknown>('/reports/inventory-status', { params }),
  inventoryMovementsReport: (params?: ReportRequest) => get<unknown>('/reports/inventory-movements', { params }),
  topProductsReport: (params?: ReportRequest) => get<unknown>('/reports/top-products', { params }),
  slowMovingReport: (params?: ReportRequest) => get<unknown>('/reports/slow-moving', { params }),
  cashierPerformanceReport: (params?: ReportRequest) => get<unknown>('/reports/cashier-performance', { params }),
  customerStatement: (customerId: string, params?: ReportRequest) => get<unknown>(`/reports/customer-statement`, { params: { ...params, customerId } }),
  supplierStatement: (supplierId: string, params?: ReportRequest) => get<unknown>(`/reports/supplier-statement`, { params: { ...params, supplierId } }),
  taxReport: (params?: ReportRequest) => get<unknown>('/reports/tax', { params }),
  shiftReport: (shiftId: string) => get<unknown>(`/reports/shift`, { params: { shiftId } }),
  dailySummary: (params?: ReportRequest) => get<unknown>('/reports/daily-summary', { params }),
};

// ─── Shifts Endpoints ───────────────────────────────────────────────

const shifts = {
  getShifts: (params?: PaginationParams) => get<PaginatedResponse<ShiftResponse>>('/shifts', { params }),
  getShift: (id: string) => get<ShiftResponse>(`/shifts/${id}`),
  getActiveShift: () => get<ShiftResponse | null>('/shifts/active'),
  getCurrentShift: () => get<any>('/shifts/current'),
  openShift: (data: { openingCash: number; branchId?: string; notes?: string }) => post<any>('/shifts/open', data),
  closeShift: (id: string, data: { actualCash: number; closingNote?: string }) => post<any>(`/shifts/${id}/close`, data),
  addExpense: (id: string, data: { amount: number; category: string; description?: string }) => post<any>(`/shifts/${id}/expenses`, data),
  getShiftSummary: (id: string) => get<any>(`/shifts/${id}/summary`),
};

// ─── Expenses Endpoints ─────────────────────────────────────────────

const expenses = {
  getExpenses: (params?: PaginationParams) => get<PaginatedResponse<ExpenseResponse>>('/expenses', { params }),
  getExpense: (id: string) => get<ExpenseResponse>(`/expenses/${id}`),
  createExpense: (data: CreateExpenseRequest) => post<ExpenseResponse>('/expenses', data),
  updateExpense: (id: string, data: UpdateExpenseRequest) => put<ExpenseResponse>(`/expenses/${id}`, data),
  deleteExpense: (id: string) => del<void>(`/expenses/${id}`),
};

// ─── Revenues Endpoints ─────────────────────────────────────────────

const revenues = {
  getRevenues: (params?: PaginationParams) => get<PaginatedResponse<RevenueResponse>>('/revenues', { params }),
  getRevenue: (id: string) => get<RevenueResponse>(`/revenues/${id}`),
  createRevenue: (data: CreateRevenueRequest) => post<RevenueResponse>('/revenues', data),
  updateRevenue: (id: string, data: UpdateRevenueRequest) => put<RevenueResponse>(`/revenues/${id}`, data),
  deleteRevenue: (id: string) => del<void>(`/revenues/${id}`),
};

// ─── Tax Configs Endpoints ──────────────────────────────────────────

const taxConfigs = {
  getTaxConfigs: (params?: PaginationParams) => get<{ data: TaxConfigResponse[]; total: number; defaultConfig: TaxConfigResponse | null }>('/tax-configs', { params }),
  createTaxConfig: (data: CreateTaxConfigRequest) => post<TaxConfigResponse>('/tax-configs', data),
  updateTaxConfig: (id: string, data: UpdateTaxConfigRequest) => put<TaxConfigResponse>(`/tax-configs/${id}`, data),
  deleteTaxConfig: (id: string) => del<void>(`/tax-configs/${id}`),
};

// ─── Notifications Endpoints ────────────────────────────────────────

const notifications = {
  getNotifications: (params?: PaginationParams) => get<PaginatedResponse<NotificationResponse>>('/notifications', { params }),
  getUnreadCount: () => get<{ count: number }>('/notifications/unread-count'),
  markAsRead: (id: string) => patch<void>(`/notifications/${id}/read`),
  markAllAsRead: () => post<void>('/notifications/mark-all-read'),
  deleteNotification: (id: string) => del<void>(`/notifications/${id}`),
};

// ─── Audit Logs Endpoints ───────────────────────────────────────────

const auditLogs = {
  getAuditLogs: (params?: PaginationParams) => get<PaginatedResponse<AuditLogResponse>>('/audit-logs', { params }),
};

// ─── Tickets Endpoints ──────────────────────────────────────────────

const tickets = {
  getTickets: (params?: PaginationParams) => get<PaginatedResponse<TicketResponse>>('/tickets', { params }),
  getTicket: (id: string) => get<TicketResponse>(`/tickets/${id}`),
  createTicket: (data: CreateTicketRequest) => post<TicketResponse>('/tickets', data),
  updateTicket: (id: string, data: UpdateTicketRequest) => put<TicketResponse>(`/tickets/${id}`, data),
  changeTicketStatus: (id: string, status: string) => patch<TicketResponse>(`/tickets/${id}/status`, { status }),
  assignTicket: (id: string, assignedToId: string) => patch<TicketResponse>(`/tickets/${id}/assign`, { assignedToId }),
  addTicketMessage: (id: string, data: AddTicketMessageRequest) => post<TicketMessage>(`/tickets/${id}/messages`, data),
};

// ─── Backups Endpoints ──────────────────────────────────────────────

const backups = {
  getBackups: (params?: PaginationParams) => get<PaginatedResponse<BackupResponse>>('/backups', { params }),
  createBackup: (data?: { type?: string; includeFiles?: boolean; includeDatabase?: boolean; encrypt?: boolean }) => post<BackupResponse>('/backups', data || {}),
  getBackup: (id: string) => get<BackupResponse>(`/backups/${id}`),
  deleteBackup: (id: string) => del<void>(`/backups/${id}`),
};

// ─── Upload Endpoints ───────────────────────────────────────────────

const upload = {
  uploadFile: (file: File | Blob, onProgress?: (progress: number) => void) =>
    uploadFile<UploadResponse>('/upload', file, 'file', onProgress),
  uploadMultipleFiles: (files: (File | Blob)[], onProgress?: (progress: number) => void) =>
    uploadMultipleFiles<UploadResponse[]>('/upload/multiple', files, 'files', onProgress),
  deleteFile: (id: string) => del<void>(`/upload/${id}`),
};

// ─── API Keys Endpoints ─────────────────────────────────────────────

const apiKeys = {
  getApiKeys: (params?: PaginationParams) => get<{ data: ApiKeyResponse[]; total: number }>('/api-keys', { params }),
  createApiKey: (data: CreateApiKeyRequest) => post<ApiKeyCreatedResponse>('/api-keys', data),
  updateApiKey: (id: string, data: UpdateApiKeyRequest) => put<ApiKeyResponse>(`/api-keys/${id}`, data),
  deleteApiKey: (id: string) => del<void>(`/api-keys/${id}`),
  regenerateApiKey: (id: string) => post<ApiKeyCreatedResponse>(`/api-keys/${id}/regenerate`),
  toggleApiKey: (id: string) => patch<ApiKeyResponse>(`/api-keys/${id}/toggle-active`),
};

// ─── Webhooks Endpoints ─────────────────────────────────────────────

const webhooks = {
  getWebhooks: (params?: PaginationParams) => get<{ data: WebhookResponse[]; total: number }>('/webhooks', { params }),
  createWebhook: (data: CreateWebhookRequest) => post<WebhookResponse>('/webhooks', data),
  updateWebhook: (id: string, data: UpdateWebhookRequest) => put<WebhookResponse>(`/webhooks/${id}`, data),
  deleteWebhook: (id: string) => del<void>(`/webhooks/${id}`),
  triggerWebhook: (id: string) => post<{ success: boolean }>(`/webhooks/${id}/trigger`),
};

// ─── Health Endpoints ───────────────────────────────────────────────

const health = {
  getHealth: () => get<HealthResponse>('/health'),
  getDetailedHealth: () => get<DetailedHealthResponse>('/health/detailed'),
  getMetrics: () => get<MetricsResponse>('/health/metrics'),
  getVersion: () => get<{ version: string; buildDate: string; commit: string }>('/health/version'),
};

// ─── Export All ─────────────────────────────────────────────────────

export const api = {
  auth,
  users,
  tenants,
  plans,
  subscriptions,
  branches,
  warehouses,
  products,
  categories,
  variants,
  priceLists,
  inventory,
  customers,
  loyalty,
  giftCards,
  suppliers,
  purchaseOrders,
  invoices,
  payments,
  coupons,
  promotions,
  reports,
  shifts,
  expenses,
  revenues,
  taxConfigs,
  notifications,
  auditLogs,
  tickets,
  backups,
  upload,
  apiKeys,
  webhooks,
  health,
};

export default api;