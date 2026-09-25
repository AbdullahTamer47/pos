import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export class CreateCouponDto {
  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @ApiProperty({ enum: CouponType, example: CouponType.PERCENTAGE })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({ example: 20, description: 'Percentage (1-100) or fixed amount' })
  @IsNumber()
  @Min(0.01)
  value: number;

  @ApiPropertyOptional({ example: 50, description: 'Minimum order amount to apply' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 100, description: 'Maximum total uses' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxUses?: number;

  @ApiPropertyOptional({ example: 1, description: 'Max uses per customer' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxUsesPerCustomer?: number;

  @ApiPropertyOptional({ description: 'Restrict to specific customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-12-31T23:59:59.000Z' })
  @IsDateString()
  endDate: string;
}

export class ValidateCouponDto {
  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiProperty({ example: 250 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  orderAmount: number;

  @ApiPropertyOptional({ description: 'Customer ID for per-customer validation' })
  @IsOptional()
  @IsString()
  customerId?: string;
}