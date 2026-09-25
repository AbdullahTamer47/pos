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
import { PriceListsService } from './price-lists.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { Permissions, CashierPermission } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';

@ApiTags('Price Lists')
@Controller('price-lists')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'List all price lists' })
  @ApiResponse({ status: 200, description: 'Price lists' })
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.priceListsService.findAll(user.tenantId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get price list with product prices' })
  @ApiResponse({ status: 200, description: 'Price list details' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.priceListsService.findById(id, user.tenantId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create price list' })
  @ApiResponse({ status: 201, description: 'Price list created' })
  create(
    @Body() dto: CreatePriceListDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.priceListsService.create(dto, user.tenantId);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update price list' })
  @ApiResponse({ status: 200, description: 'Price list updated' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePriceListDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.priceListsService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete price list' })
  @ApiResponse({ status: 200, description: 'Price list deleted' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.priceListsService.remove(id, user.tenantId);
  }

  @Put(':id/prices')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update product prices in price list' })
  @ApiResponse({ status: 200, description: 'Prices updated' })
  @ApiResponse({ status: 404, description: 'Price list not found' })
  bulkUpdatePrices(
    @Param('id') id: string,
    @Body('prices') prices: { productId: string; price: number }[],
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.priceListsService.bulkUpdatePrices(id, prices, user.tenantId);
  }

  @Get(':id/products/:productId/price')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get specific product price from price list' })
  @ApiResponse({ status: 200, description: 'Product price' })
  @ApiResponse({ status: 404, description: 'Price list or product not found' })
  getProductPrice(
    @Param('id') priceListId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.priceListsService.getProductPrice(priceListId, productId, user.tenantId);
  }
}