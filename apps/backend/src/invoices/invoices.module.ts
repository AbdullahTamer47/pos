import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ProductsModule } from '../products/products.module';
import { CustomersModule } from '../customers/customers.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, RedisModule, ProductsModule, CustomersModule],
  controllers: [InvoicesController, PaymentsController],
  providers: [InvoicesService, PaymentsService],
  exports: [InvoicesService],
})
export class InvoicesModule {}