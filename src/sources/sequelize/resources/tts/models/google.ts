import googleJSON from './google.json' with { type: 'json' };

export const models = googleJSON.data.map((value) => ({
  value: value.name,
  label: 'google',
}));
