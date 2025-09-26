import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { Phone } from './phone.entity';
import { PhonesController } from './phones.controller';
import { PhonesService } from './phones.service';

@Module({
  imports: [TypeOrmModule.forFeature([Phone]), AsteriskModule],
  controllers: [PhonesController],
  providers: [PhonesService, RolesGuard],
})
export class PhonesModule {}
