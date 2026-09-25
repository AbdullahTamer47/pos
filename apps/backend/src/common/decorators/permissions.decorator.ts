import { SetMetadata } from '@nestjs/common';

export enum CashierPermission {
  CREATE_SALE = 'CREATE_SALE',
  PROCESS_REFUND = 'PROCESS_REFUND',
  APPLY_DISCOUNT = 'APPLY_DISCOUNT',
  VOID_TRANSACTION = 'VOID_TRANSACTION',
  OPEN_DRAWER = 'OPEN_DRAWER',
  VIEW_REPORTS = 'VIEW_REPORTS',
  MANAGE_CUSTOMERS = 'MANAGE_CUSTOMERS',
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  HOLD_ORDER = 'HOLD_ORDER',
  SPLIT_PAYMENT = 'SPLIT_PAYMENT',
}

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: CashierPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);