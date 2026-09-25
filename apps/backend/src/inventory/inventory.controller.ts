import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { Permissions, CashierPermission } from '../common/decorators/permissions.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { StockAdjustDto } from './dto/stock-adjust.dto';
import { StockTransferDto } from './dto/stock-transfer.dto';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_CLERK, UserRole.CASHIER)
  @Permissions(CashierPermission.MANAGE_INVENTORY)
  @ApiOperation({ summary: 'List stock levels with filtering, pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Stock levels list' })
  getStock(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.inventoryService.getStock({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      warehouseId,
      productId,
      lowStock: lowStock === 'true',
      tenantId: user.tenantId,
    });
  }

  @Get('stock/:productId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_CLERK, UserRole.CASHIER)
  @Permissions(CashierPermission.MANAGE_INVENTORY)
  @ApiOperation({ summary: 'Get stock for specific product across warehouses' })
  @ApiResponse({ status: 200, description: 'Product stock levels' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  getStockByProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.getStockByProduct(productId, user.tenantId);
  }

  @Post('adjust')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_CLERK)
  @ApiOperation({ summary: 'Manual stock adjustment (creates InventoryMovement)' })
  @ApiResponse({ status: 201, description: 'Stock adjusted' })
  @ApiResponse({ status: 404, description: 'Warehouse or product not found' })
  adjustStock(
    @Body() dto: StockAdjustDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.adjustStock(dto, user.tenantId, user.id);
  }

  @Post('transfer')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_CLERK)
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  @ApiResponse({ status: 201, description: 'Stock transferred' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or same warehouse' })
  @ApiResponse({ status: 404, description: 'Warehouse or product not found' })
  transferStock(
    @Body() dto: StockTransferDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.transferStock(dto, user.tenantId, user.id);
  }

  @Get('movements')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_CLERK, UserRole.CASHIER)
  @Permissions(CashierPermission.MANAGE_INVENTORY)
  @ApiOperation({ summary: 'List inventory movements with filters, pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Inventory movements list' })
  getMovements(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getMovements({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      type,
      productId,
      warehouseId,
      startDate,
      endDate,
      tenantId: user.tenantId,
    });
  }

  @Get('alerts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_CLERK)
  @ApiOperation({ summary: 'List stock alerts (low stock, expired)' })
  @ApiResponse({ status: 200, description: 'Stock alerts list' })
  getAlerts(@CurrentUser() user: CurrentUserPayload) {
    return this.inventoryService.getAlerts(user.tenantId);
  }

  @Put('alerts/:id/resolve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_CLERK)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve stock alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  resolveAlert(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.resolveAlert(id, user.tenantId);
  }

  @Get('expiring')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_CLERK)
  @ApiOperation({ summary: 'List products expiring soon (with date range)' })
  @ApiQuery({ name: 'daysBefore', required: false, type: Number })
  @ApiQuery({ name: 'daysAfter', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Expiring products list' })
  getExpiringProducts(
    @CurrentUser() user: CurrentUserPayload,
    @Query('daysBefore') daysBefore?: string,
    @Query('daysAfter') daysAfter?: string,
  ) {
    return this.inventoryService.getExpiringProducts({
      daysBefore: daysBefore ? parseInt(daysBefore, 10) : undefined,
      daysAfter: daysAfter ? parseInt(daysAfter, 10) : undefined,
      tenantId: user.tenantId,
    });
  }
}