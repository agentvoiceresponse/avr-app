const values = [
  'eleven_multilingual_v2',
  'eleven_flash_v2_5',
  'eleven_flash_v2',
  'eleven_multilingual_sts_v2',
  'eleven_english_sts_v2',
  'eleven_monolingual_v1',
  'eleven_multilingual_v1',
  'eleven_turbo_v2_5',
  'eleven_turbo_v2',
];

export const models = values.map((value) => ({
  value,
  label: 'Elevenlabs',
}));
