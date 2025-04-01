import openrouterJSON from './openrouter.json' with { type: 'json' };

export const models = openrouterJSON.data.map((value) => ({
  value: value.id,
  label: 'openrouter',
}));
