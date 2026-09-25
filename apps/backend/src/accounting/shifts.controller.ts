import {
  Controller,
  Get,
  Post,
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
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';

@ApiTags('Shifts')
@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'List all shifts with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Shifts list' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.shiftsService.findAll(
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        status,
        startDate,
        endDate,
        branchId,
      },
      tenantId || user.tenantId,
    );
  }

  @Get('active')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get active shift for current cashier' })
  @ApiResponse({ status: 200, description: 'Active shift data' })
  getActiveShift(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.shiftsService.getActiveShift(
      tenantId || user.tenantId,
      user.id,
    );
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get shift detail with transactions' })
  @ApiResponse({ status: 200, description: 'Shift details' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.shiftsService.findById(id, tenantId || user.tenantId);
  }

  @Post('open')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Open a new shift' })
  @ApiResponse({ status: 201, description: 'Shift opened' })
  @ApiResponse({ status: 400, description: 'Active shift already exists' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  openShift(
    @Body() dto: OpenShiftDto,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.shiftsService.openShift(
      dto,
      tenantId || user.tenantId,
      user.id,
    );
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Close a shift and calculate discrepancy' })
  @ApiResponse({ status: 200, description: 'Shift closed' })
  @ApiResponse({ status: 400, description: 'Shift already closed or not owner' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  closeShift(
    @Param('id') id: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.shiftsService.closeShift(
      id,
      dto,
      tenantId || user.tenantId,
      user.id,
    );
  }
}