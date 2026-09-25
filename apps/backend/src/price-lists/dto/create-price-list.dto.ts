import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';

export enum PriceListType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  SEMI = 'SEMI',
  VIP = 'VIP',
  CUSTOM = 'CUSTOM',
}

export class CreatePriceListDto {
  @ApiProperty({ example: 'قائمة أسعار الجملة' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nameAr: string;

  @ApiProperty({ example: 'Wholesale Price List' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nameEn: string;

  @ApiProperty({ enum: PriceListType, example: PriceListType.WHOLESALE })
  @IsEnum(PriceListType)
  type: PriceListType;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}