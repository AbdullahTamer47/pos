import { describe, it, expect } from 'vitest';

export function calculateTestTotals(params: {
  items: Array<{ unitPrice: number; quantity: number; discount?: number; discountType?: 'percentage' | 'fixed'; taxRate?: number }>;
  invoiceDiscount?: number;
  deliveryFee?: number;
}) {
  const { items, invoiceDiscount = 0, deliveryFee = 0 } = params;

  let subtotal = 0;
  let itemDiscounts = 0;
  let totalTax = 0;

  for (const item of items) {
    const lineGross = item.unitPrice * item.quantity;
    subtotal += lineGross;

    const discountVal = item.discount || 0;
    const itemDisc =
      item.discountType === 'percentage'
        ? (lineGross * Math.min(100, Math.max(0, discountVal))) / 100
        : Math.min(lineGross, Math.max(0, discountVal));

    itemDiscounts += itemDisc;

    const taxable = Math.max(0, lineGross - itemDisc);
    const taxRate = typeof item.taxRate === 'number' ? item.taxRate : 14;
    const tax = (taxable * taxRate) / 100;
    totalTax += tax;
  }

  const validInvoiceDiscount = Math.min(Math.max(0, subtotal - itemDiscounts), Math.max(0, invoiceDiscount));
  const totalDiscount = itemDiscounts + validInvoiceDiscount;
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const grandTotal = Math.round((taxableAmount + totalTax + deliveryFee) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    grandTotal,
  };
}

describe('Egyptian Tax & POS Calculations', () => {
  it('should calculate standard 14% VAT accurately', () => {
    const res = calculateTestTotals({
      items: [{ unitPrice: 100, quantity: 1, taxRate: 14 }],
    });
    expect(res.subtotal).toBe(100);
    expect(res.totalDiscount).toBe(0);
    expect(res.totalTax).toBe(14);
    expect(res.grandTotal).toBe(114);
  });

  it('should apply percentage discount before 14% tax', () => {
    const res = calculateTestTotals({
      items: [{ unitPrice: 100, quantity: 1, discount: 10, discountType: 'percentage', taxRate: 14 }],
    });
    expect(res.subtotal).toBe(100);
    expect(res.totalDiscount).toBe(10);
    expect(res.taxableAmount).toBe(90);
    expect(res.totalTax).toBe(12.6);
    expect(res.grandTotal).toBe(102.6);
  });

  it('should apply fixed discount before 14% tax', () => {
    const res = calculateTestTotals({
      items: [{ unitPrice: 200, quantity: 1, discount: 50, discountType: 'fixed', taxRate: 14 }],
    });
    expect(res.subtotal).toBe(200);
    expect(res.totalDiscount).toBe(50);
    expect(res.taxableAmount).toBe(150);
    expect(res.totalTax).toBe(21);
    expect(res.grandTotal).toBe(171);
  });

  it('should prevent negative totals when discount exceeds subtotal', () => {
    const res = calculateTestTotals({
      items: [{ unitPrice: 50, quantity: 1, discount: 100, discountType: 'fixed', taxRate: 14 }],
    });
    expect(res.subtotal).toBe(50);
    expect(res.totalDiscount).toBe(50);
    expect(res.taxableAmount).toBe(0);
    expect(res.totalTax).toBe(0);
    expect(res.grandTotal).toBe(0);
  });

  it('should include delivery fee in grand total', () => {
    const res = calculateTestTotals({
      items: [{ unitPrice: 100, quantity: 1, taxRate: 14 }],
      deliveryFee: 25,
    });
    expect(res.grandTotal).toBe(139);
  });
});
