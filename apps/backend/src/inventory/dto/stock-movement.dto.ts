import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
  STOCKTAKING = 'STOCKTAKING',
  DAMAGE = 'DAMAGE',
  EXPIRED = 'EXPIRED',
}

export class StockMovementItemDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 'Restock from supplier' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class StockMovementDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  warehouseId: string;

  @ApiProperty({ enum: MovementType, example: MovementType.IN })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({ type: [StockMovementItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockMovementItemDto)
  items: StockMovementItemDto[];

  @ApiPropertyOptional({ example: 'PO-001' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({ example: 'Monthly restock' })
  @IsOptional()
  @IsString()
  note?: string;
}