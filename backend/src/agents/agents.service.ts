import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DockerService } from '../docker/docker.service';
import { AsteriskService } from '../asterisk/asterisk.service';
import { Provider, ProviderType } from '../providers/provider.entity';
import { CreateAgentDto } from './dto/create-agent.dto';
import { RunAgentDto } from './dto/run-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { Agent, AgentMode, AgentStatus } from './agent.entity';
import {
  buildPaginatedResult,
  getPagination,
  PaginatedResult,
  PaginationQuery,
} from '../common/pagination';

@Injectable()
export class AgentsService {
  private readonly defaultImage =
    process.env.CORE_DEFAULT_IMAGE || 'agentvoiceresponse/avr-core:latest';

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    private readonly dockerService: DockerService,
    private readonly asteriskService: AsteriskService,
  ) {}

  async create(createAgentDto: CreateAgentDto): Promise<Agent> {
    const agent = this.agentRepository.create({
      name: createAgentDto.name,
      mode: createAgentDto.mode ?? AgentMode.PIPELINE,
      port: Math.floor(Math.random() * 1000) + 5000,
      httpPort: Math.floor(Math.random() * 1000) + 7000,
    });

    agent.providerAsr = await this.resolveProvider(
      createAgentDto.providerAsrId,
    );
    agent.providerLlm = await this.resolveProvider(
      createAgentDto.providerLlmId,
    );
    agent.providerTts = await this.resolveProvider(
      createAgentDto.providerTtsId,
    );
    agent.providerSts = await this.resolveProvider(
      createAgentDto.providerStsId,
    );

    this.assertModeRequirements(agent);

    const saved = await this.agentRepository.save(agent);
    return saved;
  }

  async findAll(query: PaginationQuery): Promise<PaginatedResult<Agent>> {
    const { skip, take, page, limit } = getPagination(query);

    const [data, total] = await this.agentRepository.findAndCount({
      skip,
      take,
    });

    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({ where: { id } });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return agent;
  }

  async update(id: string, updateAgentDto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.findOne(id);

    if (updateAgentDto.name) {
      agent.name = updateAgentDto.name;
    }

    if (updateAgentDto.mode) {
      agent.mode = updateAgentDto.mode;
    }

    // Retrocompatibily: if httpPort is not set, generate a random port
    if (agent.httpPort === null) {
      agent.httpPort = Math.floor(Math.random() * 1000) + 7000;
    }

    if (updateAgentDto.providerAsrId !== undefined) {
      agent.providerAsr = await this.resolveProvider(
        updateAgentDto.providerAsrId,
      );
    }
    if (updateAgentDto.providerLlmId !== undefined) {
      agent.providerLlm = await this.resolveProvider(
        updateAgentDto.providerLlmId,
      );
    }
    if (updateAgentDto.providerTtsId !== undefined) {
      agent.providerTts = await this.resolveProvider(
        updateAgentDto.providerTtsId,
      );
    }
    if (updateAgentDto.providerStsId !== undefined) {
      agent.providerSts = await this.resolveProvider(
        updateAgentDto.providerStsId,
      );
    }

    this.assertModeRequirements(agent);

    const saved = await this.agentRepository.save(agent);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const agent = await this.agentRepository.findOne({ where: { id } });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    const names = this.getContainerNames(agent.id, agent.mode);
    for (const name of names) {
      await this.dockerService.stopContainer(name);
    }
    // TODO: remove phone related to agent from asterisk

    const result = await this.agentRepository.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('Agent not found');
    }
  }

  async runAgent(id: string, runAgentDto: RunAgentDto) {
    const agent = await this.findOne(id);
    const env = this.buildEnv(agent, runAgentDto.env ?? []);
    const coreEnv = this.buildEnv(agent, [
      `WEBHOOK_URL=${process.env.WEBHOOK_URL}`,
      `WEBHOOK_SECRET=${process.env.WEBHOOK_SECRET}`,
    ]);

    const containerIds: Record<string, string> = {};

    const mappedProviders: Array<[ProviderType, Provider | null]> =
      agent.mode === AgentMode.STS
        ? [[ProviderType.STS, agent.providerSts ?? null]]
        : [
            [ProviderType.ASR, agent.providerAsr ?? null],
            [ProviderType.LLM, agent.providerLlm ?? null],
            [ProviderType.TTS, agent.providerTts ?? null],
          ];

    for (const [type, provider] of mappedProviders) {
      if (!provider) {
        continue;
      }
      const containerName = this.buildContainerName(
        agent.id,
        type.toLowerCase(),
      );
      // Generate a random port between 6000 and 6999 for each provider container
      const port = Math.floor(Math.random() * 1000) + 6000;
      const image = this.extractImage(provider);
      const providerEnv = this.extendEnv(env, provider, type, port);
      if (type == ProviderType.STS) {
        coreEnv.push(`STS_URL=ws://${containerName}:${port}`);
      } else {
        coreEnv.push(
          `${type.toLowerCase()}_URL=http://${containerName}:${port}`,
        );
      }
      containerIds[type] = await this.dockerService.runContainer(
        containerName,
        image,
        providerEnv,
        [
          `${process.env.TOOLS_DIR}:/usr/src/app/tools`
        ]
      );
    }

    if (Object.keys(containerIds).length) {
      const containerName = this.buildContainerName(agent.id);
      coreEnv.push(`PORT=${agent.port}`);
      coreEnv.push(`HTTP_PORT=${agent.httpPort}`);
      containerIds['core'] = await this.dockerService.runContainer(
        containerName,
        this.defaultImage,
        coreEnv,
      );
    }

    agent.status = AgentStatus.RUNNING;
    return this.agentRepository.save(agent);
  }

  async stopAgent(id: string): Promise<Agent> {
    const agent = await this.findOne(id);
    const names = this.getContainerNames(agent.id, agent.mode);
    for (const name of names) {
      await this.dockerService.stopContainer(name);
    }

    agent.status = AgentStatus.STOPPED;
    return this.agentRepository.save(agent);
  }

  private async resolveProvider(id?: string | null): Promise<Provider | null> {
    if (!id) {
      return null;
    }

    const provider = await this.providerRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }
    return provider;
  }

  private buildContainerName(agentId: string, type?: string) {
    return type ? `avr-${type}-${agentId}` : `avr-core-${agentId}`;
  }

  private getContainerNames(agentId: string, mode: AgentMode): string[] {
    if (mode === AgentMode.STS) {
      return [
        this.buildContainerName(agentId, ProviderType.STS.toLowerCase()),
        this.buildContainerName(agentId),
      ];
    }

    return [
      this.buildContainerName(agentId, ProviderType.ASR.toLowerCase()),
      this.buildContainerName(agentId, ProviderType.LLM.toLowerCase()),
      this.buildContainerName(agentId, ProviderType.TTS.toLowerCase()),
      this.buildContainerName(agentId),
    ];
  }

  private extractImage(provider: Provider | null): string | null {
    if (!provider) {
      return null;
    }
    const image = provider.config?.image ?? provider.config?.dockerImage;
    return typeof image === 'string' ? image : null;
  }

  private buildEnv(agent: Agent, additional: string[]): string[] {
    const baseEnv = [`AGENT_ID=${agent.id}`, `AGENT_NAME=${agent.name}`];

    const envSet = new Set([...baseEnv, ...additional]);
    return Array.from(envSet);
  }

  private isValidUrl(str) {
    try {
      new URL(str);
      return true;
    } catch (_) {
      return false;
    }
  }

  private extendEnv(
    baseEnv: string[],
    provider: Provider,
    type: ProviderType,
    port?: number,
  ): string[] {
    const providerEnv = Object.entries(provider.config?.env ?? {})
      .map(([key, value]) => {
        switch (key) {
          case 'OPENAI_INSTRUCTIONS':
            return `${this.isValidUrl(value) ? 'OPENAI_URL_INSTRUCTIONS' : 'OPENAI_INSTRUCTIONS'}=${value}`;
        case 'OPENAI_LANGUAGE': {
          const language = value ? String(value) : '';
          if (!language || language === 'NULL' || language === 'auto') {
            return null;
          }
          return `OPENAI_LANGUAGE=${language}`;
        }
          case 'GEMINI_INSTRUCTIONS':
            return `${this.isValidUrl(value) ? 'GEMINI_URL_INSTRUCTIONS' : 'GEMINI_INSTRUCTIONS'}=${value}`;
          default:
            return `${key}=${value}`;
        }
      })
      .filter((entry): entry is string => Boolean(entry));
    const env = new Set([...baseEnv, ...providerEnv]);
    env.add(`PROVIDER_${type}_ID=${provider.id}`);
    env.add(`PROVIDER_${type}_NAME=${provider.name}`);
    env.add(`PROVIDER_${type}_TYPE=${provider.type}`);
    env.add(`PORT=${port}`);

    if (type === ProviderType.STS || type === ProviderType.LLM) {
      env.add(`AMI_URL=${process.env.AMI_URL}`);
    }
    return Array.from(env);
  }

  private assertModeRequirements(agent: Agent) {
    if (agent.mode === AgentMode.STS) {
      if (!agent.providerSts) {
        throw new BadRequestException('STS provider is required for STS mode');
      }
      agent.providerAsr = null;
      agent.providerLlm = null;
      agent.providerTts = null;
      return;
    }

    if (!agent.providerAsr || !agent.providerLlm || !agent.providerTts) {
      throw new BadRequestException(
        'Providers ASR, LLM, and TTS are required for pipeline mode',
      );
    }
    agent.providerSts = null;
  }
}
