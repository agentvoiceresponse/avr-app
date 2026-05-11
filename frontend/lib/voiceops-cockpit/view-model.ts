import type { AgentDto, DockerContainerDto, TopFailure } from './types';

export function getStoppedAgents(agents: AgentDto[]): AgentDto[] {
  return agents.filter((agent) => agent.status === 'stopped');
}

export function getExitedContainers(containers: DockerContainerDto[]): DockerContainerDto[] {
  return containers.filter((container) => container.state !== 'running');
}

export function getTopFailure(input: {
  stoppedAgentsCount: number;
  exitedContainersCount: number;
  callErrorCount: number;
  trunksCount: number;
}): TopFailure | null {
  if (input.stoppedAgentsCount > 0) {
    return { key: 'agents', count: input.stoppedAgentsCount };
  }
  if (input.exitedContainersCount > 0) {
    return { key: 'containers', count: input.exitedContainersCount };
  }
  if (input.callErrorCount > 0) {
    return { key: 'calls', count: input.callErrorCount };
  }
  if (input.trunksCount === 0) {
    return { key: 'trunks', count: 0 };
  }
  return null;
}

export function getFailingComponentsCount(input: {
  stoppedAgentsCount: number;
  exitedContainersCount: number;
  callErrorCount: number;
}): number {
  return input.stoppedAgentsCount + input.exitedContainersCount + input.callErrorCount;
}
