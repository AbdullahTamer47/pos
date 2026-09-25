import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ShiftsService } from './shifts.service';
import { ExpensesService } from './expenses.service';
import { RevenuesService } from './revenues.service';
import { TaxConfigService } from './tax-config.service';
import { ShiftsController } from './shifts.controller';
import { ExpensesController } from './expenses.controller';
import { RevenuesController } from './revenues.controller';
import { TaxConfigController } from './tax-config.controller';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [
    ShiftsController,
    ExpensesController,
    RevenuesController,
    TaxConfigController,
  ],
  providers: [
    ShiftsService,
    ExpensesService,
    RevenuesService,
    TaxConfigService,
  ],
  exports: [
    ShiftsService,
    ExpensesService,
    RevenuesService,
    TaxConfigService,
  ],
})
export class AccountingModule {}