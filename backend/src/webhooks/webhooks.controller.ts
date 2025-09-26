import {
  Body,
  Controller,
  Get,
  Headers,
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
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  async handleWebhook(
    @Body() event: WebhookEventDto,
    @Headers('x-avr-webhook-secret') secret: string,
    @Headers('x-avr-agent-id') agentId: string | undefined,
  ) {
    this.webhooksService.verifySecret(secret);
    await this.webhooksService.handleEvent(event, agentId);
    return { status: 'ok' };
  }

  @Get('calls')
  async listCalls(
    @Query()
    query: PaginationQuery & {
      agentId?: string;
      range?: string;
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
    const { agentId, range } = query;
    const since = this.resolveRange(range);
    const result = await this.webhooksService.listCalls(agentId, since, query);
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
}
