import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePhoneDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  fullName: string;

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password: string;
}
