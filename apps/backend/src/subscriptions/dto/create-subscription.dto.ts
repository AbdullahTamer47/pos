import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  planId: string;

  @ApiPropertyOptional({ example: 'CARD' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'pay_ref_123' })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  autoRenew?: boolean;
}