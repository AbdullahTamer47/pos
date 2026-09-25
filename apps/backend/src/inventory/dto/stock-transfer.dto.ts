import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class StockTransferDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  fromWarehouseId: string;

  @ApiProperty({ example: 'clx...' })
  @IsString()
  toWarehouseId: string;

  @ApiProperty({ example: 'clx...' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ example: 'Transfer to main branch' })
  @IsOptional()
  @IsString()
  note?: string;
}