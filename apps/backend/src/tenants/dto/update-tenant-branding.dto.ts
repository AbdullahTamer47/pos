import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsHexColor } from 'class-validator';

export class UpdateTenantBrandingDto {
  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '#1a73e8' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#ffffff' })
  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @ApiPropertyOptional({ example: '#333333' })
  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @ApiPropertyOptional({ example: '#f5f5f5' })
  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/favicon.ico' })
  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @ApiPropertyOptional({ example: 'My Store POS' })
  @IsOptional()
  @IsString()
  displayName?: string;
}