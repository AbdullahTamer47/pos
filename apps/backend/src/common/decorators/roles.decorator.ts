import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TRADER = 'TRADER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  INVENTORY_CLERK = 'INVENTORY_CLERK',
  INVENTORY_MANAGER = 'INVENTORY_MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);