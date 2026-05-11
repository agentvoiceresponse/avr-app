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
