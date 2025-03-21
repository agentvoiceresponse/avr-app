import Ari, { Client } from 'ari-client';

const client: Client = await Ari.connect(
  process.env.ARI_URL || 'http://avr-asterisk:8088/ari',
  process.env.ARI_USERNAME || 'avr',
  process.env.ARI_PASSWORD || 'avr',
);


export const reloadModule = async (moduleName: string): Promise<void> => {
  await client.asterisk.reloadModule({ moduleName });
};
