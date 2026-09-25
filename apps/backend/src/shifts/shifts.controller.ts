import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CreateShiftExpenseDto } from './dto/create-expense.dto';

@ApiTags('Shifts')
@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('current')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get current open shift for logged in cashier' })
  @ApiResponse({ status: 200, description: 'Current shift' })
  getCurrentShift(@CurrentUser() user: CurrentUserPayload) {
    return this.shiftsService.getCurrentShift(user.id, user.tenantId);
  }

  @Post('open')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Open a new cash register shift' })
  @ApiResponse({ status: 201, description: 'Shift opened' })
  openShift(
    @Body() dto: OpenShiftDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.shiftsService.openShift(user.id, user.tenantId, dto);
  }

  @Post(':id/close')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Close a cash shift (Z-Report)' })
  @ApiResponse({ status: 200, description: 'Shift closed and Z-Report generated' })
  closeShift(
    @Param('id') id: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.shiftsService.closeShift(id, user.id, user.tenantId, dto);
  }

  @Post(':id/expenses')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Record petty cash expense from drawer' })
  @ApiResponse({ status: 201, description: 'Expense recorded' })
  addExpense(
    @Param('id') id: string,
    @Body() dto: CreateShiftExpenseDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.shiftsService.addExpense(id, user.id, user.tenantId, dto);
  }

  @Get(':id/summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TRADER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get summary statistics for a shift (Z-Report preview)' })
  @ApiResponse({ status: 200, description: 'Shift summary' })
  getShiftSummary(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.shiftsService.getShiftSummary(id, user.tenantId);
  }
}
