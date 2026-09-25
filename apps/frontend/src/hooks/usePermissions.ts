import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@smartpos/types';
import type { CashierPermission } from '@smartpos/types';

export interface Permissions {
  hasPermission: (permission: keyof CashierPermission) => boolean;
  canSell: boolean;
  canReturn: boolean;
  canDiscount: boolean;
  maxDiscountPercent: number;
  canViewCostPrice: boolean;
  canEditPrice: boolean;
  canCancelInvoice: boolean;
  canViewAllInvoices: boolean;
  canManageCustomers: boolean;
  canViewReports: boolean;
  canManageInventory: boolean;
  canHoldInvoice: boolean;
  canOpenCloseShift: boolean;
  isSuperAdmin: boolean;
  isTrader: boolean;
  isManager: boolean;
  isCashier: boolean;
}

export function usePermissions(): Permissions {
  const { user } = useAuthStore();

  return useMemo(() => {
    const role = user?.role as UserRole | undefined;
    const cashierProfile = user?.permissions as CashierPermission | undefined | null;

    const isSuperAdmin = role === UserRole.SUPER_ADMIN;
    const isTrader = role === UserRole.TRADER;
    const isManager = role === UserRole.MANAGER;
    const isCashier = role === UserRole.CASHIER;

    const isElevated = isSuperAdmin || isTrader || isManager;

    const hasPermission = (permission: keyof CashierPermission): boolean => {
      if (isElevated) return true;
      if (isCashier && cashierProfile) {
        return !!cashierProfile[permission];
      }
      return false;
    };

    return {
      hasPermission,
      canSell: isElevated || (cashierProfile?.can_sell ?? false),
      canReturn: isElevated || (cashierProfile?.can_return ?? false),
      canDiscount: isElevated || (cashierProfile?.can_apply_discount ?? false),
      maxDiscountPercent: isElevated ? 100 : (cashierProfile?.max_discount_percent ?? 0),
      canViewCostPrice: isElevated || (cashierProfile?.can_view_cost_price ?? false),
      canEditPrice: isElevated || (cashierProfile?.can_edit_price ?? false),
      canCancelInvoice: isElevated || (cashierProfile?.can_cancel_invoice ?? false),
      canViewAllInvoices: isElevated || (cashierProfile?.can_view_all_invoices ?? false),
      canManageCustomers: isElevated || (cashierProfile?.can_manage_customers ?? false),
      canViewReports: isElevated || (cashierProfile?.can_view_reports ?? false),
      canManageInventory: isElevated || (cashierProfile?.can_manage_inventory ?? false),
      canHoldInvoice: isElevated || (cashierProfile?.can_hold_invoice ?? false),
      canOpenCloseShift: isElevated || (cashierProfile?.can_open_close_shift ?? false),
      isSuperAdmin,
      isTrader,
      isManager,
      isCashier,
    };
  }, [user]);
}