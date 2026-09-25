import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsBoolean, IsEmail } from 'class-validator';

export class UpdateBranchDto {
  @ApiPropertyOptional({ example: 'الفرع المحدث' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameAr?: string;

  @ApiPropertyOptional({ example: 'Updated Branch' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameEn?: string;

  @ApiPropertyOptional({ example: 'BR002' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @ApiPropertyOptional({ example: 'Jeddah, Saudi Arabia' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+966501234568' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'updated@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}