import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { ProviderType } from '../provider.entity';

export class CreateProviderDto {
  @IsEnum(ProviderType)
  type: ProviderType;

  @IsString()
  name: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
