# AVR-137 Connector Trust-Boundary Contract Matrix

Date: 2026-05-11  
Owner: System Integrator

## Scope

This matrix captures contract and failure behavior for provider runtime boundaries in AVR backend lifecycle paths (`ProvidersService`, `AgentsService`).

## Contract Matrix

| Provider path | Contract boundary | Failure class | Expected behavior | Evidence |
|---|---|---|---|---|
| Provider create/update (`POST/PATCH /providers`) | `config.image` required; `config.env` must be object map; known STS images enforce required env keys | malformed payload | reject request (`400`), no persistence | `backend/src/providers/providers.service.spec.ts` - `rejects provider create when image is missing`, `rejects provider create when known contract env is missing` |
| Provider run (`POST /agents/:id/run`) | reserved runtime keys blocked in provider env (`PORT`, `AGENT_*`, `*_URL`, `PROVIDER_*`) | trust-boundary key injection | abort startup, persist agent `error` with configuration-invalid semantics | `backend/src/agents/agents.service.spec.ts` - `rejects reserved provider env keys` |
| Provider readiness handshake (run lifecycle) | container must become healthy/running before timeout | timeout | abort startup, cleanup started containers, mark retryable dependency failure | `backend/src/agents/agents.service.spec.ts` - `fails on readiness timeout and persists error` |
| Provider readiness handshake (run lifecycle) | container health `unhealthy` is terminal for that attempt | malformed upstream runtime state | abort startup, cleanup started containers, persist `error` | `backend/src/agents/agents.service.spec.ts` - `fails on unhealthy provider and performs cleanup` |
| Core startup after provider start | provider started but core boot fails with upstream client/server error | upstream 4xx/5xx | abort startup, cleanup provider container, persist terminal failure (`retryable=false`) | `backend/src/agents/agents.service.spec.ts` - `maps upstream 4xx core startup failure to terminal error state`, `maps upstream 5xx core startup failure to terminal error state` |
| Stop lifecycle (`POST /agents/:id/stop`) | stop is idempotent best-effort across all container names | retry/idempotency | attempt all container stops; if any fail, mark compensation failure with terminal state | `backend/src/agents/agents.service.spec.ts` - `attempts all container stops and marks compensation failure` |

## Notes

- Current contract allowlist is explicit for known STS images in `backend/src/providers/provider-contracts.ts`; unknown images still require valid image/env shape but skip provider-specific required-key validation.

## Handoff

Branch-ready artifacts for Staff Engineer review:
- `backend/src/providers/provider-contracts.ts`
- `backend/src/providers/providers.service.ts`
- `backend/src/providers/providers.service.spec.ts`
- `backend/src/agents/agents.service.ts`
- `backend/src/agents/agents.service.spec.ts`
- this matrix document
