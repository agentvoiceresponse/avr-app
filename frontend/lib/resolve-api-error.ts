import { ApiError } from './api';

interface ResolveApiErrorMessageOptions {
  fallback: string;
  authRequired: string;
  forbidden: string;
}

export function resolveApiErrorMessage(
  error: unknown,
  options: ResolveApiErrorMessageOptions,
) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return options.authRequired;
    }
    if (error.status === 403) {
      return options.forbidden;
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return options.fallback;
}
