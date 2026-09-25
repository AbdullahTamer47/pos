import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, Matches, IsOptional, IsEmail } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'My Store' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'mystore' })
  @IsString()
  @MinLength(3)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain must contain only lowercase letters, numbers, and hyphens',
  })
  subdomain: string;

  @ApiPropertyOptional({ example: 'contact@mystore.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+966501234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Riyadh, Saudi Arabia' })
  @IsOptional()
  @IsString()
  address?: string;
}