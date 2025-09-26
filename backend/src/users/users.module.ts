import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { UsersSeeder } from './users.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  providers: [UsersService, RolesGuard, UsersSeeder],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
