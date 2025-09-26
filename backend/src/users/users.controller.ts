import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './user.entity';
import { UsersService } from './users.service';
import { PaginatedResult, PaginationQuery } from '../common/pagination';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return this.toSafeUser(user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  async findAll(
    @Query() query: PaginationQuery,
  ): Promise<PaginatedResult<any>> {
    const result = await this.usersService.findAll(query);
    return {
      ...result,
      data: result.data.map((user) => this.toSafeUser(user)),
    };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return this.toSafeUser(user);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }

  private toSafeUser(user: User) {
    const { passwordHash: _passwordHash, ...safe } = user;
    void _passwordHash;
    return safe;
  }
}
