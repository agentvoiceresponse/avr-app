import openrouterJSON from './openrouter.json' assert { type: 'json' };

export const models = openrouterJSON.data.map((value) => ({
  value: value.id,
  label: 'openrouter',
}));
