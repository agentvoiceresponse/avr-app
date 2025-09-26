import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsteriskService } from '../asterisk/asterisk.service';
import { Phone } from './phone.entity';
import { CreatePhoneDto } from './dto/create-phone.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import {
  buildPaginatedResult,
  getPagination,
  PaginatedResult,
  PaginationQuery,
} from '../common/pagination';

@Injectable()
export class PhonesService {
  constructor(
    @InjectRepository(Phone)
    private readonly phoneRepository: Repository<Phone>,
    private readonly asteriskService: AsteriskService,
  ) {}

  async create(dto: CreatePhoneDto): Promise<Phone> {
    const fullName = dto.fullName.trim();
    if (!fullName) {
      throw new BadRequestException('Full name cannot be empty');
    }
    const password = dto.password.trim();

    const client = this.phoneRepository.create({
      fullName,
      password,
    });

    const saved = await this.phoneRepository.save(client);

    try {
      await this.asteriskService.provisionPhone(saved);
    } catch (error) {
      await this.phoneRepository.delete(saved.id);
      throw error;
    }

    return saved;
  }

  async findAll(query: PaginationQuery): Promise<PaginatedResult<Phone>> {
    const { skip, take, page, limit } = getPagination(query);
    const [data, total] = await this.phoneRepository.findAndCount({
      order: { fullName: 'ASC' },
      skip,
      take,
    });
    return buildPaginatedResult(data, total, page, limit);
  }

  async update(id: string, dto: UpdatePhoneDto): Promise<Phone> {
    const phone = await this.phoneRepository.findOne({ where: { id } });

    if (!phone) {
      throw new NotFoundException('Phone not found');
    }

    if (dto.fullName !== undefined) {
      const fullName = dto.fullName.trim();
      if (!fullName) {
        throw new BadRequestException('Full name cannot be empty');
      }
      phone.fullName = fullName;
    }

    if (dto.password !== undefined) {
      const trimmed = dto.password.trim();
      if (trimmed.length > 0) {
        phone.password = trimmed;
      }
    }

    const saved = await this.phoneRepository.save(phone);

    await this.asteriskService.provisionPhone(saved);

    return saved;
  }

  async remove(id: string): Promise<void> {
    const client = await this.phoneRepository.findOne({ where: { id } });

    if (!client) {
      throw new NotFoundException('Phone not found');
    }

    await this.phoneRepository.remove(client);

    await this.asteriskService.removePhone(id);
  }
}
