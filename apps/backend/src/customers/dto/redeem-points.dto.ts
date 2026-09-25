import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class RedeemPointsDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  customerId: string;

  @ApiProperty({ example: 100 })
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

  @ApiPropertyOptional({ example: 'Points redemption at checkout' })
  @IsOptional()
  @IsString()
  note?: string;
}