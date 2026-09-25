import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateTicketDto {
  @ApiProperty({ example: 'Issue with invoice printing' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @ApiProperty({ enum: TicketPriority, example: TicketPriority.MEDIUM })
  @IsEnum(TicketPriority)
  priority: TicketPriority;

  @ApiPropertyOptional({ example: 'I am unable to print invoices for the last 2 hours' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}