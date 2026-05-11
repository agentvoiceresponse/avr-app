import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-runtime-env', () => ({
  env: () => 'http://localhost:3001',
}));

import {
  AUTH_SESSION_EXPIRED_EVENT,
  ApiError,
  TOKEN_KEY,
  apiFetch,
} from './api';

describe('apiFetch auth handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('clears token and dispatches auth-expired event on 401', async () => {
    localStorage.setItem(TOKEN_KEY, 'token');
    const eventSpy = vi.fn();
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, eventSpy);
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(apiFetch('/users')).rejects.toBeInstanceOf(ApiError);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(eventSpy).toHaveBeenCalledTimes(1);
  });
});
