import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AsteriskService } from '../asterisk/asterisk.service';
import { DockerService } from '../docker/docker.service';
import { Provider, ProviderType } from '../providers/provider.entity';
import {
  Agent,
  AgentFailureReason,
  AgentFailureStatus,
  AgentMode,
  AgentStatus,
} from './agent.entity';
import { AgentsService } from './agents.service';

describe('AgentsService', () => {
  let service: AgentsService;
  const agentRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };
  const providerRepositoryMock = {
    findOne: jest.fn(),
  };
  const dockerServiceMock = {
    runContainer: jest.fn(),
    stopContainer: jest.fn(),
    listContainers: jest.fn(),
    getContainerInspect: jest.fn(),
  };
  const asteriskServiceMock = {
    syncDialplan: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: getRepositoryToken(Agent), useValue: agentRepositoryMock },
        {
          provide: getRepositoryToken(Provider),
          useValue: providerRepositoryMock,
        },
        { provide: DockerService, useValue: dockerServiceMock },
        { provide: AsteriskService, useValue: asteriskServiceMock },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('marks error and cleans up when startup fails after first provider', async () => {
    const asrProvider = {
      id: 'asr1',
      name: 'asr',
      type: ProviderType.ASR,
      config: { image: 'repo/asr:latest', env: {} },
    } as Provider;
    const llmProvider = {
      id: 'llm1',
      name: 'llm',
      type: ProviderType.LLM,
      config: { image: 'repo/llm:latest', env: {} },
    } as Provider;

    const agent = {
      id: 'agent1',
      name: 'Test Agent',
      mode: AgentMode.PIPELINE,
      status: AgentStatus.STOPPED,
      port: 5010,
      httpPort: 7010,
      providerAsr: asrProvider,
      providerLlm: llmProvider,
      providerTts: null,
      providerSts: null,
    } as Agent;

    jest.spyOn(service, 'findOne').mockResolvedValue(agent);
    dockerServiceMock.runContainer
      .mockResolvedValueOnce('cid-asr')
      .mockRejectedValueOnce(new Error('LLM boot failed'));
    dockerServiceMock.getContainerInspect.mockResolvedValue({
      State: { Running: true },
    });
    agentRepositoryMock.save.mockImplementation(async (payload) => payload);

    await expect(service.runAgent('agent1', { env: [] })).rejects.toThrow(
      'LLM boot failed',
    );

    expect(dockerServiceMock.stopContainer).toHaveBeenCalledWith(
      'avr-asr-agent1',
    );
    expect(agentRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AgentStatus.ERROR,
        lastError: 'LLM boot failed',
      }),
    );
  });

  it('rejects reserved provider env keys', async () => {
    const asrProvider = {
      id: 'asr1',
      name: 'asr',
      type: ProviderType.ASR,
      config: { image: 'repo/asr:latest', env: { PORT: '9999' } },
    } as Provider;
    const agent = {
      id: 'agent2',
      name: 'Agent 2',
      mode: AgentMode.PIPELINE,
      status: AgentStatus.STOPPED,
      port: 5020,
      httpPort: 7020,
      providerAsr: asrProvider,
      providerLlm: null,
      providerTts: null,
      providerSts: null,
    } as Agent;

    jest.spyOn(service, 'findOne').mockResolvedValue(agent);

    await expect(
      service.runAgent('agent2', { env: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fails on readiness timeout and persists error', async () => {
    const asrProvider = {
      id: 'asr-timeout',
      name: 'asr-timeout',
      type: ProviderType.ASR,
      config: { image: 'repo/asr:latest', env: {} },
    } as Provider;
    const llmProvider = {
      id: 'llm-timeout',
      name: 'llm-timeout',
      type: ProviderType.LLM,
      config: { image: 'repo/llm:latest', env: {} },
    } as Provider;
    const ttsProvider = {
      id: 'tts-timeout',
      name: 'tts-timeout',
      type: ProviderType.TTS,
      config: { image: 'repo/tts:latest', env: {} },
    } as Provider;
    const agent = {
      id: 'agent-timeout',
      name: 'Agent Timeout',
      mode: AgentMode.PIPELINE,
      status: AgentStatus.STOPPED,
      port: 5030,
      httpPort: 7030,
      providerAsr: asrProvider,
      providerLlm: llmProvider,
      providerTts: ttsProvider,
      providerSts: null,
    } as Agent;

    jest.spyOn(service, 'findOne').mockResolvedValue(agent);
    dockerServiceMock.runContainer.mockResolvedValue('cid-timeout');
    dockerServiceMock.getContainerInspect.mockResolvedValue({
      State: { Running: false, Health: { Status: 'starting' } },
    });
    agentRepositoryMock.save.mockImplementation(async (payload) => payload);
    jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(20000);

    await expect(service.runAgent(agent.id, { env: [] })).rejects.toThrow(
      'readiness timeout',
    );
    expect(agentRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: AgentStatus.ERROR }),
    );
  });

  it('fails on unhealthy provider and performs cleanup', async () => {
    const stsProvider = {
      id: 'sts-bad',
      name: 'sts-bad',
      type: ProviderType.STS,
      config: {
        image: 'agentvoiceresponse/avr-sts-openai',
        env: { OPENAI_API_KEY: 'sk', OPENAI_MODEL: 'gpt-4o-realtime-preview' },
      },
    } as Provider;
    const agent = {
      id: 'agent-unhealthy',
      name: 'Agent Unhealthy',
      mode: AgentMode.STS,
      status: AgentStatus.STOPPED,
      port: 5040,
      httpPort: 7040,
      providerAsr: null,
      providerLlm: null,
      providerTts: null,
      providerSts: stsProvider,
    } as Agent;

    jest.spyOn(service, 'findOne').mockResolvedValue(agent);
    dockerServiceMock.runContainer.mockResolvedValue('cid-unhealthy');
    dockerServiceMock.getContainerInspect.mockResolvedValue({
      State: { Running: true, Health: { Status: 'unhealthy' } },
    });
    agentRepositoryMock.save.mockImplementation(async (payload) => payload);

    await expect(service.runAgent(agent.id, { env: [] })).rejects.toThrow(
      'failed healthcheck',
    );
    expect(dockerServiceMock.stopContainer).toHaveBeenCalledWith(
      'avr-sts-agent-unhealthy',
    );
  });

  it('maps upstream 5xx core startup failure to terminal error state', async () => {
    const asrProvider = {
      id: 'asr-5xx',
      name: 'asr-5xx',
      type: ProviderType.ASR,
      config: { image: 'repo/asr:latest', env: {} },
    } as Provider;
    const agent = {
      id: 'agent-5xx',
      name: 'Agent 5xx',
      mode: AgentMode.PIPELINE,
      status: AgentStatus.STOPPED,
      port: 5050,
      httpPort: 7050,
      providerAsr: asrProvider,
      providerLlm: null,
      providerTts: null,
      providerSts: null,
    } as Agent;

    jest.spyOn(service, 'findOne').mockResolvedValue(agent);
    dockerServiceMock.runContainer
      .mockResolvedValueOnce('cid-asr-5xx')
      .mockRejectedValueOnce(new Error('502 Bad Gateway'));
    dockerServiceMock.getContainerInspect.mockResolvedValue({
      State: { Running: true },
    });
    agentRepositoryMock.save.mockImplementation(async (payload) => payload);

    await expect(service.runAgent(agent.id, { env: [] })).rejects.toThrow(
      '502 Bad Gateway',
    );

    expect(agentRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AgentStatus.ERROR,
        failureStatus: AgentFailureStatus.TERMINAL,
        failureReason: AgentFailureReason.UNKNOWN,
        retryable: false,
      }),
    );
  });

  it('maps upstream 4xx core startup failure to terminal error state', async () => {
    const asrProvider = {
      id: 'asr-4xx',
      name: 'asr-4xx',
      type: ProviderType.ASR,
      config: { image: 'repo/asr:latest', env: {} },
    } as Provider;
    const agent = {
      id: 'agent-4xx',
      name: 'Agent 4xx',
      mode: AgentMode.PIPELINE,
      status: AgentStatus.STOPPED,
      port: 5051,
      httpPort: 7051,
      providerAsr: asrProvider,
      providerLlm: null,
      providerTts: null,
      providerSts: null,
    } as Agent;

    jest.spyOn(service, 'findOne').mockResolvedValue(agent);
    dockerServiceMock.runContainer
      .mockResolvedValueOnce('cid-asr-4xx')
      .mockRejectedValueOnce(new Error('401 Unauthorized'));
    dockerServiceMock.getContainerInspect.mockResolvedValue({
      State: { Running: true },
    });
    agentRepositoryMock.save.mockImplementation(async (payload) => payload);

    await expect(service.runAgent(agent.id, { env: [] })).rejects.toThrow(
      '401 Unauthorized',
    );

    expect(agentRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AgentStatus.ERROR,
        failureStatus: AgentFailureStatus.TERMINAL,
        failureReason: AgentFailureReason.UNKNOWN,
        retryable: false,
      }),
    );
  });

  it('attempts all container stops and marks compensation failure', async () => {
    const agent = {
      id: 'agent-stop',
      name: 'Agent Stop',
      mode: AgentMode.PIPELINE,
      status: AgentStatus.RUNNING,
      port: 5060,
      httpPort: 7060,
      providerAsr: null,
      providerLlm: null,
      providerTts: null,
      providerSts: null,
    } as Agent;

    jest.spyOn(service, 'findOne').mockResolvedValue(agent);
    dockerServiceMock.stopContainer
      .mockRejectedValueOnce(new Error('asr still shutting down'))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    agentRepositoryMock.save.mockImplementation(async (payload) => payload);

    await expect(service.stopAgent(agent.id)).rejects.toThrow(
      'Compensation stop failed for 1 container(s)',
    );

    expect(dockerServiceMock.stopContainer).toHaveBeenCalledTimes(4);
    expect(agentRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AgentStatus.ERROR,
        failureReason: AgentFailureReason.COMPENSATION_FAILED,
        failureStatus: AgentFailureStatus.TERMINAL,
        retryable: false,
      }),
    );
  });
});
