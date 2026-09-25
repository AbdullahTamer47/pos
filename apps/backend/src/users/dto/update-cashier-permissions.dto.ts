import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCashierPermissionsDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  CREATE_SALE: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  PROCESS_REFUND: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  APPLY_DISCOUNT: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  VIEW_REPORTS: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  MANAGE_CUSTOMERS: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  MANAGE_INVENTORY: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  HOLD_ORDER: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  SPLIT_PAYMENT: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  VOID_TRANSACTION: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  OPEN_DRAWER: boolean;
}