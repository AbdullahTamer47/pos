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
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateCouponDto, ValidateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@ApiTags('Coupons')
@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'List coupons with pagination, search, and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'expired', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Coupons list' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('expired') expired?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.couponsService.findAll(
      {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        expired: expired !== undefined ? expired === 'true' : undefined,
      },
user!.tenantId,
    );
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get single coupon with usage history' })
  @ApiResponse({ status: 200, description: 'Coupon details' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.couponsService.findById(id, user.tenantId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Coupon code already exists' })
  create(
    @Body() dto: CreateCouponDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.couponsService.create(dto, user.tenantId, user.id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update coupon' })
  @ApiResponse({ status: 200, description: 'Coupon updated' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.couponsService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete coupon' })
  @ApiResponse({ status: 200, description: 'Coupon deleted' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.couponsService.remove(id, user.tenantId);
  }

  @Post('validate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Validate coupon code for POS use' })
  @ApiResponse({ status: 200, description: 'Coupon validation result' })
  @ApiResponse({ status: 400, description: 'Invalid coupon' })
  validate(
    @Body() dto: ValidateCouponDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.couponsService.validateCoupon(dto, user.tenantId);
  }

  @Post(':id/toggle-active')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Toggle coupon active status' })
  @ApiResponse({ status: 200, description: 'Coupon status toggled' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  toggleActive(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.couponsService.toggleActive(id, user.tenantId);
  }
}