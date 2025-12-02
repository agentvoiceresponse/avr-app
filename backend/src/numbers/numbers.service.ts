import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsteriskService } from '../asterisk/asterisk.service';
import { Agent } from '../agents/agent.entity';
import { Phone } from '../phones/phone.entity';
import { Trunk } from '../trunks/trunk.entity';
import { CreateNumberDto } from './dto/create-number.dto';
import { UpdateNumberDto } from './dto/update-number.dto';
import { PhoneNumber } from './number.entity';
import {
  buildPaginatedResult,
  getPagination,
  PaginatedResult,
  PaginationQuery,
} from '../common/pagination';

@Injectable()
export class NumbersService {
  constructor(
    @InjectRepository(PhoneNumber)
    private readonly numbersRepository: Repository<PhoneNumber>,
    @InjectRepository(Agent)
    private readonly agentsRepository: Repository<Agent>,
    @InjectRepository(Phone)
    private readonly phonesRepository: Repository<Phone>,
    @InjectRepository(Trunk)
    private readonly trunksRepository: Repository<Trunk>,
    private readonly asteriskService: AsteriskService,
  ) {}

  async create(dto: CreateNumberDto): Promise<PhoneNumber> {
    const value = dto.value.trim();

    const existing = await this.numbersRepository.findOne({
      where: { value },
    });
    if (existing) {
      throw new ConflictException('Number already exists');
    }

    const payload = await this.buildAssociations(dto);

    const number = this.numbersRepository.create({
      value,
      application: dto.application,
      ...payload,
    });

    const saved = await this.numbersRepository.save(number);

    try {
      await this.asteriskService.provisionNumber(saved);
    } catch (error) {
      await this.numbersRepository.delete(saved.id);
      throw error;
    }

    return saved;
  }

  async findAll(query: PaginationQuery): Promise<PaginatedResult<PhoneNumber>> {
    const { skip, take, page, limit } = getPagination(query);
    const [data, total] = await this.numbersRepository.findAndCount({
      relations: ['agent', 'phone', 'trunk'],
      order: { value: 'ASC' },
      skip,
      take,
    });
    return buildPaginatedResult(data, total, page, limit);
  }

  async update(id: string, dto: UpdateNumberDto): Promise<PhoneNumber> {
    const number = await this.numbersRepository.findOne({ where: { id } });

    if (!number) {
      throw new NotFoundException('Number not found');
    }

    if (dto.value) {
      const nextValue = dto.value.trim();
      if (nextValue !== number.value) {
        const existing = await this.numbersRepository.findOne({
          where: { value: nextValue },
        });
        if (existing) {
          throw new ConflictException('Number already exists');
        }
        number.value = nextValue;
      }
    }

    if (dto.application) {
      number.application = dto.application;
    }

    if (dto.agentId || dto.phoneId || dto.trunkId || dto.application) {
      const associations = await this.buildAssociations({
        application: number.application,
        agentId: dto.agentId ?? number.agent?.id,
        phoneId: dto.phoneId ?? number.phone?.id,
        trunkId: dto.trunkId ?? number.trunk?.id,
      });
      number.agent = associations.agent ?? null;
      number.phone = associations.phone ?? null;
      number.trunk = associations.trunk ?? null;
    }

    const saved = await this.numbersRepository.save(number);

    await this.asteriskService.provisionNumber(saved);

    return saved;
  }

  async remove(id: string): Promise<void> {
    const number = await this.numbersRepository.findOne({ where: { id } });

    if (!number) {
      throw new NotFoundException('Number not found');
    }

    await this.numbersRepository.remove(number);

    await this.asteriskService.removeNumber(id);
  }

  private async buildAssociations(
    dto:
      | Pick<CreateNumberDto, 'application' | 'agentId' | 'phoneId' | 'trunkId'>
      | {
          application: 'agent' | 'internal' | 'transfer';
          agentId?: string | null;
          phoneId?: string | null;
          trunkId?: string | null;
        },
  ): Promise<{ agent?: Agent | null; phone?: Phone | null; trunk?: Trunk | null }> {
    switch (dto.application) {
      case 'agent': {
        if (!dto.agentId) {
          throw new NotFoundException('Agent not found');
        }
        const agent = await this.agentsRepository.findOne({
          where: { id: dto.agentId },
        });
        if (!agent) {
          throw new NotFoundException('Agent not found');
        }
        return { agent, phone: null, trunk: null };
      }
      case 'internal': {
        if (!dto.phoneId) {
          throw new NotFoundException('Phone not found');
        }
        const phone = await this.phonesRepository.findOne({
          where: { id: dto.phoneId },
        });
        if (!phone) {
          throw new NotFoundException('Phone not found');
        }
        return { phone, agent: null, trunk: null };
      }
      case 'transfer': {
        if (!dto.trunkId) {
          throw new NotFoundException('Trunk not found');
        }
        const trunk = await this.trunksRepository.findOne({
          where: { id: dto.trunkId },
        });
        if (!trunk) {
          throw new NotFoundException('Trunk not found');
        }
        return { trunk, agent: null, phone: null };
      }
      default:
        throw new NotFoundException('Invalid application');
    }
  }
}
