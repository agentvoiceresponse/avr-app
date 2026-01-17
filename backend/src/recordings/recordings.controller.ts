import {
  Controller,
  Get,
  Param,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { RecordingsService } from './recordings.service';

@Controller('recordings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  async listRecordings() {
    const recordings = await this.recordingsService.listRecordings();
    return recordings.map((recording) => ({
      id: recording.id,
      callUuid: recording.callUuid,
      filename: recording.filename,
      sizeBytes: recording.sizeBytes,
      recordedAt: recording.recordedAt,
      updatedAt: recording.updatedAt,
    }));
  }

  @Get(':uuid')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  async getRecording(@Param('uuid') uuid: string) {
    const recording = await this.recordingsService.findByCallUuid(uuid);
    if (!recording) {
      return null;
    }
    return {
      id: recording.id,
      callUuid: recording.callUuid,
      filename: recording.filename,
      sizeBytes: recording.sizeBytes,
      recordedAt: recording.recordedAt,
      updatedAt: recording.updatedAt,
    };
  }

  @Get(':uuid/download')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  async downloadRecording(
    @Param('uuid') uuid: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filePath = await this.recordingsService.getRecordingPathOrThrow(uuid);
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Disposition': `attachment; filename="${uuid}.wav"`,
    });
    const stream = createReadStream(filePath);
    return new StreamableFile(stream);
  }
}
