import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CockpitBanner } from './cockpit-banner';

describe('CockpitBanner', () => {
  it('renders read-only notice for viewer', () => {
    render(
      <CockpitBanner
        isReadOnly
        topFailure={{ key: 'agents', count: 1 }}
        failureTitle="1 stopped agent"
        failureGuidance="Restart agent"
        actionLabel="Restart"
        actionStatus="idle"
        actionMessage={null}
        readOnlyLabel="Read-only"
        alertTitle="Alert"
        healthyTitle="Healthy"
        noFailuresLabel="No failures"
        healthyGuidance="Healthy guidance"
        onAction={() => {}}
      />, 
    );

    expect(screen.getByText('Read-only')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /restart/i })).toBeNull();
  });

  it('invokes action callback when actionable', () => {
    const onAction = vi.fn();
    render(
      <CockpitBanner
        isReadOnly={false}
        topFailure={{ key: 'agents', count: 1 }}
        failureTitle="1 stopped agent"
        failureGuidance="Restart agent"
        actionLabel="Restart"
        actionStatus="idle"
        actionMessage={null}
        readOnlyLabel="Read-only"
        alertTitle="Alert"
        healthyTitle="Healthy"
        noFailuresLabel="No failures"
        healthyGuidance="Healthy guidance"
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /restart/i }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
