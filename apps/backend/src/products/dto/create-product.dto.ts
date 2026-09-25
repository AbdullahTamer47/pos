import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductUnit {
  PIECE = 'PIECE',
  KG = 'KG',
  LITER = 'LITER',
  BOX = 'BOX',
  METER = 'METER',
  PACK = 'PACK',
  CARTON = 'CARTON',
  DOZEN = 'DOZEN',
}

export class CreateProductUnitDto {
  @ApiProperty({ example: 'Carton' })
  @IsString()
  @MinLength(1)
  unitName: string;

  @ApiProperty({ example: 12 })
  @IsNumber()
  conversionRate: number;

  @ApiPropertyOptional({ example: '6281234567890' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 120 })
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateProductVariantOptionDto {
  @ApiProperty({ example: 'color' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Red' })
  @IsString()
  @MinLength(1)
  value: string;
}

export class CreateProductVariantDto {
  @ApiProperty({ example: 'Large Red' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'PRD-001-LR' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: '6281234567891' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiPropertyOptional({ type: [CreateProductVariantOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantOptionDto)
  options?: CreateProductVariantOptionDto[];
}

export class CreateProductDto {
  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 'قهوة عربية' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nameAr: string;

  @ApiProperty({ example: 'Arabic Coffee' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nameEn: string;

  @ApiPropertyOptional({ example: 'قهوة عربية محمصة طازجة' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ example: 'Freshly roasted Arabic coffee' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ example: 'PRD-001' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  sku?: string;

  @ApiPropertyOptional({ example: '6281234567890' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiProperty({ enum: ProductUnit, example: ProductUnit.PIECE })
  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hasExpiry?: boolean;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  expiryDays?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isComposite?: boolean;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockAlert?: number;

  @ApiPropertyOptional({ type: [CreateProductUnitDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductUnitDto)
  units?: CreateProductUnitDto[];

  @ApiPropertyOptional({ type: [CreateProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  compositeProductIds?: string[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  compositeQuantities?: number[];
}