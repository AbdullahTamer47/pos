import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ZatcaService } from './zatca.service';

@Module({
  imports: [PrismaModule],
  providers: [ZatcaService],
  exports: [ZatcaService],
})
export class ZatcaModule {}