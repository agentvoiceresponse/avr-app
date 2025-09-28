import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import Ari, { Client } from 'ari-client';
import { Phone } from '../phones/phone.entity';
import { PhoneNumber } from '../numbers/number.entity';
import { Trunk } from '../trunks/trunk.entity';

@Injectable()
export class AsteriskService {
  private readonly logger = new Logger(AsteriskService.name);
  private ari: Client | null = null;
  private ariPromise: Promise<Client> | null = null;
  private readonly basePath =
    process.env.ASTERISK_CONFIG_PATH || '/app/asterisk';
  private readonly extensionsPath = path.join(this.basePath, 'extensions.conf');
  private readonly pjsipPath = path.join(this.basePath, 'pjsip.conf');
  private readonly managerPath = path.join(this.basePath, 'manager.conf');
  private readonly trunksPath = path.join(this.basePath, 'pjsip.conf');

  private async getAri(): Promise<Client> {
    if (this.ari) {
      return this.ari;
    }

    if (!this.ariPromise) {
      const url = process.env.ARI_URL || 'http://avr-asterisk:8088/ari';
      const username = process.env.ARI_USERNAME || 'avr';
      const password = process.env.ARI_PASSWORD || 'u4lyvcPyQ19hwJKy';
      this.logger.debug(`Connecting to ARI at ${url}`);
      this.ariPromise = Ari.connect(url, username, password)
        .then((client) => {
          this.ari = client;
          return client;
        })
        .catch((error) => {
          this.logger.error('Failed to connect to ARI', error as Error);
          this.ariPromise = null;
          throw error;
        });
    }

    return this.ariPromise;
  }

  private async reloadModule(moduleName: string): Promise<void> {
    try {
      const ari = await this.getAri();
      await ari.asterisk.reloadModule({ moduleName });
      this.logger.debug(`Reloaded module ${moduleName}`);
    } catch (error) {
      this.logger.error(
        `Unable to reload module ${moduleName}`,
        error as Error,
      );
    }
  }

  async provisionPhone(phone: Phone): Promise<void> {
    await this.upsertBlock(
      this.pjsipPath,
      `phone-${phone.id}`,
      this.buildPhoneBlock(phone),
    );
    await this.reloadModule('res_pjsip.so');
  }

  async provisionNumber(number: PhoneNumber): Promise<void> {
    await this.upsertBlock(
      this.extensionsPath,
      `number-${number.id}`,
      this.buildNumberBlock(number),
    );
    await this.reloadModule('pbx_config.so');
  }

  async provisionTrunk(trunk: Trunk): Promise<void> {
    await this.upsertBlock(
      this.trunksPath,
      `trunk-${trunk.id}`,
      this.buildTrunkBlock(trunk),
    );
    await this.reloadModule('res_pjsip.so');
  }

  async removePhone(phoneId: string): Promise<void> {
    await this.removeBlock(this.pjsipPath, `phone-${phoneId}`);
    await this.reloadModule('res_pjsip.so');
  }

  async removeNumber(numberId: string): Promise<void> {
    await this.removeBlock(this.extensionsPath, `number-${numberId}`);
    await this.reloadModule('pbx_config.so');
  }

  async removeTrunk(trunkId: string): Promise<void> {
    await this.removeBlock(this.trunksPath, `trunk-${trunkId}`);
    await this.reloadModule('res_pjsip.so');
  }

  private async upsertBlock(
    filePath: string,
    identifier: string,
    block: string,
  ) {
    await this.ensureFile(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const [beginMarker, endMarker] = this.getMarkers(identifier);
    const blockWithMarkers = `${beginMarker}\n${block}\n${endMarker}\n`;
    const regex = new RegExp(
      `${this.escapeRegex(beginMarker)}[\\s\\S]*?${this.escapeRegex(endMarker)}(?:\\r?\\n|$)`,
      'g',
    );
    let nextContent: string;
    if (regex.test(content)) {
      nextContent = content.replace(regex, blockWithMarkers);
    } else {
      const separator =
        content.length === 0 || content.endsWith('\n') ? '' : '\n';
      nextContent = `${content}${separator}${blockWithMarkers}`;
    }
    await fs.writeFile(filePath, nextContent);
  }

  private async removeBlock(filePath: string, identifier: string) {
    try {
      await this.ensureFile(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      const [beginMarker, endMarker] = this.getMarkers(identifier);
      const regex = new RegExp(
        `${this.escapeRegex(beginMarker)}[\\s\\S]*?${this.escapeRegex(endMarker)}(?:\\r?\\n|$)`,
        'g',
      );
      const nextContent = content.replace(regex, '');
      await fs.writeFile(
        filePath,
        nextContent.trimEnd() + (nextContent.trimEnd().length ? '\n' : ''),
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove Asterisk block for ${identifier}`,
        error as Error,
      );
    }
  }

  private async ensureFile(filePath: string) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, '');
    }
  }

  private getMarkers(identifier: string): [string, string] {
    return [`; BEGIN ${identifier}`, `; END ${identifier}`];
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private buildNumberBlock(number: PhoneNumber): string {
    const agent = number.agent;
    return [
      `exten => ${number.value},1,NoOp(Number ${number.value} -> Agent ${agent.name ?? agent.id})`,
      ' same => n,Answer()',
      ' same => n,Ringing()',
      ' same => n,Wait(1)',
      " same => n,Set(UUID=${SHELL(uuidgen | tr -d '\\n')})",
      ' same => n,Dial(AudioSocket/avr-core-' +
        agent.id +
        ':' +
        agent.port +
        '/${UUID})',
      ' same => n,Hangup()',
    ].join('\n');
  }

  private buildPhoneBlock(phone: Phone): string {
    const callerName = phone.fullName?.replace(/"/g, '') ?? '';
    const callerId = callerName
      ? `callerid="${callerName}" <${phone.id}>`
      : undefined;

    const endpointSection = [
      `[${phone.id}](webrtc-template)`,
      `auth=${phone.id}`,
      `aors=${phone.id}`,
      callerId,
    ].filter(Boolean) as string[];

    const authSection = [
      `[${phone.id}]`,
      'type=auth',
      'auth_type=userpass',
      `username=${phone.id}`,
      `password=${phone.password}`,
    ];

    const aorSection = [
      `[${phone.id}]`,
      'type=aor',
      'max_contacts=1',
      'remove_existing=yes',
    ];

    return [...endpointSection, '', ...authSection, '', ...aorSection].join(
      '\n',
    );
  }

  private buildTrunkBlock(trunk: Trunk): string {
    const callerName = trunk.name?.replace(/"/g, '') ?? '';
    const callerId = callerName
      ? `callerid="${callerName}" <${trunk.id}>`
      : undefined;

    const endpointSection = [
      `[${trunk.id}]`,
      'type=endpoint',
      'context=from-trunk',
      'disallow=all',
      'allow=ulaw',
      `auth=${trunk.id}`,
      `aors=${trunk.id}`,
      `outbound_auth=${trunk.id}`,
      callerId,
    ].filter(Boolean) as string[];

    const authSection = [
      `[${trunk.id}]`,
      'type=auth',
      'auth_type=userpass',
      `username=${trunk.id}`,
      `password=${trunk.password}`,
    ];

    const aorSection = [
      `[${trunk.id}]`,
      'type=aor',
      'max_contacts=1',
      'remove_existing=yes',
    ];

    return [...endpointSection, '', ...authSection, '', ...aorSection].join(
      '\n',
    );
  }
}
