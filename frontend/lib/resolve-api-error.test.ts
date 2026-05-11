import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { resolveApiErrorMessage } from './resolve-api-error';

const options = {
  fallback: 'fallback',
  authRequired: 'auth required',
  forbidden: 'forbidden',
};

describe('resolveApiErrorMessage', () => {
  it('maps 401 to authRequired', () => {
    expect(resolveApiErrorMessage(new ApiError('server', 401), options)).toBe('auth required');
  });

  it('maps 403 to forbidden', () => {
    expect(resolveApiErrorMessage(new ApiError('server', 403), options)).toBe('forbidden');
  });

  it('preserves API error message for non-auth statuses', () => {
    expect(resolveApiErrorMessage(new ApiError('bad request', 400), options)).toBe('bad request');
  });
});
