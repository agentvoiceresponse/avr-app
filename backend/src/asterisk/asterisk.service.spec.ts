import { Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import Ari from 'ari-client';
import { AsteriskService } from './asterisk.service';

describe('AsteriskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.ASTERISK_CONFIG_PATH;
  });

  it('logs structured error when ARI connection fails', async () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    jest
      .spyOn(Ari, 'connect')
      .mockRejectedValueOnce(new Error('ECONNREFUSED 127.0.0.1:8088'));

    const service = new AsteriskService();

    await expect((service as any).getAri()).rejects.toThrow(
      'ECONNREFUSED 127.0.0.1:8088',
    );
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to connect to ARI',
      expect.any(Error),
    );
  });

  it('logs structured error when module reload fails', async () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const service = new AsteriskService();
    jest
      .spyOn(service as any, 'getAri')
      .mockRejectedValueOnce(new Error('ARI unavailable'));

    await (service as any).reloadModule('pbx_config.so');

    expect(errorSpy).toHaveBeenCalledWith(
      'Unable to reload module pbx_config.so',
      expect.any(Error),
    );
  });

  it('creates and uses a dedicated managed section when provisioning phones', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avr-asterisk-'));
    process.env.ASTERISK_CONFIG_PATH = tempDir;
    const service = new AsteriskService();
    jest.spyOn(service as any, 'reloadModule').mockResolvedValue(undefined);

    const pjsipPath = path.join(tempDir, 'pjsip.conf');
    await fs.writeFile(pjsipPath, '[static]\ntype=global\n');

    await service.provisionPhone({
      id: '1001',
      fullName: 'Agent Test',
      password: 'secret',
    } as any);

    const content = await fs.readFile(pjsipPath, 'utf8');
    expect(content).toContain('[static]\ntype=global\n');
    expect(content).toContain('; BEGIN AVR-MANAGED');
    expect(content).toContain('; BEGIN phone-1001');
    expect(content).toContain('; END AVR-MANAGED');
  });

  it('fails fast when managed section contains unmanaged lines', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avr-asterisk-'));
    process.env.ASTERISK_CONFIG_PATH = tempDir;
    const service = new AsteriskService();
    jest.spyOn(service as any, 'reloadModule').mockResolvedValue(undefined);

    const pjsipPath = path.join(tempDir, 'pjsip.conf');
    await fs.writeFile(
      pjsipPath,
      [
        '; BEGIN AVR-MANAGED',
        'manual=unexpected',
        '; END AVR-MANAGED',
        '',
      ].join('\n'),
    );

    await expect(
      service.provisionPhone({
        id: '1002',
        fullName: 'Drifted User',
        password: 'secret',
      } as any),
    ).rejects.toThrow('Asterisk config drift detected');
  });
});
