import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'المستودع الرئيسي' })
  @IsString()
  @MinLength(2)
  nameAr: string;

  @ApiProperty({ example: 'Main Warehouse' })
  @IsString()
  @MinLength(2)
  nameEn: string;

  @ApiProperty({ example: 'WH001' })
  @IsString()
  @MinLength(2)
  code: string;

  @ApiProperty({ example: 'clx...' })
  @IsString()
  branchId: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}