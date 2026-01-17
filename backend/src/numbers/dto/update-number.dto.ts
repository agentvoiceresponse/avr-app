import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class UpdateNumberDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^\+?[0-9]+$/, {
    message: 'Number can only contain digits and an optional leading +',
  })
  value?: string;

  @IsOptional()
  @IsIn(['agent', 'internal', 'transfer'])
  application?: 'agent' | 'internal' | 'transfer';

  @IsOptional()
  @IsUUID()
  agentId?: string;

  @IsOptional()
  @IsUUID()
  phoneId?: string;

  @IsOptional()
  @IsUUID()
  trunkId?: string;

  @IsOptional()
  @IsBoolean()
  denoiseEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  recordingEnabled?: boolean;
}
