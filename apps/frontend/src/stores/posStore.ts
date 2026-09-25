import { create } from 'zustand';

export interface Product {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  sku: string;
  barcode?: string;
  image?: string;
  categoryId?: string;
  categoryName?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  isActive: boolean;
  hasExpiry: boolean;
  hasVariants: boolean;
  stock?: number;
  minStock?: number;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  taxRate: number;
  variant?: {
    id: string;
    name: string;
    value: string;
  };
  note?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  loyaltyPoints?: number;
  creditLimit?: number;
  balance?: number;
}

export interface Payment {
  id: string;
  method: 'cash' | 'instapay' | 'card' | 'credit' | 'wallet' | 'giftCard' | 'bankTransfer';
  amount: number;
  reference?: string;
  note?: string;
  cardNumber?: string;
  giftCardCode?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
}

export interface GiftCard {
  id: string;
  code: string;
  balance: number;
  isActive: boolean;
}

export interface LocalHeldInvoice {
  id: string;
  invoiceNumber: string;
  cart: CartItem[];
  customer: Customer | null;
  deliveryFee: number;
  invoiceDiscount: number;
  invoiceDiscountType: 'percentage' | 'fixed';
  note?: string;
  heldAt: string;
  total: number;
}

export interface CartTotals {
  subtotal: number;
  itemDiscounts: number;
  invoiceDiscountAmount: number;
  couponDiscountAmount: number;
  totalDiscount: number;
  taxableAmount: number;
  totalTax: number;
  deliveryFee: number;
  grandTotal: number;
  totalPaid: number;
  balance: number;
  change: number;
}

interface POSState {
  cart: CartItem[];
  selectedCustomer: Customer | null;
  appliedCoupon: Coupon | null;
  appliedGiftCard: GiftCard | null;
  payments: Payment[];
  heldInvoiceId: string | null;
  heldInvoices: LocalHeldInvoice[];
  deliveryFee: number;
  invoiceDiscount: number;
  invoiceDiscountType: 'percentage' | 'fixed';
  isScanning: boolean;
  searchQuery: string;
  selectedCategory: string | null;
  quickKeys: Product[];
  isProcessing: boolean;
}

interface POSActions {
  addToCart: (product: Product, quantity?: number, variant?: CartItem['variant'], note?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateDiscount: (itemId: string, discount: number, discountType: 'percentage' | 'fixed') => void;
  updateItemNote: (itemId: string, note: string) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer | null) => void;
  setCoupon: (coupon: Coupon | null) => void;
  removeCoupon: () => void;
  setGiftCard: (giftCard: GiftCard | null) => void;
  removeGiftCard: () => void;
  setDeliveryFee: (fee: number) => void;
  setInvoiceDiscount: (discount: number, type: 'percentage' | 'fixed') => void;
  addPayment: (payment: Payment) => void;
  removePayment: (paymentId: string) => void;
  clearPayments: () => void;
  setScanning: (scanning: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  setQuickKeys: (products: Product[]) => void;
  setProcessing: (processing: boolean) => void;
  holdCurrentInvoice: (note?: string) => string | null;
  resumeHeldInvoice: (id: string) => boolean;
  deleteHeldInvoice: (id: string) => void;
  clearHeldInvoice: () => void;
  calculateTotals: () => CartTotals;
}

type POSStore = POSState & POSActions;

function getInitialHeldInvoices(): LocalHeldInvoice[] {
  try {
    const raw = localStorage.getItem('smartpos_held_invoices');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHeldInvoicesToStorage(items: LocalHeldInvoice[]) {
  try {
    localStorage.setItem('smartpos_held_invoices', JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save held invoices', e);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function calculateItemDiscount(item: CartItem): number {
  const lineTotal = item.unitPrice * item.quantity;
  if (item.discountType === 'percentage') {
    const pct = Math.max(0, Math.min(100, item.discount || 0));
    return Math.round(((lineTotal * pct) / 100) * 100) / 100;
  }
  return Math.min(lineTotal, Math.max(0, item.discount || 0));
}

export function calculateItemTax(item: CartItem): number {
  const lineTotal = item.unitPrice * item.quantity;
  const afterDiscount = Math.max(0, lineTotal - calculateItemDiscount(item));
  const rate = typeof item.taxRate === 'number' ? item.taxRate : 14;
  return Math.round(((afterDiscount * rate) / 100) * 100) / 100;
}

export const usePOSStore = create<POSStore>((set, get) => ({
  cart: [],
  selectedCustomer: null,
  appliedCoupon: null,
  appliedGiftCard: null,
  payments: [],
  heldInvoiceId: null,
  heldInvoices: getInitialHeldInvoices(),
  deliveryFee: 0,
  invoiceDiscount: 0,
  invoiceDiscountType: 'fixed',
  isScanning: true,
  searchQuery: '',
  selectedCategory: null,
  quickKeys: [],
  isProcessing: false,

  addToCart: (product: Product, quantity = 1, variant?: CartItem['variant'], note?: string) => {
    const { cart } = get();
    const existingIndex = cart.findIndex(
      (item) =>
        item.product.id === product.id &&
        item.variant?.id === variant?.id
    );

    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex]!,
        quantity: updatedCart[existingIndex]!.quantity + quantity,
        note: note || updatedCart[existingIndex]!.note,
      };
      set({ cart: updatedCart });
    } else {
      const newItem: CartItem = {
        id: generateId(),
        product,
        quantity,
        unitPrice: product.sellingPrice,
        discount: 0,
        discountType: 'fixed',
        taxRate: typeof product.taxRate === 'number' ? product.taxRate : 14,
        variant,
        note,
      };
      set({ cart: [...cart, newItem] });
    }
  },

  removeFromCart: (itemId: string) => {
    const { cart } = get();
    set({ cart: cart.filter((item) => item.id !== itemId) });
  },

  updateQuantity: (itemId: string, quantity: number) => {
    const { cart } = get();
    if (quantity <= 0) {
      set({ cart: cart.filter((item) => item.id !== itemId) });
      return;
    }
    const updatedCart = cart.map((item) =>
      item.id === itemId ? { ...item, quantity } : item
    );
    set({ cart: updatedCart });
  },

  updateDiscount: (itemId: string, discount: number, discountType: 'percentage' | 'fixed') => {
    const { cart } = get();
    const updatedCart = cart.map((item) =>
      item.id === itemId ? { ...item, discount, discountType } : item
    );
    set({ cart: updatedCart });
  },

  updateItemNote: (itemId: string, note: string) => {
    const { cart } = get();
    const updatedCart = cart.map((item) =>
      item.id === itemId ? { ...item, note } : item
    );
    set({ cart: updatedCart });
  },

  clearCart: () => {
    set({
      cart: [],
      selectedCustomer: null,
      appliedCoupon: null,
      appliedGiftCard: null,
      payments: [],
      heldInvoiceId: null,
      deliveryFee: 0,
      invoiceDiscount: 0,
    });
  },

  setCustomer: (customer: Customer | null) => {
    set({ selectedCustomer: customer });
  },

  setCoupon: (coupon: Coupon | null) => {
    set({ appliedCoupon: coupon });
  },

  removeCoupon: () => {
    set({ appliedCoupon: null });
  },

  setGiftCard: (giftCard: GiftCard | null) => {
    set({ appliedGiftCard: giftCard });
  },

  removeGiftCard: () => {
    set({ appliedGiftCard: null });
  },

  setDeliveryFee: (fee: number) => {
    set({ deliveryFee: Math.max(0, fee || 0) });
  },

  setInvoiceDiscount: (discount: number, type: 'percentage' | 'fixed') => {
    set({ invoiceDiscount: Math.max(0, discount || 0), invoiceDiscountType: type });
  },

  addPayment: (payment: Payment) => {
    set((state) => ({ payments: [...state.payments, payment] }));
  },

  removePayment: (paymentId: string) => {
    const { payments } = get();
    set({ payments: payments.filter((p) => p.id !== paymentId) });
  },

  clearPayments: () => {
    set({ payments: [] });
  },

  setScanning: (scanning: boolean) => {
    set({ isScanning: scanning });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSelectedCategory: (categoryId: string | null) => {
    set({ selectedCategory: categoryId });
  },

  setQuickKeys: (products: Product[]) => {
    set({ quickKeys: products });
  },

  setProcessing: (processing: boolean) => {
    set({ isProcessing: processing });
  },

  holdCurrentInvoice: (note?: string) => {
    const { cart, selectedCustomer, deliveryFee, invoiceDiscount, invoiceDiscountType, heldInvoices, calculateTotals } = get();
    if (cart.length === 0) return null;

    const totals = calculateTotals();
    const id = `held-${Date.now()}`;
    const newHeld: LocalHeldInvoice = {
      id,
      invoiceNumber: `HELD-${Date.now().toString().slice(-4)}`,
      cart: [...cart],
      customer: selectedCustomer,
      deliveryFee,
      invoiceDiscount,
      invoiceDiscountType,
      note: note || '',
      heldAt: new Date().toISOString(),
      total: totals.grandTotal,
    };

    const updated = [newHeld, ...heldInvoices];
    saveHeldInvoicesToStorage(updated);

    set({
      heldInvoices: updated,
      cart: [],
      selectedCustomer: null,
      deliveryFee: 0,
      invoiceDiscount: 0,
      payments: [],
      heldInvoiceId: null,
    });

    return id;
  },

  resumeHeldInvoice: (id: string) => {
    const { heldInvoices } = get();
    const target = heldInvoices.find((h) => h.id === id);
    if (!target) return false;

    const updated = heldInvoices.filter((h) => h.id !== id);
    saveHeldInvoicesToStorage(updated);

    set({
      heldInvoices: updated,
      cart: target.cart,
      selectedCustomer: target.customer,
      deliveryFee: target.deliveryFee || 0,
      invoiceDiscount: target.invoiceDiscount || 0,
      invoiceDiscountType: target.invoiceDiscountType || 'fixed',
      payments: [],
      heldInvoiceId: target.id,
    });

    return true;
  },

  deleteHeldInvoice: (id: string) => {
    const { heldInvoices } = get();
    const updated = heldInvoices.filter((h) => h.id !== id);
    saveHeldInvoicesToStorage(updated);
    set({ heldInvoices: updated });
  },

  clearHeldInvoice: () => {
    set({ heldInvoiceId: null });
  },

  calculateTotals: (): CartTotals => {
    const { cart, payments, appliedCoupon, deliveryFee, invoiceDiscount, invoiceDiscountType } = get();

    let subtotal = 0;
    let itemDiscounts = 0;

    // 1. Calculate line totals and item discounts
    const lineNets: Array<{ net: number; taxRate: number }> = [];

    for (const item of cart) {
      const lineGross = Math.round(item.unitPrice * item.quantity * 100) / 100;
      subtotal += lineGross;

      const itemDisc = calculateItemDiscount(item);
      itemDiscounts += itemDisc;

      const lineNet = Math.max(0, lineGross - itemDisc);
      const taxRate = typeof item.taxRate === 'number' ? item.taxRate : 14;
      lineNets.push({ net: lineNet, taxRate });
    }

    const totalLineNet = Math.round(lineNets.reduce((sum, l) => sum + l.net, 0) * 100) / 100;

    // 2. Calculate Invoice Discount
    let invoiceDiscountAmount = 0;
    if (invoiceDiscount > 0 && totalLineNet > 0) {
      if (invoiceDiscountType === 'percentage') {
        const pct = Math.max(0, Math.min(100, invoiceDiscount));
        invoiceDiscountAmount = (totalLineNet * pct) / 100;
      } else {
        invoiceDiscountAmount = invoiceDiscount;
      }
      invoiceDiscountAmount = Math.min(totalLineNet, Math.max(0, invoiceDiscountAmount));
      invoiceDiscountAmount = Math.round(invoiceDiscountAmount * 100) / 100;
    }

    const netAfterInvoiceDisc = Math.max(0, totalLineNet - invoiceDiscountAmount);

    // 3. Calculate Coupon Discount
    let couponDiscountAmount = 0;
    if (appliedCoupon && netAfterInvoiceDisc > 0) {
      if (appliedCoupon.discountType === 'percentage') {
        const pct = Math.max(0, Math.min(100, appliedCoupon.discountValue));
        let cDisc = (netAfterInvoiceDisc * pct) / 100;
        if (appliedCoupon.maxDiscount && cDisc > appliedCoupon.maxDiscount) {
          cDisc = appliedCoupon.maxDiscount;
        }
        couponDiscountAmount = cDisc;
      } else {
        couponDiscountAmount = appliedCoupon.discountValue;
      }
      couponDiscountAmount = Math.min(netAfterInvoiceDisc, Math.max(0, couponDiscountAmount));
      couponDiscountAmount = Math.round(couponDiscountAmount * 100) / 100;
    }

    const globalDiscount = invoiceDiscountAmount + couponDiscountAmount;
    const totalDiscount = Math.round((itemDiscounts + globalDiscount) * 100) / 100;
    const taxableAmount = Math.max(0, Math.round((totalLineNet - globalDiscount) * 100) / 100);

    // 4. Calculate Tax on the net taxable amount for each item
    let totalTax = 0;
    if (taxableAmount > 0 && totalLineNet > 0) {
      const discountRatio = globalDiscount / totalLineNet;
      for (const line of lineNets) {
        const discountedBase = line.net * (1 - discountRatio);
        const lineTax = (discountedBase * line.taxRate) / 100;
        totalTax += lineTax;
      }
    } else if (taxableAmount > 0) {
      for (const line of lineNets) {
        const lineTax = (line.net * line.taxRate) / 100;
        totalTax += lineTax;
      }
    }

    totalTax = Math.round(totalTax * 100) / 100;
    const fee = Math.max(0, deliveryFee || 0);
    const grandTotal = Math.max(0, Math.round((taxableAmount + totalTax + fee) * 100) / 100);

    const totalPaid = Math.round(payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;
    const balance = Math.max(0, Math.round((grandTotal - totalPaid) * 100) / 100);
    const change = Math.max(0, Math.round((totalPaid - grandTotal) * 100) / 100);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      itemDiscounts: Math.round(itemDiscounts * 100) / 100,
      invoiceDiscountAmount,
      couponDiscountAmount,
      totalDiscount,
      taxableAmount,
      totalTax,
      deliveryFee: fee,
      grandTotal,
      totalPaid,
      balance,
      change,
    };
  },
}));