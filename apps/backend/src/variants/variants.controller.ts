import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VariantsService } from './variants.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@ApiTags('Variants')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Get('products/:productId/variants')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'List variants for a product' })
  @ApiResponse({ status: 200, description: 'Variants list' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findByProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.variantsService.findByProduct(productId, user.tenantId);
  }

  @Post('products/:productId/variants')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create variant with options' })
  @ApiResponse({ status: 201, description: 'Variant created' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Variant SKU or barcode already exists' })
  create(
    @Param('productId') productId: string,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.variantsService.create(productId, dto, user.tenantId);
  }

  @Put('variants/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update variant' })
  @ApiResponse({ status: 200, description: 'Variant updated' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVariantDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.variantsService.update(id, dto, user.tenantId);
  }

  @Delete('variants/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete variant' })
  @ApiResponse({ status: 200, description: 'Variant deleted' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  @ApiResponse({ status: 409, description: 'Variant has stock' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.variantsService.remove(id, user.tenantId);
  }
}