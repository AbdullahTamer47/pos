import {
  Controller,
  Get,
  Post,
  Put,
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
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@ApiTags('Support Tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'List support tickets with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Tickets list' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.supportService.findAll(
      {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        status,
        priority,
      },
      tenantId || user.tenantId,
      user.role,
      user.id,
    );
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get ticket detail with messages' })
  @ApiResponse({ status: 200, description: 'Ticket details' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.supportService.findById(
      id,
      tenantId || user.tenantId,
      user.role,
      user.id,
    );
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a new support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.supportService.create(
      dto,
      tenantId || user.tenantId,
      user.id,
    );
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a support ticket' })
  @ApiResponse({ status: 200, description: 'Ticket updated' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTicketDto>,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.supportService.update(
      id,
      dto,
      tenantId || user.tenantId,
      user.role,
    );
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Change ticket status' })
  @ApiResponse({ status: 200, description: 'Status changed' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  changeStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.supportService.changeStatus(
      id,
      status,
      tenantId || user.tenantId,
      user.role,
    );
  }

  @Put(':id/assign')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign ticket to a user' })
  @ApiResponse({ status: 200, description: 'Ticket assigned' })
  @ApiResponse({ status: 404, description: 'Ticket or user not found' })
  assign(
    @Param('id') id: string,
    @Body('assignedToId') assignedToId: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.supportService.assign(
      id,
      assignedToId,
      tenantId || user.tenantId,
    );
  }

  @Post(':id/messages')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Add a message to a ticket' })
  @ApiResponse({ status: 201, description: 'Message added' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.supportService.addMessage(
      id,
      dto,
      tenantId || user.tenantId,
      user.id,
      user.role,
    );
  }
}