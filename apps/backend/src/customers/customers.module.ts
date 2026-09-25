import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { GiftCardsController } from './gift-cards.controller';
import { GiftCardsService } from './gift-cards.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [CustomersController, LoyaltyController, GiftCardsController],
  providers: [CustomersService, LoyaltyService, GiftCardsService],
  exports: [CustomersService, LoyaltyService, GiftCardsService],
})
export class CustomersModule {}