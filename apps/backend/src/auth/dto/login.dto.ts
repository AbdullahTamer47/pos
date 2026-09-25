import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com or 01012345678' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ example: '01012345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'user@example.com or 01012345678' })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiProperty({ example: 'StrongP@ss1' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  rememberMe?: boolean;

  @ApiPropertyOptional({ example: 'Chrome / Windows' })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}