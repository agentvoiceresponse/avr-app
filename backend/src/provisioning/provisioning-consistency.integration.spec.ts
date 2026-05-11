import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsteriskService } from '../asterisk/asterisk.service';
import { Agent } from '../agents/agent.entity';
import { Phone } from '../phones/phone.entity';
import { PhonesService } from '../phones/phones.service';
import { PhoneNumber } from '../numbers/number.entity';
import { NumbersService } from '../numbers/numbers.service';
import { Provider } from '../providers/provider.entity';
import { Trunk } from '../trunks/trunk.entity';
import { TrunksService } from '../trunks/trunks.service';

describe('Provisioning Consistency (integration)', () => {
  let moduleRef: TestingModule;
  let trunksService: TrunksService;
  let phonesService: PhonesService;
  let numbersService: NumbersService;
  let trunksRepository: Repository<Trunk>;
  let phonesRepository: Repository<Phone>;
  let numbersRepository: Repository<PhoneNumber>;

  const asteriskServiceMock = {
    provisionTrunk: jest.fn(),
    removeTrunk: jest.fn(),
    provisionPhone: jest.fn(),
    removePhone: jest.fn(),
    provisionNumber: jest.fn(),
    removeNumber: jest.fn(),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Trunk, Phone, PhoneNumber, Agent, Provider],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([Trunk, Phone, PhoneNumber, Agent, Provider]),
      ],
      providers: [
        TrunksService,
        PhonesService,
        NumbersService,
        { provide: AsteriskService, useValue: asteriskServiceMock },
      ],
    }).compile();

    trunksService = moduleRef.get(TrunksService);
    phonesService = moduleRef.get(PhonesService);
    numbersService = moduleRef.get(NumbersService);
    trunksRepository = moduleRef.get(getRepositoryToken(Trunk));
    phonesRepository = moduleRef.get(getRepositoryToken(Phone));
    numbersRepository = moduleRef.get(getRepositoryToken(PhoneNumber));
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await numbersRepository.clear();
    await phonesRepository.clear();
    await trunksRepository.clear();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('rolls back trunk DB update and returns retryable failure metadata', async () => {
    const trunk = await trunksRepository.save({
      name: 'existing-trunk',
      password: 'secret',
      transport: 'udp',
      codecs: 'ulaw,alaw',
    });
    asteriskServiceMock.provisionTrunk.mockRejectedValueOnce(
      new Error('reload failed'),
    );

    let payload: {
      code: string;
      retryable: boolean;
      resource: string;
      action: string;
    } | null = null;
    try {
      await trunksService.update(trunk.id, { name: 'updated-trunk' });
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      payload = (error as ServiceUnavailableException).getResponse() as {
        code: string;
        retryable: boolean;
        resource: string;
        action: string;
      };
    }

    const persisted = await trunksRepository.findOneOrFail({
      where: { id: trunk.id },
    });
    expect(persisted.name).toBe('existing-trunk');
    expect(payload).not.toBeNull();
    expect(payload?.code).toBe('ASTERISK_SYNC_FAILED');
    expect(payload?.retryable).toBe(true);
    expect(payload?.resource).toBe('trunk');
    expect(payload?.action).toBe('update');
  });

  it('rolls back phone DB update and returns retryable failure metadata', async () => {
    const phone = await phonesRepository.save({
      fullName: 'Alice',
      password: 'pwd',
    });
    asteriskServiceMock.provisionPhone.mockRejectedValueOnce(
      new Error('reload failed'),
    );

    let payload: {
      code: string;
      retryable: boolean;
      resource: string;
      action: string;
    } | null = null;
    try {
      await phonesService.update(phone.id, { fullName: 'Bob' });
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      payload = (error as ServiceUnavailableException).getResponse() as {
        code: string;
        retryable: boolean;
        resource: string;
        action: string;
      };
    }

    const persisted = await phonesRepository.findOneOrFail({
      where: { id: phone.id },
    });
    expect(persisted.fullName).toBe('Alice');

    expect(payload).not.toBeNull();
    expect(payload?.code).toBe('ASTERISK_SYNC_FAILED');
    expect(payload?.retryable).toBe(true);
    expect(payload?.resource).toBe('phone');
    expect(payload?.action).toBe('update');
  });

  it('preserves number row on remove failure and returns retryable failure metadata', async () => {
    const phone = await phonesRepository.save({
      fullName: 'Ops phone',
      password: 'pwd',
    });
    const number = await numbersRepository.save({
      value: '+15551230001',
      application: 'internal',
      denoiseEnabled: true,
      recordingEnabled: false,
      phone,
    });
    asteriskServiceMock.removeNumber.mockRejectedValueOnce(new Error('down'));

    let payload: {
      code: string;
      retryable: boolean;
      resource: string;
      action: string;
    } | null = null;
    try {
      await numbersService.remove(number.id);
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      payload = (error as ServiceUnavailableException).getResponse() as {
        code: string;
        retryable: boolean;
        resource: string;
        action: string;
      };
    }

    const persisted = await numbersRepository.findOne({
      where: { id: number.id },
    });
    expect(persisted).not.toBeNull();

    expect(payload).not.toBeNull();
    expect(payload?.code).toBe('ASTERISK_SYNC_FAILED');
    expect(payload?.retryable).toBe(true);
    expect(payload?.resource).toBe('number');
    expect(payload?.action).toBe('remove');
  });
});
