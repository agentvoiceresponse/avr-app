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
  private readonly managedSectionStart = '; BEGIN AVR-MANAGED';
  private readonly managedSectionEnd = '; END AVR-MANAGED';
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

  async syncDialplan(): Promise<void> {
    await this.reloadModule('pbx_config.so');
    await this.reloadModule('res_pjsip.so');
  }

  private async upsertBlock(
    filePath: string,
    identifier: string,
    block: string,
  ) {
    await this.ensureFile(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const sections = this.parseManagedSection(content);
    const [beginMarker, endMarker] = this.getMarkers(identifier);
    const blockWithMarkers = `${beginMarker}\n${block}\n${endMarker}\n`;
    const regex = new RegExp(
      `${this.escapeRegex(beginMarker)}[\\s\\S]*?${this.escapeRegex(endMarker)}(?:\\r?\\n|$)`,
      'g',
    );
    let nextManagedContent: string;
    if (regex.test(sections.managedContent)) {
      nextManagedContent = sections.managedContent.replace(
        regex,
        blockWithMarkers,
      );
    } else {
      const separator =
        sections.managedContent.length === 0 ||
        sections.managedContent.endsWith('\n')
          ? ''
          : '\n';
      nextManagedContent = `${sections.managedContent}${separator}${blockWithMarkers}`;
    }
    this.assertManagedRegionSafe(nextManagedContent, filePath);
    const nextContent = this.stringifyManagedSection(
      sections,
      nextManagedContent,
    );
    await fs.writeFile(filePath, nextContent);
  }

  private async removeBlock(filePath: string, identifier: string) {
    await this.ensureFile(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const sections = this.parseManagedSection(content);
    const [beginMarker, endMarker] = this.getMarkers(identifier);
    const regex = new RegExp(
      `${this.escapeRegex(beginMarker)}[\\s\\S]*?${this.escapeRegex(endMarker)}(?:\\r?\\n|$)`,
      'g',
    );
    const nextManagedContent = sections.managedContent.replace(regex, '');
    this.assertManagedRegionSafe(nextManagedContent, filePath);
    const nextContent = this.stringifyManagedSection(
      sections,
      nextManagedContent,
    );
    await fs.writeFile(filePath, nextContent);
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

  private parseManagedSection(content: string): {
    prefix: string;
    managedContent: string;
    suffix: string;
  } {
    const start = content.indexOf(this.managedSectionStart);
    const end = content.indexOf(this.managedSectionEnd);

    if (start === -1 && end === -1) {
      return { prefix: content, managedContent: '', suffix: '' };
    }

    if (start === -1 || end === -1 || end < start) {
      throw new Error(
        'Asterisk config managed section is malformed. Refusing to edit telephony config.',
      );
    }

    const secondStart = content.indexOf(
      this.managedSectionStart,
      start + this.managedSectionStart.length,
    );
    const secondEnd = content.indexOf(
      this.managedSectionEnd,
      end + this.managedSectionEnd.length,
    );
    if (secondStart !== -1 || secondEnd !== -1) {
      throw new Error(
        'Asterisk config has duplicate managed section markers. Refusing to edit telephony config.',
      );
    }

    const managedStart = content.indexOf('\n', start);
    const managedBodyStart =
      managedStart === -1
        ? start + this.managedSectionStart.length
        : managedStart + 1;
    const managedContent = content.slice(managedBodyStart, end);
    const suffixStart = end + this.managedSectionEnd.length;

    return {
      prefix: content.slice(0, start),
      managedContent,
      suffix: content.slice(suffixStart),
    };
  }

  private stringifyManagedSection(
    sections: { prefix: string; managedContent: string; suffix: string },
    managedContent: string,
  ): string {
    const normalizedPrefix =
      sections.prefix.endsWith('\n') || sections.prefix.length === 0
        ? sections.prefix
        : `${sections.prefix}\n`;
    const normalizedBody = managedContent.trimEnd();
    const managedBlock = `${this.managedSectionStart}\n${normalizedBody}${normalizedBody.length ? '\n' : ''}${this.managedSectionEnd}\n`;
    const normalizedSuffix = sections.suffix.trimStart();
    return (
      `${normalizedPrefix}${managedBlock}${normalizedSuffix}`.trimEnd() + '\n'
    );
  }

  private assertManagedRegionSafe(
    managedContent: string,
    filePath: string,
  ): void {
    const cleaned = managedContent
      .replace(/; BEGIN [^\n]+\n[\s\S]*?; END [^\n]+(?:\r?\n|$)/g, '')
      .trim();
    if (cleaned.length > 0) {
      throw new Error(
        `Asterisk config drift detected in managed section for ${filePath}. Refusing to overwrite unmanaged lines.`,
      );
    }
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private buildNumberBlock(number: PhoneNumber): string {
    const tenant = process.env.TENANT || 'demo';
    switch (number.application) {
      case 'internal': {
        if (!number.phone) {
          throw new Error('Phone not found for internal call');
        }
        return [
          `[${tenant}]`,
          `exten => ${number.value},1,NoOp(Internal call)`,
          ` same => n,Dial(PJSIP/${number.phone.id})`,
          ' same => n,Hangup()',
        ].join('\n');
      }
      case 'transfer': {
        if (!number.trunk) {
          throw new Error('Trunk not found for transfer call');
        }
        return [
          `[${tenant}]`,
          `exten => ${number.value},1,NoOp(Transfer call)`,
          ` same => n,Dial(PJSIP/${number.value}@${number.trunk.id})`,
          ' same => n,Hangup()',
        ].join('\n');
      }
      case 'agent':
      default: {
        const agent = number.agent;
        if (!agent) {
          throw new Error('Agent not found for number');
        }
        const denoiseEnabled = number.denoiseEnabled ?? true;
        const recordingEnabled = number.recordingEnabled ?? false;
        const lines = [
          `[${tenant}]`,
          `exten => ${number.value},1,NoOp(Exten ${number.value} -> Agent ${agent.name ?? agent.id})`,
          ' same => n,Answer()',
          ' same => n,Ringing()',
          ' same => n,Wait(1)',
          ' same => n,Set(AVR_NUMBER=${CALLERID(num)})',
          " same => n,Set(UUID=${SHELL(uuidgen | tr -d '\\n')})",
          ' same => n,Set(JSON_BODY={"uuid":"${UUID}","payload":{"from":"${CALLERID(num)}","to":"${EXTEN}","uniqueid":"${UNIQUEID}","channel":"${CHANNEL}","recording": ' +
            recordingEnabled +
            '}})',
          ' same => n,Set(CURLOPT(httpheader)=Content-Type: application/json)',
          ' same => n,Set(JSON_RESPONSE=${CURL(http://avr-core-' +
            agent.id +
            ':' +
            agent.httpPort +
            '/call,${JSON_BODY})})',
          ' same => n,NoOp(JSON_BODY: ${JSON_BODY})',
          ' same => n,NoOp(JSON_RESPONSE: ${JSON_RESPONSE})',
        ];
        if (recordingEnabled) {
          lines.push(
            ' same => n,MixMonitor(/var/spool/asterisk/monitor/' +
              tenant +
              '/${UUID}.wav)',
          );
        }
        if (denoiseEnabled) {
          lines.push(' same => n,Set(DENOISE(rx)=on)');
        }
        lines.push(
          ' same => n,Dial(AudioSocket/avr-core-' +
            agent.id +
            ':' +
            agent.port +
            '/${UUID})',
          ' same => n,Hangup()',
        );
        return lines.join('\n');
      }
    }
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
      `context=${process.env.TENANT || 'demo'}`,
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
    const codecs = this.normalizeCodecs(trunk.codecs);

    const endpointSection = [
      `[${trunk.id}]`,
      'type=endpoint',
      `transport=transport-${trunk.transport || 'udp'}`,
      `context=${process.env.TENANT || 'demo'}`,
      'disallow=all',
      `allow=${codecs}`,
      `auth=${trunk.id}`,
      `aors=${trunk.id}`,
      `outbound_auth=${trunk.id}`,
      `trust_id_inbound=yes`,
      `trust_id_outbound=yes`,
      `send_pai=yes`,
      `send_rpid=yes`,
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

  private normalizeCodecs(input?: string): string {
    const fallback = 'ulaw,alaw';
    if (!input) {
      return fallback;
    }
    const codecs = input
      .split(',')
      .map((codec) => codec.trim())
      .filter(Boolean);

    if (codecs.length === 0) {
      return fallback;
    }

    return codecs.join(',');
  }
}
