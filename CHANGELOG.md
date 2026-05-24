# Changelog

All notable changes to this project are documented in this file.

## [1.5.7] - 2026-05-24

### Fixed
- Pipeline `runAgent` now injects canonical streaming paths into `ASR_URL`, `LLM_URL`, and `TTS_URL` for avr-core (`/speech-to-text-stream`, `/prompt-stream`, `/text-to-speech-stream`) instead of bare `http://container:port` roots ([AVR-291](https://github.com/agentvoiceresponse/avr-app/issues/291)).

## [1.5.6] - 2026-05-24

### Added
- Backend runtime contracts for **Deepgram**, **Sarvam**, and **Soniox** ASR connectors (`DEEPGRAM_API_KEY`, `SARVAM_API_KEY`, `SONIOX_API_KEY`) validated at provider create/update time ([AVR-292](https://github.com/agentvoiceresponse/avr-app/issues/292)).
- Unit test coverage for each ASR contract (reject missing key, accept satisfied contract).
- ASR image compatibility rows in `backend/docs/AVR-135-connector-compatibility-matrix-2026-05-11.md`.

## [1.5.5] - 2026-05-24

### Added
- Admin provider templates for **Speechmatics** and **HumeAI** STS connectors with region, config-id gating, and EN/IT i18n ([AVR-281](https://github.com/agentvoiceresponse/avr-app/issues/281)).
- Backend runtime contracts for `avr-sts-speechmatics` and `avr-sts-humeai`; `AGENT_PROMPT` required for `avr-sts-deepgram` ([AVR-282](https://github.com/agentvoiceresponse/avr-app/issues/282), [AVR-284](https://github.com/agentvoiceresponse/avr-app/issues/284)).
- STS environment parity matrix at `backend/docs/AVR-281-sts-env-parity.md` covering all seven STS images.

### Changed
- OpenAI STS template default model updated to `gpt-realtime-2` to match GA Realtime connector default.
- Connector compatibility matrix extended with Speechmatics, HumeAI, and Deepgram `AGENT_PROMPT` contract rows.
- **Breaking:** existing Deepgram STS providers must set `AGENT_PROMPT` in provider config before `runAgent` after upgrading to `1.5.5`; the backend now enforces this at startup (template pre-fills on new providers).

## [1.5.4] - 2026-05-24

### Fixed
- Fixed duplicate telephony config blocks after upgrade by purging legacy `; BEGIN {id}` / `; END {id}` marker regions outside the `AVR-MANAGED` section on trunk, phone, and number upsert/remove ([AVR-186](https://github.com/agentvoiceresponse/avr-app/issues/186)).
- Removed unused `manager.conf` write path from Asterisk provisioning; `manager.conf` remains seed/static AMI only (extensions and pjsip are managed at runtime).

## [1.5.3] - 2026-05-24

### Added
- Added Phase A connector compatibility matrix and failure policy (`backend/docs/AVR-135-connector-compatibility-matrix-2026-05-11.md`) with STS image/env contracts, readiness timeout policy, and unit-test evidence mapping.
- Added backend provisioning consistency primitives and contract helpers to keep provider, trunk, phone, and number synchronization behavior aligned.
- Added backend unit and integration coverage for provisioning synchronization flows, webhook forwarding failure handling, and Asterisk service behavior.
- Added frontend VoiceOps cockpit modules, API error resolution helpers, and Vitest-based frontend test coverage.

### Changed
- Updated backend service logic for agents, providers, trunks, phones, numbers, webhooks, and Asterisk integration to support release lane governance and operational consistency.
- Updated protected frontend pages, app shell, API client/auth handling, and i18n dictionaries (`en` and `it`) for the new operational UX.
- Updated frontend toolchain metadata (`package.json` and lockfile) to include the new test and support modules shipped with this release.

### Fixed
- Fixed connector readiness timeout being classified as terminal configuration error; timeouts now persist `dependency_unavailable` with `retryable=true` per AVR-137 trust-boundary matrix.
- Fixed concurrent `runAgent` / `stopAgent` requests racing on agent lifecycle transitions by using optimistic status updates before Docker operations.

## [1.5.2] - 2026-05-10

### Changed
- Updated root, backend, and frontend README files to align with the current repository behavior.
- Clarified that backend and frontend are independent npm projects and documented correct local commands.
- Added backend operational notes for CORS, Docker socket access, strict DTO validation, admin seeding, and TypeORM `synchronize: true`.
- Added frontend runtime environment guidance for `next-runtime-env` and corrected stack/version references.
