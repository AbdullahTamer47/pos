import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsDateString, IsBoolean, Min } from 'class-validator';

export class CreateGiftCardDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.01)
  initialBalance: number;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}