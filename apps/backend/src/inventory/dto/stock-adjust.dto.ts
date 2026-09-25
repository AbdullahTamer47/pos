import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class StockAdjustDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  warehouseId: string;

  @ApiProperty({ example: 'clx...' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 'Stock count adjustment' })
  @IsOptional()
  @IsString()
  note?: string;
}