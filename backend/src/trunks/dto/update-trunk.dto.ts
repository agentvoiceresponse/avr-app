import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateTrunkDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsIn(['udp', 'tcp'])
  transport?: 'udp' | 'tcp';

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]+(,[a-zA-Z0-9_.-]+)*$/, {
    message: 'Invalid codecs list',
  })
  codecs?: string;
}
