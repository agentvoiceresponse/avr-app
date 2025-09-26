import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { DockerService } from './docker.service';

interface ContainerDto {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  createdAt: string;
  labels: Record<string, string>;
}

@Controller('docker')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DockerController {
  constructor(private readonly dockerService: DockerService) {}

  @Get('containers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  async listContainers(): Promise<ContainerDto[]> {
    const containers = await this.dockerService.listAllContainers();
    return containers.map((container) => ({
      id: container.Id,
      name: container.Names?.[0] ?? container.Id,
      image: container.Image,
      state: container.State,
      status: container.Status,
      createdAt: new Date(container.Created * 1000).toISOString(),
      labels: container.Labels ?? {},
    }));
  }

  @Get('containers/:id/logs')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  async getLogs(
    @Param('id') id: string,
    @Query('tail') tail = '200',
  ): Promise<{ logs: string }> {
    const tailNumber = Number.parseInt(tail, 10);
    const logs = await this.dockerService.getContainerLogs(
      id,
      Number.isNaN(tailNumber) ? 200 : tailNumber,
    );
    return { logs };
  }

  @Post('containers/:id/start')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  startContainer(@Param('id') id: string): Promise<void> {
    return this.dockerService.startContainer(id);
  }

  @Post('containers/:id/stop')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  stopContainer(@Param('id') id: string): Promise<void> {
    return this.dockerService.stopContainerById(id);
  }
}
