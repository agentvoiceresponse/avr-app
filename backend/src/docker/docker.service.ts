import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import Dockerode from 'dockerode';

@Injectable()
export class DockerService {
  private readonly docker: Dockerode;
  private readonly logger = new Logger(DockerService.name);

  constructor() {
    this.docker = new Dockerode({
      socketPath: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock',
    });
  }

  async runContainer(
    name: string,
    image: string,
    env: string[] = [],
  ): Promise<string> {
    await this.pullImage(image);
    const existing = await this.findContainerByName(name);
    if (existing) {
      const container = this.docker.getContainer(existing.Id);
      const details = await container.inspect();
      if (!details.State.Running) {
        await container.start();
        this.logger.debug(`Started existing container ${name}`);
      }
      return existing.Id;
    }

    const container = await this.docker.createContainer({
      name,
      Image: image,
      Env: env,
      Labels: { agentName: name },
      NetworkingConfig: {
        EndpointsConfig: {
          avr: {},
        },
      },
    });
    await container.start();
    this.logger.debug(`Created and started container ${name}`);
    return container.id;
  }

  async stopContainer(name: string): Promise<void> {
    const existing = await this.findContainerByName(name);
    if (!existing) {
      this.logger.warn(`Container ${name} not found`);
      return;
    }

    const container = this.docker.getContainer(existing.Id);
    const details = await container.inspect();
    if (details.State.Running) {
      await container.stop();
      await container.remove();
      this.logger.debug(`Stopped container ${name}`);
    }
  }

  async listContainers(agentId: string): Promise<any[]> {
    return this.docker.listContainers({
      all: true,
      filters: { name: [agentId] },
    });
  }

  async listAllContainers(): Promise<Dockerode.ContainerInfo[]> {
    return this.docker.listContainers({ all: true });
  }

  async getContainerInspect(
    containerId: string,
  ): Promise<Dockerode.ContainerInspectInfo> {
    try {
      const container = this.docker.getContainer(containerId);
      return await container.inspect();
    } catch (error) {
      this.logger.warn(`Container ${containerId} not found`);
      throw new NotFoundException('Container not found');
    }
  }

  async startContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    try {
      const inspect = await container.inspect();
      if (inspect.Config?.Image) {
        await this.pullImage(inspect.Config.Image);
      }
      if (!inspect.State.Running) {
        await container.start();
        this.logger.debug(`Started container ${containerId}`);
      }
    } catch (error: any) {
      if (error?.statusCode === 404) {
        throw new NotFoundException('Container not found');
      }
      this.logger.error(
        `Unable to start container ${containerId}`,
        error as Error,
      );
      throw new InternalServerErrorException('Unable to start container');
    }
  }

  async stopContainerById(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    try {
      const inspect = await container.inspect();
      if (inspect.State.Running) {
        await container.stop();
        this.logger.debug(`Stopped container ${containerId}`);
      }
    } catch (error: any) {
      if (error?.statusCode === 404) {
        throw new NotFoundException('Container not found');
      }
      this.logger.error(
        `Unable to stop container ${containerId}`,
        error as Error,
      );
      throw new InternalServerErrorException('Unable to stop container');
    }
  }

  async getContainerLogs(containerId: string, tail = 200): Promise<string> {
    const container = this.docker.getContainer(containerId);
    try {
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
        follow: false,
      });
      return logs.toString('utf-8');
    } catch (error: any) {
      if (error?.statusCode === 404) {
        throw new NotFoundException('Container not found');
      }
      this.logger.error(
        `Unable to fetch logs for container ${containerId}`,
        error as Error,
      );
      throw new InternalServerErrorException('Unable to fetch container logs');
    }
  }

  private async findContainerByName(name: string) {
    const containers = await this.docker.listContainers({
      all: true,
      filters: { name: [name] },
    });
    return containers.length > 0 ? containers[0] : null;
  }

  private async pullImage(image: string): Promise<void> {
    this.logger.debug(`Pulling image ${image}`);
    return new Promise((resolve, reject) => {
      this.docker.pull(image, (error, stream) => {
        if (error) {
          this.logger.error(`Failed to pull image ${image}`, error as Error);
          return reject(error);
        }

        this.docker.modem.followProgress(stream, (progressError) => {
          if (progressError) {
            this.logger.error(
              `Error while pulling image ${image}`,
              progressError as Error,
            );
            reject(progressError);
          } else {
            this.logger.debug(`Image ${image} pulled successfully`);
            resolve();
          }
        });
      });
    });
  }
}
