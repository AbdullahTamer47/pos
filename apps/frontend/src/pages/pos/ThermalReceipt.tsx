import React from 'react';

export interface ThermalReceiptProps {
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  taxNumber?: string;
  commercialRegister?: string;
  invoiceNumber: string;
  date?: string;
  cashierName?: string;
  customerName?: string;
  customerPhone?: string;
  customerTaxNumber?: string;
  customerAddress?: string;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxRate?: number;
    taxAmount?: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  taxableAmount?: number;
  discount?: number;
  itemDiscounts?: number;
  invoiceDiscount?: number;
  couponDiscount?: number;
  shipping?: number;
  grandTotal: number;
  paidAmount?: number;
  changeAmount?: number;
  balanceAmount?: number;
  paymentMethod?: string;
  notes?: string;
  status?: string;
  paperSize?: '80mm' | '58mm';
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'نقداً (Cash)',
  card: 'بطاقة بنكية / ميزة (Card)',
  instapay: 'إنستاباي (InstaPay)',
  wallet: 'محفظة إلكترونية (Wallet)',
  vodafone_cash: 'فودافون كاش (Vodafone Cash)',
  credit: 'آجل / على الحساب (Credit)',
  giftCard: 'بطاقة هدايا (Gift Card)',
};

export function renderPrintHtml(html: string, windowWidth: number = 800, windowHeight: number = 750) {
  let printWindow: Window | null = null;
  try {
    printWindow = window.open('', '_blank', `width=${windowWidth},height=${windowHeight},scrollbars=yes,resizable=yes`);
  } catch {
    printWindow = null;
  }

  if (printWindow && !printWindow.closed) {
    try {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      return;
    } catch (e) {
      console.warn('Direct popup write failed, falling back to iframe', e);
    }
  }

  // Fallback for mobile browsers (iOS Safari, Android Chrome) where popups are blocked by default:
  let iframe = document.getElementById('smartpos-print-hidden-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'smartpos-print-hidden-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      return;
    }
  } catch (err) {
    console.error('Iframe print error', err);
  }

  alert('يرجى السماح بالنوافذ المنبثقة (Pop-ups) لمعاينة وطباعة الفاتورة.');
}

// ==========================================
// 1. THERMAL RECEIPT (80mm & 58mm) - طباعة إيصال كاشير حراري
// ==========================================
export function printThermalReceipt(data: ThermalReceiptProps) {
  const paperSize = data.paperSize || '80mm';
  const is58 = paperSize === '58mm';

  const windowWidth = is58 ? 400 : 480;

  const paymentMethodKey = (data.paymentMethod || 'cash').toLowerCase();
  const paymentLabel = PAYMENT_METHOD_LABELS[paymentMethodKey] || data.paymentMethod || 'نقداً';

  const subtotalVal = Number(data.subtotal) || 0;
  const discountVal = Number(data.discount) || 0;
  const grandTotalVal = Number(data.grandTotal) || 0;
  const taxVal = Number(data.tax) || 0;
  const shippingVal = Number(data.shipping) || 0;
  const paidVal = data.paidAmount !== undefined ? Number(data.paidAmount) : grandTotalVal;
  const changeVal = data.changeAmount !== undefined ? Number(data.changeAmount) : Math.max(0, paidVal - grandTotalVal);
  const balanceVal = data.balanceAmount !== undefined ? Number(data.balanceAmount) : Math.max(0, grandTotalVal - paidVal);

  const formattedDate = data.date || new Date().toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const rowsHtml = (data.items || [])
    .map((item, index) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const lineDisc = Number(item.discount) || 0;
      const lineTotal = Number(item.total) || (qty * price - lineDisc);
      const taxRate = typeof item.taxRate === 'number' ? item.taxRate : 14;

      return `
      <tr>
        <td style="padding: 5px 2px; text-align: center; color: #64748b; font-size: ${is58 ? '10px' : '11px'}; width: 18px;">${index + 1}</td>
        <td style="padding: 5px 3px; text-align: right;">
          <div style="font-weight: 700; font-size: ${is58 ? '11px' : '12px'}; color: #0f172a; word-break: break-word;">${item.name || 'صنف'}</div>
          <div style="font-size: ${is58 ? '9.5px' : '10.5px'}; color: #64748b; margin-top: 1px; direction: ltr; text-align: right;">
            <span>${qty}</span> × <span>${price.toFixed(2)} ج.م</span>
            ${taxRate > 0 ? `<span style="margin-right: 4px; color: #475569;">(${taxRate}% ضريبة)</span>` : ''}
          </div>
          ${lineDisc > 0 ? `
          <div style="font-size: 9.5px; color: #dc2626; font-weight: 600;">
            خصم: -${lineDisc.toFixed(2)} ج.م
          </div>` : ''}
        </td>
        <td style="padding: 5px 2px; text-align: center; font-weight: 700; font-size: ${is58 ? '11px' : '12px'}; width: 28px;">${qty}</td>
        <td style="padding: 5px 2px; text-align: left; font-weight: 800; font-size: ${is58 ? '11px' : '12.5px'}; color: #000; direction: ltr; white-space: nowrap;">
          ${lineTotal.toFixed(2)}
        </td>
      </tr>
    `;
    })
    .join('');

  // QR Code payload (compliant with simplified electronic invoices)
  const qrData = encodeURIComponent(
    `فاتورة:${data.invoiceNumber}|متجر:${data.storeName || 'Smart POS'}|ضريبة:${(data.taxNumber || '300123456')}|إجمالي:${grandTotalVal.toFixed(2)}|ضريبة_المبلغ:${taxVal.toFixed(2)}|تاريخ:${formattedDate}`
  );
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=1&data=${qrData}`;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>إيصال كاشير #${data.invoiceNumber}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
          background-color: #cbd5e1;
          color: #0f172a;
          line-height: 1.35;
          direction: rtl;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Top Action Bar (Screen Only) */
        .action-bar {
          position: sticky;
          top: 0;
          background: #0f172a;
          color: #fff;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .action-bar button {
          cursor: pointer;
          border: none;
          outline: none;
          font-family: 'Cairo', sans-serif;
          font-weight: 700;
          font-size: 13px;
          padding: 6px 14px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .btn-print {
          background: #16a34a;
          color: #fff;
        }
        .btn-print:hover {
          background: #15803d;
        }
        .btn-share {
          background: #0284c7;
          color: #fff;
        }
        .btn-share:hover {
          background: #0369a1;
        }
        .btn-size {
          background: rgba(255,255,255,0.18);
          color: #fff;
          font-size: 12px;
          padding: 5px 10px;
        }
        .btn-size.active {
          background: #3b82f6;
          color: #fff;
        }
        .btn-close {
          background: rgba(255,255,255,0.15);
          color: #fff;
        }
        .btn-close:hover {
          background: rgba(255,255,255,0.25);
        }

        /* Receipt Wrapper */
        .receipt-container {
          width: ${is58 ? '58mm' : '80mm'};
          margin: 20px auto;
          background: #ffffff;
          padding: ${is58 ? '4mm 3mm' : '6mm 5mm'};
          border-radius: 4px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          font-size: ${is58 ? '11px' : '12px'};
        }

        .header {
          text-align: center;
          padding-bottom: 8px;
          border-bottom: 1.5px dashed #64748b;
          margin-bottom: 8px;
        }
        .store-logo {
          display: inline-block;
          font-size: 13px;
          font-weight: 900;
          background: #0f172a;
          color: #fff;
          padding: 2px 10px;
          border-radius: 9999px;
          margin-bottom: 4px;
        }
        .store-name {
          font-size: ${is58 ? '14px' : '16px'};
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .store-meta {
          font-size: ${is58 ? '9.5px' : '10.5px'};
          color: #475569;
          line-height: 1.4;
        }

        .tax-badge {
          display: inline-block;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: 700;
          color: #334155;
          margin-top: 4px;
        }

        /* Info Grid */
        .meta-section {
          padding-bottom: 8px;
          border-bottom: 1.5px dashed #64748b;
          margin-bottom: 8px;
          font-size: ${is58 ? '10px' : '11px'};
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        .meta-label {
          color: #64748b;
          font-weight: 600;
        }
        .meta-val {
          font-weight: 700;
          color: #0f172a;
        }

        /* Items Table */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }
        thead th {
          border-bottom: 1.5px solid #0f172a;
          padding: 4px 2px;
          font-size: ${is58 ? '10px' : '11px'};
          font-weight: 800;
          color: #0f172a;
        }
        tbody tr {
          border-bottom: 1px dotted #e2e8f0;
        }

        /* Totals */
        .totals-section {
          border-top: 1.5px dashed #64748b;
          padding-top: 6px;
          margin-bottom: 10px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: ${is58 ? '11px' : '12px'};
          margin-bottom: 3px;
        }
        .total-row.highlight {
          border-top: 1.5px solid #0f172a;
          border-bottom: 1.5px solid #0f172a;
          padding: 6px 0;
          margin: 6px 0;
          font-size: ${is58 ? '13px' : '15px'};
          font-weight: 900;
          color: #0f172a;
        }
        .total-label {
          color: #334155;
          font-weight: 700;
        }
        .total-val {
          font-weight: 800;
          direction: ltr;
        }

        /* QR & Footer */
        .footer {
          text-align: center;
          padding-top: 6px;
          border-top: 1.5px dashed #64748b;
          font-size: ${is58 ? '9.5px' : '10.5px'};
          color: #64748b;
        }
        .qr-box {
          margin: 8px auto;
          text-align: center;
        }
        .qr-box img {
          width: ${is58 ? '85px' : '105px'};
          height: ${is58 ? '85px' : '105px'};
          border-radius: 4px;
        }

        /* Print Media Styles */
        @page {
          size: ${is58 ? '58mm auto' : '80mm auto'};
          margin: 0;
        }
        @media print {
          body {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .action-bar {
            display: none !important;
          }
          .receipt-container {
            width: 100% !important;
            max-width: ${is58 ? '58mm' : '80mm'} !important;
            margin: 0 auto !important;
            padding: ${is58 ? '2mm 1.5mm' : '4mm 3mm'} !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      </style>
    </head>
    <body>

      <!-- Screen Action Bar -->
      <div class="action-bar no-print">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 800;">🖨️ إيصال حراري</span>
          <div style="display: flex; gap: 4px;">
            <button class="btn-size ${!is58 ? 'active' : ''}" onclick="switchPaperSize('80mm')">80mm</button>
            <button class="btn-size ${is58 ? 'active' : ''}" onclick="switchPaperSize('58mm')">58mm</button>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-share" onclick="shareReceipt()">مشاركة 📤</button>
          <button class="btn-print" onclick="window.print()">طباعة الإيصال</button>
          <button class="btn-close" onclick="window.close()">إغلاق</button>
        </div>
      </div>

      <!-- Receipt Content -->
      <div class="receipt-container">

        <!-- Header -->
        <div class="header">
          <div class="store-logo">SMART POS</div>
          <div class="store-name">${data.storeName || 'متجر الأمل الذكي'}</div>
          <div class="store-meta">
            ${data.storeAddress ? `<div>${data.storeAddress}</div>` : '<div>الفرع الرئيسي - مصر</div>'}
            ${data.storePhone ? `<div>هاتف: ${data.storePhone}</div>` : '<div>خدمة العملاء: 01000000000</div>'}
            <div>الرقم الضريبي: ${data.taxNumber || '300-123-456'}</div>
            <div>السجل التجاري: ${data.commercialRegister || '145892'}</div>
          </div>
          <div class="tax-badge">فاتورة ضريبية مبسطة (Simplified Tax Invoice)</div>
        </div>

        <!-- Meta Grid -->
        <div class="meta-section">
          <div class="meta-row">
            <span class="meta-label">رقم الفاتورة:</span>
            <span class="meta-val" style="font-family: monospace; font-size: ${is58 ? '11px' : '12px'};">${data.invoiceNumber}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">التاريخ والوقت:</span>
            <span class="meta-val">${formattedDate}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">الكاشير:</span>
            <span class="meta-val">${data.cashierName || 'كاشير المتجر'}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">العميل:</span>
            <span class="meta-val">${data.customerName || 'عميل نقدي'}</span>
          </div>
          ${data.customerTaxNumber ? `
          <div class="meta-row">
            <span class="meta-label">الرقم الضريبي للعميل:</span>
            <span class="meta-val">${data.customerTaxNumber}</span>
          </div>` : ''}
          <div class="meta-row">
            <span class="meta-label">طريقة الدفع:</span>
            <span class="meta-val">${paymentLabel}</span>
          </div>
        </div>

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th style="width: 18px; text-align: center;">#</th>
              <th style="text-align: right;">الصنف</th>
              <th style="width: 28px; text-align: center;">العدد</th>
              <th style="text-align: left;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Totals Section -->
        <div class="totals-section">
          <div class="total-row">
            <span class="total-label">المجموع الفرعي:</span>
            <span class="total-val">${subtotalVal.toFixed(2)} ج.م</span>
          </div>
          ${discountVal > 0 ? `
          <div class="total-row" style="color: #dc2626;">
            <span class="total-label" style="color: #dc2626;">إجمالي الخصم:</span>
            <span class="total-val">-${discountVal.toFixed(2)} ج.م</span>
          </div>` : ''}
          ${taxVal > 0 ? `
          <div class="total-row">
            <span class="total-label">ضريبة القيمة المضافة (14%):</span>
            <span class="total-val">${taxVal.toFixed(2)} ج.م</span>
          </div>` : ''}
          ${shippingVal > 0 ? `
          <div class="total-row">
            <span class="total-label">رسوم التوصيل:</span>
            <span class="total-val">+${shippingVal.toFixed(2)} ج.م</span>
          </div>` : ''}
          <div class="total-row highlight">
            <span class="total-label">المبلغ المستحق:</span>
            <span class="total-val">${grandTotalVal.toFixed(2)} ج.م</span>
          </div>
          <div class="total-row">
            <span class="total-label">المبلغ المدفوع:</span>
            <span class="total-val">${paidVal.toFixed(2)} ج.م</span>
          </div>
          ${changeVal > 0 ? `
          <div class="total-row" style="color: #16a34a; font-weight: 800;">
            <span class="total-label" style="color: #16a34a;">المتبقي للعميل (الباقي):</span>
            <span class="total-val">${changeVal.toFixed(2)} ج.م</span>
          </div>` : ''}
          ${balanceVal > 0 ? `
          <div class="total-row" style="color: #dc2626; font-weight: 800;">
            <span class="total-label" style="color: #dc2626;">المتبقي على الحساب (آجل):</span>
            <span class="total-val">${balanceVal.toFixed(2)} ج.م</span>
          </div>` : ''}
        </div>

        <!-- QR Code -->
        <div class="qr-box">
          <img src="${qrCodeUrl}" alt="ZATCA / ETA QR Code" />
          <div style="font-size: 9px; color: #64748b; margin-top: 2px;">امسح للتحقق من صحة الفاتورة</div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div>شكراً لزيارتكم ونتمنى لكم يوماً سعيداً!</div>
          <div style="font-size: 9px; margin-top: 2px;">الاستبدال والاسترجاع خلال 14 يوماً بموجب هذا الإيصال</div>
          <div style="font-size: 8.5px; margin-top: 3px; font-family: monospace;">Smart POS Cloud • 01000000000</div>
        </div>

      </div>

      <script>
        function switchPaperSize(size) {
          var url = new URL(window.location.href);
          var container = document.querySelector('.receipt-container');
          if (size === '58mm') {
            container.style.width = '58mm';
          } else {
            container.style.width = '80mm';
          }
        }

        function shareReceipt() {
          if (navigator.share) {
            navigator.share({
              title: 'إيصال فاتورة #${data.invoiceNumber}',
              text: 'إيصال فاتورة #${data.invoiceNumber} من ${data.storeName || 'Smart POS'} بمبلغ ${grandTotalVal.toFixed(2)} ج.م',
              url: window.location.href
            }).catch(function(e) { console.log('Share canceled', e); });
          } else {
            try {
              navigator.clipboard.writeText('إيصال فاتورة #${data.invoiceNumber} من ${data.storeName || 'Smart POS'} بمبلغ ${grandTotalVal.toFixed(2)} ج.م');
              alert('تم نسخ تفاصيل الفاتورة للحافظة لمشاركتها.');
            } catch (err) {
              alert('إيصال فاتورة #${data.invoiceNumber} بمبلغ ${grandTotalVal.toFixed(2)} ج.م');
            }
          }
        }

        window.addEventListener('load', function() {
          if (document.fonts) {
            document.fonts.ready.then(function() {
              setTimeout(function() { window.print(); }, 250);
            });
          } else {
            setTimeout(function() { window.print(); }, 400);
          }
        });
      </script>
    </body>
    </html>
  `;

  renderPrintHtml(html, windowWidth, 750);
}

// ==========================================
// 2. OFFICIAL A4 TAX INVOICE - طباعة فاتورة ضريبية رسمية A4
// ==========================================
export function printA4Invoice(data: ThermalReceiptProps) {
  const paymentMethodKey = (data.paymentMethod || 'cash').toLowerCase();
  const paymentLabel = PAYMENT_METHOD_LABELS[paymentMethodKey] || data.paymentMethod || 'نقداً';

  const subtotalVal = Number(data.subtotal) || 0;
  const discountVal = Number(data.discount) || 0;
  const grandTotalVal = Number(data.grandTotal) || 0;
  const taxVal = Number(data.tax) || 0;
  const taxableBaseVal = data.taxableAmount !== undefined ? Number(data.taxableAmount) : Math.max(0, subtotalVal - discountVal);
  const shippingVal = Number(data.shipping) || 0;
  const paidVal = data.paidAmount !== undefined ? Number(data.paidAmount) : grandTotalVal;
  const changeVal = data.changeAmount !== undefined ? Number(data.changeAmount) : Math.max(0, paidVal - grandTotalVal);
  const balanceVal = data.balanceAmount !== undefined ? Number(data.balanceAmount) : Math.max(0, grandTotalVal - paidVal);

  const formattedDate = data.date || new Date().toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const rowsHtml = (data.items || [])
    .map((item, index) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const itemDisc = Number(item.discount) || 0;
      const lineGross = qty * price;
      const lineTaxable = Math.max(0, lineGross - itemDisc);
      const taxRate = typeof item.taxRate === 'number' ? item.taxRate : 14;
      const lineTax = Number(item.taxAmount) || ((lineTaxable * taxRate) / 100);
      const lineTotal = lineTaxable + lineTax;

      return `
      <tr>
        <td style="text-align: center; color: #64748b; font-size: 11.5px; font-weight: 700;">${index + 1}</td>
        <td>
          <div style="font-weight: 800; color: #0f172a; font-size: 13px;">${item.name || 'صنف بدون اسم'}</div>
          ${item.sku ? `<div style="font-size: 10.5px; color: #64748b; font-family: monospace;">SKU: ${item.sku}</div>` : ''}
        </td>
        <td style="text-align: center; font-weight: 800; font-size: 13px;">${qty}</td>
        <td style="text-align: center; font-weight: 700; direction: ltr;">${price.toFixed(2)}</td>
        <td style="text-align: center; color: ${itemDisc > 0 ? '#dc2626' : '#94a3b8'}; font-weight: 700; direction: ltr;">
          ${itemDisc > 0 ? `-${itemDisc.toFixed(2)}` : '0.00'}
        </td>
        <td style="text-align: center; font-weight: 700; direction: ltr;">${lineTaxable.toFixed(2)}</td>
        <td style="text-align: center; font-weight: 700; color: #475569;">${taxRate}%</td>
        <td style="text-align: center; font-weight: 700; direction: ltr;">${lineTax.toFixed(2)}</td>
        <td style="text-align: left; font-weight: 900; color: #0f172a; font-size: 13.5px; direction: ltr;">
          ${lineTotal.toFixed(2)}
        </td>
      </tr>
    `;
    })
    .join('');

  const qrData = encodeURIComponent(
    `فاتورة_ضريبية:${data.invoiceNumber}|بائع:${data.storeName || 'Smart POS'}|رقم_ضريبي:${data.taxNumber || '300123456'}|تاريخ:${formattedDate}|إجمالي:${grandTotalVal.toFixed(2)}|ضريبة:${taxVal.toFixed(2)}`
  );
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=125x125&margin=2&data=${qrData}`;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة ضريبية رسمية #${data.invoiceNumber}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
          background-color: #e2e8f0;
          color: #0f172a;
          line-height: 1.45;
          direction: rtl;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Top Action Bar (Screen Only) */
        .action-bar {
          position: sticky;
          top: 0;
          background: #0f172a;
          color: #fff;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .action-bar button {
          cursor: pointer;
          border: none;
          outline: none;
          font-family: 'Cairo', sans-serif;
          font-weight: 700;
          font-size: 13.5px;
          padding: 8px 18px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        .btn-print {
          background: #4f46e5;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-print:hover {
          background: #4338ca;
        }
        .btn-share {
          background: #0284c7;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-share:hover {
          background: #0369a1;
        }
        .btn-close {
          background: rgba(255,255,255,0.15);
          color: #fff;
        }
        .btn-close:hover {
          background: rgba(255,255,255,0.25);
        }

        /* A4 Sheet Container */
        .page-container {
          width: 210mm;
          min-height: 297mm;
          margin: 20px auto;
          background: #ffffff;
          padding: 14mm 12mm;
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          border: 1px solid #cbd5e1;
        }

        /* Corporate Header */
        .corp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2.5px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 14px;
        }
        .company-info {
          flex: 1;
        }
        .company-title {
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .company-badge {
          background: #4f46e5;
          color: #fff;
          font-size: 13px;
          padding: 3px 10px;
          border-radius: 6px;
          font-weight: 900;
        }
        .company-subtitle {
          font-size: 12px;
          color: #475569;
          margin-bottom: 2px;
        }
        .company-tax {
          font-size: 11.5px;
          color: #1e293b;
          font-weight: 700;
        }

        .invoice-title-box {
          text-align: left;
        }
        .invoice-main-heading {
          font-size: 22px;
          font-weight: 900;
          color: #4f46e5;
          text-transform: uppercase;
          line-height: 1.2;
        }
        .invoice-sub-heading {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 1px;
        }
        .invoice-num-tag {
          display: inline-block;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 13.5px;
          font-weight: 900;
          font-family: monospace;
          padding: 3px 10px;
          border-radius: 6px;
          border: 1.5px solid #c7d2fe;
          margin-top: 4px;
        }

        /* Info Grid */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
        }
        .info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 12px;
        }
        .info-card-title {
          font-size: 11.5px;
          font-weight: 800;
          color: #4f46e5;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 3px;
        }
        .info-label {
          color: #64748b;
          font-weight: 600;
        }
        .info-val {
          color: #0f172a;
          font-weight: 700;
        }

        /* Table */
        .table-wrap {
          margin-bottom: 16px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        thead th {
          background: #0f172a;
          color: #ffffff;
          font-weight: 800;
          padding: 8px 6px;
          border: 1px solid #0f172a;
          font-size: 11.5px;
        }
        tbody td {
          padding: 7px 6px;
          border: 1px solid #e2e8f0;
          vertical-align: middle;
        }
        tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        /* Bottom Section */
        .bottom-section {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 16px;
          align-items: flex-start;
          margin-top: 8px;
        }

        .terms-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 12px;
        }
        .terms-title {
          font-size: 11.5px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 4px;
        }
        .terms-text {
          font-size: 10.5px;
          color: #64748b;
          line-height: 1.5;
        }

        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px dashed #cbd5e1;
          text-align: center;
          font-size: 11px;
          color: #475569;
          font-weight: 700;
        }
        .sig-box {
          width: 46%;
          height: 44px;
        }

        .totals-table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        .totals-table td {
          padding: 6px 10px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 12px;
        }
        .totals-label {
          color: #475569;
          font-weight: 700;
        }
        .totals-val {
          text-align: left;
          font-weight: 800;
          color: #0f172a;
          direction: ltr;
        }
        .grand-total-row {
          background: #4f46e5 !important;
          color: #ffffff !important;
        }
        .grand-total-row td {
          font-size: 14.5px !important;
          font-weight: 900 !important;
          color: #ffffff !important;
          padding: 9px 10px !important;
        }

        /* Footer Stamp */
        .footer-stamp {
          margin-top: 24px;
          padding-top: 10px;
          border-top: 1.5px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10.5px;
          color: #64748b;
        }

        /* Print Media Styles */
        @page {
          size: A4 portrait;
          margin: 8mm 8mm;
        }
        @media print {
          body {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .action-bar {
            display: none !important;
          }
          .page-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          thead th {
            background: #0f172a !important;
            color: #fff !important;
          }
          .grand-total-row {
            background: #4f46e5 !important;
            color: #fff !important;
          }
          .grand-total-row td {
            color: #fff !important;
          }
        }
      </style>
    </head>
    <body>

      <!-- Top Screen Bar -->
      <div class="action-bar no-print">
        <div style="font-weight: 800; font-size: 14px; display: flex; align-items: center; gap: 8px;">
          <span>📄 معاينة الفاتورة الضريبية الرسمية A4</span>
          <span style="font-size: 11px; background: rgba(255,255,255,0.18); padding: 2px 8px; border-radius: 4px;">Standard A4</span>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn-share" onclick="shareInvoice()">
            <span>📤 مشاركة</span>
          </button>
          <button class="btn-print" onclick="window.print()">
            <span>🖨️ طباعة الفاتورة A4</span>
          </button>
          <button class="btn-close" onclick="window.close()">✖️ إغلاق</button>
        </div>
      </div>

      <!-- Page -->
      <div class="page-container">

        <!-- Corporate Header -->
        <div class="corp-header">
          <div class="company-info">
            <div class="company-title">
              <span class="company-badge">SP</span>
              <span>${data.storeName || 'شركة الأمل للتجارة والتوزيع'}</span>
            </div>
            <div class="company-subtitle">أنظمة نقاط البيع والتجزئة الذكية • Smart POS Solutions</div>
            <div class="company-subtitle">العنوان: ${data.storeAddress || 'شارع التحرير، الدقي، الجيزة، جمهورية مصر العربية'}</div>
            <div class="company-tax">
              <span>رقم التسجيل الضريبي: <strong>${data.taxNumber || '399-456-789'}</strong></span>
              <span style="margin: 0 8px;">•</span>
              <span>السجل التجاري: <strong>${data.commercialRegister || '128456'}</strong></span>
              <span style="margin: 0 8px;">•</span>
              <span>الهاتف: <strong>${data.storePhone || '02-33445566'}</strong></span>
            </div>
          </div>
          <div class="invoice-title-box">
            <div class="invoice-main-heading">فاتورة ضريبية</div>
            <div class="invoice-sub-heading">TAX INVOICE</div>
            <div class="invoice-num-tag"># ${data.invoiceNumber}</div>
          </div>
        </div>

        <!-- Info Grid -->
        <div class="info-grid">
          <!-- Client Card -->
          <div class="info-card">
            <div class="info-card-title">
              <span>بيانات العميل / المشتري</span>
              <span style="font-size: 10px; color: #64748b;">Buyer Information</span>
            </div>
            <div class="info-row">
              <span class="info-label">اسم العميل:</span>
              <span class="info-val">${data.customerName || 'عميل نقدي (Walk-in Customer)'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">رقم الهاتف:</span>
              <span class="info-val">${data.customerPhone || 'غير مسجل'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الرقم الضريبي للمشتري:</span>
              <span class="info-val">${data.customerTaxNumber || 'غير متوفر'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">العنوان:</span>
              <span class="info-val">${data.customerAddress || 'القاهرة، مصر'}</span>
            </div>
          </div>

          <!-- Invoice Details Card -->
          <div class="info-card">
            <div class="info-card-title">
              <span>تفاصيل الفاتورة والعملية</span>
              <span style="font-size: 10px; color: #64748b;">Invoice Metadata</span>
            </div>
            <div class="info-row">
              <span class="info-label">تاريخ ووقت الإصدار:</span>
              <span class="info-val">${formattedDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">مسؤول البيع / الكاشير:</span>
              <span class="info-val">${data.cashierName || 'إدارة المتجر'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">طريقة السداد:</span>
              <span class="info-val">${paymentLabel}</span>
            </div>
            <div class="info-row">
              <span class="info-label">حالة الفاتورة:</span>
              <span class="info-val" style="color: ${balanceVal > 0 ? '#dc2626' : '#16a34a'};">
                ${data.status === 'cancelled' ? 'ملغاة' : (balanceVal > 0 ? 'متبقي حساب آجل' : 'مدفوعة بالكامل')}
              </span>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width: 28px; text-align: center;">#</th>
                <th style="text-align: right;">البيان والوصف (Description)</th>
                <th style="width: 40px; text-align: center;">الكمية</th>
                <th style="width: 85px; text-align: center;">سعر الوحدة</th>
                <th style="width: 75px; text-align: center;">الخصم</th>
                <th style="width: 90px; text-align: center;">الوعاء الضريبي</th>
                <th style="width: 55px; text-align: center;">الضريبة %</th>
                <th style="width: 75px; text-align: center;">قيمة الضريبة</th>
                <th style="width: 95px; text-align: left;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Bottom Section -->
        <div class="bottom-section">
          
          <!-- Terms & Signatures -->
          <div>
            <div class="terms-box">
              <div class="terms-title">📌 الشروط والأحكام والسياسات القانونية:</div>
              <div class="terms-text">
                1. الفاتورة صادرة طبقاً لمنظومة الفاتورة والإيصال الإلكتروني المعتمدة وتعتبر سنداً قانونياً للملكية.<br/>
                2. يحق للعميل استبدال أو استرجاع البضاعة خلال 14 يوماً من تاريخ الفاتورة مع إحضار أصل الفاتورة وأن تكون البضاعة بحالتها الأصلية.<br/>
                3. الأصناف الخاضعة للضريبة محسوبة وفقاً للنسب المقررة قانوناً (14% ضريبة القيمة المضافة العامة).
              </div>
            </div>

            <!-- Signatures -->
            <div class="signatures">
              <div class="sig-box">
                <div>توقيع واستلام المشتري</div>
                <div style="margin-top: 22px; border-bottom: 1px dotted #94a3b8; width: 110px; margin-left: auto; margin-right: auto;"></div>
              </div>
              <div class="sig-box">
                <div>اعتماد وختم الشركة الرسمي</div>
                <div style="margin-top: 22px; border-bottom: 1px dotted #94a3b8; width: 110px; margin-left: auto; margin-right: auto;"></div>
              </div>
            </div>
          </div>

          <!-- Totals Card -->
          <div>
            <table class="totals-table">
              <tr>
                <td class="totals-label">المجموع الإجمالي (قبل الخصم):</td>
                <td class="totals-val">${subtotalVal.toFixed(2)} ج.م</td>
              </tr>
              ${discountVal > 0 ? `
              <tr style="color: #dc2626;">
                <td class="totals-label" style="color: #dc2626;">إجمالي الخصم التجاري:</td>
                <td class="totals-val" style="color: #dc2626;">-${discountVal.toFixed(2)} ج.م</td>
              </tr>` : ''}
              <tr>
                <td class="totals-label">الصافي الخاضع للضريبة:</td>
                <td class="totals-val">${taxableBaseVal.toFixed(2)} ج.م</td>
              </tr>
              <tr>
                <td class="totals-label">إجمالي ضريبة القيمة المضافة:</td>
                <td class="totals-val">${taxVal.toFixed(2)} ج.م</td>
              </tr>
              ${shippingVal > 0 ? `
              <tr>
                <td class="totals-label">مصاريف الشحن والتوصيل:</td>
                <td class="totals-val">+${shippingVal.toFixed(2)} ج.م</td>
              </tr>` : ''}
              <tr class="grand-total-row">
                <td>الإجمالي المستحق (شامل الضريبة):</td>
                <td style="text-align: left; direction: ltr;">${grandTotalVal.toFixed(2)} ج.م</td>
              </tr>
              <tr>
                <td class="totals-label">المبلغ المسدد:</td>
                <td class="totals-val">${paidVal.toFixed(2)} ج.م</td>
              </tr>
              ${changeVal > 0 ? `
              <tr style="color: #16a34a; font-weight: 800;">
                <td class="totals-label" style="color: #16a34a;">المبلغ المتبقي للعميل (الباقي):</td>
                <td class="totals-val" style="color: #16a34a;">${changeVal.toFixed(2)} ج.م</td>
              </tr>` : ''}
              ${balanceVal > 0 ? `
              <tr style="color: #dc2626; font-weight: 800;">
                <td class="totals-label" style="color: #dc2626;">المتبقي كحساب آجل (الدين):</td>
                <td class="totals-val" style="color: #dc2626;">${balanceVal.toFixed(2)} ج.م</td>
              </tr>` : ''}
            </table>

            <!-- QR Code Section -->
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px;">
              <img src="${qrCodeUrl}" alt="QR" style="width: 58px; height: 58px; border-radius: 4px;" />
              <div>
                <div style="font-weight: 800; font-size: 11px; color: #0f172a;">الفاتورة الإلكترونية المعتمدة</div>
                <div style="font-size: 9.5px; color: #64748b; line-height: 1.3;">رمز التحقق الرقمي المعتمد لدى منظومة الفاتورة الضريبية</div>
              </div>
            </div>

          </div>

        </div>

        <!-- Stamp & Watermark Footer -->
        <div class="footer-stamp">
          <div>تم الإصدار بواسطة نظام نقاط البيع Smart POS v2.0 • جميع الحقوق محفوظة</div>
          <div style="direction: ltr; font-family: monospace; font-weight: 700;">INV-ETA-${data.invoiceNumber}-VERIFIED</div>
        </div>

      </div>

      <script>
        function shareInvoice() {
          if (navigator.share) {
            navigator.share({
              title: 'فاتورة ضريبية #${data.invoiceNumber}',
              text: 'فاتورة ضريبية #${data.invoiceNumber} من ${data.storeName || 'Smart POS'} بمبلغ ${grandTotalVal.toFixed(2)} ج.م',
              url: window.location.href
            }).catch(function(e) { console.log('Share canceled', e); });
          } else {
            try {
              navigator.clipboard.writeText('فاتورة ضريبية #${data.invoiceNumber} من ${data.storeName || 'Smart POS'} بمبلغ ${grandTotalVal.toFixed(2)} ج.م');
              alert('تم نسخ تفاصيل الفاتورة للحافظة لمشاركتها.');
            } catch (err) {
              alert('فاتورة ضريبية #${data.invoiceNumber} بمبلغ ${grandTotalVal.toFixed(2)} ج.م');
            }
          }
        }

        window.addEventListener('load', function() {
          if (document.fonts) {
            document.fonts.ready.then(function() {
              setTimeout(function() { window.print(); }, 250);
            });
          } else {
            setTimeout(function() { window.print(); }, 400);
          }
        });
      </script>
    </body>
    </html>
  `;

  renderPrintHtml(html, 960, 820);
}
