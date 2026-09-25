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
import { GiftCardsService } from './gift-cards.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import { UpdateGiftCardDto } from './dto/update-gift-card.dto';
import { ValidateGiftCardDto } from './dto/validate-gift-card.dto';

@ApiTags('Gift Cards')
@Controller('gift-cards')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class GiftCardsController {
  constructor(private readonly giftCardsService: GiftCardsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'List gift cards with search and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Gift cards list' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.giftCardsService.findAll(
      {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      },
user!.tenantId,
    );
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create gift card with auto-generated code' })
  @ApiResponse({ status: 201, description: 'Gift card created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(
    @Body() dto: CreateGiftCardDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.giftCardsService.create(dto, user.tenantId, user.id);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get gift card with usage details' })
  @ApiResponse({ status: 200, description: 'Gift card details' })
  @ApiResponse({ status: 404, description: 'Gift card not found' })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.giftCardsService.findById(id, user.tenantId);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update gift card' })
  @ApiResponse({ status: 200, description: 'Gift card updated' })
  @ApiResponse({ status: 404, description: 'Gift card not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGiftCardDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.giftCardsService.update(id, dto, user.tenantId);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a gift card' })
  @ApiResponse({ status: 200, description: 'Gift card deactivated' })
  @ApiResponse({ status: 404, description: 'Gift card not found' })
  deactivate(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.giftCardsService.deactivate(id, user.tenantId);
  }

  @Post('validate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate gift card code and return balance' })
  @ApiResponse({ status: 200, description: 'Gift card validation result' })
  validate(
    @Body() dto: ValidateGiftCardDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.giftCardsService.validate(dto.code, user.tenantId);
  }
}