# AVR-281 STS environment parity matrix

Date: 2026-05-24  
Issue: [AVR-284](/AVR/issues/AVR-284) (Deliverable D3 under [AVR-281](/AVR/issues/AVR-281))  
Owner: @System Integrator

## Purpose

Cross-walk of all seven `avr-sts-*` connectors against:

- Connector runtime (startup / session requirements from `index.js`)
- `.env.example` and README
- `backend/src/providers/provider-contracts.ts` (`requiredEnv` + `validate`)
- Admin templates in `frontend/app/(protected)/providers/page.tsx`

Legend: **R** = required at connector startup or session; **C** = backend contract required; **T** = frontend template `required: true` or conditional validation; **O** = optional / defaulted in connector; **—** = not applicable.

## Summary

| Image | Connector R keys | Backend C keys | Template required keys | Parity |
|---|---|---|---|---|
| `avr-sts-openai` | `OPENAI_API_KEY` (session) | `OPENAI_API_KEY`, `OPENAI_MODEL` | same as C + optional tuning | OK (C stricter on model) |
| `avr-sts-elevenlabs` | `ELEVENLABS_API_KEY`, agent id or `ELEVENLABS_AGENT_URL` | `ELEVENLABS_AGENT_ID`, `ELEVENLABS_API_KEY` | same as C | OK (URL path wiki-only) |
| `avr-sts-gemini` | `GEMINI_API_KEY` (session) | `GEMINI_API_KEY`, `GEMINI_MODEL` | same as C | OK |
| `avr-sts-ultravox` | `ULTRAVOX_API_KEY`; `ULTRAVOX_AGENT_ID` when agent mode | `ULTRAVOX_API_KEY` + validate agent id | same + `superRefine` | OK |
| `avr-sts-deepgram` | `DEEPGRAM_API_KEY`, `AGENT_PROMPT` | `DEEPGRAM_API_KEY`, `AGENT_PROMPT` | same (prompt has template default) | OK (contract updated AVR-284) |
| `avr-sts-speechmatics` | `SPEECHMATICS_API_KEY` | `SPEECHMATICS_API_KEY` | `SPEECHMATICS_API_KEY` | OK |
| `avr-sts-humeai` | `HUMEAI_API_KEY` | `HUMEAI_API_KEY` | `HUMEAI_API_KEY` | OK |

## Per-provider detail

### 1. OpenAI (`agentvoiceresponse/avr-sts-openai`)

| Variable | Connector | `.env.example` | Backend C | Template | Notes |
|---|---|---|---|---|---|
| `OPENAI_API_KEY` | R (API auth) | documented | C | T | |
| `OPENAI_MODEL` | O (default `gpt-realtime-2`) | commented optional | C | T | Admin requires explicit model; connector default not relied on in panel |
| `OPENAI_VOICE` | O | commented | — | O | High-value optional in template |
| `OPENAI_LANGUAGE` | O | commented | — | O | Select widget; `auto` omits env key on save |
| `OPENAI_INSTRUCTIONS` | O | documented | — | O | Alt: `OPENAI_URL_INSTRUCTIONS`, `OPENAI_FILE_INSTRUCTIONS` — wiki |
| `OPENAI_TEMPERATURE`, `OPENAI_MAX_TOKENS`, turn detection, transcription model, reasoning effort | O | commented | — | — | Wiki: advanced Realtime tuning |
| `PORT` | O | documented | — | — | AVR injects; reserved in platform matrix |
| `AMI_URL` | O | commented | — | — | Tools only; reserved `_URL` suffix |

**Intentional omissions (wiki):** instruction URL/file loaders, VAD/turn-detection knobs, deprecated preview model names.

**Template default note:** `OPENAI_MODEL` default in UI should track connector GA default (`gpt-realtime-2`); operators can override.

---

### 2. ElevenLabs (`agentvoiceresponse/avr-sts-elevenlabs`)

| Variable | Connector | `.env.example` | Backend C | Template | Notes |
|---|---|---|---|---|---|
| `ELEVENLABS_API_KEY` | R (warn if missing) | R | C | T | |
| `ELEVENLABS_AGENT_ID` | R* | R | C | T | *Or `ELEVENLABS_AGENT_URL` at runtime |
| `ELEVENLABS_AGENT_URL` | R* | commented | — | — | Wiki: dynamic agent resolution |
| `PORT` | O | documented | — | — | |

**Intentional omissions:** `ELEVENLABS_AGENT_URL` not in contract/template — uncommon; use custom env map or wiki.

---

### 3. Gemini (`agentvoiceresponse/avr-sts-gemini`)

| Variable | Connector | `.env.example` | Backend C | Template | Notes |
|---|---|---|---|---|---|
| `GEMINI_API_KEY` | R (session) | R | C | T | |
| `GEMINI_MODEL` | O (default in code) | R | C | T | |
| `GEMINI_INSTRUCTIONS` | O | documented | — | O | URL/file loaders — wiki |
| `GEMINI_THINKING_LEVEL`, `GEMINI_THINKING_BUDGET` | O | documented | — | O | Template select widgets |
| `PORT` | O | documented | — | — | |

---

### 4. Ultravox (`agentvoiceresponse/avr-sts-ultravox`)

| Variable | Connector | `.env.example` | Backend C | Template | Notes |
|---|---|---|---|---|---|
| `ULTRAVOX_API_KEY` | R | R | C | T | |
| `ULTRAVOX_CALL_TYPE` | O (`agent`) | R | — | O | Template select; default `agent` |
| `ULTRAVOX_AGENT_ID` | R when agent | R | validate | O/T | Required when call type `agent` (backend + `superRefine`) |
| `ULTRAVOX_SYSTEM_PROMPT` | O (generic mode) | R | — | O | |
| `ULTRAVOX_SAMPLE_RATE`, `ULTRAVOX_CLIENT_BUFFER_SIZE_MS` | O | documented | — | — | Wiki |
| External voice provider block (`ULTRAVOX_ELEVENLABS_*`, Cartesia, LMNT, generic voice JSON) | O | documented | — | — | Wiki: generic-call advanced voice |
| `ULTRAVOX_JOIN_HTTP_TIMEOUT_MS`, `AMI_*`, `AVR_TOOL_EXECUTION_TIMEOUT_MS` | O | documented | — | — | Wiki / ops |

---

### 5. Deepgram (`agentvoiceresponse/avr-sts-deepgram`)

| Variable | Connector | `.env.example` | Backend C | Template | Notes |
|---|---|---|---|---|---|
| `DEEPGRAM_API_KEY` | R (`process.exit`) | R | C | T | |
| `AGENT_PROMPT` | R (`process.exit`) | R (comment) | C | T | Template `defaults` pre-fills on create |
| `DEEPGRAM_ASR_MODEL` | O | documented | — | O | |
| `OPENAI_MODEL` | O | documented | — | O | LLM leg inside Deepgram agent |
| `DEEPGRAM_TTS_MODEL` | O | documented | — | O | |
| `DEEPGRAM_GREETING` | O | documented | — | O | |
| `DEEPGRAM_SAMPLE_RATE` | O | documented | — | — | Wiki |
| `PORT` | O | documented | — | — | |

---

### 6. Speechmatics (`agentvoiceresponse/avr-sts-speechmatics`)

| Variable | Connector | `.env.example` | Backend C | Template | Notes |
|---|---|---|---|---|---|
| `SPEECHMATICS_API_KEY` | R (`process.exit`) | R | C | T | Added in AVR-282 |
| `SPEECHMATICS_REGION` | O (`eu`) | — | — | O | Template select EU/US; omitted from `.env.example` but in code |
| `PORT` | O | documented | — | — | |

**Intentional omissions:** no further Speechmatics Flow tuning keys in panel (connector is minimal).

---

### 7. HumeAI (`agentvoiceresponse/avr-sts-humeai`)

| Variable | Connector | `.env.example` | Backend C | Template | Notes |
|---|---|---|---|---|---|
| `HUMEAI_API_KEY` | R | R | C | T | |
| `HUMEAI_CONFIG_ID` | O (config path) | documented | — | O | When set, UI omits voice/instructions/welcome |
| `HUMEAI_VOICE_ID` | O | commented | — | O | Ignored when config id set |
| `HUMEAI_INSTRUCTIONS` | O (default string) | commented | — | O | Ignored when config id set |
| `HUMEAI_WELCOME_MESSAGE` | O | commented | — | O | Ignored when config id set |
| `HUMEAI_WS_URL` | O | — | — | O | Template only; wiki for custom endpoints |
| `PORT` | O | documented | — | — | |

**Intentional omissions:** no backend requirement for config vs inline mode — connector supports both; operators must supply config id **or** inline fields (documented in template description).

---

## Platform reserved keys (all STS)

Rejected by `AgentsService` / AVR-135 matrix (not in connector templates):

`AGENT_ID`, `AGENT_NAME`, `PORT`, `HTTP_PORT`, `WEBHOOK_*`, `*_URL` service wiring (`ASR_URL`, `LLM_URL`, `TTS_URL`, `STS_URL`, `AMI_URL`), `PROVIDER_*` prefix.

Connectors may still document `AMI_URL` for optional `avr_*` tools; operators set via advanced/custom config outside templates.

## Related artifacts

- Runtime contracts: `backend/src/providers/provider-contracts.ts`
- Compatibility summary: [AVR-135-connector-compatibility-matrix-2026-05-11.md](./AVR-135-connector-compatibility-matrix-2026-05-11.md)
- Frontend templates: `frontend/app/(protected)/providers/page.tsx`
- Connector repos: `avr-sts-{openai,elevenlabs,gemini,ultravox,deepgram,speechmatics,humeai}`

## Verification

- `cd backend && npx jest src/providers/providers.service.spec.ts`
- Manual: create provider per STS template in admin panel; confirm required-field validation matches table above.
