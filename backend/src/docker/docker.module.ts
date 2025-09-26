import { Module } from '@nestjs/common';
import { DockerService } from './docker.service';
import { DockerController } from './docker.controller';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  providers: [DockerService, RolesGuard],
  controllers: [DockerController],
  exports: [DockerService],
})
export class DockerModule {}
