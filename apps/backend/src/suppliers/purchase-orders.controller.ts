import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ChangeStatusDto } from './dto/change-status.dto';

@ApiTags('Purchase Orders')
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_CLERK)
  @ApiOperation({ summary: 'List purchase orders with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'supplierId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Purchase orders list' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.purchaseOrdersService.findAll(
      {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        status,
        supplierId,
        startDate,
        endDate,
      },
user!.tenantId,
    );
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_CLERK)
  @ApiOperation({ summary: 'Get purchase order with items' })
  @ApiResponse({ status: 200, description: 'Purchase order details' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchaseOrdersService.findById(id, user.tenantId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create purchase order with items' })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchaseOrdersService.create(dto, user.tenantId, user.id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update purchase order (only draft)' })
  @ApiResponse({ status: 200, description: 'Purchase order updated' })
  @ApiResponse({ status: 400, description: 'Only draft POs can be updated' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchaseOrdersService.update(id, dto, user.tenantId);
  }

  @Put(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Change purchase order status' })
  @ApiResponse({ status: 200, description: 'Status changed' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchaseOrdersService.changeStatus(id, dto, user.tenantId, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete purchase order (only draft)' })
  @ApiResponse({ status: 200, description: 'Purchase order deleted' })
  @ApiResponse({ status: 400, description: 'Only draft POs can be deleted' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.purchaseOrdersService.remove(id, user.tenantId);
  }
}