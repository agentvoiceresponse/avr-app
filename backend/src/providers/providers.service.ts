import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { Provider } from './provider.entity';
import {
  buildPaginatedResult,
  getPagination,
  PaginatedResult,
  PaginationQuery,
} from '../common/pagination';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
  ) {}

  async create(createProviderDto: CreateProviderDto): Promise<Provider> {
    const existing = await this.providerRepository.findOne({
      where: { name: createProviderDto.name },
    });

    if (existing) {
      throw new ConflictException('Provider name already exists');
    }

    const provider = this.providerRepository.create(createProviderDto);
    return this.providerRepository.save(provider);
  }

  async findAll(query: PaginationQuery): Promise<PaginatedResult<Provider>> {
    const { skip, take, page, limit } = getPagination(query);
    const [data, total] = await this.providerRepository.findAndCount({
      skip,
      take,
    });
    return buildPaginatedResult(data, total, page, limit);
  }

  async findById(id: string): Promise<Provider> {
    const provider = await this.providerRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    return provider;
  }

  async update(
    id: string,
    updateProviderDto: UpdateProviderDto,
  ): Promise<Provider> {
    const provider = await this.providerRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (updateProviderDto.name && updateProviderDto.name !== provider.name) {
      const existing = await this.providerRepository.findOne({
        where: { name: updateProviderDto.name },
      });
      if (existing) {
        throw new ConflictException('Provider name already exists');
      }
      provider.name = updateProviderDto.name;
    }

    if (updateProviderDto.type) {
      provider.type = updateProviderDto.type;
    }

    if (updateProviderDto.config !== undefined) {
      provider.config = updateProviderDto.config;
    }

    return this.providerRepository.save(provider);
  }

  async remove(id: string): Promise<void> {
    const result = await this.providerRepository.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('Provider not found');
    }
  }
}
