import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

const tenantStorage = new AsyncLocalStorage<Map<string, unknown>>();

export function getCurrentTenantId(): string | undefined {
  const store = tenantStorage.getStore();
  return store?.get('tenantId') as string | undefined;
}

export function getTenantStorage(): AsyncLocalStorage<Map<string, unknown>> {
  return tenantStorage;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();

    this.$use(async (params, next) => {
      const tenantId = getCurrentTenantId();

      if (tenantId && this.isTenantModel(params.model)) {
        const action = params.action as string;

        if (action === 'findMany' || action === 'findFirst') {
          if (!params.args) params.args = {};
          if (!params.args.where) params.args.where = {};
          if (!params.args.where.tenantId) {
            params.args.where.tenantId = tenantId;
          }
        }

        if (action === 'create') {
          if (params.args && params.args.data && !params.args.data.tenantId) {
            params.args.data.tenantId = tenantId;
          }
        }
      }

      return next(params);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  private isTenantModel(model: string | undefined): boolean {
    if (!model) return false;
    const tenantModels = [
      'User',
      'Product',
      'Category',
      'Order',
      'Customer',
      'Supplier',
      'Inventory',
      'Invoice',
      'Payment',
      'CashierSession',
      'Shift',
      'Store',
      'Warehouse',
      'TaxRate',
      'Discount',
      'Unit',
      'Brand',
      'AuditLog',
      'PriceList',
      'PurchaseOrder',
      'SalesReport',
      'Expense',
      'Return',
      'Transfer',
      'Device',
    ];
    return tenantModels.includes(model);
  }
}