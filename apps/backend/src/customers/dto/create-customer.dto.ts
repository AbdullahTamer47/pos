import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsEnum,
  Min,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export enum CustomerTier {
  REGULAR = 'REGULAR',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

export class CreateCustomerAddressDto {
  @ApiProperty({ example: 'Home' })
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @MinLength(1)
  address: string;

  @ApiPropertyOptional({ example: 'Riyadh' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Al Olaya' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ example: '12221' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 24.7136 })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 46.6753 })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateCustomerDto {
  @ApiProperty({ example: 'Abdullah Al Otaibi' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '+966512345678' })
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({ example: 'abdullah@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: CustomerTier, example: CustomerTier.REGULAR })
  @IsOptional()
  @IsEnum(CustomerTier)
  tier?: CustomerTier;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ example: 'Preferred customer' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ type: [CreateCustomerAddressDto] })
  @IsOptional()
  addresses?: CreateCustomerAddressDto[];
}