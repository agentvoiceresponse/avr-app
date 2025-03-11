import googleJSON from './google.json' assert { type: 'json' };

export const models = googleJSON.data.map((value) => ({
  value: value.name,
  label: 'google',
}));
