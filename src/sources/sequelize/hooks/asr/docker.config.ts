import path from 'path';
import * as url from 'url';
import fs from 'fs';
import { ContainerCreateOptions } from 'dockerode';

import { ASRModel } from '../../models/asr.model.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const getAsrConfig = (params: any) => {
  const { id, provider, model, language, key }: ASRModel = params;
  const containerName = 'avr-asr-' + id;
  const containerPort = (+process.env.ASR_PORT_START || 6000) + Number(id);
  const config: ContainerCreateOptions = {
    Image: '',
    name: containerName,
    Env: [`SPEECH_RECOGNITION_MODEL=${model}`, `SPEECH_RECOGNITION_LANGUAGE=${language}`, `PORT=${containerPort}`],
    HostConfig: {
      NetworkMode: process.env.AVR_NETWORK || 'avr',
      Binds: [],
    },
    Labels: {
      app: 'avr',
      resource: 'asr',
      provider,
    },
  };

  switch (provider) {
    case 'deepgram':
      config.Env.push(`DEEPGRAM_API_KEY=${key}`);
      config.Image = 'agentvoiceresponse/avr-asr-deepgram';
      break;
    case 'google': {
      const googleCredentialsPath = path.join(__dirname, '../../../../../keys', `avr-asr-${id}.json`);
      fs.writeFileSync(googleCredentialsPath, key);
      config.Env.push(`GOOGLE_APPLICATION_CREDENTIALS=/usr/src/app/google.json`);
      config.HostConfig.Binds.push(`${googleCredentialsPath}:/usr/src/app/google.json`);
      config.Image = 'agentvoiceresponse/avr-asr-google-cloud-speech';
      break;
    }
    // case 'elevenlabs':
    //   config.Image = 'agentvoiceresponse/avr-asr-elevenlabs';
    //   break;
    default:
      throw new Error('Invalid provider');
  }

  return { containerName, containerPort, config };
};
