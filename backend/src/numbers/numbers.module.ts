import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { Agent } from '../agents/agent.entity';
import { Phone } from '../phones/phone.entity';
import { Trunk } from '../trunks/trunk.entity';
import { PhoneNumber } from './number.entity';
import { NumbersController } from './numbers.controller';
import { NumbersService } from './numbers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PhoneNumber, Agent, Phone, Trunk]),
    AsteriskModule,
  ],
  controllers: [NumbersController],
  providers: [NumbersService, RolesGuard],
})
export class NumbersModule {}
