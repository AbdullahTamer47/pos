import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class EarnPointsDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  customerId: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  points: number;

  @ApiPropertyOptional({ example: 'INVOICE' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({ example: 'Manual points award' })
  @IsOptional()
  @IsString()
  note?: string;
}