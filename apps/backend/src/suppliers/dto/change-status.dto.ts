import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export class ChangeStatusDto {
  @ApiProperty({ enum: PurchaseOrderStatus, example: PurchaseOrderStatus.APPROVED })
  @IsEnum(PurchaseOrderStatus)
  status: PurchaseOrderStatus;
}