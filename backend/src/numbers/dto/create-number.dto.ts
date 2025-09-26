import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsUUID,
} from 'class-validator';

export class CreateNumberDto {
  @IsString()
  @MinLength(5)
  @MaxLength(32)
  @Matches(/^\+?[0-9]+$/, {
    message: 'Number can only contain digits and an optional leading +',
  })
  value: string;

  @IsUUID()
  agentId: string;
}
