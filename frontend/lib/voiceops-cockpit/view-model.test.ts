import { describe, expect, it } from 'vitest';
import { getFailingComponentsCount, getTopFailure } from './view-model';

describe('voiceops cockpit view-model', () => {
  it('prioritizes stopped agents over other failures', () => {
    const result = getTopFailure({
      stoppedAgentsCount: 2,
      exitedContainersCount: 3,
      callErrorCount: 4,
      trunksCount: 1,
    });
    expect(result).toEqual({ key: 'agents', count: 2 });
  });

  it('returns trunk failure when no failures exist and no trunks are configured', () => {
    const result = getTopFailure({
      stoppedAgentsCount: 0,
      exitedContainersCount: 0,
      callErrorCount: 0,
      trunksCount: 0,
    });
    expect(result).toEqual({ key: 'trunks', count: 0 });
  });

  it('computes failing component aggregate', () => {
    expect(
      getFailingComponentsCount({
        stoppedAgentsCount: 1,
        exitedContainersCount: 2,
        callErrorCount: 3,
      }),
    ).toBe(6);
  });
});
