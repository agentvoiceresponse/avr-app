import { Test, TestingModule } from '@nestjs/testing';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

describe('AgentsController', () => {
  let controller: AgentsController;
  const agentsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    runAgent: jest.fn(),
    stopAgent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [{ provide: AgentsService, useValue: agentsServiceMock }],
    }).compile();

    controller = module.get<AgentsController>(AgentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
