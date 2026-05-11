import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AsteriskService } from '../asterisk/asterisk.service';
import { Phone } from './phone.entity';
import { PhonesService } from './phones.service';

describe('PhonesService', () => {
  let service: PhonesService;
  const phoneRepositoryMock = {
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
  };
  const asteriskServiceMock = {
    provisionPhone: jest.fn(),
    removePhone: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhonesService,
        { provide: getRepositoryToken(Phone), useValue: phoneRepositoryMock },
        { provide: AsteriskService, useValue: asteriskServiceMock },
      ],
    }).compile();
    service = module.get<PhonesService>(PhonesService);
  });

  it('rolls back DB update when phone provisioning fails', async () => {
    const existing = { id: 'p1', fullName: 'Alice', password: 'old' };
    phoneRepositoryMock.findOne.mockResolvedValueOnce(existing);
    phoneRepositoryMock.save
      .mockResolvedValueOnce({ ...existing, fullName: 'Bob' })
      .mockResolvedValueOnce(existing);
    asteriskServiceMock.provisionPhone.mockRejectedValueOnce(
      new Error('reload failed'),
    );

    await expect(
      service.update('p1', { fullName: 'Bob' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(phoneRepositoryMock.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'p1', fullName: 'Alice' }),
    );
  });

  it('does not remove DB phone when asterisk removal fails', async () => {
    const existing = { id: 'p1' };
    phoneRepositoryMock.findOne.mockResolvedValueOnce(existing);
    asteriskServiceMock.removePhone.mockRejectedValueOnce(new Error('down'));

    await expect(service.remove('p1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(phoneRepositoryMock.remove).not.toHaveBeenCalled();
  });
});
