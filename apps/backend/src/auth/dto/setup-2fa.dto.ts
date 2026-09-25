import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class Setup2FADto {
  @ApiPropertyOptional({ example: 'StrongP@ss1' })
  @IsOptional()
  @IsString()
  password?: string;
}