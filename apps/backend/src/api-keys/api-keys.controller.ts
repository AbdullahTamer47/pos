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
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all API keys (masked)' })
  @ApiResponse({ status: 200, description: 'API keys list' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.apiKeysService.findAll(tenantId || user.tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new API key (returns full key only once)' })
  @ApiResponse({ status: 201, description: 'API key created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.apiKeysService.create(dto, tenantId || user.tenantId, user.id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update API key name or permissions' })
  @ApiResponse({ status: 200, description: 'API key updated' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateApiKeyDto>,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.apiKeysService.update(id, dto, tenantId || user.tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an API key' })
  @ApiResponse({ status: 200, description: 'API key deleted' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.apiKeysService.remove(id, tenantId || user.tenantId);
  }

  @Put(':id/regenerate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate API key (returns new full key only once)' })
  @ApiResponse({ status: 200, description: 'API key regenerated' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  regenerate(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.apiKeysService.regenerate(id, tenantId || user.tenantId);
  }

  @Put(':id/toggle-active')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle API key active status' })
  @ApiResponse({ status: 200, description: 'Status toggled' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  toggleActive(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.apiKeysService.toggleActive(id, tenantId || user.tenantId);
  }
}