import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsteriskService } from '../asterisk/asterisk.service';
import { CreateTrunkDto } from './dto/create-trunk.dto';
import { UpdateTrunkDto } from './dto/update-trunk.dto';
import { Trunk } from './trunk.entity';
import {
  buildPaginatedResult,
  getPagination,
  PaginatedResult,
  PaginationQuery,
} from '../common/pagination';
import { buildProvisioningSyncException } from '../common/provisioning-sync';

@Injectable()
export class TrunksService {
  constructor(
    @InjectRepository(Trunk)
    private readonly trunksRepository: Repository<Trunk>,
    private readonly asteriskService: AsteriskService,
  ) {}

  async create(dto: CreateTrunkDto): Promise<Trunk> {
    const name = dto.name.trim();

    const existing = await this.trunksRepository.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException('Trunk name already exists');
    }

    const password = randomBytes(12).toString('base64url');

    const transport = dto.transport ?? 'udp';
    const codecs = this.normalizeCodecs(dto.codecs);

    const trunk = this.trunksRepository.create({
      name,
      password,
      transport,
      codecs,
    });
    const saved = await this.trunksRepository.save(trunk);

    try {
      await this.asteriskService.provisionTrunk(saved);
    } catch (error) {
      await this.trunksRepository.delete(saved.id);
      throw buildProvisioningSyncException('trunk', 'create', error);
    }

    return saved;
  }

  async findAll(query: PaginationQuery): Promise<PaginatedResult<Trunk>> {
    const { skip, take, page, limit } = getPagination(query);
    const [data, total] = await this.trunksRepository.findAndCount({
      order: { name: 'ASC' },
      skip,
      take,
    });
    return buildPaginatedResult(data, total, page, limit);
  }

  async update(id: string, dto: UpdateTrunkDto): Promise<Trunk> {
    const trunk = await this.trunksRepository.findOne({ where: { id } });

    if (!trunk) {
      throw new NotFoundException('Trunk not found');
    }
    const previous = { ...trunk };

    if (dto.name && dto.name.trim() !== trunk.name) {
      const newName = dto.name.trim();
      const existing = await this.trunksRepository.findOne({
        where: { name: newName },
      });
      if (existing) {
        throw new ConflictException('Trunk name already exists');
      }
      trunk.name = newName;
    }

    if (dto.transport && dto.transport !== trunk.transport) {
      trunk.transport = dto.transport;
    }

    if (dto.codecs !== undefined) {
      trunk.codecs = this.normalizeCodecs(dto.codecs);
    } else {
      trunk.codecs = this.normalizeCodecs(trunk.codecs);
    }

    const saved = await this.trunksRepository.save(trunk);
    try {
      await this.asteriskService.provisionTrunk(saved);
    } catch (error) {
      await this.trunksRepository.save(previous);
      throw buildProvisioningSyncException('trunk', 'update', error);
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const trunk = await this.trunksRepository.findOne({ where: { id } });
    if (!trunk) {
      throw new NotFoundException('Trunk not found');
    }

    try {
      await this.asteriskService.removeTrunk(id);
    } catch (error) {
      throw buildProvisioningSyncException('trunk', 'remove', error);
    }
    await this.trunksRepository.remove(trunk);
  }

  private normalizeCodecs(input?: string): string {
    const fallback = 'ulaw,alaw';
    if (!input) {
      return fallback;
    }
    const codecs = input
      .split(',')
      .map((codec) => codec.trim())
      .filter(Boolean);

    if (codecs.length === 0) {
      return fallback;
    }

    return codecs.join(',');
  }
}
