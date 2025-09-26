import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTrunkDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;
}
