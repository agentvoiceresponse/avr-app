import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AsteriskService } from '../asterisk/asterisk.service';
import { Trunk } from './trunk.entity';
import { TrunksService } from './trunks.service';

describe('TrunksService', () => {
  let service: TrunksService;
  const trunksRepositoryMock = {
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
  };
  const asteriskServiceMock = {
    provisionTrunk: jest.fn(),
    removeTrunk: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrunksService,
        { provide: getRepositoryToken(Trunk), useValue: trunksRepositoryMock },
        { provide: AsteriskService, useValue: asteriskServiceMock },
      ],
    }).compile();
    service = module.get<TrunksService>(TrunksService);
  });

  it('rolls back DB update when trunk provisioning fails', async () => {
    const existing = {
      id: 't1',
      name: 'old',
      transport: 'udp',
      codecs: 'ulaw',
    };
    trunksRepositoryMock.findOne.mockResolvedValueOnce(existing);
    trunksRepositoryMock.save
      .mockResolvedValueOnce({ ...existing, name: 'new', codecs: 'alaw' })
      .mockResolvedValueOnce(existing);
    asteriskServiceMock.provisionTrunk.mockRejectedValueOnce(
      new Error('reload failed'),
    );

    await expect(
      service.update('t1', { name: 'new', codecs: 'alaw' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(trunksRepositoryMock.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 't1', name: 'old' }),
    );
  });

  it('does not remove DB trunk when asterisk removal fails', async () => {
    const existing = { id: 't1' };
    trunksRepositoryMock.findOne.mockResolvedValueOnce(existing);
    asteriskServiceMock.removeTrunk.mockRejectedValueOnce(new Error('down'));

    await expect(service.remove('t1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(trunksRepositoryMock.remove).not.toHaveBeenCalled();
  });
});
