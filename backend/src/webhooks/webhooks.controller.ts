import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { WebhooksService } from './webhooks.service';
import { PaginatedResult, PaginationQuery } from '../common/pagination';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  async handleWebhook(
    @Body() event: WebhookEventDto,
    @Headers('x-avr-webhook-secret') secret: string,
    @Headers('x-avr-agent-id') agentId: string | undefined,
  ) {
    this.webhooksService.verifySecret(secret);
    await this.forwardWebhook(event, agentId);
    await this.webhooksService.handleEvent(event, agentId);
    return { status: 'ok' };
  }

  @Get('calls')
  async listCalls(
    @Query()
    query: PaginationQuery & {
      agentId?: string;
      range?: string;
      uuid?: string;
      startedFrom?: string;
      startedTo?: string;
      sortField?: 'startedAt' | 'endedAt';
      sortDirection?: 'asc' | 'desc';
    },
  ): Promise<
    PaginatedResult<{
      id: string;
      uuid: string;
      agentId?: string | null;
      startedAt?: Date | null;
      endedAt?: Date | null;
    }>
  > {
    const {
      agentId,
      range,
      uuid,
      startedFrom,
      startedTo,
      sortField,
      sortDirection,
    } = query;
    const since = this.resolveRange(range);
    const result = await this.webhooksService.listCalls(
      {
        agentId,
        since,
        uuid,
        startedFrom,
        startedTo,
        sortField,
        sortDirection,
      },
      query,
    );
    return {
      ...result,
      data: result.data.map((call) => ({
        id: call.id,
        uuid: call.uuid,
        agentId: call.agentId,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
      })),
    };
  }

  @Get('summary')
  async summary(
    @Query('agentId') agentId?: string,
    @Query('range') range?: string,
  ) {
    const since = this.resolveRange(range);
    return this.webhooksService.getSummary(agentId, since);
  }

  @Get('calls/:id')
  async getCall(@Param('id') id: string) {
    const call = await this.webhooksService.getCallWithEvents(id);
    if (!call) {
      throw new NotFoundException('Call not found');
    }
    return {
      id: call.id,
      uuid: call.uuid,
      agentId: call.agentId,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
      events: call.events
        ?.map((event) => ({
          id: event.id,
          type: event.type,
          timestamp: event.timestamp,
          payload: event.payload,
        }))
        ?.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        ),
    };
  }

  private resolveRange(range?: string): Date | undefined {
    const months = Number.parseInt(range ?? '', 10);
    const allowed = [1, 3, 6, 12];
    if (!allowed.includes(months)) {
      return undefined;
    }
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
  }

  private async forwardWebhook(
    event: WebhookEventDto,
    agentId?: string,
  ): Promise<void> {
    const forwardUrl = process.env.WEBHOOK_FORWARD_URL;
    if (!forwardUrl) {
      return;
    }
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn('WEBHOOK_SECRET not set; skipping webhook forwarding');
      return;
    }
    try {
      const response = await fetch(forwardUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-avr-webhook-secret': secret,
          ...(agentId ? { 'x-avr-agent-id': agentId } : {}),
        },
        body: JSON.stringify(event),
      });
      if (!response.ok) {
        this.logger.warn(
          `Webhook forward failed with status ${response.status}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to forward webhook', error as Error);
    }
  }
}
