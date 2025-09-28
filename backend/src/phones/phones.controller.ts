import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { PhonesService } from './phones.service';
import { CreatePhoneDto } from './dto/create-phone.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { Phone } from './phone.entity';
import { PaginatedResult, PaginationQuery } from '../common/pagination';

@Controller('phones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PhonesController {
  constructor(private readonly phonesService: PhonesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreatePhoneDto): Promise<Phone> {
    return this.phonesService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  findAll(@Query() query: PaginationQuery): Promise<PaginatedResult<Phone>> {
    return this.phonesService.findAll(query);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdatePhoneDto): Promise<Phone> {
    return this.phonesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.phonesService.remove(id);
    return { success: true };
  }
}
