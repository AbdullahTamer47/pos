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
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerAddressDto } from './dto/create-customer.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'List customers with pagination, search, and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tier', required: false, type: String })
  @ApiQuery({ name: 'minPoints', required: false, type: Number })
  @ApiQuery({ name: 'maxPoints', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Customers list' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('tier') tier?: string,
    @Query('minPoints') minPoints?: string,
    @Query('maxPoints') maxPoints?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.customersService.findAll(
      {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        tier,
        minPoints: minPoints ? parseFloat(minPoints) : undefined,
        maxPoints: maxPoints ? parseFloat(maxPoints) : undefined,
      },
      user!.tenantId,
    );
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get single customer with addresses and ledger summary' })
  @ApiResponse({ status: 200, description: 'Customer details' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.findById(id, user.tenantId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Phone number already exists' })
  create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.create(dto, user.tenantId);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update customer' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete customer' })
  @ApiResponse({ status: 200, description: 'Customer deleted' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.remove(id, user.tenantId);
  }

  @Get(':id/ledger')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get customer ledger (financial transactions)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Customer ledger' })
  getLedger(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.customersService.getLedger(
      id,
      {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      },
      user!.tenantId,
    );
  }

  @Post(':id/payment')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Record customer debt payment' })
  @ApiResponse({ status: 201, description: 'Payment recorded' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  addPayment(
    @Param('id') id: string,
    @Body() dto: { amount: number; note?: string; paymentMethod?: string; referenceNumber?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.addPayment(id, dto, user.tenantId);
  }

  @Post(':id/addresses')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add address to customer' })
  @ApiResponse({ status: 201, description: 'Address added' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  addAddress(
    @Param('id') id: string,
    @Body() dto: CreateCustomerAddressDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.addAddress(id, dto, user.tenantId);
  }

  @Put(':id/addresses/:addressId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update customer address' })
  @ApiResponse({ status: 200, description: 'Address updated' })
  @ApiResponse({ status: 404, description: 'Customer or address not found' })
  updateAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.updateAddress(id, addressId, dto, user.tenantId);
  }

  @Delete(':id/addresses/:addressId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete customer address' })
  @ApiResponse({ status: 200, description: 'Address deleted' })
  @ApiResponse({ status: 404, description: 'Customer or address not found' })
  deleteAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.deleteAddress(id, addressId, user.tenantId);
  }

  @Get(':id/transactions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get loyalty transactions for customer' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Loyalty transactions' })
  getTransactions(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.customersService.getTransactions(
      id,
      {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      },
      user!.tenantId,
    );
  }

  @Get(':id/statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get customer statistics' })
  @ApiResponse({ status: 200, description: 'Customer statistics' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  getStatistics(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.getStatistics(id, user.tenantId);
  }
}