/**
 * SmartPOS Integrated Client-Side Database
 * Provides 100% offline and online persistence when a dedicated backend server
 * is not running or unreachable, ensuring the user can add products, categories,
 * customers, issue invoices, and operate the POS with zero network errors.
 */

const STORAGE_PREFIX = 'smartpos_live_';

function getStore<T>(key: string, defaultVal: T[]): T[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return defaultVal;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (key === 'products' && Array.isArray(defaultVal) && defaultVal.length > 0) {
        const existingIds = new Set(parsed.map((p: any) => p.id));
        const missingDefaults = (defaultVal as any[]).filter((d) => !existingIds.has(d.id));
        if (missingDefaults.length > 0) {
          const merged = [...parsed, ...missingDefaults];
          localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(merged));
          return merged as T[];
        }
      }
      if (key === 'categories' && Array.isArray(defaultVal) && defaultVal.length > 0) {
        const existingIds = new Set(parsed.map((c: any) => c.id));
        const missingDefaults = (defaultVal as any[]).filter((d) => !existingIds.has(d.id));
        if (missingDefaults.length > 0) {
          const merged = [...parsed, ...missingDefaults];
          localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(merged));
          return merged as T[];
        }
      }
      return parsed;
    }
    return defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStore<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`Storage quota exceeded for ${key}`, e);
  }
}

export interface MockProduct {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  sku: string;
  barcode?: string;
  categoryId?: string;
  categoryName?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  taxRate?: number;
  stock: number;
  minStock?: number;
  lowStockAlert?: number;
  hasExpiry: boolean;
  isActive: boolean;
  image?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockCategory {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  productCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface MockCustomer {
  id: string;
  name: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;
  notes?: string;
  balance: number;
  totalSpent: number;
  totalOrders: number;
  loyaltyPoints?: number;
  tier?: 'REGULAR' | 'SILVER' | 'GOLD' | 'PLATINUM';
  isActive: boolean;
  createdAt: string;
}

export interface MockStockMovement {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  warehouseId: string;
  warehouseName: string;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN' | 'PURCHASE' | 'SALE';
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  reference?: string;
  notes?: string;
  userName?: string;
  createdAt: string;
}

export interface MockGiftCard {
  id: string;
  code: string;
  name?: string;
  balance: number;
  initialBalance: number;
  customerId?: string;
  customerName?: string;
  isActive: boolean;
  expiryDate?: string;
  createdAt: string;
}

export interface MockSupplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  balance: number;
  totalSpent: number;
  isActive: boolean;
  createdAt: string;
}

export interface MockInvoice {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  cashierName?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount: number;
  tax?: number;
  discountAmount: number;
  discount?: number;
  totalAmount: number;
  total?: number;
  grandTotal?: number;
  paid?: number;
  balance?: number;
  status?: string;
  type?: string;
  invoiceDate?: string;
  payments: Array<{
    method: string;
    amount: number;
  }>;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  createdAt: string;
}

export interface MockShift {
  id: string;
  shiftNumber?: string;
  cashierId: string;
  cashierName: string;
  branchId?: string;
  openedAt?: string;
  closedAt?: string;
  status: 'OPEN' | 'CLOSED';
  startTime: string;
  endTime?: string;
  openingBalance: number;
  closingBalance?: number;
  openingCash?: number;
  expectedCash?: number;
  actualCash?: number;
  difference?: number;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  invoiceCount: number;
  totalOrders?: number;
  expenses?: Array<{
    id: string;
    amount: number;
    category: string;
    description?: string;
    time: string;
  }>;
  totalExpenses?: number;
  notes?: string;
  closingNote?: string;
  summary?: any;
}

export interface MockTenant {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  legalName?: string;
  taxNumber?: string;
  commercialRegister?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  planId?: string;
  planName?: string;
  subscriptionStatus?: string;
  isActive: boolean;
  settings?: Record<string, unknown>;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MockPlan {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  price: number;
  monthlyPrice?: number;
  annualPrice?: number;
  maxUsers?: number;
  maxBranches?: number;
  maxProducts?: number;
  features?: string[];
  isActive: boolean;
  createdAt: string;
}

export interface MockTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  tenantId?: string;
  tenantName?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedToId?: string;
  assignedToName?: string;
  messages: Array<{
    id: string;
    senderName: string;
    senderRole: string;
    message: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface MockPurchaseOrder {
  id: string;
  poNumber: string;
  poDate: string;
  supplierId: string;
  supplierName: string;
  warehouseId?: string;
  expectedDate?: string;
  status: 'draft' | 'ordered' | 'partiallyReceived' | 'received' | 'cancelled';
  items: Array<{
    id?: string;
    productId: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
  notes?: string;
  reference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockHeldInvoice {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  customer?: any;
  items: Array<{
    productId: string;
    productName: string;
    sku?: string;
    unit?: string;
    costPrice?: number;
    unitPrice: number;
    quantity: number;
    total: number;
  }>;
  subtotal: number;
  total: number;
  notes?: string;
  heldAt: string;
  createdAt: string;
}

export interface MockUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  branchId?: string;
  branchName?: string;
  isActive: boolean;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MockCoupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface MockBackup {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'COMPLETED' | 'FAILED';
  createdAt: string;
  snapshotData?: string;
}

const DEFAULT_USERS: MockUser[] = [
  {
    id: 'user-1',
    fullName: 'أحمد محمود (كاشير رئيسي)',
    email: 'cashier@smartpos.local',
    phone: '01011223344',
    role: 'CASHIER',
    isActive: true,
    permissions: ['pos.create_sale', 'pos.apply_discount', 'pos.hold_invoice', 'pos.open_cash_drawer', 'nav.pos', 'nav.invoices'],
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'user-2',
    fullName: 'سارة عبد الرحمن (مدير فرع المعادي)',
    email: 'manager@smartpos.local',
    phone: '01122334455',
    role: 'MANAGER',
    isActive: true,
    permissions: ['pos.create_sale', 'pos.apply_discount', 'pos.hold_invoice', 'pos.refund', 'pos.view_cost', 'nav.pos', 'nav.invoices', 'nav.dashboard', 'nav.products', 'nav.inventory', 'nav.reports'],
    createdAt: '2026-02-15T11:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'user-3',
    fullName: 'كريم عادل (أمين مخزن)',
    email: 'inventory@smartpos.local',
    phone: '01233445566',
    role: 'INVENTORY_STAFF',
    isActive: true,
    permissions: ['nav.products', 'nav.inventory', 'nav.suppliers'],
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
];

const DEFAULT_COUPONS: MockCoupon[] = [
  {
    id: 'coup-1',
    code: 'WELCOME',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscount: 50,
    minOrderAmount: 100,
    usageLimit: 100,
    usageCount: 14,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'coup-2',
    code: 'SAVE50',
    discountType: 'fixed',
    discountValue: 50,
    minOrderAmount: 250,
    usageLimit: 50,
    usageCount: 8,
    isActive: true,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'coup-3',
    code: 'RAMADAN20',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscount: 100,
    minOrderAmount: 300,
    usageLimit: 200,
    usageCount: 35,
    isActive: true,
    createdAt: '2026-03-01T00:00:00.000Z',
  },
];

const DEFAULT_PLANS: MockPlan[] = [
  {
    id: 'plan-basic',
    name: 'الباقة الأساسية (Starter)',
    nameAr: 'الباقة الأساسية',
    nameEn: 'Starter Plan',
    description: 'مثالية للمحلات الصغيرة والمتاجر الفردية',
    price: 350,
    monthlyPrice: 350,
    annualPrice: 3500,
    maxUsers: 2,
    maxBranches: 1,
    maxProducts: 1000,
    features: ['نقطة بيع سريعة (POS)', 'إيصالات حرارية 80mm', 'إدارة المخزون الأساسية', 'دعم فني عبر واتساب'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan-pro',
    name: 'الباقة المتقدمة (Professional)',
    nameAr: 'الباقة المتقدمة',
    nameEn: 'Professional Plan',
    description: 'للمتاجر المتوسطة والسوبرماركت المتنامي',
    price: 500,
    monthlyPrice: 500,
    annualPrice: 5000,
    maxUsers: 5,
    maxBranches: 3,
    maxProducts: 10000,
    features: ['كل مميزات الأساسية', 'فواتير ضريبية A4', 'تقارير مالية وجرد متقدم', 'إدارة العملاء والموردين', 'ورديات كاشير متعددة'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan-enterprise',
    name: 'الباقة الشاملة (Enterprise)',
    nameAr: 'الباقة الشاملة',
    nameEn: 'Enterprise Plan',
    description: 'للشركات وسلاسل التجزئة المتعددة الفروع',
    price: 850,
    monthlyPrice: 850,
    annualPrice: 8500,
    maxUsers: 999,
    maxBranches: 99,
    maxProducts: 99999,
    features: ['كل مميزات المتقدمة', 'فروع وكاشيرات غير محدودة', 'ربط منظومة الفاتورة الإلكترونية', 'دعم فني VIP على مدار الساعة'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const DEFAULT_TENANTS: MockTenant[] = [
  {
    id: 'tenant-1',
    name: 'متجر الأمل الذكي (فرع المعادي)',
    nameAr: 'متجر الأمل الذكي',
    nameEn: 'Smart Amal Store',
    legalName: 'شركة الأمل للتجارة والتوريدات ش.ذ.م.م',
    taxNumber: '300-492-817',
    commercialRegister: '1084920',
    phone: '01012345678',
    email: 'trader@demo.com',
    address: 'شارع 9، المعادي، القاهرة',
    planId: 'plan-pro',
    planName: 'الباقة المتقدمة',
    subscriptionStatus: 'ACTIVE',
    isActive: true,
    branding: { primaryColor: '#6750a4', secondaryColor: '#ffb4ab' },
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-09-13T12:00:00.000Z',
  },
  {
    id: 'tenant-2',
    name: 'سوبرماركت النصر الحديث',
    nameAr: 'سوبرماركت النصر الحديث',
    nameEn: 'Al-Nasr Modern Supermarket',
    legalName: 'مؤسسة النصر للمواد الغذائية',
    taxNumber: '298-114-556',
    commercialRegister: '95412',
    phone: '01123456789',
    email: 'nasr@market.com',
    address: 'مدينة نصر، الحي السابع، القاهرة',
    planId: 'plan-enterprise',
    planName: 'الباقة الشاملة',
    subscriptionStatus: 'ACTIVE',
    isActive: true,
    branding: { primaryColor: '#0284c7', secondaryColor: '#38bdf8' },
    createdAt: '2026-03-15T09:30:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  },
  {
    id: 'tenant-3',
    name: 'صيدلية الشفاء والجمال',
    nameAr: 'صيدلية الشفاء والجمال',
    nameEn: 'Al-Shifa Pharmacy',
    legalName: 'مجموعة صيدليات الشفاء',
    taxNumber: '412-887-901',
    commercialRegister: '33491',
    phone: '01234567890',
    email: 'shifa@pharmacy.eg',
    address: 'الدقي، الجيزة',
    planId: 'plan-basic',
    planName: 'الباقة الأساسية',
    subscriptionStatus: 'ACTIVE',
    isActive: true,
    branding: { primaryColor: '#059669', secondaryColor: '#34d399' },
    createdAt: '2026-05-10T14:15:00.000Z',
    updatedAt: '2026-09-12T18:00:00.000Z',
  },
  {
    id: 'tenant-4',
    name: 'مؤسسة البركة للتوزيع والتجزئة',
    nameAr: 'مؤسسة البركة للتوزيع',
    nameEn: 'Al-Baraka Distribution',
    legalName: 'شركة البركة للتجارة العامة',
    taxNumber: '199-445-320',
    commercialRegister: '88214',
    phone: '01555554444',
    email: 'baraka@trading.com',
    address: 'سموحة، الإسكندرية',
    planId: 'plan-pro',
    planName: 'الباقة المتقدمة',
    subscriptionStatus: 'TRIAL',
    isActive: true,
    branding: { primaryColor: '#d97706', secondaryColor: '#fbbf24' },
    createdAt: '2026-09-01T11:00:00.000Z',
    updatedAt: '2026-09-13T11:00:00.000Z',
  },
];

const DEFAULT_TICKETS: MockTicket[] = [
  {
    id: 'tick-1',
    ticketNumber: 'TCK-1001',
    subject: 'استفسار حول ربط الطابعة الحرارية 80mm على الشبكة',
    description: 'يرجى توضيح كيفية ضبط إعدادات IP للطابعة لتطبع مباشرة من جهاز التابلت',
    tenantId: 'tenant-1',
    tenantName: 'متجر الأمل الذكي',
    status: 'open',
    priority: 'medium',
    assignedToName: 'فريق الدعم الفني',
    messages: [
      {
        id: 'msg-1',
        senderName: 'التاجر (متجر الأمل)',
        senderRole: 'TRADER',
        message: 'السلام عليكم، هل يمكن تفعيل الطباعة الحرارية عبر شبكة الـ Wi-Fi؟',
        createdAt: '2026-09-13T16:00:00.000Z',
      },
    ],
    createdAt: '2026-09-13T16:00:00.000Z',
    updatedAt: '2026-09-13T16:00:00.000Z',
  },
  {
    id: 'tick-2',
    ticketNumber: 'TCK-1002',
    subject: 'طلب إضافة مستخدم كاشير جديد للفرع الثاني',
    description: 'نريد زيادة عدد الكاشيرات إلى 4 كاشيرات للفرع الجديد',
    tenantId: 'tenant-2',
    tenantName: 'سوبرماركت النصر الحديث',
    status: 'in_progress',
    priority: 'high',
    assignedToName: 'إدارة الاشتراكات',
    messages: [
      {
        id: 'msg-2',
        senderName: 'إدارة سوبرماركت النصر',
        senderRole: 'TRADER',
        message: 'نحتاج فتح حسابين كاشير إضافيين ضمن باقة Enterprise',
        createdAt: '2026-09-13T18:30:00.000Z',
      },
    ],
    createdAt: '2026-09-13T18:30:00.000Z',
    updatedAt: '2026-09-13T19:00:00.000Z',
  },
];

const DEFAULT_CATEGORIES: MockCategory[] = [
  { id: 'cat-1', name: 'مواد غذائية وبقالة', nameAr: 'مواد غذائية وبقالة', nameEn: 'Groceries', description: 'المواد التموينية والبقوليات والزيوت', productCount: 4, isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-2', name: 'ألبان وأجبان', nameAr: 'ألبان وأجبان', nameEn: 'Dairy & Cheese', description: 'منتجات الألبان والأجبان الطازجة', productCount: 2, isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cat-3', name: 'مشروبات وعصائر', nameAr: 'مشروبات وعصائر', nameEn: 'Beverages', description: 'المياه والعصائر والمشروبات الساخنة', productCount: 2, isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
];

const DEFAULT_PRODUCTS: MockProduct[] = [
  {
    id: 'prod-1',
    name: 'أرز مصري فاخر 1 كجم',
    nameAr: 'أرز مصري فاخر 1 كجم',
    nameEn: 'Egyptian Rice 1kg',
    sku: 'RICE-001',
    barcode: '6221234567891',
    categoryId: 'cat-1',
    categoryName: 'مواد غذائية وبقالة',
    unit: 'كجم',
    costPrice: 28.00,
    sellingPrice: 35.00,
    taxRate: 14,
    stock: 150,
    minStock: 20,
    lowStockAlert: 15,
    hasExpiry: true,
    isActive: true,
    description: 'أرز مصري عريض الحبة درجة أولى',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  },
  {
    id: 'prod-2',
    name: 'زيت عباد الشمس 800 مل',
    nameAr: 'زيت عباد الشمس 800 مل',
    nameEn: 'Sunflower Oil 800ml',
    sku: 'OIL-002',
    barcode: '6221234567892',
    categoryId: 'cat-1',
    categoryName: 'مواد غذائية وبقالة',
    unit: 'زجاجة',
    costPrice: 52.00,
    sellingPrice: 65.00,
    taxRate: 14,
    stock: 90,
    minStock: 15,
    lowStockAlert: 10,
    hasExpiry: true,
    isActive: true,
    description: 'زيت عباد الشمس نقي للقلي والطبخ',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  },
  {
    id: 'prod-3',
    name: 'سكر نقي أبيض 1 كجم',
    nameAr: 'سكر نقي أبيض 1 كجم',
    nameEn: 'White Sugar 1kg',
    sku: 'SUGAR-003',
    barcode: '6221234567893',
    categoryId: 'cat-1',
    categoryName: 'مواد غذائية وبقالة',
    unit: 'كيس',
    costPrice: 25.00,
    sellingPrice: 32.00,
    taxRate: 14,
    stock: 200,
    minStock: 25,
    lowStockAlert: 20,
    hasExpiry: true,
    isActive: true,
    description: 'سكر بلوري أبيض ناصع عالي الجودة',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  },
  {
    id: 'prod-4',
    name: 'مكرونة فرن ممتازة 400 جم',
    nameAr: 'مكرونة فرن ممتازة 400 جم',
    nameEn: 'Penne Pasta 400g',
    sku: 'PASTA-004',
    barcode: '6221234567894',
    categoryId: 'cat-1',
    categoryName: 'مواد غذائية وبقالة',
    unit: 'كيس',
    costPrice: 11.00,
    sellingPrice: 15.00,
    taxRate: 14,
    stock: 180,
    minStock: 30,
    lowStockAlert: 15,
    hasExpiry: true,
    isActive: true,
    description: 'مكرونة سيمولينا قمح صلب',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  },
  {
    id: 'prod-5',
    name: 'حليب طبيعي كامل الدسم 1 لتر',
    nameAr: 'حليب طبيعي كامل الدسم 1 لتر',
    nameEn: 'Full Cream Milk 1L',
    sku: 'MILK-005',
    barcode: '6221234567895',
    categoryId: 'cat-2',
    categoryName: 'ألبان وأجبان',
    unit: 'عبوة',
    costPrice: 34.00,
    sellingPrice: 42.00,
    taxRate: 14,
    stock: 65,
    minStock: 10,
    lowStockAlert: 8,
    hasExpiry: true,
    isActive: true,
    description: 'حليب معقم كامل الدسم طويل الأجل',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  },
  {
    id: 'prod-6',
    name: 'جبنة بيضاء فيتا 500 جم',
    nameAr: 'جبنة بيضاء فيتا 500 جم',
    nameEn: 'Feta Cheese 500g',
    sku: 'CHEESE-006',
    barcode: '6221234567896',
    categoryId: 'cat-2',
    categoryName: 'ألبان وأجبان',
    unit: 'علبة',
    costPrice: 38.00,
    sellingPrice: 48.00,
    taxRate: 14,
    stock: 45,
    minStock: 10,
    lowStockAlert: 5,
    hasExpiry: true,
    isActive: true,
    description: 'جبنة فيتا نباتي الدهن طرية',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  },
  {
    id: 'prod-7',
    name: 'قهوة نسكافيه كلاسيك 100 جم',
    nameAr: 'قهوة نسكافيه كلاسيك 100 جم',
    nameEn: 'Nescafe Classic 100g',
    sku: 'COFFEE-007',
    barcode: '6221234567897',
    categoryId: 'cat-3',
    categoryName: 'مشروبات وعصائر',
    unit: 'برطمان',
    costPrice: 95.00,
    sellingPrice: 120.00,
    stock: 40,
    minStock: 10,
    lowStockAlert: 5,
    hasExpiry: true,
    isActive: true,
    description: 'قهوة سريعة التحضير نكهة غنية',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  },
  {
    id: 'prod-8',
    name: 'مياه معدنية طبيعية 1.5 لتر',
    nameAr: 'مياه معدنية طبيعية 1.5 لتر',
    nameEn: 'Mineral Water 1.5L',
    sku: 'WATER-008',
    barcode: '6221234567898',
    categoryId: 'cat-3',
    categoryName: 'مشروبات وعصائر',
    unit: 'زجاجة',
    costPrice: 5.50,
    sellingPrice: 8.00,
    stock: 320,
    minStock: 50,
    lowStockAlert: 30,
    hasExpiry: true,
    isActive: true,
    description: 'مياه شرب طبيعية نقية معبأة',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  },
];

const DEFAULT_CUSTOMERS: MockCustomer[] = [
  { id: 'cust-1', name: 'عميل نقدي عام', phone: '01000000000', email: 'cash@smartpos.local', address: 'مبيعات مباشرة', balance: 0, totalSpent: 0, totalOrders: 0, loyaltyPoints: 0, tier: 'REGULAR', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'cust-2', name: 'م. أحمد إبراهيم', phone: '01011223344', email: 'ahmed@gmail.com', address: 'المعادي - القاهرة', balance: 0, totalSpent: 1250, totalOrders: 5, loyaltyPoints: 125, tier: 'SILVER', isActive: true, createdAt: '2026-02-10T00:00:00.000Z' },
  { id: 'cust-3', name: 'شركة الفهد للتوريدات', phone: '01233445566', email: 'contact@al-fahd.eg', address: 'مدينة نصر - القاهرة', balance: 1500, totalSpent: 8500, totalOrders: 12, loyaltyPoints: 340, tier: 'GOLD', isActive: true, createdAt: '2026-03-01T00:00:00.000Z' },
];

const DEFAULT_SUPPLIERS: MockSupplier[] = [
  {
    id: 'supp-1',
    name: 'شركة النيل للصناعات الغذائية',
    phone: '01011223344',
    email: 'info@nile-foods.eg',
    address: 'المنطقة الصناعية - 6 أكتوبر',
    notes: 'مورد معتمد للزيوت والأرز والسكر',
    balance: 0,
    totalSpent: 45000,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'supp-2',
    name: 'مؤسسة الدلتا لمنتجات الألبان والأجبان',
    phone: '01223344556',
    email: 'sales@delta-dairy.com',
    address: 'المنصورة - الدقهلية',
    notes: 'توريد أسبوعي لمنتجات الألبان الطازجة',
    balance: 2400,
    totalSpent: 28000,
    isActive: true,
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'supp-3',
    name: 'الشركة المصرية لتجارة المشروبات والمياه',
    phone: '01155667788',
    email: 'orders@egy-beverages.com',
    address: 'طريق مصر الإسكندرية الصحراوي',
    notes: 'موزع المياه المعدنية والعصائر المعتمد',
    balance: 0,
    totalSpent: 19500,
    isActive: true,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

const DEFAULT_PURCHASE_ORDERS: MockPurchaseOrder[] = [
  {
    id: 'po-101',
    poNumber: 'PO-2026-001',
    poDate: '2026-09-10T09:00:00.000Z',
    supplierId: 'supp-1',
    supplierName: 'شركة النيل للصناعات الغذائية',
    status: 'ordered',
    items: [
      {
        id: 'poi-1',
        productId: 'prod-1',
        productName: 'أرز مصري فاخر 1 كجم',
        quantity: 50,
        unitPrice: 28.00,
        total: 1400.00,
      },
      {
        id: 'poi-2',
        productId: 'prod-2',
        productName: 'زيت عباد الشمس 800 مل',
        quantity: 30,
        unitPrice: 52.00,
        total: 1560.00,
      },
    ],
    subtotal: 2960.00,
    tax: 0,
    discount: 0,
    shipping: 50.00,
    total: 3010.00,
    expectedDate: '2026-09-18T00:00:00.000Z',
    notes: 'طلبية توريد منتجات بقالة أساسية',
    createdAt: '2026-09-10T09:00:00.000Z',
    updatedAt: '2026-09-10T09:00:00.000Z',
  },
  {
    id: 'po-102',
    poNumber: 'PO-2026-002',
    poDate: '2026-09-12T11:30:00.000Z',
    supplierId: 'supp-2',
    supplierName: 'مؤسسة الدلتا لمنتجات الألبان والأجبان',
    status: 'received',
    items: [
      {
        id: 'poi-3',
        productId: 'prod-5',
        productName: 'لبن جهينة كامل الدسم 1 لتر',
        quantity: 60,
        unitPrice: 35.00,
        total: 2100.00,
      },
      {
        id: 'poi-4',
        productId: 'prod-6',
        productName: 'جبنة فيتا دومتي 500 جم',
        quantity: 40,
        unitPrice: 38.00,
        total: 1520.00,
      },
    ],
    subtotal: 3620.00,
    tax: 0,
    discount: 100.00,
    shipping: 0,
    total: 3520.00,
    expectedDate: '2026-09-14T00:00:00.000Z',
    notes: 'توريد ألبان وأجبان أسبوعي - تم الاستلام بالكامل',
    createdAt: '2026-09-12T11:30:00.000Z',
    updatedAt: '2026-09-14T10:00:00.000Z',
  },
];

export const mockDb = {
  // ─── Products ──────────────────────────────────────────────
  getProducts(params?: { page?: number; limit?: number; search?: string; categoryId?: string }) {
    let items = getStore<MockProduct>('products', DEFAULT_PRODUCTS).map((p) => ({
      ...p,
      taxRate: typeof p.taxRate === 'number' ? p.taxRate : 14,
    }));
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.nameAr && p.nameAr.toLowerCase().includes(q)) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q))
      );
    }
    if (params?.categoryId) {
      items = items.filter((p) => p.categoryId === params.categoryId);
    }
    const total = items.length;
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const start = (page - 1) * limit;
    const data = items.slice(start, start + limit);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  getProduct(id: string) {
    const items = getStore<MockProduct>('products', DEFAULT_PRODUCTS);
    return items.find((p) => p.id === id) || null;
  },

  createProduct(payload: any): MockProduct {
    const items = getStore<MockProduct>('products', DEFAULT_PRODUCTS);
    const newProduct: MockProduct = {
      id: `prod-${Date.now()}`,
      name: payload.nameAr || payload.name || payload.nameEn || 'صنف جديد',
      nameAr: payload.nameAr || payload.name,
      nameEn: payload.nameEn || '',
      sku: payload.sku || `SKU-${Date.now().toString().slice(-5)}`,
      barcode: payload.barcode || '',
      categoryId: payload.categoryId || undefined,
      categoryName: payload.categoryName || undefined,
      unit: payload.unit || 'piece',
      costPrice: Number(payload.costPrice) || 0,
      sellingPrice: Number(payload.sellingPrice) || 0,
      wholesalePrice: payload.wholesalePrice ? Number(payload.wholesalePrice) : undefined,
      stock: payload.stock !== undefined && payload.stock !== null && !isNaN(Number(payload.stock))
        ? Number(payload.stock)
        : 100,
      minStock: payload.minStock !== undefined && payload.minStock !== null && !isNaN(Number(payload.minStock))
        ? Number(payload.minStock)
        : 5,
      lowStockAlert: payload.lowStockAlert !== undefined && payload.lowStockAlert !== null && !isNaN(Number(payload.lowStockAlert))
        ? Number(payload.lowStockAlert)
        : (payload.minStock !== undefined ? Number(payload.minStock) : 5),
      hasExpiry: Boolean(payload.hasExpiry),
      isActive: payload.isActive !== false,
      image: payload.image || '',
      description: payload.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.unshift(newProduct);
    setStore('products', items);

    // Update category product count if categoryId present
    if (newProduct.categoryId) {
      this.incrementCategoryProductCount(newProduct.categoryId);
    }

    return newProduct;
  },

  updateProduct(id: string, payload: any): MockProduct {
    const items = getStore<MockProduct>('products', DEFAULT_PRODUCTS);
    const idx = items.findIndex((p) => p.id === id);
    const existing = items[idx];
    if (idx === -1 || !existing) {
      throw new Error('Product not found');
    }
    const updated: MockProduct = {
      ...existing,
      ...payload,
      stock: payload.stock !== undefined && payload.stock !== null && !isNaN(Number(payload.stock))
        ? Number(payload.stock)
        : existing.stock,
      minStock: payload.minStock !== undefined && payload.minStock !== null && !isNaN(Number(payload.minStock))
        ? Number(payload.minStock)
        : existing.minStock,
      lowStockAlert: payload.lowStockAlert !== undefined && payload.lowStockAlert !== null && !isNaN(Number(payload.lowStockAlert))
        ? Number(payload.lowStockAlert)
        : existing.lowStockAlert,
      id,
      updatedAt: new Date().toISOString(),
    };
    items[idx] = updated;
    setStore('products', items);
    return updated;
  },

  deleteProduct(id: string): boolean {
    const items = getStore<MockProduct>('products', DEFAULT_PRODUCTS);
    const filtered = items.filter((p) => p.id !== id);
    setStore('products', filtered);
    return true;
  },

  // ─── Categories ──────────────────────────────────────────
  getCategories(params?: { page?: number; limit?: number; search?: string }) {
    let items = getStore<MockCategory>('categories', DEFAULT_CATEGORIES);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter((c) => c.name.toLowerCase().includes(q) || (c.nameAr && c.nameAr.toLowerCase().includes(q)));
    }
    const total = items.length;
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const start = (page - 1) * limit;
    return { data: items.slice(start, start + limit), total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  createCategory(payload: any): MockCategory {
    const items = getStore<MockCategory>('categories', DEFAULT_CATEGORIES);
    const newCategory: MockCategory = {
      id: `cat-${Date.now()}`,
      name: payload.nameAr || payload.name || payload.nameEn || 'قسم جديد',
      nameAr: payload.nameAr || payload.name,
      nameEn: payload.nameEn || '',
      description: payload.description || '',
      productCount: 0,
      isActive: payload.isActive !== false,
      createdAt: new Date().toISOString(),
    };
    items.push(newCategory);
    setStore('categories', items);
    return newCategory;
  },

  incrementCategoryProductCount(categoryId: string) {
    const categories = getStore<MockCategory>('categories', DEFAULT_CATEGORIES);
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      cat.productCount = (cat.productCount || 0) + 1;
      setStore('categories', categories);
    }
  },

  updateCategory(id: string, payload: any): MockCategory {
    const items = getStore<MockCategory>('categories', DEFAULT_CATEGORIES);
    const idx = items.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Category not found');
    const updated = { ...items[idx], ...payload, id };
    items[idx] = updated;
    setStore('categories', items);
    return updated;
  },

  deleteCategory(id: string): boolean {
    const items = getStore<MockCategory>('categories', DEFAULT_CATEGORIES);
    setStore('categories', items.filter((c) => c.id !== id));
    return true;
  },

  // ─── Customers ──────────────────────────────────────────
  getCustomers(params?: { page?: number; limit?: number; search?: string }) {
    let items = getStore<MockCustomer>('customers', DEFAULT_CUSTOMERS);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }
    const total = items.length;
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const start = (page - 1) * limit;
    return { data: items.slice(start, start + limit), total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  getCustomer(id: string): MockCustomer | null {
    const items = getStore<MockCustomer>('customers', DEFAULT_CUSTOMERS);
    return items.find((c) => c.id === id) || null;
  },

  createCustomer(payload: any): MockCustomer {
    const items = getStore<MockCustomer>('customers', DEFAULT_CUSTOMERS);
    const newCustomer: MockCustomer = {
      id: `cust-${Date.now()}`,
      name: payload.name || payload.nameAr || 'عميل جديد',
      phone: payload.phone || '',
      phone2: payload.phone2 || '',
      email: payload.email || '',
      address: payload.address || '',
      notes: payload.notes || '',
      balance: Number(payload.balance) || 0,
      totalSpent: 0,
      totalOrders: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    items.unshift(newCustomer);
    setStore('customers', items);
    return newCustomer;
  },

  updateCustomer(id: string, payload: any): MockCustomer {
    const items = getStore<MockCustomer>('customers', []);
    const idx = items.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Customer not found');
    const updated = { ...items[idx], ...payload, id };
    items[idx] = updated;
    setStore('customers', items);
    return updated;
  },

  deleteCustomer(id: string): boolean {
    const items = getStore<MockCustomer>('customers', []);
    setStore('customers', items.filter((c) => c.id !== id));
    return true;
  },

  // ─── Suppliers ──────────────────────────────────────────
  getSuppliers(params?: { page?: number; limit?: number; search?: string }) {
    let items = getStore<MockSupplier>('suppliers', DEFAULT_SUPPLIERS);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q))
      );
    }
    const total = items.length;
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const start = (page - 1) * limit;
    return { data: items.slice(start, start + limit), total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  getSupplier(id: string) {
    const items = getStore<MockSupplier>('suppliers', DEFAULT_SUPPLIERS);
    return items.find((s) => s.id === id) || null;
  },

  createSupplier(payload: any): MockSupplier {
    const items = getStore<MockSupplier>('suppliers', DEFAULT_SUPPLIERS);
    const newSupplier: MockSupplier = {
      id: `supp-${Date.now()}`,
      name: payload.name || payload.nameAr || 'مورد جديد',
      phone: payload.phone || '',
      email: payload.email || '',
      address: payload.address || '',
      notes: payload.notes || '',
      balance: Number(payload.balance) || 0,
      totalSpent: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    items.unshift(newSupplier);
    setStore('suppliers', items);
    return newSupplier;
  },

  updateSupplier(id: string, payload: any): MockSupplier {
    const items = getStore<MockSupplier>('suppliers', DEFAULT_SUPPLIERS);
    const idx = items.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Supplier not found');
    const updated = { ...items[idx], ...payload, id };
    items[idx] = updated;
    setStore('suppliers', items);
    return updated;
  },

  deleteSupplier(id: string): boolean {
    const items = getStore<MockSupplier>('suppliers', DEFAULT_SUPPLIERS);
    setStore('suppliers', items.filter((s) => s.id !== id));
    return true;
  },

  // ─── Purchase Orders ───────────────────────────────────
  getPurchaseOrders(params?: { page?: number; limit?: number; search?: string; status?: string; supplierId?: string }) {
    let items = getStore<MockPurchaseOrder>('purchase_orders', DEFAULT_PURCHASE_ORDERS);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (po) =>
          po.poNumber.toLowerCase().includes(q) ||
          (po.supplierName && po.supplierName.toLowerCase().includes(q)) ||
          (po.reference && po.reference.toLowerCase().includes(q))
      );
    }
    if (params?.status) {
      items = items.filter((po) => po.status === params.status);
    }
    if (params?.supplierId) {
      items = items.filter((po) => po.supplierId === params.supplierId);
    }
    const total = items.length;
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const start = (page - 1) * limit;
    return { data: items.slice(start, start + limit), total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  getPurchaseOrder(id: string) {
    const items = getStore<MockPurchaseOrder>('purchase_orders', DEFAULT_PURCHASE_ORDERS);
    return items.find((po) => po.id === id) || null;
  },

  createPurchaseOrder(payload: any): MockPurchaseOrder {
    const items = getStore<MockPurchaseOrder>('purchase_orders', DEFAULT_PURCHASE_ORDERS);
    const suppliers = getStore<MockSupplier>('suppliers', DEFAULT_SUPPLIERS);
    const supplier = suppliers.find((s) => s.id === payload.supplierId);

    const poItems = (payload.items || []).map((it: any, idx: number) => {
      const prod = this.getProduct(it.productId);
      const qty = Number(it.quantity) || 1;
      const price = Number(it.unitPrice) || Number(prod?.costPrice) || 0;
      return {
        id: `poi-${Date.now()}-${idx}`,
        productId: it.productId,
        productName: prod?.name || prod?.nameAr || 'صنف',
        quantity: qty,
        unitPrice: price,
        total: qty * price,
      };
    });

    const subtotal = poItems.reduce((acc: number, item: any) => acc + item.total, 0);
    const discount = Number(payload.discount) || 0;
    const shipping = Number(payload.shipping) || 0;
    const tax = Number(payload.tax) || 0;
    const total = Math.max(0, subtotal - discount + shipping + tax);

    const count = items.length + 1;
    const poNumber = `PO-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

    const newPO: MockPurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      poDate: new Date().toISOString(),
      supplierId: payload.supplierId,
      supplierName: supplier ? supplier.name : 'مورد عام',
      warehouseId: payload.warehouseId || '',
      expectedDate: payload.expectedDate || '',
      status: 'draft',
      items: poItems,
      subtotal,
      tax,
      discount,
      shipping,
      total,
      notes: payload.notes || '',
      reference: payload.reference || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    items.unshift(newPO);
    setStore('purchase_orders', items);
    return newPO;
  },

  updatePurchaseOrder(id: string, payload: any): MockPurchaseOrder {
    const items = getStore<MockPurchaseOrder>('purchase_orders', DEFAULT_PURCHASE_ORDERS);
    const idx = items.findIndex((p) => p.id === id);
    if (idx === -1 || !items[idx]) throw new Error('Purchase order not found');
    const target = items[idx]!;
    const updated = { ...target, ...payload, updatedAt: new Date().toISOString() };
    items[idx] = updated;
    setStore('purchase_orders', items);
    return updated;
  },

  changePOStatus(id: string, status: 'draft' | 'ordered' | 'partiallyReceived' | 'received' | 'cancelled'): MockPurchaseOrder {
    const items = getStore<MockPurchaseOrder>('purchase_orders', DEFAULT_PURCHASE_ORDERS);
    const idx = items.findIndex((p) => p.id === id);
    if (idx === -1 || !items[idx]) throw new Error('Purchase order not found');
    const target = items[idx]!;
    target.status = status;
    target.updatedAt = new Date().toISOString();

    // If marked received, automatically add stock to products
    if (status === 'received') {
      target.items.forEach((item) => {
        try {
          const prod = this.getProduct(item.productId);
          if (prod) {
            this.updateProduct(prod.id, {
              stock: (prod.stock || 0) + item.quantity,
              costPrice: item.unitPrice > 0 ? item.unitPrice : prod.costPrice,
            });
          }
        } catch (e) {
          console.warn('Failed to update product stock on PO receive', e);
        }
      });
    }

    setStore('purchase_orders', items);
    return target;
  },

  deletePurchaseOrder(id: string): boolean {
    const items = getStore<MockPurchaseOrder>('purchase_orders', DEFAULT_PURCHASE_ORDERS);
    setStore('purchase_orders', items.filter((p) => p.id !== id));
    return true;
  },

  // ─── Held Invoices ─────────────────────────────────────
  getHeldInvoices() {
    return getStore<MockHeldInvoice>('held_invoices', []);
  },

  holdInvoice(payload: any): MockHeldInvoice {
    const items = getStore<MockHeldInvoice>('held_invoices', []);
    const invCount = items.length + 1;
    const invoiceNumber = `HOLD-${Date.now().toString().slice(-4)}-${invCount}`;

    const rawItems = Array.isArray(payload.items) ? payload.items : (payload.cart || []);
    const mappedItems = rawItems.map((it: any) => ({
      productId: it.productId || it.product?.id || `item-${Date.now()}`,
      productName: it.productName || it.product?.nameAr || it.product?.name || 'صنف',
      sku: it.sku || it.product?.sku || '',
      unit: it.unit || it.product?.unit || 'PIECE',
      costPrice: Number(it.costPrice || it.product?.costPrice) || 0,
      unitPrice: Number(it.unitPrice || it.product?.sellingPrice) || 0,
      quantity: Number(it.quantity) || 1,
      total: (Number(it.unitPrice || it.product?.sellingPrice) || 0) * (Number(it.quantity) || 1),
    }));

    const total = mappedItems.reduce((acc: number, cur: any) => acc + cur.total, 0);

    const held: MockHeldInvoice = {
      id: `hold-${Date.now()}`,
      invoiceNumber,
      customerId: payload.customerId || payload.customer?.id,
      customerName: payload.customerName || payload.customer?.name,
      customer: payload.customer,
      items: mappedItems,
      subtotal: total,
      total,
      notes: payload.notes || '',
      heldAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    items.unshift(held);
    setStore('held_invoices', items);
    return held;
  },

  resumeHeldInvoice(id: string) {
    const items = getStore<MockHeldInvoice>('held_invoices', []);
    const target = items.find((h) => h.id === id);
    if (!target) {
      throw new Error('Held invoice not found');
    }
    // Remove from held
    setStore('held_invoices', items.filter((h) => h.id !== id));
    return {
      message: 'Invoice resumed successfully',
      cartData: {
        items: target.items,
        customer: target.customer,
      },
      items: target.items,
      customer: target.customer,
    };
  },

  deleteHeldInvoice(id: string): boolean {
    const items = getStore<MockHeldInvoice>('held_invoices', []);
    setStore('held_invoices', items.filter((h) => h.id !== id));
    return true;
  },

  // ─── Invoices ───────────────────────────────────────────
  getInvoices(params?: { page?: number; limit?: number }) {
    const rawItems = getStore<any>('invoices', []);
    const items: MockInvoice[] = rawItems.map((inv) => {
      const totalAmount = Number(inv.totalAmount) || Number(inv.total) || Number(inv.grandTotal) || 0;
      const date = inv.invoiceDate || inv.createdAt || new Date().toISOString();
      return {
        ...inv,
        total: totalAmount,
        totalAmount,
        grandTotal: totalAmount,
        subtotal: Number(inv.subtotal) || totalAmount,
        taxAmount: Number(inv.taxAmount) || Number(inv.tax) || 0,
        tax: Number(inv.tax) || Number(inv.taxAmount) || 0,
        discountAmount: Number(inv.discountAmount) || Number(inv.discount) || 0,
        discount: Number(inv.discount) || Number(inv.discountAmount) || 0,
        paid: Number(inv.paid) || totalAmount,
        balance: Number(inv.balance) || 0,
        status: inv.status || 'paid',
        paymentStatus: (inv.paymentStatus || 'PAID') as any,
        type: inv.type || 'SALE',
        invoiceDate: date,
        createdAt: inv.createdAt || date,
        customerName: inv.customerName || (inv.customerId ? 'عميل مسجل' : 'زبون نقدي'),
      };
    });
    const total = items.length;
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const start = (page - 1) * limit;
    return { data: items.slice(start, start + limit), total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  getInvoice(id: string) {
    const res = this.getInvoices({ limit: 1000 });
    return res.data.find((inv) => inv.id === id || inv.invoiceNumber === id) || null;
  },

  createInvoice(payload: any): MockInvoice {
    const invoices = getStore<any>('invoices', []);
    const products = getStore<MockProduct>('products', []);

    // 1. Items calculation
    const rawItems = Array.isArray(payload.items) ? payload.items : [];
    const items = rawItems.map((it: any) => {
      const unitPrice = Number(it.unitPrice) || Number(it.price) || 0;
      const quantity = Number(it.quantity) || 1;
      return {
        productId: it.productId,
        productName: it.productName || it.name || 'صنف',
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    });

    const itemsSubtotal = items.reduce((sum: number, it: any) => sum + it.total, 0);
    const discount = Number(payload.discount) || Number(payload.discountAmount) || 0;
    const tax = Number(payload.tax) || Number(payload.taxAmount) || 0;

    let computedTotal = Math.max(0, itemsSubtotal - discount + tax);
    if (computedTotal === 0 && Array.isArray(payload.payments) && payload.payments.length > 0) {
      computedTotal = payload.payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    }
    const finalTotal = Number(payload.totalAmount) || Number(payload.total) || Number(payload.grandTotal) || computedTotal;

    // Deduct purchased products stock
    rawItems.forEach((item: any) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - (Number(item.quantity) || 1));
      }
    });
    setStore('products', products);

    const nextNum = invoices.length + 1;
    const invoiceNumber = `INV-${nextNum.toString().padStart(5, '0')}`;
    const nowIso = new Date().toISOString();

    const newInvoice: MockInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      customerId: payload.customerId || undefined,
      customerName: payload.customerName || (payload.customerId ? 'عميل مسجل' : 'زبون نقدي'),
      cashierName: 'مدير المتجر',
      items,
      subtotal: itemsSubtotal > 0 ? itemsSubtotal : finalTotal,
      taxAmount: tax,
      tax,
      discountAmount: discount,
      discount,
      totalAmount: finalTotal,
      total: finalTotal,
      grandTotal: finalTotal,
      paid: finalTotal,
      payments: (Array.isArray(payload.payments) && payload.payments.length > 0
        ? payload.payments
        : [{ method: 'cash', amount: finalTotal }]
      ).map((p: any, idx: number) => ({
        id: p.id || `pay-${Date.now()}-${idx}`,
        method: p.method || 'cash',
        amount: Number(p.amount) || finalTotal,
        date: p.date || nowIso,
        reference: p.reference || '',
      })),
      paymentStatus: 'PAID',
      type: 'SALE',
      invoiceDate: nowIso,
      createdAt: nowIso,
    };

    invoices.unshift(newInvoice);
    setStore('invoices', invoices);

    // Update active shift stats
    const currentShift = this.getCurrentShift();
    if (currentShift && currentShift.status === 'OPEN') {
      currentShift.totalSales = (currentShift.totalSales || 0) + newInvoice.totalAmount;
      currentShift.totalOrders = (currentShift.totalOrders || 0) + 1;
      const hasCard = (newInvoice.payments || []).some((p: any) => String(p.method).toUpperCase() === 'CARD');
      if (hasCard) {
        currentShift.cardSales = (currentShift.cardSales || 0) + newInvoice.totalAmount;
      } else {
        currentShift.cashSales = (currentShift.cashSales || 0) + newInvoice.totalAmount;
      }
      this.saveCurrentShift(currentShift);
    }

    return newInvoice;
  },

  // ─── Settings & Tenant ──────────────────────────────────
  getTenantSettings() {
    return {
      taxRate: 0,
      currency: 'EGP',
      vatEnabled: false,
      companyName: 'Smart POS',
      supportPhone: '01000165672',
    };
  },

  // ─── Tenants (إدارة التجار للمشرف العام) ──────────────────────
  getTenants(params?: { page?: number; limit?: number; search?: string }) {
    let items = getStore<MockTenant>('tenants', DEFAULT_TENANTS);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.nameAr && t.nameAr.toLowerCase().includes(q)) ||
          (t.email && t.email.toLowerCase().includes(q)) ||
          (t.phone && t.phone.includes(q))
      );
    }
    const total = items.length;
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const start = (page - 1) * limit;
    return { data: items.slice(start, start + limit), total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  getTenant(id: string): MockTenant {
    const items = getStore<MockTenant>('tenants', DEFAULT_TENANTS);
    return items.find((t) => t.id === id) || (items[0] as MockTenant) || (DEFAULT_TENANTS[0] as MockTenant);
  },

  createTenant(payload: any): MockTenant {
    const items = getStore<MockTenant>('tenants', DEFAULT_TENANTS);
    const plans = this.getPlans().data;
    const matchedPlan = plans.find((p) => p.id === payload.planId) || plans[0] || DEFAULT_PLANS[0];
    const planId = matchedPlan?.id || 'plan-basic';
    const planName = matchedPlan?.nameAr || matchedPlan?.name || 'الباقة الأساسية';

    const newTenant: MockTenant = {
      id: `tenant-${Date.now()}`,
      name: payload.name || payload.nameAr || 'تاجر جديد',
      nameAr: payload.nameAr || payload.name,
      nameEn: payload.nameEn || payload.name,
      legalName: payload.legalName || payload.name,
      taxNumber: payload.taxNumber || '',
      commercialRegister: payload.commercialRegister || '',
      email: payload.email || `merchant_${Date.now().toString().slice(-4)}@smartpos.local`,
      phone: payload.phone || '',
      address: payload.address || 'القاهرة، مصر',
      city: payload.city || 'القاهرة',
      planId,
      planName,
      subscriptionStatus: 'ACTIVE',
      isActive: true,
      branding: {
        primaryColor: '#6750a4',
        secondaryColor: '#ffb4ab',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.unshift(newTenant);
    setStore('tenants', items);
    return newTenant;
  },

  updateTenant(id: string, payload: any): MockTenant {
    const items = getStore<MockTenant>('tenants', DEFAULT_TENANTS);
    const idx = items.findIndex((t) => t.id === id);
    if (idx === -1 || !items[idx]) throw new Error('Tenant not found');
    const current = items[idx] as MockTenant;
    const updated = { ...current, ...payload, id, updatedAt: new Date().toISOString() };
    items[idx] = updated;
    setStore('tenants', items);
    return updated;
  },

  toggleTenantActive(id: string): MockTenant {
    const items = getStore<MockTenant>('tenants', DEFAULT_TENANTS);
    const idx = items.findIndex((t) => t.id === id);
    if (idx === -1 || !items[idx]) throw new Error('Tenant not found');
    const current = items[idx] as MockTenant;
    current.isActive = !current.isActive;
    current.updatedAt = new Date().toISOString();
    items[idx] = current;
    setStore('tenants', items);
    return current;
  },

  deleteTenant(id: string): boolean {
    const items = getStore<MockTenant>('tenants', DEFAULT_TENANTS);
    setStore('tenants', items.filter((t) => t.id !== id));
    return true;
  },

  updateBranding(id: string, payload: any): MockTenant {
    const items = getStore<MockTenant>('tenants', DEFAULT_TENANTS);
    const idx = items.findIndex((t) => t.id === id);
    if (idx === -1 || !items[idx]) throw new Error('Tenant not found');
    const current = items[idx] as MockTenant;
    current.branding = { ...current.branding, ...payload };
    current.updatedAt = new Date().toISOString();
    items[idx] = current;
    setStore('tenants', items);
    return current;
  },

  // ─── Plans (باقات الاشتراك) ──────────────────────────────────
  getPlans(params?: { page?: number; limit?: number }) {
    const items = getStore<MockPlan>('plans', DEFAULT_PLANS);
    const total = items.length;
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const start = (page - 1) * limit;
    return { data: items.slice(start, start + limit), total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  getPlan(id: string): MockPlan {
    const items = getStore<MockPlan>('plans', DEFAULT_PLANS);
    return items.find((p) => p.id === id) || (items[0] as MockPlan) || (DEFAULT_PLANS[0] as MockPlan);
  },

  createPlan(payload: any): MockPlan {
    const items = getStore<MockPlan>('plans', DEFAULT_PLANS);
    const newPlan: MockPlan = {
      id: `plan-${Date.now()}`,
      name: payload.name || payload.nameAr || 'باقة جديدة',
      nameAr: payload.nameAr || payload.name,
      nameEn: payload.nameEn || '',
      description: payload.description || '',
      price: Number(payload.price) || 500,
      monthlyPrice: Number(payload.monthlyPrice || payload.price) || 500,
      annualPrice: (Number(payload.price) || 500) * 10,
      maxUsers: Number(payload.maxUsers) || 5,
      maxBranches: Number(payload.maxBranches) || 1,
      maxProducts: Number(payload.maxProducts) || 5000,
      features: Array.isArray(payload.features) ? payload.features : ['نقاط بيع سريعة', 'فواتير حرارية و A4'],
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    items.unshift(newPlan);
    setStore('plans', items);
    return newPlan;
  },

  updatePlan(id: string, payload: any): MockPlan {
    const items = getStore<MockPlan>('plans', DEFAULT_PLANS);
    const idx = items.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Plan not found');
    const updated = { ...items[idx], ...payload, id };
    items[idx] = updated;
    setStore('plans', items);
    return updated;
  },

  deletePlan(id: string): boolean {
    const items = getStore<MockPlan>('plans', DEFAULT_PLANS);
    setStore('plans', items.filter((p) => p.id !== id));
    return true;
  },

  // ─── Subscriptions (اشتراكات التجار والخطط) ───────────────────
  getCurrentSubscription(tenantId?: string) {
    const tenants = getStore<MockTenant>('tenants', DEFAULT_TENANTS);
    const plans = getStore<MockPlan>('plans', DEFAULT_PLANS);
    const products = getStore<MockProduct>('products', DEFAULT_PRODUCTS);

    const targetTenant: MockTenant = (tenantId ? tenants.find((t) => t.id === tenantId) : null) || tenants[0] || (DEFAULT_TENANTS[0] as MockTenant);
    const plan: MockPlan = plans.find((p) => p.id === targetTenant.planId) || plans[1] || (DEFAULT_PLANS[1] as MockPlan);

    // Expiration date is in 15 days so the trader gets warned proactively
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDateObj = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const endDate = endDateObj.toISOString();
    const daysRemaining = 15;

    return {
      id: `sub-${targetTenant.id}`,
      tenantId: targetTenant.id,
      tenantName: targetTenant.nameAr || targetTenant.name,
      planId: plan.id,
      planName: plan.nameAr || plan.name,
      planDescription: plan.description,
      status: targetTenant.subscriptionStatus || 'ACTIVE',
      startDate,
      endDate,
      daysRemaining,
      trialEnd: targetTenant.subscriptionStatus === 'TRIAL' ? endDate : undefined,
      nextBilling: endDate,
      billingAmount: plan.monthlyPrice || plan.price || 500,
      currency: 'EGP',
      paymentMethod: 'فودافون كاش / تحويل بنكي',
      autoRenew: true,
      features: plan.features || [
        'نقطة بيع سريعة (POS) غير محدودة',
        'طباعة إيصالات حرارية 80mm وفواتير A4',
        'إدارة المخزون والتنبيهات المتقدمة',
        'تقارير المبيعات والأرباح والورديات',
        'دعم فني عبر واتساب 24/7',
      ],
      limits: {
        maxProducts: plan.maxProducts || 10000,
        maxBranches: plan.maxBranches || 3,
        maxUsers: plan.maxUsers || 5,
      },
      usage: {
        products: products.length,
        maxProducts: plan.maxProducts || 10000,
        branches: 1,
        maxBranches: plan.maxBranches || 3,
        users: 2,
        maxUsers: plan.maxUsers || 5,
      },
      createdAt: startDate,
      updatedAt: now.toISOString(),
    };
  },

  getSubscriptions(params?: { page?: number; limit?: number }) {
    const tenants = getStore<MockTenant>('tenants', DEFAULT_TENANTS);
    const plans = getStore<MockPlan>('plans', DEFAULT_PLANS);
    const subs = tenants.map((t) => {
      const plan = plans.find((p) => p.id === t.planId) || plans[0];
      const now = new Date();
      const endDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
      return {
        id: `sub-${t.id}`,
        tenantId: t.id,
        tenantName: t.nameAr || t.name,
        planId: plan?.id || 'plan-pro',
        planName: plan?.nameAr || plan?.name || 'الباقة المتقدمة',
        status: t.subscriptionStatus || 'ACTIVE',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate,
        daysRemaining: 15,
        billingAmount: plan?.monthlyPrice || 500,
        autoRenew: true,
      };
    });
    return { data: subs, total: subs.length, page: 1, limit: 50, totalPages: 1 };
  },

  renewSubscription(id: string) {
    return this.getCurrentSubscription();
  },

  // ─── Tickets (تذاكر الدعم الفني) ──────────────────────────────
  getTickets(params?: { page?: number; limit?: number; search?: string }) {
    let items = getStore<MockTicket>('tickets', DEFAULT_TICKETS);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.ticketNumber.toLowerCase().includes(q) ||
          (t.tenantName && t.tenantName.toLowerCase().includes(q))
      );
    }
    const total = items.length;
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const start = (page - 1) * limit;
    return { data: items.slice(start, start + limit), total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  getTicket(id: string): MockTicket {
    const items = getStore<MockTicket>('tickets', DEFAULT_TICKETS);
    return items.find((t) => t.id === id || t.ticketNumber === id) || (items[0] as MockTicket) || (DEFAULT_TICKETS[0] as MockTicket);
  },

  updateTicket(id: string, payload: any): MockTicket {
    const items = getStore<MockTicket>('tickets', DEFAULT_TICKETS);
    const idx = items.findIndex((t) => t.id === id || t.ticketNumber === id);
    if (idx === -1 || !items[idx]) throw new Error('Ticket not found');
    const current = items[idx] as MockTicket;
    const updated = { ...current, ...payload, id: current.id, updatedAt: new Date().toISOString() };
    items[idx] = updated;
    setStore('tickets', items);
    return updated;
  },

  addTicketMessage(id: string, payload: { message: string }): MockTicket {
    const items = getStore<MockTicket>('tickets', DEFAULT_TICKETS);
    const idx = items.findIndex((t) => t.id === id || t.ticketNumber === id);
    if (idx === -1 || !items[idx]) throw new Error('Ticket not found');
    const current = items[idx] as MockTicket;
    current.messages.push({
      id: `msg-${Date.now()}`,
      senderName: 'المشرف العام (الدعم)',
      senderRole: 'SUPER_ADMIN',
      message: payload.message,
      createdAt: new Date().toISOString(),
    });
    current.updatedAt = new Date().toISOString();
    items[idx] = current;
    setStore('tickets', items);
    return current;
  },

  // ─── Super Admin Dashboard (لوحة المشرف العام) ────────────────
  getAdminDashboard() {
    const tenants = getStore<MockTenant>('tenants', DEFAULT_TENANTS);
    const tickets = getStore<MockTicket>('tickets', DEFAULT_TICKETS);
    const plans = getStore<MockPlan>('plans', DEFAULT_PLANS);

    const activeCount = tenants.filter((t) => t.isActive).length;
    const monthlyRev = tenants.reduce((sum, t) => {
      const plan = plans.find((p) => p.id === t.planId);
      return sum + (plan?.monthlyPrice || 500);
    }, 0);

    return {
      totalTenants: tenants.length,
      activeSubscriptions: activeCount,
      monthlyRevenue: monthlyRev,
      totalUsers: tenants.length * 3 + 2,
      revenueTrend: [
        { month: 'أبريل', revenue: 1400 },
        { month: 'مايو', revenue: 1850 },
        { month: 'يونيو', revenue: 2100 },
        { month: 'يوليو', revenue: 2450 },
        { month: 'أغسطس', revenue: 2600 },
        { month: 'سبتمبر', revenue: monthlyRev },
      ],
      tenantsGrowth: [
        { month: 'أبريل', count: 1 },
        { month: 'مايو', count: 2 },
        { month: 'يونيو', count: 2 },
        { month: 'يوليو', count: 3 },
        { month: 'أغسطس', count: 3 },
        { month: 'سبتمبر', count: tenants.length },
      ],
      recentTenants: tenants.slice(0, 5),
      recentTickets: tickets.slice(0, 5),
      systemHealth: {
        cpu: { percent: 14 },
        memory: { used: 1200 * 1024 * 1024, total: 4096 * 1024 * 1024, percent: 29 },
        disk: { used: 18 * 1024 * 1024 * 1024, total: 100 * 1024 * 1024 * 1024, percent: 18 },
      },
    };
  },

  getAdminSettings() {
    return {
      defaultLanguage: 'ar',
      defaultCurrency: 'EGP',
      maintenanceMode: false,
      rateLimitEnabled: true,
      rateLimitRequests: 100,
      rateLimitWindow: 15,
      smtpHost: 'smtp.smartpos.eg',
      smtpPort: 587,
      smtpUser: 'support@smartpos.eg',
      smtpFrom: 'Smart POS Cloud <support@smartpos.eg>',
      emailEnabled: true,
      posEnabled: true,
      inventoryEnabled: true,
      accountingEnabled: true,
      reportsEnabled: true,
      apiEnabled: true,
      webhooksEnabled: true,
      loyaltyEnabled: true,
      giftCardsEnabled: true,
      couponsEnabled: true,
      promotionsEnabled: true,
      multiBranchEnabled: true,
      multiWarehouseEnabled: true,
    };
  },

  // ─── Shifts (الورديات وتقفيل الدرج) ──────────────────────────
  saveCurrentShift(shift: MockShift) {
    const shifts = getStore<MockShift>('shifts', []);
    const idx = shifts.findIndex((s) => s.id === shift.id || s.status === 'OPEN');
    if (idx !== -1) {
      shifts[idx] = shift;
    } else {
      shifts.unshift(shift);
    }
    setStore('shifts', shifts);
    localStorage.setItem(`${STORAGE_PREFIX}current_shift`, JSON.stringify(shift));
  },

  getCurrentShift() {
    const shifts = getStore<MockShift>('shifts', []);
    const active = shifts.find((s) => s.status === 'OPEN');
    if (!active) return null;

    // Calculate current sales from invoices since openedAt
    const invoices = getStore<any>('invoices', []);
    const shiftStartTime = active.openedAt || active.startTime || new Date().toISOString();
    const shiftInvoices = invoices.filter((inv) => new Date(inv.createdAt || inv.invoiceDate).getTime() >= new Date(shiftStartTime).getTime());
    const cashSales = shiftInvoices
      .filter((inv) => inv.paymentMethod === 'cash' || !inv.paymentMethod || (inv.payments && inv.payments.some((p: any) => p.method === 'cash')))
      .reduce((sum, inv) => sum + (Number(inv.totalAmount) || Number(inv.total) || 0), 0);
    const cardSales = shiftInvoices
      .filter((inv) => inv.paymentMethod === 'card' || inv.paymentMethod === 'instapay' || (inv.payments && inv.payments.some((p: any) => p.method !== 'cash')))
      .reduce((sum, inv) => sum + (Number(inv.totalAmount) || Number(inv.total) || 0), 0);
    const totalSales = cashSales + cardSales;
    const totalExpenses = (active.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const expectedCash = (Number(active.openingCash) || 0) + cashSales - totalExpenses;

    const summary = {
      shiftId: active.id,
      shiftNumber: active.shiftNumber,
      cashierName: active.cashierName,
      openedAt: active.openedAt,
      openingCash: Number(active.openingCash) || 0,
      cashSales,
      cardSales,
      totalSales,
      totalOrders: shiftInvoices.length,
      totalExpenses,
      expectedCash,
    };

    return {
      ...active,
      cashSales,
      cardSales,
      totalSales,
      totalOrders: shiftInvoices.length,
      totalExpenses,
      expectedCash,
      summary,
    };
  },

  openShift(payload: { openingCash: number; branchId?: string; notes?: string }) {
    const shifts = getStore<MockShift>('shifts', []);
    const existing = shifts.find((s) => s.status === 'OPEN');
    if (existing) {
      return existing;
    }
    const newShift: MockShift = {
      id: `shift-${Date.now()}`,
      shiftNumber: `SH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${(shifts.length + 1).toString().padStart(2, '0')}`,
      cashierId: 'user-1',
      cashierName: 'أحمد محمود (الكاشير)',
      branchId: payload.branchId || 'branch-1',
      openedAt: new Date().toISOString(),
      status: 'OPEN',
      openingCash: Number(payload.openingCash) || 0,
      expectedCash: Number(payload.openingCash) || 0,
      cashSales: 0,
      cardSales: 0,
      totalSales: 0,
      totalOrders: 0,
      expenses: [],
      totalExpenses: 0,
      notes: payload.notes || '',
      startTime: new Date().toISOString(),
      openingBalance: Number(payload.openingCash) || 0,
      invoiceCount: 0,
    };
    shifts.unshift(newShift);
    setStore('shifts', shifts);
    return newShift;
  },

  closeShift(id: string, payload: { actualCash: number; closingNote?: string }) {
    const shifts = getStore<MockShift>('shifts', []);
    const idx = shifts.findIndex((s) => s.id === id || s.status === 'OPEN');
    if (idx === -1 || !shifts[idx]) {
      throw new Error('Shift not found');
    }
    const current = shifts[idx] as MockShift;
    const currentCalc = this.getCurrentShift();
    const expectedCash = (currentCalc ? currentCalc.expectedCash : (current.openingCash ?? current.openingBalance ?? 0)) ?? 0;
    const actualCash = Number(payload.actualCash) || 0;
    const difference = actualCash - expectedCash;

    const closed: MockShift = {
      ...current,
      actualCash,
      difference,
      closedAt: new Date().toISOString(),
      status: 'CLOSED',
      closingNote: payload.closingNote || '',
      cashSales: currentCalc?.cashSales || 0,
      cardSales: currentCalc?.cardSales || 0,
      totalSales: currentCalc?.totalSales || 0,
      totalOrders: currentCalc?.totalOrders || 0,
      expectedCash,
      summary: currentCalc?.summary || {},
    };
    shifts[idx] = closed;
    setStore('shifts', shifts);
    return closed;
  },

  addExpense(id: string, payload: { amount: number; category: string; description?: string }) {
    const shifts = getStore<MockShift>('shifts', []);
    const idx = shifts.findIndex((s) => s.id === id || s.status === 'OPEN');
    if (idx === -1 || !shifts[idx]) {
      throw new Error('Shift not found');
    }
    const current = shifts[idx] as MockShift;
    const expenseItem = {
      id: `exp-${Date.now()}`,
      amount: Number(payload.amount) || 0,
      category: payload.category || 'نثريات',
      description: payload.description || '',
      time: new Date().toISOString(),
    };
    current.expenses = current.expenses || [];
    current.expenses.push(expenseItem);
    current.totalExpenses = current.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    shifts[idx] = current;
    setStore('shifts', shifts);
    return current;
  },

  getShiftSummary(id: string) {
    const shifts = getStore<MockShift>('shifts', []);
    const shift = shifts.find((s) => s.id === id);
    if (!shift) return null;
    return shift.summary || shift;
  },

  getShifts(params?: { page?: number; limit?: number }) {
    const shifts = getStore<MockShift>('shifts', []);
    return { data: shifts, total: shifts.length, page: 1, limit: 50, totalPages: 1 };
  },

  // ─── Backups (النسخ الاحتياطي) ────────────────────────────────
  getBackups() {
    const backups = getStore<MockBackup>('backups', [
      {
        id: 'bak-prev-1',
        fileName: 'smartpos-backup-2026-09-01.json',
        fileSize: 145000,
        status: 'COMPLETED',
        createdAt: '2026-09-01T12:00:00.000Z',
      },
    ]);
    return { data: backups, total: backups.length };
  },

  createBackup() {
    const backups = getStore<MockBackup>('backups', []);
    const snapshot = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      storeName: 'متجر الأمل الذكي',
      products: getStore('products', DEFAULT_PRODUCTS),
      categories: getStore('categories', DEFAULT_CATEGORIES),
      customers: getStore('customers', DEFAULT_CUSTOMERS),
      suppliers: getStore('suppliers', DEFAULT_SUPPLIERS),
      invoices: getStore('invoices', []),
      shifts: getStore('shifts', []),
      users: getStore('store_users', DEFAULT_USERS),
      settings: this.getTenantSettings(),
    };
    const jsonStr = JSON.stringify(snapshot, null, 2);
    const size = new Blob([jsonStr]).size;
    const newBackup: MockBackup = {
      id: `bak-${Date.now()}`,
      fileName: `smartpos-backup-${new Date().toISOString().slice(0, 10)}.json`,
      fileSize: size,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      snapshotData: jsonStr,
    };
    backups.unshift(newBackup);
    setStore('backups', backups);
    return newBackup;
  },

  deleteBackup(id: string) {
    const backups = getStore<MockBackup>('backups', []);
    setStore('backups', backups.filter((b) => b.id !== id));
    return true;
  },

  restoreBackup(jsonString: string) {
    try {
      const data = JSON.parse(jsonString);
      if (data.products && Array.isArray(data.products)) setStore('products', data.products);
      if (data.categories && Array.isArray(data.categories)) setStore('categories', data.categories);
      if (data.customers && Array.isArray(data.customers)) setStore('customers', data.customers);
      if (data.suppliers && Array.isArray(data.suppliers)) setStore('suppliers', data.suppliers);
      if (data.invoices && Array.isArray(data.invoices)) setStore('invoices', data.invoices);
      if (data.shifts && Array.isArray(data.shifts)) setStore('shifts', data.shifts);
      if (data.users && Array.isArray(data.users)) setStore('store_users', data.users);
      return { success: true, message: 'تم استعادة كافة البيانات بنجاح' };
    } catch {
      throw new Error('ملف النسخة الاحتياطية غير صالح');
    }
  },

  // ─── Users (كاشيرات وموظفي المتجر) ───────────────────────────
  getUsers(params?: { page?: number; limit?: number; search?: string; role?: string }) {
    let users = getStore<MockUser>('store_users', DEFAULT_USERS);
    if (params?.search) {
      const q = params.search.toLowerCase();
      users = users.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone && u.phone.includes(q)));
    }
    if (params?.role) {
      users = users.filter((u) => u.role === params.role);
    }
    const total = users.length;
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const start = (page - 1) * limit;
    return { data: users.slice(start, start + limit), total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  getUser(id: string) {
    const users = getStore<MockUser>('store_users', DEFAULT_USERS);
    return users.find((u) => u.id === id) || null;
  },

  createUser(payload: any): MockUser {
    const users = getStore<MockUser>('store_users', DEFAULT_USERS);
    const newUser: MockUser = {
      id: `user-${Date.now()}`,
      fullName: payload.fullName || payload.name || 'موظف جديد',
      email: payload.email || `user${Date.now().toString().slice(-4)}@smartpos.local`,
      phone: payload.phone || '',
      role: payload.role || 'CASHIER',
      branchId: payload.branchId || 'branch-1',
      branchName: 'فرع المعادي الرئيسي',
      isActive: payload.isActive !== false,
      permissions: payload.permissions || ['pos.create_sale', 'pos.apply_discount', 'nav.pos'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users.unshift(newUser);
    setStore('store_users', users);
    return newUser;
  },

  updateUser(id: string, payload: any): MockUser {
    const users = getStore<MockUser>('store_users', DEFAULT_USERS);
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1 || !users[idx]) throw new Error('User not found');
    const updated: MockUser = {
      ...users[idx]!,
      ...payload,
      id,
      updatedAt: new Date().toISOString(),
    };
    users[idx] = updated;
    setStore('store_users', users);
    return updated;
  },

  deleteUser(id: string): boolean {
    const users = getStore<MockUser>('store_users', DEFAULT_USERS);
    setStore('store_users', users.filter((u) => u.id !== id));
    return true;
  },

  updateUserPermissions(id: string, permissions: string[]): MockUser {
    const users = getStore<MockUser>('store_users', DEFAULT_USERS);
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1 || !users[idx]) throw new Error('User not found');
    users[idx]!.permissions = permissions;
    users[idx]!.updatedAt = new Date().toISOString();
    setStore('store_users', users);
    return users[idx]!;
  },

  toggleUserActive(id: string): MockUser {
    const users = getStore<MockUser>('store_users', DEFAULT_USERS);
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1 || !users[idx]) throw new Error('User not found');
    users[idx]!.isActive = !users[idx]!.isActive;
    users[idx]!.updatedAt = new Date().toISOString();
    setStore('store_users', users);
    return users[idx]!;
  },

  // ─── Coupons (الكوبونات والخصومات) ───────────────────────────
  getCoupons() {
    const items = getStore<MockCoupon>('coupons', DEFAULT_COUPONS);
    return { data: items, total: items.length };
  },

  validateCoupon(code: string, orderAmount = 0) {
    const items = getStore<MockCoupon>('coupons', DEFAULT_COUPONS);
    const normalized = (code || '').trim().toUpperCase();
    const coupon = items.find((c) => c.code.toUpperCase() === normalized && c.isActive);

    if (!coupon) {
      throw new Error('كود الخصم غير صحيح أو منتهي الصلاحية');
    }
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      throw new Error(`الحد الأدنى لتطبيق هذا الكوبون هو ${coupon.minOrderAmount} ج.م`);
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (orderAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      discountAmount = Math.min(orderAmount, coupon.discountValue);
    }

    return {
      valid: true,
      coupon,
      discountAmount: Math.round(discountAmount * 100) / 100,
      message: `تم تطبيق كود الخصم (${coupon.code}) بنجاح!`,
    };
  },

  createCoupon(payload: any): MockCoupon {
    const items = getStore<MockCoupon>('coupons', DEFAULT_COUPONS);
    const newCoupon: MockCoupon = {
      id: `coup-${Date.now()}`,
      code: (payload.code || 'DISCOUNT').toUpperCase(),
      discountType: payload.discountType || 'percentage',
      discountValue: Number(payload.discountValue) || 10,
      maxDiscount: payload.maxDiscount ? Number(payload.maxDiscount) : undefined,
      minOrderAmount: payload.minOrderAmount ? Number(payload.minOrderAmount) : undefined,
      usageLimit: payload.usageLimit ? Number(payload.usageLimit) : 100,
      usageCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    items.unshift(newCoupon);
    setStore('coupons', items);
    return newCoupon;
  },

  deleteCoupon(id: string) {
    const items = getStore<MockCoupon>('coupons', DEFAULT_COUPONS);
    setStore('coupons', items.filter((c) => c.id !== id));
    return true;
  },

  // ─── 7. Returns & Refunds (مرتجعات المبيعات) ────────────────
  returnInvoice(id: string, payload?: { items?: Array<{ productId: string; quantity: number }>; reason?: string }) {
    const invoices = getStore<MockInvoice>('invoices', []);
    const inv = invoices.find((i) => i.id === id || i.invoiceNumber === id);
    if (!inv) throw new Error('Invoice not found');

    const products = getStore<MockProduct>('products', DEFAULT_PRODUCTS);
    const returnItems = payload?.items && payload.items.length > 0 ? payload.items : inv.items;

    returnItems.forEach((ri: any) => {
      const prod = products.find((p) => p.id === ri.productId);
      if (prod) {
        const before = prod.stock;
        prod.stock += (Number(ri.quantity) || 1);
        this.addStockMovement({
          productId: prod.id,
          productName: prod.nameAr || prod.name,
          sku: prod.sku,
          warehouseId: 'wh-main',
          warehouseName: 'المخزن الرئيسي',
          type: 'RETURN',
          quantity: Number(ri.quantity) || 1,
          beforeQuantity: before,
          afterQuantity: prod.stock,
          reference: inv.invoiceNumber,
          notes: payload?.reason || 'مرتجع مبيعات',
        });
      }
    });
    setStore('products', products);

    inv.status = 'refunded';
    (inv as any).refundedAt = new Date().toISOString();
    setStore('invoices', invoices);

    // Adjust shift sales if open
    const currentShift = this.getCurrentShift();
    if (currentShift && currentShift.status === 'OPEN') {
      currentShift.cashSales = Math.max(0, currentShift.cashSales - (inv.totalAmount || inv.total || 0));
      currentShift.totalSales = Math.max(0, currentShift.totalSales - (inv.totalAmount || inv.total || 0));
      this.saveCurrentShift(currentShift);
    }

    return inv;
  },

  cancelInvoice(id: string) {
    const invoices = getStore<MockInvoice>('invoices', []);
    const inv = invoices.find((i) => i.id === id || i.invoiceNumber === id);
    if (!inv) throw new Error('Invoice not found');

    const products = getStore<MockProduct>('products', DEFAULT_PRODUCTS);
    inv.items.forEach((item: any) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        const before = prod.stock;
        prod.stock += (Number(item.quantity) || 1);
        this.addStockMovement({
          productId: prod.id,
          productName: prod.nameAr || prod.name,
          sku: prod.sku,
          warehouseId: 'wh-main',
          warehouseName: 'المخزن الرئيسي',
          type: 'RETURN',
          quantity: Number(item.quantity) || 1,
          beforeQuantity: before,
          afterQuantity: prod.stock,
          reference: inv.invoiceNumber,
          notes: 'إلغاء فاتورة بيع بالكامل',
        });
      }
    });
    setStore('products', products);

    inv.status = 'cancelled';
    setStore('invoices', invoices);
    return inv;
  },

  // ─── 8. Loyalty Points (برنامج ولاء العملاء) ──────────────────
  earnLoyaltyPoints(customerId: string, points: number, description?: string) {
    const customers = getStore<MockCustomer>('customers', DEFAULT_CUSTOMERS);
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) throw new Error('Customer not found');
    cust.loyaltyPoints = (cust.loyaltyPoints || 0) + Number(points);
    if (cust.loyaltyPoints >= 5000) cust.tier = 'PLATINUM';
    else if (cust.loyaltyPoints >= 2000) cust.tier = 'GOLD';
    else if (cust.loyaltyPoints >= 500) cust.tier = 'SILVER';
    setStore('customers', customers);
    return { success: true, customer: cust, newPoints: cust.loyaltyPoints, description };
  },

  redeemLoyaltyPoints(customerId: string, points: number, description?: string) {
    const customers = getStore<MockCustomer>('customers', DEFAULT_CUSTOMERS);
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) throw new Error('Customer not found');
    const currentPoints = cust.loyaltyPoints || 0;
    if (currentPoints < points) {
      throw new Error(`رصيد النقاط غير كافٍ (المتوفر: ${currentPoints} نقطة)`);
    }
    cust.loyaltyPoints = currentPoints - Number(points);
    const discountValue = points / 10; // 10 points = 1 EGP
    setStore('customers', customers);
    return { success: true, customer: cust, redeemedPoints: points, discountValue, remainingPoints: cust.loyaltyPoints, description };
  },

  // ─── 9. Inventory Movements & Adjustments (المخزون والحركات) ───
  addStockMovement(data: Omit<MockStockMovement, 'id' | 'createdAt'>) {
    const movements = getStore<MockStockMovement>('stock_movements', []);
    const newMovement: MockStockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      userName: 'مدير المتجر',
      ...data,
    };
    movements.unshift(newMovement);
    setStore('stock_movements', movements);
    return newMovement;
  },

  getStock(params?: { page?: number; limit?: number; search?: string; warehouseId?: string }) {
    const products = getStore<MockProduct>('products', DEFAULT_PRODUCTS);
    let items = products.map((p) => ({
      id: `stock-${p.id}`,
      productId: p.id,
      productName: p.nameAr || p.name,
      sku: p.sku,
      barcode: p.barcode,
      currentStock: p.stock,
      quantity: p.stock,
      minStock: p.minStock || 10,
      maxStock: (p.minStock || 10) * 10,
      warehouseId: 'wh-main',
      warehouseName: 'المخزن الرئيسي',
      unitPrice: p.sellingPrice,
      costPrice: p.costPrice,
      lastUpdated: p.updatedAt || p.createdAt,
    }));

    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter((s) => s.productName.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q));
    }

    const page = params?.page || 1;
    const limit = params?.limit || 25;
    const start = (page - 1) * limit;
    return { data: items.slice(start, start + limit), total: items.length, page, limit, totalPages: Math.ceil(items.length / limit) || 1 };
  },

  getMovements(params?: { page?: number; limit?: number; search?: string }) {
    let movements = getStore<MockStockMovement>('stock_movements', []);
    if (movements.length === 0) {
      movements = [
        {
          id: 'mov-init-1',
          productId: 'prod-1',
          productName: 'أرز مصري فاخر 1 كجم',
          sku: 'RICE-001',
          warehouseId: 'wh-main',
          warehouseName: 'المخزن الرئيسي',
          type: 'PURCHASE',
          quantity: 150,
          beforeQuantity: 0,
          afterQuantity: 150,
          reference: 'PO-2026-001',
          userName: 'مدير المتجر',
          createdAt: '2026-09-10T10:00:00.000Z',
        },
        {
          id: 'mov-init-2',
          productId: 'prod-2',
          productName: 'زيت عباد الشمس 800 مل',
          sku: 'OIL-002',
          warehouseId: 'wh-main',
          warehouseName: 'المخزن الرئيسي',
          type: 'PURCHASE',
          quantity: 80,
          beforeQuantity: 0,
          afterQuantity: 80,
          reference: 'PO-2026-001',
          userName: 'مدير المتجر',
          createdAt: '2026-09-10T10:30:00.000Z',
        },
      ];
      setStore('stock_movements', movements);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      movements = movements.filter((m) => m.productName.toLowerCase().includes(q) || (m.reference && m.reference.toLowerCase().includes(q)));
    }

    const page = params?.page || 1;
    const limit = params?.limit || 25;
    const start = (page - 1) * limit;
    return { data: movements.slice(start, start + limit), total: movements.length, page, limit, totalPages: Math.ceil(movements.length / limit) || 1 };
  },

  adjustStock(payload: { productId: string; warehouseId: string; quantity: number; type: 'in' | 'out'; reason?: string }) {
    const products = getStore<MockProduct>('products', DEFAULT_PRODUCTS);
    const prod = products.find((p) => p.id === payload.productId);
    if (!prod) throw new Error('Product not found');
    const before = prod.stock;
    const delta = payload.type === 'in' ? Number(payload.quantity) : -Number(payload.quantity);
    prod.stock = Math.max(0, prod.stock + delta);
    setStore('products', products);

    const mov = this.addStockMovement({
      productId: prod.id,
      productName: prod.nameAr || prod.name,
      sku: prod.sku,
      warehouseId: payload.warehouseId || 'wh-main',
      warehouseName: 'المخزن الرئيسي',
      type: 'ADJUSTMENT',
      quantity: Number(payload.quantity),
      beforeQuantity: before,
      afterQuantity: prod.stock,
      notes: payload.reason || (payload.type === 'in' ? 'إذن إضافة رصيد تسوية' : 'إذن صرف / عجز جرد'),
    });

    return { success: true, product: prod, movement: mov };
  },

  transferStock(payload: { productId: string; fromWarehouseId: string; toWarehouseId: string; quantity: number; reason?: string }) {
    const products = getStore<MockProduct>('products', DEFAULT_PRODUCTS);
    const prod = products.find((p) => p.id === payload.productId);
    if (!prod) throw new Error('Product not found');

    const mov = this.addStockMovement({
      productId: prod.id,
      productName: prod.nameAr || prod.name,
      sku: prod.sku,
      warehouseId: payload.toWarehouseId,
      warehouseName: 'مخزن الفرع المحول إليه',
      type: 'TRANSFER',
      quantity: Number(payload.quantity),
      beforeQuantity: prod.stock,
      afterQuantity: prod.stock,
      notes: payload.reason || 'تحويل مخزني بين الفروع',
    });

    return { success: true, movement: mov };
  },

  getWarehouses() {
    return {
      data: [
        { id: 'wh-main', name: 'المخزن الرئيسي (التحرير)', code: 'WH-01', isDefault: true, address: 'وسط البلد، القاهرة' },
        { id: 'wh-branch2', name: 'مخزن فرع مدينة نصر', code: 'WH-02', isDefault: false, address: 'مكرم عبيد، القاهرة' },
      ],
      total: 2,
    };
  },

  // ─── 10. Gift Cards (بطاقات الهدايا) ─────────────────────────
  getGiftCards() {
    const cards = getStore<MockGiftCard>('gift_cards', [
      { id: 'gc-1', code: 'GIFT-100', name: 'قسيمة مشتريات 100 ج.م', balance: 100, initialBalance: 100, isActive: true, createdAt: '2026-09-01T10:00:00.000Z' },
      { id: 'gc-2', code: 'GIFT-250', name: 'قسيمة هدية عميل مميز 250 ج.م', balance: 250, initialBalance: 250, isActive: true, createdAt: '2026-09-01T10:00:00.000Z' },
    ]);
    return { data: cards, total: cards.length };
  },

  validateGiftCard(code: string) {
    const cards = getStore<MockGiftCard>('gift_cards', [
      { id: 'gc-1', code: 'GIFT-100', name: 'قسيمة مشتريات 100 ج.م', balance: 100, initialBalance: 100, isActive: true, createdAt: '2026-09-01T10:00:00.000Z' },
      { id: 'gc-2', code: 'GIFT-250', name: 'قسيمة هدية عميل مميز 250 ج.م', balance: 250, initialBalance: 250, isActive: true, createdAt: '2026-09-01T10:00:00.000Z' },
    ]);
    const cleanCode = (code || '').trim().toUpperCase();
    const card = cards.find((c) => c.code.toUpperCase() === cleanCode && c.isActive);
    if (!card) {
      return { valid: false, balance: 0, code: cleanCode, message: 'بطاقة الهدية غير موجودة أو غير نشطة' };
    }
    if (card.balance <= 0) {
      return { valid: false, balance: 0, code: cleanCode, message: 'رصيد بطاقة الهدية منتهي (0 ج.م)' };
    }
    return { valid: true, balance: card.balance, code: card.code, message: 'بطاقة صالحة ومفعلة' };
  },

  issueGiftCard(customerId?: string, payload?: { initialBalance: number; name?: string; expiryDate?: string }) {
    const cards = getStore<MockGiftCard>('gift_cards', []);
    const amount = Number(payload?.initialBalance) || 100;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `GIFT-${randomSuffix}`;

    const newCard: MockGiftCard = {
      id: `gc-${Date.now()}`,
      code,
      name: payload?.name || `بطاقة هدية ${amount} ج.م`,
      balance: amount,
      initialBalance: amount,
      customerId,
      isActive: true,
      expiryDate: payload?.expiryDate,
      createdAt: new Date().toISOString(),
    };
    cards.unshift(newCard);
    setStore('gift_cards', cards);
    return newCard;
  },

  deductGiftCardBalance(code: string, amount: number) {
    const cards = getStore<MockGiftCard>('gift_cards', []);
    const card = cards.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
    if (card) {
      card.balance = Math.max(0, card.balance - amount);
      setStore('gift_cards', cards);
    }
  },
};
