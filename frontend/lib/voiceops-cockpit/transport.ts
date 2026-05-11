import { apiFetch, type PaginatedResponse } from '@/lib/api';
import type {
  AgentDto,
  CallDetailDto,
  CallSummaryDto,
  CallSummaryResponse,
  CockpitSnapshot,
  DockerContainerDto,
  TrunkDto,
} from './types';

function isFailureEvent(detail: CallDetailDto): boolean {
  return (detail.events ?? []).some((event) => {
    if (event.type === 'interruption') {
      return true;
    }
    const payload = event.payload;
    if (!payload || typeof payload !== 'object') {
      return false;
    }
    const text = JSON.stringify(payload).toLowerCase();
    return text.includes('error') || text.includes('failed') || text.includes('timeout');
  });
}

export async function fetchCockpitSnapshot(
  range: string,
  agentFilter: string,
): Promise<CockpitSnapshot> {
  const params = new URLSearchParams();
  params.append('range', range);
  if (agentFilter !== 'all') {
    params.append('agentId', agentFilter);
  }
  const query = params.toString();

  const [agentsRes, summaryData, callsResponse, trunksRes, dockerRes] = await Promise.all([
    apiFetch<PaginatedResponse<AgentDto>>('/agents', {
      query: { page: 1, limit: 100 },
      paginated: true,
    }),
    apiFetch<CallSummaryResponse>(`/webhooks/summary?${query}`),
    apiFetch<PaginatedResponse<CallSummaryDto>>(`/webhooks/calls?${query}&page=1&limit=20`, {
      paginated: true,
    }),
    apiFetch<PaginatedResponse<TrunkDto>>('/trunks', {
      query: { page: 1, limit: 100 },
      paginated: true,
    }),
    apiFetch<DockerContainerDto[]>('/docker/containers'),
  ]);

  const calls = callsResponse.data ?? [];
  const details = await Promise.allSettled(
    calls.slice(0, 10).map((call) => apiFetch<CallDetailDto>(`/webhooks/calls/${call.id}`)),
  );

  const callErrorCount = details.reduce((count, result) => {
    if (result.status !== 'fulfilled') {
      return count;
    }
    return isFailureEvent(result.value) ? count + 1 : count;
  }, 0);

  return {
    agents: agentsRes.data,
    summary: summaryData,
    calls,
    trunks: trunksRes.data ?? [],
    containers: dockerRes.filter((container) => container.name.startsWith('/avr-')),
    callErrorCount,
  };
}
