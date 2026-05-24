# AVR-290 ASR environment parity matrix

Date: 2026-05-24  
Issue: [AVR-294](/AVR/issues/AVR-294) (Deliverable D3 under [AVR-290](/AVR/issues/AVR-290))  
Owner: @System Integrator

## Purpose

Cross-walk of all three `avr-asr-*` connectors against:

- Connector runtime (startup / stream requirements from `index.js`)
- `.env.example` and README
- `backend/src/providers/provider-contracts.ts` (`requiredEnv` + `validate`)
- Admin templates in `frontend/app/(protected)/providers/page.tsx` ([AVR-293](/AVR/issues/AVR-293))

Legend: **R** = required at connector startup or session; **C** = backend contract required; **T** = frontend template `required: true` or conditional validation; **O** = optional / defaulted in connector; **—** = not applicable.

## Summary

| Image | Connector R keys | Backend C keys | Template required keys | Parity |
|---|---|---|---|---|
| `avr-asr-deepgram` | `DEEPGRAM_API_KEY` (session) | `DEEPGRAM_API_KEY` | `DEEPGRAM_API_KEY` | OK |
| `avr-asr-sarvam` | `SARVAM_API_KEY` (WebSocket auth) | `SARVAM_API_KEY` | `SARVAM_API_KEY` | OK (`SARVAM_WEBSOCKET_URL` wiki-only) |
| `avr-asr-soniox` | `SONIOX_API_KEY` (config message) | `SONIOX_API_KEY` | `SONIOX_API_KEY` | OK (`SONIOX_WEBSOCKET_URL` wiki-only) |

## Per-provider detail

### 1. Deepgram (`agentvoiceresponse/avr-asr-deepgram`)

| Variable | Connector | `.env.example` | Backend C | Template | Notes |
|---|---|---|---|---|---|
| `DEEPGRAM_API_KEY` | R (SDK client / live session) | documented | C | T | No `process.exit`; fails on first stream if missing |
| `SPEECH_RECOGNITION_MODEL` | O (default `nova`) | documented | — | O | Template default `nova` matches connector |
| `SPEECH_RECOGNITION_LANGUAGE` | O (default `en`) | documented | — | O | |
| `PORT` | O (default `6010`) | documented | — | — | AVR injects; reserved in platform matrix |

**Intentional omissions (wiki):** no further Deepgram live tuning (encoding, sample rate, `interim_results`, smart_format) in panel — fixed in connector (`linear16`, 8 kHz).

---

### 2. Sarvam (`agentvoiceresponse/avr-asr-sarvam`)

| Variable | Connector | `.env.example` | Backend C | Template | Notes |
|---|---|---|---|---|---|
| `SARVAM_API_KEY` | R (`Api-Subscription-Key` header) | R | C | T | |
| `SARVAM_WEBSOCKET_URL` | O (default production WS) | documented | — | — | **Wiki / custom env** — `_URL` suffix rejected by agent runtime |
| `SARVAM_SPEECH_RECOGNITION_MODEL` | O (`saarika:v2.5`) | documented | — | O | Template default matches |
| `SARVAM_SPEECH_RECOGNITION_LANGUAGE` | O (`en-IN`) | documented | — | O | |
| `SARVAM_SPEECH_RECOGNITION_MODE` | O (`transcribe`) | documented | — | O | Template select: `transcribe` / `translate` |
| `PORT` | O (default `6050`) | documented | — | — | |

**Intentional omissions:** `SARVAM_WEBSOCKET_URL` not in contract/template — use custom provider env map or wiki for non-production endpoints.

---

### 3. Soniox (`agentvoiceresponse/avr-asr-soniox`)

| Variable | Connector | `.env.example` | Backend C | Template | Notes |
|---|---|---|---|---|---|
| `SONIOX_API_KEY` | R (first WS config payload) | R | C | T | |
| `SONIOX_WEBSOCKET_URL` | O (default `wss://stt-rt.soniox.com/transcribe-websocket`) | documented | — | — | **Wiki / custom env** — `_URL` suffix rejected by agent runtime |
| `SONIOX_SPEECH_RECOGNITION_MODEL` | O (`stt-rt-v3`) | documented | — | O | Template default matches |
| `SONIOX_SPEECH_RECOGNITION_LANGUAGE` | O (`en` → single hint) | documented | — | O | Connector wraps in `language_hints` array |
| `PORT` | O (default `6018`) | documented | — | — | |

**Intentional omissions:** `SONIOX_WEBSOCKET_URL` not in contract/template — same reserved-key policy as Sarvam.

---

## Platform reserved keys (all ASR)

Rejected by `AgentsService` / [AVR-135](./AVR-135-connector-compatibility-matrix-2026-05-11.md) matrix (not in connector templates):

`AGENT_ID`, `AGENT_NAME`, `PORT`, `HTTP_PORT`, `WEBHOOK_*`, `*_URL` service wiring (`ASR_URL`, `LLM_URL`, `TTS_URL`, `STS_URL`, `AMI_URL`), `PROVIDER_*` prefix.

**ASR provider vs agent wiring:** `ASR_URL` is how the core reaches the ASR container — not the upstream vendor WebSocket. Connectors may still read `SARVAM_WEBSOCKET_URL` / `SONIOX_WEBSOCKET_URL` when set via advanced/custom config outside templates; defaults in code apply when omitted.

## Related artifacts

- Runtime contracts: `backend/src/providers/provider-contracts.ts` ([AVR-292](/AVR/issues/AVR-292))
- Compatibility summary: [AVR-135-connector-compatibility-matrix-2026-05-11.md](./AVR-135-connector-compatibility-matrix-2026-05-11.md)
- Frontend templates: `frontend/app/(protected)/providers/page.tsx` ([AVR-293](/AVR/issues/AVR-293))
- Connector repos: `avr-asr-{deepgram,sarvam,soniox}`
- STS parity reference: [AVR-281-sts-env-parity.md](./AVR-281-sts-env-parity.md)

## Verification

- `cd backend && npx jest src/providers/providers.service.spec.ts`
- Manual: create provider per ASR template in admin panel; confirm required-field validation matches table above.
- Confirm `SARVAM_WEBSOCKET_URL` / `SONIOX_WEBSOCKET_URL` are not offered in templates (reserved `_URL`).
