import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { PaymentMethod } from './create-invoice.dto';

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'REF-123' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: 'VISA' })
  @IsOptional()
  @IsString()
  cardType?: string;

  @ApiPropertyOptional({ example: 'GIFT-CODE-123' })
  @IsOptional()
  @IsString()
  giftCardCode?: string;

  @ApiPropertyOptional({ example: 'Paid via POS' })
  @IsOptional()
  @IsString()
  note?: string;
}