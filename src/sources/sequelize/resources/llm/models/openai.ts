import openaiJSON from './openai.json' assert { type: 'json' };

export const models = openaiJSON.data.map((value) => ({
  value: value.id,
  label: 'openai',
}));
