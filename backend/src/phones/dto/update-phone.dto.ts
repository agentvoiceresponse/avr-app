import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePhoneDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password?: string;
}
