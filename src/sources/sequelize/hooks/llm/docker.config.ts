import path from 'path';
import * as url from 'url';

import { LLMModel } from '../../models/llm.model.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const getLlmConfig = (params: any) => {
  const { id, provider, key, systemPrompt, model, assistant }: LLMModel = params;
  const containerName = 'avr-llm-' + id;
  const containerPort = (+process.env.LLM_PORT_START || 7000) + Number(id);
  const config = {
    Image: '',
    name: containerName,
    Env: [`PORT=${containerPort}`],
    HostConfig: {
      NetworkMode: process.env.AVR_NETWORK || 'avr',
    },
    Labels: {
      app: 'avr',
      resource: 'llm',
      provider,
    },
  };

  switch (provider) {
    case 'openai':
      config.Env.push(`OPENAI_API_KEY=${key}`);
      config.Env.push(`OPENAI_MODEL=${model}`);
      config.Env.push(`SYSTEM_PROMPT=${systemPrompt}`);
      config.Image = 'agentvoiceresponse/avr-llm-openai';
      break;
    case 'openai-assistant': {
      config.Env.push(`OPENAI_API_KEY=${key}`);
      config.Env.push(`OPENAI_ASSISTANT_ID=${assistant}`);
      config.Env.push(`OPENAI_WAITING_MESSAGE="Please wait while I check the information."`);
      config.Env.push(`OPENAI_WAITING_TIMEOUT=2000`);
      config.Env.push(`AMI_URL=${process.env.AMI_URL || 'http://avr-ami:9000'}`);
      config.Image = 'agentvoiceresponse/avr-llm-openai-assistant';
      break;
    }
    case 'openrouter':
      config.Env.push(`OPENROUTER_API_KEY=${key}`);
      config.Env.push(`OPENROUTER_MODEL=${model}`);
      config.Env.push(`SYSTEM_PROMPT=${systemPrompt}`);
      config.Image = 'agentvoiceresponse/avr-llm-openrouter';
      break;
    default:
      throw new Error('Invalid provider');
  }

  return { containerName, containerPort, config };
};
