import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import path from 'path';
import { In, Repository } from 'typeorm';
import { Recording } from './recording.entity';

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);

  constructor(
    @InjectRepository(Recording)
    private readonly recordingsRepository: Repository<Recording>,
  ) {}

  async listRecordings(): Promise<Recording[]> {
    await this.syncFromFilesystem();
    return this.recordingsRepository.find({
      order: { recordedAt: 'DESC' },
    });
  }

  async findByCallUuid(callUuid: string): Promise<Recording | null> {
    const filePath = this.getRecordingPath(callUuid);
    try {
      const stats = await fs.stat(filePath);
      const filename = path.basename(filePath);
      const recordedAt = stats.mtime;
      const sizeBytes = stats.size;
      const existing = await this.recordingsRepository.findOne({
        where: { callUuid },
      });
      if (existing) {
        existing.filename = filename;
        existing.recordedAt = recordedAt;
        existing.sizeBytes = sizeBytes;
        return this.recordingsRepository.save(existing);
      }
      const created = this.recordingsRepository.create({
        callUuid,
        filename,
        recordedAt,
        sizeBytes,
      });
      return this.recordingsRepository.save(created);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getRecordingPathOrThrow(callUuid: string): Promise<string> {
    const filePath = this.getRecordingPath(callUuid);
    try {
      await fs.stat(filePath);
      return filePath;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        throw new NotFoundException('Recording not found');
      }
      throw error;
    }
  }

  private getRecordingPath(callUuid: string): string {
    return path.join(this.resolveMonitorPath(), `${callUuid}.wav`);
  }

  private resolveMonitorPath(): string {
    const configured = process.env.ASTERISK_MONITOR_PATH || '../recordings';
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }

  private async syncFromFilesystem(): Promise<void> {
    const monitorPath = this.resolveMonitorPath();
    let fileNames: string[] = [];
    try {
      fileNames = await fs.readdir(monitorPath);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        this.logger.warn(`Monitor path not found: ${monitorPath}`);
        return;
      }
      throw error;
    }

    const wavFiles = fileNames.filter((name) => name.toLowerCase().endsWith('.wav'));
    const existing = await this.recordingsRepository.find();
    const existingByUuid = new Map(existing.map((item) => [item.callUuid, item]));
    const seen = new Set<string>();

    for (const fileName of wavFiles) {
      const callUuid = path.basename(fileName, path.extname(fileName));
      seen.add(callUuid);
      const filePath = path.join(monitorPath, fileName);
      let stats;
      try {
        stats = await fs.stat(filePath);
      } catch (error: any) {
        if (error?.code === 'ENOENT') {
          continue;
        }
        throw error;
      }
      const existingItem = existingByUuid.get(callUuid);
      if (existingItem) {
        existingItem.filename = fileName;
        existingItem.recordedAt = stats.mtime;
        existingItem.sizeBytes = stats.size;
        await this.recordingsRepository.save(existingItem);
      } else {
        const created = this.recordingsRepository.create({
          callUuid,
          filename: fileName,
          recordedAt: stats.mtime,
          sizeBytes: stats.size,
        });
        await this.recordingsRepository.save(created);
      }
    }

    const missing = existing
      .filter((item) => !seen.has(item.callUuid))
      .map((item) => item.id);
    if (missing.length > 0) {
      await this.recordingsRepository.delete({ id: In(missing) });
    }
  }
}
