import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DockerService } from '../docker/docker.service';
import { AsteriskService } from '../asterisk/asterisk.service';
import { Provider, ProviderType } from '../providers/provider.entity';
import { assertProviderContract } from '../providers/provider-contracts';
import { CreateAgentDto } from './dto/create-agent.dto';
import { RunAgentDto } from './dto/run-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import {
  Agent,
  AgentFailureReason,
  AgentFailureStatus,
  AgentMode,
  AgentStatus,
} from './agent.entity';
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
  private readonly reservedEnvKeys = new Set([
    'AGENT_ID',
    'AGENT_NAME',
    'PORT',
    'HTTP_PORT',
    'WEBHOOK_URL',
    'WEBHOOK_SECRET',
    'ASR_URL',
    'LLM_URL',
    'TTS_URL',
    'STS_URL',
    'AMI_URL',
  ]);
  private readonly readinessTimeoutMs = Number(
    process.env.CONNECTOR_READINESS_TIMEOUT_MS ?? 15000,
  );
  private readonly readinessPollMs = Number(
    process.env.CONNECTOR_READINESS_POLL_MS ?? 1000,
  );
  private readonly lifecycleTransitions: Record<AgentStatus, AgentStatus[]> = {
    [AgentStatus.STOPPED]: [AgentStatus.STARTING],
    [AgentStatus.STARTING]: [AgentStatus.RUNNING, AgentStatus.ERROR],
    [AgentStatus.RUNNING]: [AgentStatus.STOPPING],
    [AgentStatus.STOPPING]: [AgentStatus.STOPPED, AgentStatus.ERROR],
    [AgentStatus.ERROR]: [AgentStatus.STARTING, AgentStatus.STOPPING],
  };

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
    this.assertTransition(agent.status, AgentStatus.STARTING);
    agent.status = AgentStatus.STARTING;
    this.clearFailureState(agent);
    await this.agentRepository.save(agent);

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

    try {
      for (const [type, provider] of mappedProviders) {
        if (!provider) {
          continue;
        }
        this.assertProviderRuntimeContract(provider, type);
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

        let binds: string[] = [];
        if (process.env.TOOLS_DIR) {
          binds.push(`${process.env.TOOLS_DIR}:/usr/src/app/tools`);
        }
        if (process.env.AVR_TOOLS_DIR) {
          binds.push(`${process.env.AVR_TOOLS_DIR}:/usr/src/app/avr_tools`);
        }

        containerIds[type] = await this.dockerService.runContainer(
          containerName,
          image,
          providerEnv,
          binds,
        );
        await this.waitForReadiness(containerIds[type], provider.name, type);
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

      await this.asteriskService.syncDialplan();

      this.assertTransition(agent.status, AgentStatus.RUNNING);
      agent.status = AgentStatus.RUNNING;
      this.clearFailureState(agent);
      return this.agentRepository.save(agent);
    } catch (error) {
      const startedContainers = Object.keys(containerIds).map((type) =>
        type === 'core'
          ? this.buildContainerName(agent.id)
          : this.buildContainerName(agent.id, type.toLowerCase()),
      );
      for (const name of startedContainers.reverse()) {
        try {
          await this.dockerService.stopContainer(name);
        } catch {
          // Best effort cleanup of partially started runtimes.
        }
      }
      this.assertTransition(agent.status, AgentStatus.ERROR);
      this.markFailedLifecycle(agent, error, 'run');
      await this.agentRepository.save(agent);
      throw error;
    }
  }

  async stopAgent(id: string): Promise<Agent> {
    const agent = await this.findOne(id);
    this.assertTransition(agent.status, AgentStatus.STOPPING);
    agent.status = AgentStatus.STOPPING;
    await this.agentRepository.save(agent);

    const names = this.getContainerNames(agent.id, agent.mode);
    try {
      const stopErrors = await this.stopContainersIdempotently(names);
      if (stopErrors.length) {
        throw new Error(
          `Compensation stop failed for ${stopErrors.length} container(s)`,
        );
      }
      await this.asteriskService.syncDialplan();

      this.assertTransition(agent.status, AgentStatus.STOPPED);
      agent.status = AgentStatus.STOPPED;
      this.clearFailureState(agent);
      return this.agentRepository.save(agent);
    } catch (error) {
      this.assertTransition(agent.status, AgentStatus.ERROR);
      this.markFailedLifecycle(agent, error, 'stop');
      await this.agentRepository.save(agent);
      throw error;
    }
  }

  private assertTransition(from: AgentStatus, to: AgentStatus): void {
    const allowed = this.lifecycleTransitions[from] ?? [];
    if (allowed.includes(to)) {
      return;
    }

    throw new ConflictException({
      code: 'AGENT_INVALID_TRANSITION',
      reason: 'Agent lifecycle transition is not allowed',
      currentStatus: from,
      targetStatus: to,
      allowedTransitions: allowed,
      retryable: false,
    });
  }

  private clearFailureState(agent: Agent): void {
    agent.lastError = null;
    agent.failureReason = null;
    agent.failureStatus = AgentFailureStatus.NONE;
    agent.retryable = null;
  }

  private async stopContainersIdempotently(names: string[]): Promise<Error[]> {
    const errors: Error[] = [];
    for (const name of names) {
      try {
        await this.dockerService.stopContainer(name);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown stop error';
        errors.push(new Error(`${name}: ${message}`));
      }
    }
    return errors;
  }

  private markFailedLifecycle(
    agent: Agent,
    error: unknown,
    operation: 'run' | 'stop',
  ): void {
    const message =
      error instanceof Error ? error.message : 'Unknown lifecycle error';
    const retryable = this.isRetryableLifecycleFailure(error);

    agent.status = AgentStatus.ERROR;
    agent.lastError = message;
    agent.failureReason = this.normalizeFailureReason(error, operation);
    agent.failureStatus = retryable
      ? AgentFailureStatus.RETRYABLE
      : AgentFailureStatus.TERMINAL;
    agent.retryable = retryable;
  }

  private isRetryableLifecycleFailure(error: unknown): boolean {
    if (error instanceof BadRequestException) {
      return false;
    }

    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    return (
      normalized.includes('timeout') ||
      normalized.includes('econnrefused') ||
      normalized.includes('enoent') ||
      normalized.includes('socket') ||
      normalized.includes('temporar') ||
      normalized.includes('unavailable')
    );
  }

  private normalizeFailureReason(
    error: unknown,
    operation: 'run' | 'stop',
  ): AgentFailureReason {
    if (error instanceof BadRequestException) {
      return AgentFailureReason.CONFIGURATION_INVALID;
    }

    const message = (
      error instanceof Error ? error.message : String(error)
    ).toLowerCase();

    if (operation === 'stop' && message.includes('compensation stop failed')) {
      return AgentFailureReason.COMPENSATION_FAILED;
    }

    if (
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enoent') ||
      message.includes('socket') ||
      message.includes('temporar') ||
      message.includes('unavailable')
    ) {
      return AgentFailureReason.DEPENDENCY_UNAVAILABLE;
    }

    return AgentFailureReason.UNKNOWN;
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
    } catch {
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

  private assertProviderRuntimeContract(
    provider: Provider,
    type: ProviderType,
  ): void {
    assertProviderContract(provider);

    const image = this.extractImage(provider);
    if (!image) {
      throw new BadRequestException(
        `Provider ${provider.name} (${type}) is missing runtime image`,
      );
    }

    const envConfig = provider.config?.env;
    if (!envConfig || typeof envConfig !== 'object') {
      return;
    }

    for (const key of Object.keys(envConfig)) {
      if (
        this.reservedEnvKeys.has(key) ||
        key.startsWith('PROVIDER_') ||
        key.endsWith('_URL')
      ) {
        throw new BadRequestException(
          `Provider ${provider.name} (${type}) uses reserved env key ${key}`,
        );
      }
    }
  }

  private async waitForReadiness(
    containerId: string,
    providerName: string,
    type: ProviderType,
  ): Promise<void> {
    const deadline = Date.now() + this.readinessTimeoutMs;

    while (Date.now() < deadline) {
      const inspect = await this.dockerService.getContainerInspect(containerId);
      const running = Boolean(inspect.State?.Running);
      const health = inspect.State?.Health?.Status;

      if (health === 'healthy') {
        return;
      }
      if (!health && running) {
        return;
      }
      if (health === 'unhealthy') {
        throw new BadRequestException(
          `Provider ${providerName} (${type}) failed healthcheck`,
        );
      }

      await this.sleep(this.readinessPollMs);
    }

    throw new BadRequestException(
      `Provider ${providerName} (${type}) readiness timeout after ${this.readinessTimeoutMs}ms`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
