export const values = [
  'latest_long',
  'latest_short',
  'telephony',
  'telephony_short',
  'medical_dictation',
  'medical_conversation',
  'command_and_search',
  'default',
  'phone_call',
  'video',
];

export const models = values.map((value) => ({
  value,
  label: 'Google',
}));
