import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: RedisService,
      useFactory: (configService: ConfigService) => {
        return new RedisService({
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password', ''),
          db: configService.get<number>('redis.db', 0),
          keyPrefix: configService.get<string>('redis.keyPrefix', 'smartpos:'),
          retryStrategy: (times: number) => Math.min(times * 50, 2000),
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
          lazyConnect: true,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}