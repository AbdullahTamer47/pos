import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CloseShiftDto {
  @ApiProperty({ example: 12500.50 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  actualCash: number;

  @ApiPropertyOptional({ example: 'Shift closed with discrepancy note' })
  @IsOptional()
  @IsString()
  closingNote?: string;
}