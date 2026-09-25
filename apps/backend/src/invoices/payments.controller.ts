import {
  Controller,
  Get,
  Post,
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
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('Payments')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('invoices/:id/payments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Add payment to invoice' })
  @ApiResponse({ status: 201, description: 'Payment added' })
  @ApiResponse({ status: 400, description: 'Validation error or insufficient balance' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  addPayment(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.paymentsService.addPayment(id, dto, user.tenantId);
  }

  @Get('invoices/:id/payments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'List payments for an invoice' })
  @ApiResponse({ status: 200, description: 'Payments list' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  listPayments(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.paymentsService.listPayments(id, user.tenantId);
  }

  @Delete('payments/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete payment and recalculate invoice balances' })
  @ApiResponse({ status: 200, description: 'Payment deleted' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  deletePayment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.paymentsService.deletePayment(id, user.tenantId);
  }
}