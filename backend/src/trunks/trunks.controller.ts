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
import { TrunksService } from './trunks.service';
import { CreateTrunkDto } from './dto/create-trunk.dto';
import { UpdateTrunkDto } from './dto/update-trunk.dto';
import { Trunk } from './trunk.entity';
import { PaginatedResult, PaginationQuery } from '../common/pagination';

@Controller('trunks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrunksController {
  constructor(private readonly trunksService: TrunksService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateTrunkDto): Promise<Trunk> {
    return this.trunksService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  findAll(@Query() query: PaginationQuery): Promise<PaginatedResult<Trunk>> {
    return this.trunksService.findAll(query);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateTrunkDto): Promise<Trunk> {
    return this.trunksService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string): Promise<void> {
    return this.trunksService.remove(id);
  }
}
