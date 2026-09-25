import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportQueryDto {
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Branch ID to filter by' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ enum: ['day', 'week', 'month'], example: 'day' })
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Specific shift ID' })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiPropertyOptional({ description: 'Customer ID for statement' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Supplier ID for statement' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Cashier ID for performance' })
  @IsOptional()
  @IsString()
  cashierId?: string;

  @ApiPropertyOptional({ description: 'Warehouse ID for inventory' })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Category ID for product filtering' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['quantity', 'revenue'], example: 'revenue' })
  @IsOptional()
  @IsString()
  sortBy?: string;
}