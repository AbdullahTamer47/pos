import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class UpdateWarehouseDto {
  @ApiPropertyOptional({ example: 'المستودع المحدث' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameAr?: string;

  @ApiPropertyOptional({ example: 'Updated Warehouse' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameEn?: string;

  @ApiPropertyOptional({ example: 'WH002' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}