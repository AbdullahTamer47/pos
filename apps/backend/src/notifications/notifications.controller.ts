import {
  Controller,
  Get,
  Put,
  Delete,
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
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT, UserRole.INVENTORY_CLERK)
  @ApiOperation({ summary: 'List notifications for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Notifications list' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
  ) {
    return this.notificationsService.findAll(
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        isRead: isRead !== undefined ? isRead === 'true' : undefined,
        type,
      },
      tenantId || user.tenantId,
      user.id,
    );
  }

  @Get('unread-count')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT, UserRole.INVENTORY_CLERK)
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  getUnreadCount(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.notificationsService.getUnreadCount(
      tenantId || user.tenantId,
      user.id,
    );
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT, UserRole.INVENTORY_CLERK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.notificationsService.markAsRead(
      id,
      tenantId || user.tenantId,
      user.id,
    );
  }

  @Put('read-all')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT, UserRole.INVENTORY_CLERK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllAsRead(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.notificationsService.markAllAsRead(
      tenantId || user.tenantId,
      user.id,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT, UserRole.INVENTORY_CLERK)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.notificationsService.remove(
      id,
      tenantId || user.tenantId,
      user.id,
    );
  }
}