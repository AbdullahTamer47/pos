import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { MainGateway } from './websocket.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'super-secret-key-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
    PrismaModule,
  ],
  providers: [MainGateway],
  exports: [MainGateway],
})
export class WebSocketModule {}