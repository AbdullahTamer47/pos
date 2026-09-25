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
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'List invoices with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'paymentStatus', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Invoices list' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('customerId') customerId?: string,
    @Query('branchId') branchId?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.invoicesService.findAll(
      {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        type,
        status,
        startDate,
        endDate,
        customerId,
        branchId,
        paymentStatus,
      },
user!.tenantId,
    );
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get invoice with items, payments, and customer' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invoicesService.findById(id, user.tenantId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Create invoice (full sale)' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  @ApiResponse({ status: 400, description: 'Validation error or insufficient stock' })
  create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invoicesService.create(dto, user.tenantId, user.id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update invoice (only draft)' })
  @ApiResponse({ status: 200, description: 'Invoice updated' })
  @ApiResponse({ status: 400, description: 'Only draft invoices can be updated' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invoicesService.update(id, dto, user.tenantId);
  }

  @Put(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cancel invoice' })
  @ApiResponse({ status: 200, description: 'Invoice cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel this invoice' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invoicesService.cancel(id, user.tenantId);
  }

  @Post(':id/return')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Create return invoice' })
  @ApiResponse({ status: 201, description: 'Return invoice created' })
  @ApiResponse({ status: 400, description: 'Cannot return this invoice' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  createReturn(
    @Param('id') id: string,
    @Body('items') items: { productId: string; variantId?: string; quantity: number; unitPrice: number }[],
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invoicesService.createReturn(id, items, user.tenantId, user.id);
  }

  @Post('hold')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Hold an invoice (cart)' })
  @ApiResponse({ status: 201, description: 'Invoice held' })
  hold(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invoicesService.hold(dto, user.tenantId, user.id);
  }

  @Get('hold')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'List held invoices' })
  @ApiResponse({ status: 200, description: 'Held invoices list' })
  listHeld(@CurrentUser() user: CurrentUserPayload) {
    return this.invoicesService.listHeld(user.tenantId);
  }

  @Post('hold/:id/resume')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Resume a held invoice' })
  @ApiResponse({ status: 200, description: 'Held invoice resumed' })
  @ApiResponse({ status: 404, description: 'Held invoice not found' })
  resumeHold(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invoicesService.resume(id, user.tenantId);
  }

  @Delete('hold/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete held invoice' })
  @ApiResponse({ status: 200, description: 'Held invoice deleted' })
  @ApiResponse({ status: 404, description: 'Held invoice not found' })
  deleteHold(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invoicesService.deleteHold(id, user.tenantId);
  }

  @Get('last-number')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get last invoice number' })
  @ApiResponse({ status: 200, description: 'Last invoice number' })
  getLastNumber(@CurrentUser() user: CurrentUserPayload) {
    return this.invoicesService.getLastInvoiceNumber(user.tenantId);
  }

  @Get('search/:query')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Quick search invoices' })
  @ApiResponse({ status: 200, description: 'Search results' })
  quickSearch(
    @Param('query') query: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invoicesService.quickSearch(query, user.tenantId);
  }

  @Post(':id/convert-to-sale')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Convert quotation to completed sale' })
  @ApiResponse({ status: 200, description: 'Quotation converted to sale' })
  convertToSale(
    @Param('id') id: string,
    @Body() dto: { payments?: any[]; cashierId?: string; shiftId?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invoicesService.convertQuotationToSale(id, dto, user.tenantId, user.id);
  }
}