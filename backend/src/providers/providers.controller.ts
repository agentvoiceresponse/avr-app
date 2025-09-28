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
import { CreateProviderDto } from './dto/create-provider.dto';
import { ProvidersService } from './providers.service';
import { Provider } from './provider.entity';
import { UserRole } from '../users/user.entity';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { PaginationQuery, PaginatedResult } from '../common/pagination';

@Controller('providers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createProviderDto: CreateProviderDto): Promise<Provider> {
    return this.providersService.create(createProviderDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  findAll(@Query() query: PaginationQuery): Promise<PaginatedResult<Provider>> {
    return this.providersService.findAll(query);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateProviderDto: UpdateProviderDto,
  ): Promise<Provider> {
    return this.providersService.update(id, updateProviderDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.providersService.remove(id);
    return { success: true };
  }
}
