import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DockerService } from '../docker/docker.service';
import { Provider } from '../providers/provider.entity';
import { Agent } from './agent.entity';
import { AgentsService } from './agents.service';

describe('AgentsService', () => {
  let service: AgentsService;
  const agentRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: getRepositoryToken(Agent), useValue: agentRepositoryMock },
        {
          provide: getRepositoryToken(Provider),
          useValue: providerRepositoryMock,
        },
        { provide: DockerService, useValue: dockerServiceMock },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
