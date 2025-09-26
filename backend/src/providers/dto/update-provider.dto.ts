import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { ProviderType } from '../provider.entity';

export class UpdateProviderDto {
  @IsOptional()
  @IsEnum(ProviderType)
  type?: ProviderType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
