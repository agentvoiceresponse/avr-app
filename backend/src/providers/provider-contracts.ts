import { BadRequestException } from '@nestjs/common';
import { Provider, ProviderType } from './provider.entity';

interface EnvRule {
  key: string;
  required?: boolean;
}

interface ProviderContract {
  imageName: string;
  type: ProviderType;
  requiredEnv: EnvRule[];
  validate?: (env: Record<string, unknown>) => void;
}

const ULTRAVOX_AGENT_MODE = 'agent';

const STS_CONTRACTS: ProviderContract[] = [
  {
    imageName: 'agentvoiceresponse/avr-sts-openai',
    type: ProviderType.STS,
    requiredEnv: [
      { key: 'OPENAI_API_KEY', required: true },
      { key: 'OPENAI_MODEL', required: true },
    ],
  },
  {
    imageName: 'agentvoiceresponse/avr-sts-elevenlabs',
    type: ProviderType.STS,
    requiredEnv: [
      { key: 'ELEVENLABS_AGENT_ID', required: true },
      { key: 'ELEVENLABS_API_KEY', required: true },
    ],
  },
  {
    imageName: 'agentvoiceresponse/avr-sts-gemini',
    type: ProviderType.STS,
    requiredEnv: [
      { key: 'GEMINI_API_KEY', required: true },
      { key: 'GEMINI_MODEL', required: true },
    ],
  },
  {
    imageName: 'agentvoiceresponse/avr-sts-ultravox',
    type: ProviderType.STS,
    requiredEnv: [{ key: 'ULTRAVOX_API_KEY', required: true }],
    validate: (env) => {
      const callType = String(
        env.ULTRAVOX_CALL_TYPE ?? ULTRAVOX_AGENT_MODE,
      ).trim();
      const agentId = String(env.ULTRAVOX_AGENT_ID ?? '').trim();
      if (callType === ULTRAVOX_AGENT_MODE && !agentId) {
        throw new BadRequestException(
          'ULTRAVOX_AGENT_ID is required when ULTRAVOX_CALL_TYPE is agent',
        );
      }
    },
  },
  {
    imageName: 'agentvoiceresponse/avr-sts-deepgram',
    type: ProviderType.STS,
    requiredEnv: [{ key: 'DEEPGRAM_API_KEY', required: true }],
  },
];

const CONTRACTS = [...STS_CONTRACTS];

function findContract(
  provider: Pick<Provider, 'type' | 'config'>,
): ProviderContract | null {
  const image = provider.config?.image ?? provider.config?.dockerImage;
  if (typeof image !== 'string' || !image.trim()) {
    return null;
  }

  return (
    CONTRACTS.find(
      (contract) =>
        contract.type === provider.type &&
        (image === contract.imageName ||
          image.startsWith(`${contract.imageName}:`)),
    ) ?? null
  );
}

export function assertProviderContract(
  provider: Pick<Provider, 'type' | 'config' | 'name'>,
): void {
  const config = provider.config ?? {};
  const image = config.image ?? config.dockerImage;

  if (typeof image !== 'string' || !image.trim()) {
    throw new BadRequestException(
      'Provider Docker image is required in config.image',
    );
  }

  const env = config.env;
  if (
    env !== undefined &&
    (typeof env !== 'object' || Array.isArray(env) || env === null)
  ) {
    throw new BadRequestException('Provider env must be an object map');
  }

  const contract = findContract(provider);
  if (!contract) {
    return;
  }

  const resolvedEnv = (env ?? {}) as Record<string, unknown>;

  for (const { key, required } of contract.requiredEnv) {
    if (!required) {
      continue;
    }
    const value = String(resolvedEnv[key] ?? '').trim();
    if (!value) {
      throw new BadRequestException(
        `Provider ${provider.name} is missing required env var ${key}`,
      );
    }
  }

  contract.validate?.(resolvedEnv);
}
