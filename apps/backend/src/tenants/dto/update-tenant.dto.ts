import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsEmail } from 'class-validator';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'My Store Updated' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'contact@updated.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+966501234568' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Jeddah, Saudi Arabia' })
  @IsOptional()
  @IsString()
  address?: string;
}