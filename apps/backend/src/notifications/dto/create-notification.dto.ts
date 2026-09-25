import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';

export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export class CreateNotificationDto {
  @ApiPropertyOptional({ example: 'user-id-123' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.INFO })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: 'فاتورة جديدة' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  titleAr: string;

  @ApiProperty({ example: 'New Invoice' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  titleEn: string;

  @ApiProperty({ example: 'تم إنشاء فاتورة جديدة بقيمة 500 جنيه' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  bodyAr: string;

  @ApiProperty({ example: 'A new invoice has been created with value 500 SAR' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  bodyEn: string;

  @ApiPropertyOptional({ example: '/invoices/abc123' })
  @IsOptional()
  @IsString()
  actionUrl?: string;
}