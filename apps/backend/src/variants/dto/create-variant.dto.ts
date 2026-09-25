import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantOptionDto {
  @ApiProperty({ example: 'color' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Red' })
  @IsString()
  @MinLength(1)
  value: string;
}

export class CreateVariantDto {
  @ApiProperty({ example: 'Small Blue' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'PRD-001-SB' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: '6281234567892' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 8 })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ example: 18 })
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [CreateVariantOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantOptionDto)
  options?: CreateVariantOptionDto[];
}