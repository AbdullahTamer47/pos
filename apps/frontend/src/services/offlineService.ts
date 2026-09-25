import { toast } from 'react-hot-toast';
import api from '@/api/endpoints';

const OFFLINE_INVOICES_KEY = 'smartpos_offline_pending_invoices';

export interface PendingOfflineInvoice {
  id: string;
  timestamp: string;
  invoiceData: {
    customerId?: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      discountType?: string;
      taxRate?: number;
      variantId?: string;
    }>;
    discount?: number;
    discountType?: string;
    notes?: string;
    payments: Array<{
      method: string;
      amount: number;
      reference?: string;
    }>;
    couponCode?: string;
    giftCardCode?: string;
  };
}

export const offlineService = {
  getPendingInvoices(): PendingOfflineInvoice[] {
    try {
      const data = localStorage.getItem(OFFLINE_INVOICES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveOfflineInvoice(invoiceData: PendingOfflineInvoice['invoiceData']): PendingOfflineInvoice {
    const pendingList = this.getPendingInvoices();
    const offlineItem: PendingOfflineInvoice = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      invoiceData,
    };
    pendingList.push(offlineItem);
    try {
      localStorage.setItem(OFFLINE_INVOICES_KEY, JSON.stringify(pendingList));
    } catch {
      // Storage full
    }
    return offlineItem;
  },

  removePendingInvoice(id: string) {
    const pendingList = this.getPendingInvoices().filter((item) => item.id !== id);
    try {
      localStorage.setItem(OFFLINE_INVOICES_KEY, JSON.stringify(pendingList));
    } catch {
      //
    }
  },

  async syncPendingInvoices(): Promise<number> {
    const pendingList = this.getPendingInvoices();
    if (pendingList.length === 0) return 0;

    let syncedCount = 0;
    for (const item of [...pendingList]) {
      try {
        await api.invoices.createInvoice(item.invoiceData as any);
        this.removePendingInvoice(item.id);
        syncedCount++;
      } catch (err) {
        console.error('Failed to sync offline invoice:', err);
        break; // Stop syncing if network is still unstable
      }
    }

    if (syncedCount > 0) {
      toast.success(`⚡ تم بنجاح مزامنة ${syncedCount} فاتورة مسجلة أوفلاين مع السيرفر!`);
    }

    return syncedCount;
  },

  initAutoSyncListener() {
    window.addEventListener('online', () => {
      toast.success('تمت استعادة الاتصال بالإنترنت 🌐 - جاري مزامنة الفواتير...');
      setTimeout(() => {
        offlineService.syncPendingInvoices();
      }, 1500);
    });
  },
};
