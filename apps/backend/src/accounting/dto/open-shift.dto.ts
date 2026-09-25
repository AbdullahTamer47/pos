import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenShiftDto {
  @ApiProperty({ example: 'branch-id-123' })
  @IsString()
  @MinLength(1)
  branchId: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingCash: number;

  @ApiPropertyOptional({ example: 'Opened by manager' })
  @IsOptional()
  @IsString()
  note?: string;
}