import { ServiceUnavailableException } from '@nestjs/common';

type ProvisioningAction = 'create' | 'update' | 'remove';

export function buildProvisioningSyncException(
  resource: 'trunk' | 'phone' | 'number',
  action: ProvisioningAction,
  error: unknown,
): ServiceUnavailableException {
  const detail = error instanceof Error ? error.message : String(error);
  return new ServiceUnavailableException({
    code: 'ASTERISK_SYNC_FAILED',
    resource,
    action,
    retryable: true,
    reason: `Asterisk sync failed during ${resource} ${action}`,
    detail,
  });
}
