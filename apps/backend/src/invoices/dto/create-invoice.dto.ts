import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  Min,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum InvoiceType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  RETURN_SALE = 'RETURN_SALE',
  RETURN_PURCHASE = 'RETURN_PURCHASE',
  QUOTATION = 'QUOTATION',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  HELD = 'HELD',
  QUOTATION = 'QUOTATION',
}

export enum PaymentStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  UNPAID = 'UNPAID',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  CREDIT = 'CREDIT',
  WALLET = 'WALLET',
  INSTAPAY = 'INSTAPAY',
  VODAFONE_CASH = 'VODAFONE_CASH',
  MEEZA = 'MEEZA',
  GIFT_CARD = 'GIFT_CARD',
  SPLIT = 'SPLIT',
}

export class CreateInvoiceItemDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 'Product Name' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ example: 'SKU-001' })
  @IsOptional()
  @IsString()
  productSku?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;
}

export class CreateInvoicePaymentDto {
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

export class CreateInvoiceDto {
  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: 'Walk-in customer' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: '+966512345678' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ type: [CreateInvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional({ example: 'Order notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [CreateInvoicePaymentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoicePaymentDto)
  payments?: CreateInvoicePaymentDto[];

  @ApiPropertyOptional({ example: 'COUPON-CODE' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiPropertyOptional({ example: 'SALE' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'COMPLETED' })
  @IsOptional()
  @IsString()
  status?: string;
}