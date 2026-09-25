import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
    },
    tenantId: string,
    userRole: string,
    userId: string,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (userRole !== 'SUPER_ADMIN') {
      where.tenantId = tenantId;
      where.userId = userId;
    }

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(
    id: string,
    tenantId: string,
    userRole: string,
    userId: string,
  ) {
    const where: Record<string, unknown> = { id };

    if (userRole !== 'SUPER_ADMIN') {
      where.tenantId = tenantId;
    }

    const ticket = await this.prisma.supportTicket.findFirst({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (userRole !== 'SUPER_ADMIN' && ticket.userId !== userId) {
      throw new ForbiddenException('You can only view your own tickets');
    }

    return ticket;
  }

  async create(dto: CreateTicketDto, tenantId: string, userId: string) {
    if (!VALID_PRIORITIES.includes(dto.priority)) {
      throw new BadRequestException(
        `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
      );
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        tenantId,
        userId,
        subject: dto.subject,
        priority: dto.priority,
        status: 'OPEN',
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    if (dto.message) {
      await this.prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          userId,
          message: dto.message,
        },
      });
    }

    this.logger.log(`Ticket created: ${ticket.id} by user ${userId}`);
    return ticket;
  }

  async update(
    id: string,
    dto: Partial<CreateTicketDto>,
    tenantId: string,
    userRole: string,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, tenantId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (dto.priority && !VALID_PRIORITIES.includes(dto.priority)) {
      throw new BadRequestException(
        `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`,
      );
    }

    const updateData: Record<string, unknown> = {};
    if (dto.subject !== undefined) updateData.subject = dto.subject;
    if (dto.priority !== undefined) updateData.priority = dto.priority;

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Ticket updated: ${updated.id}`);
    return updated;
  }

  async changeStatus(
    id: string,
    status: string,
    tenantId: string,
    userRole: string,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, tenantId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!VALID_STATUSES.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      );
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Ticket ${id} status changed to ${status}`);
    return updated;
  }

  async assign(
    id: string,
    assignedToId: string,
    tenantId: string,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, tenantId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const assignee = await this.prisma.user.findFirst({
      where: { id: assignedToId },
    });

    if (!assignee) {
      throw new NotFoundException('Assignee user not found');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        assignedToId,
        status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Ticket ${id} assigned to user ${assignedToId}`);
    return updated;
  }

  async addMessage(
    id: string,
    dto: CreateMessageDto,
    tenantId: string,
    userId: string,
    userRole: string,
  ) {
    const where: Record<string, unknown> = { id };
    if (userRole !== 'SUPER_ADMIN') {
      where.tenantId = tenantId;
    }

    const ticket = await this.prisma.supportTicket.findFirst({ where });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('Cannot add messages to a closed ticket');
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId: id,
        userId,
        message: dto.message,
        attachments: dto.attachments as never,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await this.prisma.supportTicket.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    this.logger.log(`Message added to ticket ${id} by user ${userId}`);
    return message;
  }
}