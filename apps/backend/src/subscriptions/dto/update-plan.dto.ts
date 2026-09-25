import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { PlanInterval } from './create-plan.dto';

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'الباقة المحدثة' })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiPropertyOptional({ example: 'Updated Plan' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ example: 'وصف محدث' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxBranches?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxCashiers?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxProducts?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxInvoicesPerMonth?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  durationDays?: number;

  @ApiPropertyOptional({ example: 149.99 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  price?: string;

  @ApiPropertyOptional()
  @IsOptional()
  features?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: PlanInterval })
  @IsOptional()
  @IsEnum(PlanInterval)
  interval?: PlanInterval;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}