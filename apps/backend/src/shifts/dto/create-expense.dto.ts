import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateShiftExpenseDto {
  @ApiProperty({ example: 50, description: 'Expense amount (المبلغ)' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'نثريات / شاي وضيافة', description: 'Expense category / description' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 'مصاريف ضيافة أو نظافة' })
  @IsOptional()
  @IsString()
  description?: string;
}
