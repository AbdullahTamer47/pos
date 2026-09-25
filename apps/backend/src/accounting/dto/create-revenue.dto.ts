import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRevenueDto {
  @ApiProperty({ example: 'branch-id-123' })
  @IsString()
  @MinLength(1)
  branchId: string;

  @ApiProperty({ example: 'SERVICE_FEE', description: 'SERVICE_FEE, INTEREST, SALE_ASSET, OTHER, etc.' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  category: string;

  @ApiProperty({ example: 2500 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ example: 'Service fee for premium support' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: '2025-06-01T00:00:00.000Z' })
  @IsDateString()
  revenueDate: string;
}