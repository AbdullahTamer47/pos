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
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all webhooks' })
  @ApiResponse({ status: 200, description: 'Webhooks list' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.webhooksService.findAll(tenantId || user.tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new webhook endpoint' })
  @ApiResponse({ status: 201, description: 'Webhook created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.webhooksService.create(dto, tenantId || user.tenantId);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateWebhookDto>,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.webhooksService.update(id, dto, tenantId || user.tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook deleted' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.webhooksService.remove(id, tenantId || user.tenantId);
  }

  @Post(':id/trigger')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook triggered' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  trigger(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.webhooksService.triggerWebhook(id, tenantId || user.tenantId);
  }

  @Put(':id/toggle-active')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle webhook active status' })
  @ApiResponse({ status: 200, description: 'Status toggled' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  toggleActive(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.webhooksService.toggleActive(id, tenantId || user.tenantId);
  }
}