# AVR-143 Closure Notes

## Manual verification notes (telemetry/sidebar UX)

Date: 2026-05-11

- Desktop layout (`>=768px`):
  - Sidebar remains persistent and `Telephony` group visibility now follows runtime probe result from `NEXT_PUBLIC_TELEPHONY_STATUS_URL` (visible only on HTTP 200).
  - `Administration` group is shown only for `admin` role; non-admin users no longer see `/users` entry points that would fail by role guard.
  - WebRTC toggle labels use existing i18n keys and remain unchanged.
- Tablet/mobile layout (`<768px`):
  - Navigation close-on-select behavior remains intact through existing `useMediaQuery("(max-width: 767px)")` + `setOpen(false)` flow.
  - Telephony group gating uses the same probe result as desktop and hides consistently when status endpoint is unavailable/non-200.

## EN/IT copy consistency

- Confirmed: no new user-facing copy strings were introduced in this change-set.
- Existing touched UX labels (`sidebarGroups.telephony`, `common.buttons.openWebrtc`, `common.buttons.hidePhone`) already exist in both:
  - `frontend/lib/i18n/en.ts`
  - `frontend/lib/i18n/it.ts`

## Residual risks

- Residual risk 1: telemetry availability probe currently runs once on mount; if telephony health changes during a long-lived session, sidebar visibility will update only after reload/navigation remount.
- Residual risk 2: status probe uses browser-side `fetch`; if endpoint CORS policy blocks the frontend origin, telephony group will be hidden even when backend telephony is healthy.
- Residual risk 3: no dedicated frontend automated tests currently cover auth-expiry event dispatch + cross-tab storage synchronization paths.

## Verification evidence

- `frontend`: `npm run lint` passed after these changes.
