import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'الفرع الرئيسي' })
  @IsString()
  @MinLength(2)
  nameAr: string;

  @ApiProperty({ example: 'Main Branch' })
  @IsString()
  @MinLength(2)
  nameEn: string;

  @ApiProperty({ example: 'BR001' })
  @IsString()
  @MinLength(2)
  code: string;

  @ApiPropertyOptional({ example: 'Riyadh, Saudi Arabia' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+966501234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'branch@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}