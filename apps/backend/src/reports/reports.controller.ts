import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ReportQueryDto } from './dto/report-query.dto';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Sales report with date range, branch filter, group by' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'groupBy', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Sales report' })
  getSalesReport(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.getSalesReport(query, user.tenantId);
  }

  @Get('profit-loss')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Profit & Loss report' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'P&L report' })
  getProfitLossReport(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.getProfitLossReport(query, user.tenantId);
  }

  @Get('inventory-status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Current inventory status with valuation' })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Inventory status report' })
  getInventoryStatus(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.getInventoryStatus(query, user.tenantId);
  }

  @Get('inventory-movements')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Inventory movements report' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Inventory movements report' })
  getInventoryMovements(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.getInventoryMovements(query, user.tenantId);
  }

  @Get('top-products')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Top selling products by quantity/revenue' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Top products report' })
  getTopProducts(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.getTopProducts(query, user.tenantId);
  }

  @Get('slow-moving')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Slow moving products report' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Slow moving products' })
  getSlowMovingProducts(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.getSlowMovingProducts(query, user.tenantId);
  }

  @Get('cashier-performance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Cashier performance report' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'cashierId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Cashier performance report' })
  getCashierPerformance(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.getCashierPerformance(query, user.tenantId);
  }

  @Get('customer-statement')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Customer statement with balance' })
  @ApiQuery({ name: 'customerId', required: true, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Customer statement' })
  getCustomerStatement(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.getCustomerStatement(query, user.tenantId);
  }

  @Get('supplier-statement')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Supplier statement with balance' })
  @ApiQuery({ name: 'supplierId', required: true, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Supplier statement' })
  getSupplierStatement(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.getSupplierStatement(query, user.tenantId);
  }

  @Get('tax')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Tax report (VAT collected)' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Tax report' })
  getTaxReport(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.getTaxReport(query, user.tenantId);
  }

  @Get('shift')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Shift report for a specific shift' })
  @ApiQuery({ name: 'shiftId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Shift report' })
  getShiftReport(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.getShiftReport(query, user.tenantId);
  }

  @Get('daily-summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TRADER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Daily business summary' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Daily summary' })
  getDailySummary(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reportsService.getDailySummary(query, user.tenantId);
  }
}