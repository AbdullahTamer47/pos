import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class UpdateLoyaltyConfigDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pointsPerCurrency?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  redemptionRate?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPointsToRedeem?: number;

  @ApiPropertyOptional({ example: 365 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pointsExpiryDays?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}