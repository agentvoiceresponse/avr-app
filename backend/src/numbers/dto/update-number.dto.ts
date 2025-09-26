import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsUUID,
} from 'class-validator';

export class UpdateNumberDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(32)
  @Matches(/^\+?[0-9]+$/, {
    message: 'Number can only contain digits and an optional leading +',
  })
  value?: string;

  @IsOptional()
  @IsUUID()
  agentId?: string;
}
