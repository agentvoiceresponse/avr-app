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
import { CreateNumberDto } from './dto/create-number.dto';
import { UpdateNumberDto } from './dto/update-number.dto';
import { NumbersService } from './numbers.service';
import { PhoneNumber } from './number.entity';
import { PaginatedResult, PaginationQuery } from '../common/pagination';

@Controller('numbers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NumbersController {
  constructor(private readonly numbersService: NumbersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateNumberDto): Promise<PhoneNumber> {
    return this.numbersService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  findAll(
    @Query() query: PaginationQuery,
  ): Promise<PaginatedResult<PhoneNumber>> {
    return this.numbersService.findAll(query);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNumberDto,
  ): Promise<PhoneNumber> {
    return this.numbersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.numbersService.remove(id);
    return { success: true };
  }
}
