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
import { RevenuesService } from './revenues.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CreateRevenueDto } from './dto/create-revenue.dto';

@ApiTags('Revenues')
@Controller('revenues')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class RevenuesController {
  constructor(private readonly revenuesService: RevenuesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'List all revenues with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Revenues list' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.revenuesService.findAll(
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        category,
        startDate,
        endDate,
        branchId,
      },
      tenantId || user.tenantId,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get revenue by ID' })
  @ApiResponse({ status: 200, description: 'Revenue details' })
  @ApiResponse({ status: 404, description: 'Revenue not found' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.revenuesService.findById(id, tenantId || user.tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a new revenue entry' })
  @ApiResponse({ status: 201, description: 'Revenue created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  create(
    @Body() dto: CreateRevenueDto,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.revenuesService.create(dto, tenantId || user.tenantId, user.id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update a revenue entry' })
  @ApiResponse({ status: 200, description: 'Revenue updated' })
  @ApiResponse({ status: 404, description: 'Revenue not found' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateRevenueDto>,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.revenuesService.update(id, dto, tenantId || user.tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a revenue entry' })
  @ApiResponse({ status: 200, description: 'Revenue deleted' })
  @ApiResponse({ status: 404, description: 'Revenue not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.revenuesService.remove(id, tenantId || user.tenantId);
  }
}