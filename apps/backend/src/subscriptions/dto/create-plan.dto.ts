import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsDecimal,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PlanInterval {
  TRIAL = 'TRIAL',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class CreatePlanDto {
  @ApiProperty({ example: 'الباقة الأساسية' })
  @IsString()
  nameAr: string;

  @ApiProperty({ example: 'Basic Plan' })
  @IsString()
  nameEn: string;

  @ApiPropertyOptional({ example: 'باقة مناسبة للشركات الصغيرة' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ example: 'Suitable for small businesses' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxBranches: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxCashiers: number;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxProducts: number;

  @ApiProperty({ example: 1000 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxInvoicesPerMonth: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  durationDays: number;

  @ApiProperty({ example: 99.99 })
  @IsDecimal({ decimal_digits: '0,2' })
  price: string;

  @ApiPropertyOptional({
    example: { zReport: true, eInvoice: false, apiAccess: false },
  })
  @IsOptional()
  features?: Record<string, unknown>;

  @ApiProperty({ enum: PlanInterval, example: PlanInterval.MONTHLY })
  @IsEnum(PlanInterval)
  interval: PlanInterval;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}