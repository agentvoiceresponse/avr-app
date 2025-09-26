import {
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class WebhookEventDto {
  @IsUUID()
  uuid: string;

  @IsString()
  @IsIn([
    'call_started',
    'call_ended',
    'interruption',
    'transcription',
    'dtmf_digit',
  ])
  type: string;

  @IsISO8601()
  timestamp: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
