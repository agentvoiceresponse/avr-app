import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call } from './call.entity';
import { CallEvent, WebhookEventType } from './call-event.entity';
import { WebhookEventDto } from './dto/webhook-event.dto';
import {
  buildPaginatedResult,
  getPagination,
  PaginatedResult,
  PaginationQuery,
} from '../common/pagination';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(CallEvent)
    private readonly eventRepository: Repository<CallEvent>,
  ) {}

  verifySecret(provided: string | undefined) {
    const expected = process.env.WEBHOOK_SECRET;
    if (!expected || provided !== expected) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }

  async handleEvent(
    event: WebhookEventDto,
    agentId?: string | null,
  ): Promise<void> {
    const existingCall = await this.callRepository.findOne({
      where: { uuid: event.uuid },
      relations: ['events'],
    });

    let call = existingCall;
    if (!call) {
      call = this.callRepository.create({
        uuid: event.uuid,
        startedAt: undefined,
        endedAt: undefined,
        agentId: agentId ?? null,
        events: [],
      });
      call = await this.callRepository.save(call);
    } else if (agentId && !call.agentId) {
      call.agentId = agentId;
      await this.callRepository.save(call);
    }

    const timestamp = new Date(event.timestamp);

    if (event.type === 'call_started') {
      call.startedAt = timestamp;
      await this.callRepository.save(call);
    }

    if (event.type === 'call_ended') {
      call.endedAt = timestamp;
      await this.callRepository.save(call);
    }

    const relevantTypes: WebhookEventType[] = [
      'call_initiated',
      'call_started',
      'call_ended',
      'transcription',
      'interruption',
      'dtmf_digit',
    ];

    if (relevantTypes.includes(event.type as WebhookEventType)) {
      const callEvent = this.eventRepository.create({
        call,
        type: event.type as WebhookEventType,
        timestamp,
        payload: event.payload ?? null,
      });
      await this.eventRepository.save(callEvent);
    }
  }

  async listCalls(
    filters: {
      agentId?: string | null;
      since?: Date;
      uuid?: string;
      startedFrom?: string;
      startedTo?: string;
      sortField?: 'startedAt' | 'endedAt';
      sortDirection?: 'asc' | 'desc';
    },
    paginationQuery: PaginationQuery = {},
  ): Promise<PaginatedResult<Call>> {
    const qb = this.callRepository.createQueryBuilder('call');

    if (filters.agentId) {
      qb.andWhere('call.agentId = :agentId', { agentId: filters.agentId });
    }

    if (filters.uuid) {
      qb.andWhere('call.uuid LIKE :uuid', { uuid: `%${filters.uuid}%` });
    }

    if (filters.since) {
      qb.andWhere('call.startedAt >= :since', {
        since: filters.since.toISOString(),
      });
    }

    const startedFrom = this.parseDate(filters.startedFrom);
    if (startedFrom) {
      qb.andWhere('call.startedAt >= :startedFrom', {
        startedFrom: startedFrom.toISOString(),
      });
    }

    const startedTo = this.parseDate(filters.startedTo, true);
    if (startedTo) {
      qb.andWhere('call.startedAt <= :startedTo', {
        startedTo: startedTo.toISOString(),
      });
    }

    const sortField = filters.sortField === 'endedAt' ? 'call.endedAt' : 'call.startedAt';
    const sortDirection = filters.sortDirection === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(sortField, sortDirection).addOrderBy('call.id', 'DESC');

    const { skip, take, page, limit } = getPagination(paginationQuery);
    qb.skip(skip).take(take);

    const [data, total] = await qb.getManyAndCount();

    return buildPaginatedResult(data, total, page, limit);
  }

  private parseDate(value?: string, endOfDay = false): Date | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  }

  async getCallWithEvents(callId: string): Promise<Call | null> {
    const qb = this.callRepository
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.events', 'event')
      .where('call.id = :id', { id: callId })
      .orderBy('event.timestamp', 'ASC');

    return qb.getOne();
  }

  async getSummary(agentId?: string | null, since?: Date) {
    const totalQb = this.callRepository.createQueryBuilder('call');
    if (agentId) {
      totalQb.andWhere('call.agentId = :agentId', { agentId });
    }
    if (since) {
      totalQb.andWhere('call.startedAt >= :since', {
        since: since.toISOString(),
      });
    }
    const totalResult = await totalQb
      .select('COUNT(call.id)', 'total')
      .getRawOne<{ total: string }>();

    const avgQb = this.callRepository
      .createQueryBuilder('call')
      .where('call.startedAt IS NOT NULL')
      .andWhere('call.endedAt IS NOT NULL');

    if (agentId) {
      avgQb.andWhere('call.agentId = :agentId', { agentId });
    }
    if (since) {
      avgQb.andWhere('call.startedAt >= :since', {
        since: since.toISOString(),
      });
    }

    const avgResult = await avgQb
      .select(
        'AVG((julianday(call.endedAt) - julianday(call.startedAt)) * 86400)',
        'avgSeconds',
      )
      .getRawOne<{ avgSeconds: string | null }>();

    const total = Number(totalResult?.total ?? 0);
    const averageDurationSeconds = Number(avgResult?.avgSeconds ?? 0);

    return {
      totalCalls: total,
      averageDurationSeconds: Number.isFinite(averageDurationSeconds)
        ? averageDurationSeconds
        : 0,
    };
  }
}
