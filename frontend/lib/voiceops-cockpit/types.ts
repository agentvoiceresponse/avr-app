export interface AgentDto {
  id: string;
  name: string;
  status: 'running' | 'stopped';
}

export interface TrunkDto {
  id: string;
  name: string;
}

export interface DockerContainerDto {
  id: string;
  name: string;
  state: string;
}

export interface CallSummaryDto {
  id: string;
  uuid: string;
  agentId?: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface CallEventDto {
  id: string;
  type: string;
  payload?: Record<string, unknown> | null;
}

export interface CallDetailDto {
  id: string;
  events: CallEventDto[];
}

export interface CallSummaryResponse {
  totalCalls: number;
  averageDurationSeconds: number;
}

export interface CockpitSnapshot {
  agents: AgentDto[];
  trunks: TrunkDto[];
  containers: DockerContainerDto[];
  calls: CallSummaryDto[];
  summary: CallSummaryResponse;
  callErrorCount: number;
}

export type TopFailureKind = 'agents' | 'containers' | 'calls' | 'trunks';

export interface TopFailure {
  key: TopFailureKind;
  count: number;
}
