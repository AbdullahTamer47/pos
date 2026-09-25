/**
 * Smart POS - Unified Printing Service
 * Re-exports the authoritative Thermal and A4 receipt printers from ThermalReceipt
 * and provides Kitchen Order printing for restaurant / order tickets.
 */

import { renderPrintHtml } from '../pages/pos/ThermalReceipt';
export { printThermalReceipt, printA4Invoice, renderPrintHtml } from '../pages/pos/ThermalReceipt';
export type { ThermalReceiptProps } from '../pages/pos/ThermalReceipt';

export interface KitchenOrderItem {
  name: string;
  nameAr?: string;
  quantity: number;
  notes?: string;
  variant?: string;
}

export interface KitchenOrder {
  orderNumber: string;
  tableNumber?: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  timestamp: string;
  items: KitchenOrderItem[];
  waiterName?: string;
  customerName?: string;
  specialInstructions?: string;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function openPrintWindow(html: string, _title: string): void {
  renderPrintHtml(html, 800, 600);
}

export function printKitchenOrder(order: KitchenOrder): void {
  const labels = {
    orderNumber: 'رقم الطلب',
    table: 'الطاولة',
    orderType: 'نوع الطلب',
    waiter: 'النادل',
    instructions: 'تعليمات خاصة',
    dineIn: 'داخل المطعم',
    takeaway: 'سفري',
    delivery: 'توصيل',
    customer: 'العميل',
  };

  const orderTypeMap: Record<string, string> = {
    'dine-in': labels.dineIn,
    takeaway: labels.takeaway,
    delivery: labels.delivery,
  };

  const lines: string[] = [];

  lines.push(`
    <div class="ticket">
      <div class="header">
        <div class="order-type">${orderTypeMap[order.orderType] || order.orderType}</div>
        <div class="order-number">${labels.orderNumber}: ${order.orderNumber}</div>
        <div class="timestamp">${formatDate(order.timestamp)} ${formatTime(order.timestamp)}</div>
        ${order.tableNumber ? `<div class="table">${labels.table}: ${order.tableNumber}</div>` : ''}
        ${order.customerName ? `<div class="customer">${labels.customer}: ${order.customerName}</div>` : ''}
        ${order.waiterName ? `<div class="waiter">${labels.waiter}: ${order.waiterName}</div>` : ''}
      </div>
      <hr />
      <div class="items">
  `);

  for (const item of order.items) {
    const displayName = item.variant
      ? `${item.nameAr || item.name} (${item.variant})`
      : item.nameAr || item.name;

    lines.push(`
      <div class="item-row">
        <span class="item-qty">${item.quantity}x</span>
        <span class="item-name">${displayName}</span>
      </div>
    `);

    if (item.notes) {
      lines.push(`
        <div class="item-notes">-- ${item.notes}</div>
      `);
    }
  }

  lines.push(`
      </div>
  `);

  if (order.specialInstructions) {
    lines.push(`
      <hr />
      <div class="instructions">
        <div class="instructions-title">${labels.instructions}:</div>
        <div class="instructions-text">${order.specialInstructions}</div>
      </div>
    `);
  }

  lines.push(`
      <hr />
      <div class="timestamp-footer">${new Date().toLocaleString('ar-EG')}</div>
    </div>
  `);

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', 'Monaco', monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      padding: 5mm;
      width: 80mm;
    }
    .ticket { width: 70mm; }
    .header { text-align: center; margin-bottom: 3mm; }
    .order-type { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 1mm; }
    .order-number { font-size: 18px; font-weight: bold; margin-bottom: 1mm; }
    .timestamp { font-size: 10px; margin-bottom: 1mm; }
    .table { font-size: 14px; font-weight: bold; margin-bottom: 1mm; }
    .customer { font-size: 11px; margin-bottom: 1mm; }
    .waiter { font-size: 10px; }
    hr { border: none; border-top: 1px dashed #000; margin: 3mm 0; }
    .items { margin-bottom: 3mm; }
    .item-row { display: flex; margin-bottom: 2mm; font-size: 13px; }
    .item-qty { font-weight: bold; min-width: 10mm; font-size: 14px; }
    .item-name { flex: 1; }
    .item-notes { font-size: 10px; padding-right: 10mm; color: #555; margin-bottom: 1mm; }
    .instructions { margin-bottom: 3mm; }
    .instructions-title { font-weight: bold; font-size: 11px; margin-bottom: 1mm; }
    .instructions-text { font-size: 11px; }
    .timestamp-footer { text-align: center; font-size: 9px; color: #888; }
    @media print {
      @page { size: 80mm auto; margin: 0; }
      body { margin: 0; padding: 5mm; }
    }
  </style>
  <title>${labels.orderNumber} ${order.orderNumber}</title>
</head>
<body>
  ${lines.join('\n')}
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 250);
    });
  </script>
</body>
</html>`;

  openPrintWindow(html, `${labels.orderNumber} ${order.orderNumber}`);
}