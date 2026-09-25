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
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@ApiTags('Subscriptions')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List all subscription plans' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Plans list' })
  findAllPlans(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.subscriptionsService.findAllPlans({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiResponse({ status: 200, description: 'Plan details' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  findPlanById(@Param('id') id: string) {
    return this.subscriptionsService.findPlanById(id);
  }

  @Post('plans')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new subscription plan (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Put('plans/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update plan (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan updated' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete plan (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan deleted' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ status: 409, description: 'Plan has active subscriptions' })
  deletePlan(@Param('id') id: string) {
    return this.subscriptionsService.deletePlan(id);
  }

  @Get('subscriptions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'List subscriptions for current tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Subscriptions list' })
  findAllSubscriptions(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.subscriptionsService.findAllSubscriptions(user.tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(['subscriptions/current', 'subscriptions/current/:tenantId'])
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get current tenant subscription' })
  @ApiResponse({ status: 200, description: 'Current subscription' })
  getCurrentSubscription(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tenantId') tenantId?: string,
  ) {
    const targetTenantId = tenantId || user.tenantId;
    return this.subscriptionsService.getCurrentSubscription(targetTenantId);
  }

  @Post('subscriptions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create or upgrade subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  @ApiResponse({ status: 400, description: 'Active subscription exists' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.subscriptionsService.createSubscription(dto, user.tenantId);
  }

  @Post('subscriptions/:id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  cancelSubscription(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.subscriptionsService.cancelSubscription(id, user.tenantId);
  }

  @Post('subscriptions/:id/renew')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Renew subscription' })
  @ApiResponse({ status: 201, description: 'Subscription renewed' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  renewSubscription(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.subscriptionsService.renewSubscription(id, user.tenantId);
  }
}