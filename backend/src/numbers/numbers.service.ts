import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsteriskService } from '../asterisk/asterisk.service';
import { Agent } from '../agents/agent.entity';
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

    const agent = await this.agentsRepository.findOne({
      where: { id: dto.agentId },
    });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const number = this.numbersRepository.create({
      value,
      agent,
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

    if (dto.agentId) {
      const agent = await this.agentsRepository.findOne({
        where: { id: dto.agentId },
      });
      if (!agent) {
        throw new NotFoundException('Agent not found');
      }
      number.agent = agent;
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
}
