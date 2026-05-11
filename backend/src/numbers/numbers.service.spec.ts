import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AsteriskService } from '../asterisk/asterisk.service';
import { Agent } from '../agents/agent.entity';
import { Phone } from '../phones/phone.entity';
import { Trunk } from '../trunks/trunk.entity';
import { PhoneNumber } from './number.entity';
import { NumbersService } from './numbers.service';

describe('NumbersService', () => {
  let service: NumbersService;
  const numbersRepositoryMock = {
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
  };
  const passthroughRepositoryMock = {
    findOne: jest.fn(),
  };
  const asteriskServiceMock = {
    provisionNumber: jest.fn(),
    removeNumber: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NumbersService,
        {
          provide: getRepositoryToken(PhoneNumber),
          useValue: numbersRepositoryMock,
        },
        {
          provide: getRepositoryToken(Agent),
          useValue: passthroughRepositoryMock,
        },
        {
          provide: getRepositoryToken(Phone),
          useValue: passthroughRepositoryMock,
        },
        {
          provide: getRepositoryToken(Trunk),
          useValue: passthroughRepositoryMock,
        },
        { provide: AsteriskService, useValue: asteriskServiceMock },
      ],
    }).compile();
    service = module.get<NumbersService>(NumbersService);
  });

  it('rolls back DB update when number provisioning fails', async () => {
    const existing = {
      id: 'n1',
      value: '+1000',
      application: 'agent',
      denoiseEnabled: false,
      recordingEnabled: false,
      agent: { id: 'a1' },
    };
    numbersRepositoryMock.findOne.mockResolvedValueOnce(existing);
    numbersRepositoryMock.save
      .mockResolvedValueOnce({ ...existing, denoiseEnabled: true })
      .mockResolvedValueOnce(existing);
    asteriskServiceMock.provisionNumber.mockRejectedValueOnce(
      new Error('reload failed'),
    );

    await expect(
      service.update('n1', { denoiseEnabled: true }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(numbersRepositoryMock.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'n1', denoiseEnabled: false }),
    );
  });

  it('does not remove DB number when asterisk removal fails', async () => {
    const existing = { id: 'n1' };
    numbersRepositoryMock.findOne.mockResolvedValueOnce(existing);
    asteriskServiceMock.removeNumber.mockRejectedValueOnce(new Error('down'));

    await expect(service.remove('n1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(numbersRepositoryMock.remove).not.toHaveBeenCalled();
  });
});
