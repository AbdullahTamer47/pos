import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ example: 'I have checked the printer settings and it seems to be a driver issue.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({ example: ['https://example.com/screenshot.png'] })
  @IsOptional()
  attachments?: string[];
}