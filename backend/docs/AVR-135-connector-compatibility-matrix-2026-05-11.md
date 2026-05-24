# AVR-135 Connector Compatibility Matrix and Failure Policy

Date: 2026-05-11  
Issue: [AVR-135](/AVR/issues/AVR-135) (Phase A / A5)  
Owner: @System Integrator

## Purpose

Define enforceable runtime contracts and startup failure behavior for provider connectors before traffic routing.

## Canonical Runtime Contract

All providers must include:
- `config.image` (or `config.dockerImage`) with a non-empty Docker image reference
- `config.env` as a key/value object map when provided

Reserved env keys rejected at runtime:
- `AGENT_ID`, `AGENT_NAME`, `PORT`, `HTTP_PORT`
- `WEBHOOK_URL`, `WEBHOOK_SECRET`
- `ASR_URL`, `LLM_URL`, `TTS_URL`, `STS_URL`, `AMI_URL`
- any key prefixed with `PROVIDER_`
- any key suffixed with `_URL`

## STS Image Compatibility Matrix

| Provider Type | Expected Image | Required Env Keys | Conditional Rules |
|---|---|---|---|
| STS | `agentvoiceresponse/avr-sts-openai[:tag]` | `OPENAI_API_KEY`, `OPENAI_MODEL` | none |
| STS | `agentvoiceresponse/avr-sts-elevenlabs[:tag]` | `ELEVENLABS_AGENT_ID`, `ELEVENLABS_API_KEY` | none |
| STS | `agentvoiceresponse/avr-sts-gemini[:tag]` | `GEMINI_API_KEY`, `GEMINI_MODEL` | none |
| STS | `agentvoiceresponse/avr-sts-ultravox[:tag]` | `ULTRAVOX_API_KEY` | if `ULTRAVOX_CALL_TYPE=agent`, require `ULTRAVOX_AGENT_ID` |
| STS | `agentvoiceresponse/avr-sts-deepgram[:tag]` | `DEEPGRAM_API_KEY`, `AGENT_PROMPT` | none |
| STS | `agentvoiceresponse/avr-sts-speechmatics[:tag]` | `SPEECHMATICS_API_KEY` | none |
| STS | `agentvoiceresponse/avr-sts-humeai[:tag]` | `HUMEAI_API_KEY` | none |

## ASR Image Compatibility Matrix

| Provider Type | Expected Image | Required Env Keys | Conditional Rules |
|---|---|---|---|
| ASR | `agentvoiceresponse/avr-asr-deepgram[:tag]` | `DEEPGRAM_API_KEY` | none |
| ASR | `agentvoiceresponse/avr-asr-sarvam[:tag]` | `SARVAM_API_KEY` | none |
| ASR | `agentvoiceresponse/avr-asr-soniox[:tag]` | `SONIOX_API_KEY` | none |

Unknown images still require generic contract checks (`image` present + valid `env` map).

## Startup Readiness and Timeout Policy

Policy implemented in `AgentsService`:
- Poll container inspect status after startup.
- Ready when:
  - `State.Health.Status=healthy`, or
  - no healthcheck is defined and `State.Running=true`.
- Fail immediately when `State.Health.Status=unhealthy`.
- Timeout when readiness is not reached before deadline.

Configurable env:
- `CONNECTOR_READINESS_TIMEOUT_MS` (default `15000`)
- `CONNECTOR_READINESS_POLL_MS` (default `1000`)

## Failure-Mode Behavior

On connector startup failure (misconfig, unhealthy, timeout, pull/run error):
- Stop already-started provider containers in reverse order (best effort).
- Persist agent `status=error`, `lastError`, and `failureReason`.
- Return error to API caller (no silent success).

Failure classification:
- Readiness timeout → `failureReason=dependency_unavailable`, `retryable=true` (`ProviderReadinessTimeoutError`).
- Reserved env / contract violations / unhealthy healthcheck → `failureReason=configuration_invalid`, `retryable=false`.

## Related artifacts

- Trust-boundary matrix (failure classes + test mapping): [AVR-137-connector-trust-boundary-matrix-2026-05-11.md](./AVR-137-connector-trust-boundary-matrix-2026-05-11.md)
- Implementation: `backend/src/providers/provider-contracts.ts`, `backend/src/agents/agents.service.ts`

## Test Evidence (Backend Unit)

Covered scenarios:
- Misconfigured provider rejected (`missing image`, known-contract missing env)
- Reserved env key rejection before runtime
- Partial startup cleanup on second provider failure
- Healthcheck `unhealthy` failure path
- Readiness timeout failure path

Target suites:
- `backend/src/providers/providers.service.spec.ts`
- `backend/src/agents/agents.service.spec.ts`
