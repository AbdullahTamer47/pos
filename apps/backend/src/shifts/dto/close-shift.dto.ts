import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseShiftDto {
  @ApiProperty({ example: 1500, description: 'Actual cash counted in drawer (الكاش الفعلي في الدرج)' })
  @IsNumber()
  @Min(0)
  actualCash: number;

  @ApiPropertyOptional({ example: 'تم تسليم الدرج والعهدة كاملة' })
  @IsOptional()
  @IsString()
  closingNote?: string;
}
