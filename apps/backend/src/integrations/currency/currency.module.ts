import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { CurrencyService } from './currency.service';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [CurrencyService],
  exports: [CurrencyService],
})
export class CurrencyModule {}