import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { Call } from './call.entity';
import { CallEvent } from './call-event.entity';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Call, CallEvent])],
  controllers: [WebhooksController],
  providers: [WebhooksService, RolesGuard],
})
export class WebhooksModule {}
