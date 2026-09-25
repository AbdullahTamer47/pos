import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaxConfigDto {
  @ApiProperty({ example: 'VAT 15%' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 15, description: 'Tax rate percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  rate: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isDefault?: boolean;

  @ApiPropertyOptional({ example: '300123456789003' })
  @IsOptional()
  @IsString()
  taxNumber?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}