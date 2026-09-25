import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
  @ApiProperty({ example: 'branch-id-123' })
  @IsString()
  @MinLength(1)
  branchId: string;

  @ApiProperty({ example: 'RENT', description: 'RENT, UTILITIES, SALARIES, SUPPLIES, MAINTENANCE, etc.' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  category: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ example: 'Monthly office rent for June' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/receipt.pdf' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiProperty({ example: '2025-06-01T00:00:00.000Z' })
  @IsDateString()
  expenseDate: string;
}