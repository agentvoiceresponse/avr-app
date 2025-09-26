import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DockerModule } from '../docker/docker.module';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { RolesGuard } from '../auth/roles.guard';
import { Provider } from '../providers/provider.entity';
import { Agent } from './agent.entity';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, Provider]),
    DockerModule,
    AsteriskModule,
  ],
  providers: [AgentsService, RolesGuard],
  controllers: [AgentsController],
})
export class AgentsModule {}
