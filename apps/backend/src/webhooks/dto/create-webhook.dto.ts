import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWebhookDto {
  @ApiProperty({ example: 'https://example.com/webhooks/pos' })
  @IsString()
  @IsUrl({ require_tld: false })
  @MinLength(1)
  @MaxLength(500)
  url: string;

  @ApiProperty({ example: ['invoice.created', 'invoice.updated', 'payment.completed'] })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}