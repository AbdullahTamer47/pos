import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  AxiosError,
} from 'axios';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token!);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken, user } = useAuthStore.getState();

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (user?.tenantId && config.headers) {
      config.headers['x-tenant-id'] = user.tenantId;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = (response.data as { data: unknown }).data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const responseBody = response.data as { data?: { accessToken: string; refreshToken: string } } | { accessToken: string; refreshToken: string };
        const tokenData = (responseBody as { data?: { accessToken: string; refreshToken: string } }).data ?? responseBody as { accessToken: string; refreshToken: string };

        setTokens(tokenData.accessToken, tokenData.refreshToken || refreshToken);

        processQueue(null, tokenData.accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokenData.accessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const errorResponse = error.response?.data as { message?: string } | undefined;
    const message =
      errorResponse?.message ||
      (error.response?.status === 500
        ? 'Server error occurred'
        : error.response?.status === 404
          ? 'Resource not found'
          : error.response?.status === 403
            ? 'Access forbidden'
            : error.message || 'An unexpected error occurred');

    const customError = new Error(message);
    (customError as Error & { status?: number; data?: unknown }).status = error.response?.status;
    (customError as Error & { status?: number; data?: unknown }).data = error.response?.data;

    return Promise.reject(customError);
  }
);

import { mockDb } from './mockDb';

function handleMockRoute(method: string, url: string, data?: any, config?: AxiosRequestConfig): any {
  const cleanUrl = url.replace(/^\/api\/v1/, '').replace(/^\//, '');
  const params = config?.params || {};

  // 1. Products
  if (cleanUrl.startsWith('products')) {
    const parts = cleanUrl.split('/');
    const id = parts[1] || '';
    if (method === 'GET') {
      if (cleanUrl.includes('search')) {
        const query = parts[2] ? decodeURIComponent(parts[2]) : (params.search || '');
        return mockDb.getProducts({ ...params, search: query });
      }
      if (parts.length === 2 && id && id !== 'search') {
        return mockDb.getProduct(id);
      }
      return mockDb.getProducts(params);
    }
    if (method === 'POST') {
      return mockDb.createProduct(data);
    }
    if (method === 'PUT' || method === 'PATCH') {
      return mockDb.updateProduct(id, data);
    }
    if (method === 'DELETE') {
      return mockDb.deleteProduct(id);
    }
  }

  // 2. Categories
  if (cleanUrl.startsWith('categories')) {
    const parts = cleanUrl.split('/');
    const id = parts[1] || '';
    if (method === 'GET') {
      return mockDb.getCategories(params);
    }
    if (method === 'POST') {
      return mockDb.createCategory(data);
    }
    if (method === 'PUT' || method === 'PATCH') {
      return mockDb.updateCategory(id, data);
    }
    if (method === 'DELETE') {
      return mockDb.deleteCategory(id);
    }
  }

  // 3. Customers
  if (cleanUrl.startsWith('customers')) {
    const parts = cleanUrl.split('/');
    const id = parts[1] || '';
    if (cleanUrl.includes('/ledger')) {
      const invs = mockDb.getInvoices({ limit: 100 }).data.filter((i) => i.customerId === id);
      const entries = invs.map((i) => ({
        id: `ledg-${i.id}`,
        customerId: id,
        date: i.createdAt,
        type: i.status === 'refunded' ? 'REFUND' : 'INVOICE',
        amount: i.totalAmount || i.total || 0,
        balance: 0,
        description: `فاتورة #${i.invoiceNumber}`,
      }));
      return { data: entries, total: entries.length, page: 1, limit: 10, totalPages: 1 };
    }
    if (cleanUrl.includes('/statistics')) {
      const cust = mockDb.getCustomer(id);
      return {
        totalSpent: cust?.totalSpent || 0,
        totalOrders: cust?.totalOrders || 0,
        averageOrderValue: cust?.totalOrders ? Math.round(((cust.totalSpent || 0) / cust.totalOrders) * 100) / 100 : 0,
        lastOrderDate: cust?.createdAt || new Date().toISOString(),
      };
    }
    if (cleanUrl.includes('/loyalty/earn')) {
      return mockDb.earnLoyaltyPoints(id, Number(data?.points) || 0, data?.description);
    }
    if (cleanUrl.includes('/loyalty/redeem')) {
      return mockDb.redeemLoyaltyPoints(id, Number(data?.points) || 0, data?.description);
    }
    if (cleanUrl.includes('/payment')) {
      return { message: 'تم تسجيل الدفعة بنجاح', newBalance: 0 };
    }
    if (method === 'GET') {
      if (parts.length === 2 && id && id !== 'search') {
        return mockDb.getCustomer(id);
      }
      return mockDb.getCustomers(params);
    }
    if (method === 'POST') {
      return mockDb.createCustomer(data);
    }
    if (method === 'PUT' || method === 'PATCH') {
      return mockDb.updateCustomer(id, data);
    }
    if (method === 'DELETE') {
      return mockDb.deleteCustomer(id);
    }
  }

  // 4. Suppliers
  if (cleanUrl.startsWith('suppliers')) {
    const parts = cleanUrl.split('/');
    const id = parts.length > 1 && parts[1] && parts[1] !== 'ledger' ? parts[1] : '';
    if (method === 'GET') {
      if (id) {
        return mockDb.getSupplier(id);
      }
      return mockDb.getSuppliers(params);
    }
    if (method === 'POST') {
      return mockDb.createSupplier(data);
    }
    if (method === 'PUT' || method === 'PATCH') {
      return mockDb.updateSupplier(id, data);
    }
    if (method === 'DELETE' && id) {
      return mockDb.deleteSupplier(id);
    }
  }

  // 4b. Purchase Orders
  if (cleanUrl.startsWith('purchase-orders')) {
    const parts = cleanUrl.split('/');
    if (cleanUrl.includes('/status')) {
      const id = parts[1] || '';
      const status = (data as any)?.status || 'ordered';
      return mockDb.changePOStatus(id, status);
    }
    const id = parts.length > 1 && parts[1] && parts[1] !== 'undefined' ? parts[1] : undefined;
    if (method === 'GET') {
      if (id) {
        return mockDb.getPurchaseOrder(id);
      }
      return mockDb.getPurchaseOrders(params);
    }
    if (method === 'POST') {
      return mockDb.createPurchaseOrder(data);
    }
    if (method === 'PUT' || method === 'PATCH') {
      return mockDb.updatePurchaseOrder(id!, data);
    }
    if (method === 'DELETE' && id) {
      return mockDb.deletePurchaseOrder(id);
    }
  }

  // 5. Invoices & Sales
  if (cleanUrl.startsWith('invoices') || cleanUrl.startsWith('sales')) {
    if (cleanUrl.includes('hold')) {
      if (cleanUrl.includes('/resume')) {
        const parts = cleanUrl.split('/');
        const id = parts[2] || '';
        return mockDb.resumeHeldInvoice(id);
      }
      const parts = cleanUrl.split('/');
      const id = parts.length > 2 ? parts[2] : undefined;
      if (method === 'GET') {
        return mockDb.getHeldInvoices();
      }
      if (method === 'POST') {
        return mockDb.holdInvoice(data);
      }
      if (method === 'DELETE' && id) {
        return mockDb.deleteHeldInvoice(id);
      }
    }

    if (cleanUrl.includes('/return')) {
      const parts = cleanUrl.split('/');
      const id = parts[1] || '';
      return mockDb.returnInvoice(id, data);
    }
    if (cleanUrl.includes('/cancel')) {
      const parts = cleanUrl.split('/');
      const id = parts[1] || '';
      return mockDb.cancelInvoice(id);
    }
    if (cleanUrl.includes('/convert-to-sale')) {
      const parts = cleanUrl.split('/');
      const id = parts[1] || '';
      return mockDb.getInvoice(id);
    }

    const parts = cleanUrl.split('/');
    if (method === 'GET') {
      if (parts.length === 2 && parts[1] && parts[1] !== 'hold') {
        return mockDb.getInvoice(parts[1]);
      }
      return mockDb.getInvoices(params);
    }
    if (method === 'POST') {
      return mockDb.createInvoice(data);
    }
  }

  // 6. Shifts
  if (cleanUrl.startsWith('shifts')) {
    if (cleanUrl.includes('current')) {
      return mockDb.getCurrentShift();
    }
    if (cleanUrl.includes('open')) {
      return mockDb.openShift(data);
    }
    if (cleanUrl.includes('close')) {
      return mockDb.closeShift('shift-1', data);
    }
    return mockDb.getCurrentShift();
  }

  // 7. Admin Dashboard & Admin Settings (للمشرف العام)
  if (cleanUrl === 'admin/dashboard' || cleanUrl === 'admin') {
    return mockDb.getAdminDashboard();
  }
  if (cleanUrl.startsWith('admin/settings')) {
    if (method === 'PUT') {
      return { success: true, ...mockDb.getAdminSettings(), ...(data as any) };
    }
    return mockDb.getAdminSettings();
  }

  // 8. Tenants (إدارة التجار)
  if (cleanUrl.startsWith('tenants')) {
    if (cleanUrl === 'tenants/settings' || cleanUrl.includes('/settings') || cleanUrl === 'tenants/current') {
      return mockDb.getTenantSettings();
    }
    const parts = cleanUrl.split('/');
    const targetId = parts[1] || '';
    if (cleanUrl.includes('toggle-active')) {
      return mockDb.toggleTenantActive(targetId);
    }
    if (cleanUrl.includes('branding')) {
      return mockDb.updateBranding(targetId, data);
    }
    if (method === 'POST') {
      return mockDb.createTenant(data);
    }
    if (method === 'PUT') {
      return mockDb.updateTenant(targetId, data);
    }
    if (method === 'DELETE') {
      return mockDb.deleteTenant(targetId);
    }
    if (parts.length > 1 && targetId) {
      return mockDb.getTenant(targetId);
    }
    const params = (config?.params || {}) as any;
    return mockDb.getTenants(params);
  }

  // 9. Plans (باقات الاشتراك)
  if (cleanUrl.startsWith('plans')) {
    const parts = cleanUrl.split('/');
    const planId = parts[1] || '';
    if (method === 'POST') {
      return mockDb.createPlan(data);
    }
    if (method === 'PUT') {
      return mockDb.updatePlan(planId, data);
    }
    if (method === 'DELETE') {
      return mockDb.deletePlan(planId);
    }
    if (parts.length > 1 && planId) {
      return mockDb.getPlan(planId);
    }
    const params = (config?.params || {}) as any;
    return mockDb.getPlans(params);
  }

  // 9b. Subscriptions (اشتراكات التجار)
  if (cleanUrl.startsWith('subscriptions')) {
    const parts = cleanUrl.split('/');
    if (cleanUrl.includes('current')) {
      const tenantId = parts[2] || undefined;
      return mockDb.getCurrentSubscription(tenantId);
    }
    if (cleanUrl.includes('renew') && method === 'POST') {
      const subId = parts[1] || '';
      return mockDb.renewSubscription(subId);
    }
    if (method === 'POST') {
      return mockDb.getCurrentSubscription((data as any)?.tenantId);
    }
    const params = (config?.params || {}) as any;
    return mockDb.getSubscriptions(params);
  }

  // Shifts (الورديات والدرج)
  if (cleanUrl.startsWith('shifts')) {
    const parts = cleanUrl.split('/');
    if (cleanUrl.includes('current') || cleanUrl.includes('active')) {
      return mockDb.getCurrentShift();
    }
    if (cleanUrl.includes('open') && method === 'POST') {
      return mockDb.openShift(data as any);
    }
    if (cleanUrl.includes('close') && method === 'POST') {
      const shiftId = parts[1] || '';
      return mockDb.closeShift(shiftId, data as any);
    }
    if (cleanUrl.includes('expenses') && method === 'POST') {
      const shiftId = parts[1] || '';
      return mockDb.addExpense(shiftId, data as any);
    }
    if (cleanUrl.includes('summary')) {
      const shiftId = parts[1] || '';
      return mockDb.getShiftSummary(shiftId);
    }
    const params = (config?.params || {}) as any;
    return mockDb.getShifts(params);
  }

  // Backups (النسخ الاحتياطي)
  if (cleanUrl.startsWith('backups')) {
    const parts = cleanUrl.split('/');
    if (method === 'POST') {
      return mockDb.createBackup();
    }
    if (method === 'DELETE') {
      const backupId = parts[1] || '';
      return mockDb.deleteBackup(backupId);
    }
    return mockDb.getBackups();
  }

  // Users (المستخدمين والكاشيرات)
  if (cleanUrl.startsWith('users')) {
    const parts = cleanUrl.split('/');
    const userId = parts[1] || '';
    if (cleanUrl.includes('permissions') && (method === 'PUT' || method === 'PATCH')) {
      return mockDb.updateUserPermissions(userId, (data as any)?.permissions || []);
    }
    if (cleanUrl.includes('toggle-active')) {
      return mockDb.toggleUserActive(userId);
    }
    if (method === 'POST') {
      return mockDb.createUser(data);
    }
    if (method === 'PUT' || method === 'PATCH') {
      return mockDb.updateUser(userId, data);
    }
    if (method === 'DELETE') {
      return mockDb.deleteUser(userId);
    }
    if (parts.length > 1 && userId && userId !== 'search') {
      return mockDb.getUser(userId);
    }
    const params = (config?.params || {}) as any;
    return mockDb.getUsers(params);
  }

  // Coupons (الكوبونات والخصومات)
  if (cleanUrl.startsWith('coupons')) {
    const parts = cleanUrl.split('/');
    if (cleanUrl.includes('validate') && method === 'POST') {
      const { code, orderAmount } = (data as any) || {};
      return mockDb.validateCoupon(code, orderAmount);
    }
    if (method === 'POST') {
      return mockDb.createCoupon(data);
    }
    if (method === 'DELETE') {
      const couponId = parts[1] || '';
      return mockDb.deleteCoupon(couponId);
    }
    return mockDb.getCoupons();
  }

  // 10. Tickets (تذاكر الدعم الفني)
  if (cleanUrl.startsWith('tickets')) {
    const parts = cleanUrl.split('/');
    const ticketId = parts[1] || '';
    if (cleanUrl.includes('messages') && method === 'POST') {
      return mockDb.addTicketMessage(ticketId, data as any);
    }
    if (method === 'PUT' || method === 'PATCH') {
      return mockDb.updateTicket(ticketId, data);
    }
    if (parts.length > 1 && ticketId) {
      return mockDb.getTicket(ticketId);
    }
    const params = (config?.params || {}) as any;
    return mockDb.getTickets(params);
  }

  // Inventory (المخزون وحركات الصنف والتسوية)
  if (cleanUrl.startsWith('inventory')) {
    if (cleanUrl.includes('stock')) {
      return mockDb.getStock(params);
    }
    if (cleanUrl.includes('movements')) {
      return mockDb.getMovements(params);
    }
    if (cleanUrl.includes('adjust') && method === 'POST') {
      return mockDb.adjustStock(data);
    }
    if (cleanUrl.includes('transfer') && method === 'POST') {
      return mockDb.transferStock(data);
    }
    if (cleanUrl.includes('alerts')) {
      const prods = mockDb.getProducts({ limit: 100 }).data;
      return prods
        .filter((p: any) => p.stock <= (p.minStock || 10))
        .map((p: any) => ({
          productId: p.id,
          productName: p.nameAr || p.name,
          warehouseId: 'wh-main',
          warehouseName: 'المخزن الرئيسي',
          currentStock: p.stock,
          minStock: p.minStock || 10,
          severity: p.stock <= 0 ? 'critical' : 'high',
        }));
    }
    return mockDb.getStock(params);
  }

  // Warehouses (المخازن والمستودعات)
  if (cleanUrl.startsWith('warehouses')) {
    return mockDb.getWarehouses();
  }

  // Loyalty (برنامج ولاء العملاء)
  if (cleanUrl.startsWith('loyalty')) {
    if (cleanUrl.includes('earn') && method === 'POST') {
      return mockDb.earnLoyaltyPoints(data?.customerId, Number(data?.points) || 0, data?.description);
    }
    if (cleanUrl.includes('redeem') && method === 'POST') {
      return mockDb.redeemLoyaltyPoints(data?.customerId, Number(data?.points) || 0, data?.description);
    }
    if (cleanUrl.includes('config')) {
      return { enabled: true, pointsPerCurrency: 0.1, currencyPerPoint: 0.1, minRedeemPoints: 10 };
    }
  }

  // Gift Cards (بطاقات الهدايا)
  if (cleanUrl.startsWith('gift-cards')) {
    const parts = cleanUrl.split('/');
    if (cleanUrl.includes('validate') && method === 'POST') {
      return mockDb.validateGiftCard(data?.code);
    }
    if (method === 'POST') {
      return mockDb.issueGiftCard(data?.customerId, data);
    }
    if (method === 'PUT') {
      return { success: true };
    }
    if (cleanUrl.includes('deactivate')) {
      return { success: true };
    }
    if (parts.length > 1 && parts[1] && parts[1] !== 'validate') {
      const cards = mockDb.getGiftCards().data;
      const found = cards.find((c: any) => c.id === parts[1] || c.code === parts[1]);
      return found || cards[0];
    }
    return mockDb.getGiftCards();
  }

  // 11. General Settings
  if (cleanUrl.startsWith('settings')) {
    return mockDb.getTenantSettings();
  }

  // 8. Auth
  if (cleanUrl.startsWith('auth')) {
    if (cleanUrl.includes('login')) {
      const identifier = String(data?.identifier || data?.phone || data?.email || '');
      const isSuper = identifier.toLowerCase().includes('admin') || identifier === '01099999999';
      return {
        user: {
          id: isSuper ? 'admin-1' : 'trader-1',
          name: isSuper ? 'مدير النظام (Super Admin)' : 'متجر الأمل الذكي (التاجر)',
          email: identifier.includes('@') ? identifier : (isSuper ? 'admin@smartpos.com' : 'trader@demo.com'),
          phone: !identifier.includes('@') && identifier.length >= 7 ? identifier : (isSuper ? '01099999999' : '01012345678'),
          role: isSuper ? 'SUPER_ADMIN' : 'TRADER',
          tenantId: 'tenant-1',
          isActive: true,
        },
        tokens: {
          accessToken: 'demo-token-access',
          refreshToken: 'demo-token-refresh',
          expiresIn: 86400,
        },
      };
    }
    return { success: true };
  }

  // 9. Reports
  if (cleanUrl.startsWith('reports')) {
    const invoices = mockDb.getInvoices({ limit: 1000 });
    const totalRev = invoices.data.reduce((acc, inv) => acc + (Number(inv.totalAmount) || Number(inv.total) || 0), 0);
    const totalOrders = invoices.total;
    const avgOrder = totalOrders > 0 ? totalRev / totalOrders : 0;
    const products = mockDb.getProducts({ limit: 1000 }).data;

    // Top products by revenue
    const productSalesMap: Record<string, { nameAr: string; nameEn: string; revenue: number; quantity: number }> = {};
    invoices.data.forEach((inv) => {
      (inv.items || []).forEach((it: any) => {
        const key = it.productName || 'صنف';
        if (!productSalesMap[key]) {
          productSalesMap[key] = { nameAr: key, nameEn: key, revenue: 0, quantity: 0 };
        }
        productSalesMap[key].quantity += (Number(it.quantity) || 1);
        productSalesMap[key].revenue += (Number(it.total) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0));
      });
    });
    const topProductsList = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Low stock and out of stock counts
    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= (Number((p as any).minStockLevel) || 10)).length;
    const outOfStockCount = products.filter((p) => p.stock <= 0).length;

    // 7-day daily breakdown for charts
    const now = new Date();
    const grouped = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0] || '';
      const dayName = d.toLocaleDateString('ar-EG', { weekday: 'short' });

      const dayInvoices = invoices.data.filter((inv) => String(inv.createdAt || inv.invoiceDate || '').startsWith(dateStr));
      const dayRev = dayInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || Number(inv.total) || 0), 0);

      grouped.push({
        period: dayName,
        date: dateStr,
        count: dayInvoices.length,
        orders: dayInvoices.length,
        revenue: dayRev,
        sales: dayRev,
      });
    }

    return {
      summary: {
        totalRevenue: totalRev,
        totalSales: totalOrders,
        averageOrderValue: avgOrder,
      },
      netProfit: Math.round(totalRev * 0.35 * 100) / 100,
      totalRevenue: totalRev,
      revenue: totalRev,
      totalSales: totalOrders,
      orders: totalOrders,
      lowStockCount,
      outOfStockCount,
      products: topProductsList,
      grouped,
      data: invoices.data,
    };
  }

  return { data: [], total: 0, page: 1, limit: 10, totalPages: 1, success: true };
}

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const hasExternalApi = Boolean(import.meta.env.VITE_API_URL);
  if (hasExternalApi) {
    try {
      const response = await apiClient.get<T>(url, config);
      return response.data;
    } catch {
      return handleMockRoute('GET', url, undefined, config) as T;
    }
  }
  return handleMockRoute('GET', url, undefined, config) as T;
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const hasExternalApi = Boolean(import.meta.env.VITE_API_URL);
  if (hasExternalApi) {
    try {
      const response = await apiClient.post<T>(url, data, config);
      return response.data;
    } catch {
      return handleMockRoute('POST', url, data, config) as T;
    }
  }
  return handleMockRoute('POST', url, data, config) as T;
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const hasExternalApi = Boolean(import.meta.env.VITE_API_URL);
  if (hasExternalApi) {
    try {
      const response = await apiClient.put<T>(url, data, config);
      return response.data;
    } catch {
      return handleMockRoute('PUT', url, data, config) as T;
    }
  }
  return handleMockRoute('PUT', url, data, config) as T;
}

export async function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const hasExternalApi = Boolean(import.meta.env.VITE_API_URL);
  if (hasExternalApi) {
    try {
      const response = await apiClient.patch<T>(url, data, config);
      return response.data;
    } catch {
      return handleMockRoute('PATCH', url, data, config) as T;
    }
  }
  return handleMockRoute('PATCH', url, data, config) as T;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const hasExternalApi = Boolean(import.meta.env.VITE_API_URL);
  if (hasExternalApi) {
    try {
      const response = await apiClient.delete<T>(url, config);
      return response.data;
    } catch {
      return handleMockRoute('DELETE', url, undefined, config) as T;
    }
  }
  return handleMockRoute('DELETE', url, undefined, config) as T;
}

export async function uploadFile<T>(
  url: string,
  file: File | Blob,
  fieldName = 'file',
  onProgress?: (progress: number) => void
): Promise<T> {
  const hasExternalApi = Boolean(import.meta.env.VITE_API_URL);
  if (hasExternalApi) {
    try {
      const formData = new FormData();
      formData.append(fieldName, file);
      const response = await apiClient.post<T>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (pe) => {
          if (onProgress && pe.total) onProgress(Math.round((pe.loaded * 100) / pe.total));
        },
      });
      return response.data;
    } catch {
      // Fallback
    }
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({ url: reader.result as string } as T);
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadMultipleFiles<T>(
  url: string,
  files: (File | Blob)[],
  fieldName = 'files',
  onProgress?: (progress: number) => void
): Promise<T> {
  const hasExternalApi = Boolean(import.meta.env.VITE_API_URL);
  if (hasExternalApi) {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append(fieldName, file));
      const response = await apiClient.post<T>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (pe) => {
          if (onProgress && pe.total) onProgress(Math.round((pe.loaded * 100) / pe.total));
        },
      });
      return response.data;
    } catch {
      // Fallback
    }
  }
  const promises = files.map(
    (f) =>
      new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.readAsDataURL(f);
      })
  );
  const urls = await Promise.all(promises);
  return { urls } as T;
}

export type { AxiosRequestConfig };
export default apiClient;