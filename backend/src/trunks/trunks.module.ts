import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { Trunk } from './trunk.entity';
import { TrunksService } from './trunks.service';
import { TrunksController } from './trunks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Trunk]), AsteriskModule],
  providers: [TrunksService, RolesGuard],
  controllers: [TrunksController],
})
export class TrunksModule {}
