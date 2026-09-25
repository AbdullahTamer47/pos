import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PromotionType {
  BUY_X_GET_Y = 'BUY_X_GET_Y',
  BUNDLE = 'BUNDLE',
  DISCOUNT = 'DISCOUNT',
}

export class BuyXGetYConfig {
  @ApiProperty({ example: 'product-id-123' })
  @IsString()
  buyProductId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  buyQuantity: number;

  @ApiProperty({ example: 'product-id-456' })
  @IsString()
  getProductId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  getQuantity: number;

  @ApiPropertyOptional({ example: 100, description: 'Discount percentage on free item (100 = free)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;
}

export class BundleConfig {
  @ApiProperty({ example: 'combo-id-789' })
  @IsString()
  bundleProductId: string;

  @ApiProperty({ example: 150, description: 'Special bundle price' })
  @IsNumber()
  @Min(0)
  bundlePrice: number;

  @ApiProperty({ description: 'Array of product IDs included in bundle' })
  @IsArray()
  @IsString({ each: true })
  includedProductIds: string[];

  @ApiProperty({ description: 'Quantities corresponding to includedProductIds' })
  @IsArray()
  @IsNumber({}, { each: true })
  quantities: number[];
}

export class DiscountConfig {
  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED'] })
  @IsString()
  discountType: string;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ description: 'Apply to specific product IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableProductIds?: string[];

  @ApiPropertyOptional({ description: 'Apply to specific category IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategoryIds?: string[];

  @ApiPropertyOptional({ example: 100, description: 'Minimum cart total to apply' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minCartAmount?: number;
}

export class CreatePromotionDto {
  @ApiProperty({ example: 'Buy 2 Get 1 Free' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nameAr: string;

  @ApiProperty({ example: 'Buy 2 Get 1 Free' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nameEn: string;

  @ApiProperty({ enum: PromotionType, example: PromotionType.BUY_X_GET_Y })
  @IsEnum(PromotionType)
  type: PromotionType;

  @ApiProperty({ description: 'Configuration object based on promotion type' })
  @IsObject()
  config: Record<string, unknown>;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-12-31T23:59:59.000Z' })
  @IsDateString()
  endDate: string;
}