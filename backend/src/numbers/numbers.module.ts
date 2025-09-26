import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { Agent } from '../agents/agent.entity';
import { PhoneNumber } from './number.entity';
import { NumbersController } from './numbers.controller';
import { NumbersService } from './numbers.service';

@Module({
  imports: [TypeOrmModule.forFeature([PhoneNumber, Agent]), AsteriskModule],
  controllers: [NumbersController],
  providers: [NumbersService, RolesGuard],
})
export class NumbersModule {}
