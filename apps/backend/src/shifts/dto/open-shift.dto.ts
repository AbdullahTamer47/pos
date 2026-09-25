import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenShiftDto {
  @ApiProperty({ example: 200, description: 'Opening cash amount (الفكة / العهدة الافتتاحية)' })
  @IsNumber()
  @Min(0)
  openingCash: number;

  @ApiPropertyOptional({ example: 'clx...', description: 'Branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: 'وردية الصباح' })
  @IsOptional()
  @IsString()
  notes?: string;
}
