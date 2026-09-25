import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UpdateLoyaltyConfigDto } from './dto/update-loyalty-config.dto';
import { EarnPointsDto } from './dto/earn-points.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';

@ApiTags('Loyalty')
@Controller('loyalty')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get loyalty program configuration' })
  @ApiResponse({ status: 200, description: 'Loyalty configuration' })
  getConfig(@CurrentUser() user: CurrentUserPayload) {
    return this.loyaltyService.getConfig(user.tenantId);
  }

  @Put('config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update loyalty program configuration' })
  @ApiResponse({ status: 200, description: 'Loyalty configuration updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  updateConfig(
    @Body() dto: UpdateLoyaltyConfigDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.loyaltyService.updateConfig(dto, user.tenantId);
  }

  @Post('earn')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Manually award loyalty points to a customer' })
  @ApiResponse({ status: 201, description: 'Points awarded' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  earnPoints(
    @Body() dto: EarnPointsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.loyaltyService.earnPoints(dto, user.tenantId);
  }

  @Post('redeem')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Redeem loyalty points' })
  @ApiResponse({ status: 201, description: 'Points redeemed' })
  @ApiResponse({ status: 400, description: 'Insufficient points or below minimum' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  redeemPoints(
    @Body() dto: RedeemPointsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.loyaltyService.redeemPoints(dto, user.tenantId);
  }
}