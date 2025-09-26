import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class RunAgentDto {
  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  env?: string[];
}
