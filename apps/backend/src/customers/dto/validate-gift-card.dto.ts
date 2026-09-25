import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ValidateGiftCardDto {
  @ApiProperty({ example: 'GC-A1B2C3D4' })
  @IsString()
  code: string;
}