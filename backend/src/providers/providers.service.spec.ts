import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Provider, ProviderType } from './provider.entity';
import { ProvidersService } from './providers.service';

describe('ProvidersService', () => {
  let service: ProvidersService;
  const providerRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        {
          provide: getRepositoryToken(Provider),
          useValue: providerRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects provider create when image is missing', async () => {
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      service.create({
        name: 'broken-sts',
        type: ProviderType.STS,
        config: { env: { OPENAI_API_KEY: 'sk-test' } },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects provider create when known contract env is missing', async () => {
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      service.create({
        name: 'sts-openai',
        type: ProviderType.STS,
        config: {
          image: 'agentvoiceresponse/avr-sts-openai:latest',
          env: { OPENAI_API_KEY: 'sk-test' },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates provider when contract is satisfied', async () => {
    const dto = {
      name: 'sts-openai',
      type: ProviderType.STS,
      config: {
        image: 'agentvoiceresponse/avr-sts-openai',
        env: {
          OPENAI_API_KEY: 'sk-test',
          OPENAI_MODEL: 'gpt-4o-realtime-preview',
        },
      },
    };
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);
    providerRepositoryMock.create.mockReturnValueOnce(dto);
    providerRepositoryMock.save.mockResolvedValueOnce({ id: '1', ...dto });

    const created = await service.create(dto);

    expect(created.id).toBe('1');
    expect(providerRepositoryMock.create).toHaveBeenCalledWith(dto);
  });

  it('rejects speechmatics provider create when SPEECHMATICS_API_KEY is missing', async () => {
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      service.create({
        name: 'sts-speechmatics',
        type: ProviderType.STS,
        config: {
          image: 'agentvoiceresponse/avr-sts-speechmatics:latest',
          env: {},
        },
      }),
    ).rejects.toMatchObject({
      response: {
        message: expect.stringContaining('SPEECHMATICS_API_KEY'),
      },
    });
  });

  it('creates speechmatics provider when contract is satisfied', async () => {
    const dto = {
      name: 'sts-speechmatics',
      type: ProviderType.STS,
      config: {
        image: 'agentvoiceresponse/avr-sts-speechmatics',
        env: { SPEECHMATICS_API_KEY: 'sm-test-key' },
      },
    };
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);
    providerRepositoryMock.create.mockReturnValueOnce(dto);
    providerRepositoryMock.save.mockResolvedValueOnce({ id: 'sm-1', ...dto });

    const created = await service.create(dto);

    expect(created.id).toBe('sm-1');
  });

  it('rejects humeai provider create when HUMEAI_API_KEY is missing', async () => {
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      service.create({
        name: 'sts-humeai',
        type: ProviderType.STS,
        config: {
          image: 'agentvoiceresponse/avr-sts-humeai:latest',
          env: { HUMEAI_CONFIG_ID: 'cfg-123' },
        },
      }),
    ).rejects.toMatchObject({
      response: {
        message: expect.stringContaining('HUMEAI_API_KEY'),
      },
    });
  });

  it('creates humeai provider when contract is satisfied', async () => {
    const dto = {
      name: 'sts-humeai',
      type: ProviderType.STS,
      config: {
        image: 'agentvoiceresponse/avr-sts-humeai',
        env: { HUMEAI_API_KEY: 'hume-test-key' },
      },
    };
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);
    providerRepositoryMock.create.mockReturnValueOnce(dto);
    providerRepositoryMock.save.mockResolvedValueOnce({ id: 'hume-1', ...dto });

    const created = await service.create(dto);

    expect(created.id).toBe('hume-1');
  });

  it('rejects asr-deepgram provider create when DEEPGRAM_API_KEY is missing', async () => {
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      service.create({
        name: 'asr-deepgram',
        type: ProviderType.ASR,
        config: {
          image: 'agentvoiceresponse/avr-asr-deepgram:latest',
          env: {},
        },
      }),
    ).rejects.toMatchObject({
      response: {
        message: expect.stringContaining('DEEPGRAM_API_KEY'),
      },
    });
  });

  it('creates asr-deepgram provider when contract is satisfied', async () => {
    const dto = {
      name: 'asr-deepgram',
      type: ProviderType.ASR,
      config: {
        image: 'agentvoiceresponse/avr-asr-deepgram',
        env: { DEEPGRAM_API_KEY: 'dg-test-key' },
      },
    };
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);
    providerRepositoryMock.create.mockReturnValueOnce(dto);
    providerRepositoryMock.save.mockResolvedValueOnce({
      id: 'asr-dg-1',
      ...dto,
    });

    const created = await service.create(dto);

    expect(created.id).toBe('asr-dg-1');
  });

  it('rejects asr-sarvam provider create when SARVAM_API_KEY is missing', async () => {
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      service.create({
        name: 'asr-sarvam',
        type: ProviderType.ASR,
        config: {
          image: 'agentvoiceresponse/avr-asr-sarvam:latest',
          env: {},
        },
      }),
    ).rejects.toMatchObject({
      response: {
        message: expect.stringContaining('SARVAM_API_KEY'),
      },
    });
  });

  it('creates asr-sarvam provider when contract is satisfied', async () => {
    const dto = {
      name: 'asr-sarvam',
      type: ProviderType.ASR,
      config: {
        image: 'agentvoiceresponse/avr-asr-sarvam',
        env: { SARVAM_API_KEY: 'sarvam-test-key' },
      },
    };
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);
    providerRepositoryMock.create.mockReturnValueOnce(dto);
    providerRepositoryMock.save.mockResolvedValueOnce({
      id: 'asr-sv-1',
      ...dto,
    });

    const created = await service.create(dto);

    expect(created.id).toBe('asr-sv-1');
  });

  it('rejects asr-soniox provider create when SONIOX_API_KEY is missing', async () => {
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      service.create({
        name: 'asr-soniox',
        type: ProviderType.ASR,
        config: {
          image: 'agentvoiceresponse/avr-asr-soniox:latest',
          env: {},
        },
      }),
    ).rejects.toMatchObject({
      response: {
        message: expect.stringContaining('SONIOX_API_KEY'),
      },
    });
  });

  it('creates asr-soniox provider when contract is satisfied', async () => {
    const dto = {
      name: 'asr-soniox',
      type: ProviderType.ASR,
      config: {
        image: 'agentvoiceresponse/avr-asr-soniox',
        env: { SONIOX_API_KEY: 'soniox-test-key' },
      },
    };
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);
    providerRepositoryMock.create.mockReturnValueOnce(dto);
    providerRepositoryMock.save.mockResolvedValueOnce({
      id: 'asr-sx-1',
      ...dto,
    });

    const created = await service.create(dto);

    expect(created.id).toBe('asr-sx-1');
  });

  it('rejects deepgram provider create when AGENT_PROMPT is missing', async () => {
    providerRepositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      service.create({
        name: 'sts-deepgram',
        type: ProviderType.STS,
        config: {
          image: 'agentvoiceresponse/avr-sts-deepgram:latest',
          env: { DEEPGRAM_API_KEY: 'dg-test-key' },
        },
      }),
    ).rejects.toMatchObject({
      response: {
        message: expect.stringContaining('AGENT_PROMPT'),
      },
    });
  });

  it('fails create on duplicate name', async () => {
    providerRepositoryMock.findOne.mockResolvedValueOnce({ id: 'existing' });

    await expect(
      service.create({
        name: 'duplicate',
        type: ProviderType.STS,
        config: {
          image: 'agentvoiceresponse/avr-sts-openai',
          env: {
            OPENAI_API_KEY: 'sk-test',
            OPENAI_MODEL: 'gpt-4o-realtime-preview',
          },
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
