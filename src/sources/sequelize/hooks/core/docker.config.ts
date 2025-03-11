import { CoreModel } from '../../models/core.model.js';

export const getCoreConfig = (params: any) => {
  const { id, name, asrId, llmId, ttsId, firstMessage, stopAgent }: CoreModel = params;
  const containerName = 'avr-core-' + id;

  // Calculate ports for core, ASR, LLM, and TTS services
  const containerPort = (+process.env.CORE_PORT_START || 5000) + Number(id);
  const asrPort = (+process.env.ASR_PORT_START || 6000) + Number(asrId);
  const llmPort = (+process.env.LLM_PORT_START || 7000) + Number(llmId);
  const ttsPort = (+process.env.TTS_PORT_START || 8000) + Number(ttsId);

  // Configuration for the Docker container
  const config = {
    Image: 'agentvoiceresponse/avr-core',
    name: containerName,
    Env: [
      `PORT=${containerPort}`,
      `ASR_URL=http://avr-asr-${asrId}:${asrPort}/speech-to-text-stream`,
      `LLM_URL=http://avr-llm-${llmId}:${llmPort}/prompt-stream`,
      `TTS_URL=http://avr-tts-${ttsId}:${ttsPort}/text-to-speech-stream`,
      `SYSTEM_NAME="${name}"`,
      `INTERRUPT_LISTENING=${!stopAgent}`,
    ],
    HostConfig: {
      PortBindings: {
        [`${containerPort}/tcp`]: [
          {
            HostPort: `${containerPort}`,
          },
        ],
      },
      NetworkMode: process.env.AVR_NETWORK || 'avr',
    },
    Labels: {
      app: 'avr',
      resource: 'core',
    },
  };

  if (firstMessage) {
    config.Env.push(`SYSTEM_MESSAGE="${firstMessage}"`);
  }

  return { containerName, containerPort, config };
};
