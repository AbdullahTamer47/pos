import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Al Jazeera Supplies' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '+966512345678' })
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({ example: 'info@aljazeera.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Ahmed Saleh' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactPerson?: string;

  @ApiPropertyOptional({ example: 'King Fahd Road, Riyadh' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Net 30' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentTerms?: string;

  @ApiPropertyOptional({ example: 'Reliable supplier' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}