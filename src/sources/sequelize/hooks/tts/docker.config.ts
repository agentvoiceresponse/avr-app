import path from 'path';
import * as url from 'url';
import fs from 'fs';

import { TTSModel } from '../../models/tts.model.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const getTtsConfig = (params: any) => {
  const { id, provider, key, model, voice, gender, speekingRate }: TTSModel = params;
  const containerName = 'avr-tts-' + id;
  const containerPort = (+process.env.TTS_PORT_START || 8000) + Number(id);
  const config = {
    Image: '',
    name: containerName,
    Env: [`PORT=${containerPort}`],
    HostConfig: {
      NetworkMode: process.env.AVR_NETWORK || 'avr',
      Binds: [],
    },
    Labels: {
      app: 'avr',
      resource: 'tts',
      provider,
    },
  };

  switch (provider) {
    case 'deepgram':
      config.Env.push(`DEEPGRAM_API_KEY=${key}`);
      config.Env.push(`DEEPGRAM_TTS_MODEL=${model}`);
      config.Image = 'agentvoiceresponse/avr-tts-deepgram';
      break;
    case 'google': {
      const googleCredentialsPath = path.join(__dirname, '../../../../../keys', `avr-tts-${id}.json`);
      fs.writeFileSync(googleCredentialsPath, key);
      config.Env.push(`GOOGLE_APPLICATION_CREDENTIALS=/usr/src/app/google.json`);
      config.HostConfig.Binds.push(`${googleCredentialsPath}:/usr/src/app/google.json`);
      const language = model.split('-').slice(0, 2).join('-');
      config.Env.push(`TEXT_TO_SPEECH_LANGUAGE=${language}`);
      config.Env.push(`TEXT_TO_SPEECH_GENDER=${gender}`);
      config.Env.push(`TEXT_TO_SPEECH_NAME=${model}`);
      config.Env.push(`TEXT_TO_SPEECH_SPEAKING_RATE=${speekingRate}`);
      config.Image = 'agentvoiceresponse/avr-tts-google-cloud-tts';
      break;
    }
    // case 'elevenlabs':
    //   config.Env.push(`ELEVENLABS_API_KEY=${key}`);
    //   config.Env.push(`ELEVENLABS_MODEL_ID=${model}`);
    //   config.Env.push(`ELEVENLABS_VOICE_ID=${voice}`);
    //   config.Image = 'agentvoiceresponse/avr-tts-elevenlabs';
    //   break;
    default:
      throw new Error('Invalid provider');
  }

  return { containerName, containerPort, config };
};
