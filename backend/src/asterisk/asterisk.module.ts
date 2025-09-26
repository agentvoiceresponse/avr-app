import { Module } from '@nestjs/common';
import { AsteriskService } from './asterisk.service';

@Module({
  providers: [AsteriskService],
  exports: [AsteriskService],
})
export class AsteriskModule {}
