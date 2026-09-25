import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { BranchesModule } from './branches/branches.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { VariantsModule } from './variants/variants.module';
import { PriceListsModule } from './price-lists/price-lists.module';
import { InventoryModule } from './inventory/inventory.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { InvoicesModule } from './invoices/invoices.module';
import { CouponsModule } from './coupons/coupons.module';
import { PromotionsModule } from './promotions/promotions.module';
import { ReportsModule } from './reports/reports.module';
import { AccountingModule } from './accounting/accounting.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SupportModule } from './support/support.module';
import { BackupModule } from './backup/backup.module';
import { UploadModule } from './upload/upload.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WebSocketModule } from './websocket/websocket.module';
import { QueuesModule } from './queues/queues.module';
import { WhatsAppModule } from './integrations/whatsapp/whatsapp.module';
import { ZatcaModule } from './integrations/zatca/zatca.module';
import { ShiftsModule } from './shifts/shifts.module';
import { HealthModule } from './health/health.module';
import appConfig from './config/app.config';
import redisConfig from './config/redis.config';
import bullConfig from './config/bull.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, redisConfig, bullConfig],
      envFilePath: ['.env', '.env.local'],
      cache: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('app.throttle.ttl', 60000),
            limit: config.get<number>('app.throttle.limit', 100),
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    SubscriptionsModule,
    BranchesModule,
    WarehousesModule,
    ProductsModule,
    CategoriesModule,
    VariantsModule,
    PriceListsModule,
    InventoryModule,
    CustomersModule,
    SuppliersModule,
    InvoicesModule,
    CouponsModule,
    PromotionsModule,
    ReportsModule,
    AccountingModule,
    NotificationsModule,
    AuditLogsModule,
    SupportModule,
    BackupModule,
    UploadModule,
    ApiKeysModule,
    WebhooksModule,
    WebSocketModule,
    QueuesModule,
    WhatsAppModule,
    ZatcaModule,
    ShiftsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}