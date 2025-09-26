import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AgentMode } from '../agent.entity';

export class CreateAgentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(AgentMode)
  mode?: AgentMode;

  @IsOptional()
  @IsUUID()
  providerAsrId?: string;

  @IsOptional()
  @IsUUID()
  providerLlmId?: string;

  @IsOptional()
  @IsUUID()
  providerTtsId?: string;

  @IsOptional()
  @IsUUID()
  providerStsId?: string;
}
