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
import { TaxConfigService } from './tax-config.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CreateTaxConfigDto } from './dto/create-tax-config.dto';

@ApiTags('Tax Configurations')
@Controller('tax-configs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TaxConfigController {
  constructor(private readonly taxConfigService: TaxConfigService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'List all tax configs for tenant' })
  @ApiResponse({ status: 200, description: 'Tax configs list' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.taxConfigService.findAll(tenantId || user.tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a new tax configuration' })
  @ApiResponse({ status: 201, description: 'Tax config created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(
    @Body() dto: CreateTaxConfigDto,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.taxConfigService.create(dto, tenantId || user.tenantId);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update a tax configuration' })
  @ApiResponse({ status: 200, description: 'Tax config updated' })
  @ApiResponse({ status: 404, description: 'Tax config not found' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTaxConfigDto>,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.taxConfigService.update(id, dto, tenantId || user.tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a tax configuration' })
  @ApiResponse({ status: 200, description: 'Tax config deleted' })
  @ApiResponse({ status: 404, description: 'Tax config not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.taxConfigService.remove(id, tenantId || user.tenantId);
  }

  @Put(':id/toggle-default')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a tax config as default' })
  @ApiResponse({ status: 200, description: 'Default tax config updated' })
  @ApiResponse({ status: 404, description: 'Tax config not found' })
  toggleDefault(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.taxConfigService.toggleDefault(id, tenantId || user.tenantId);
  }
}