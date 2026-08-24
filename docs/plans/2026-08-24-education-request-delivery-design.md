# Education request delivery integrity

## Problem

The production education form can show “Request received” without sending an
email. Its off-screen honeypot uses the semantic field name `company`, which a
browser or password manager can autofill. The API deliberately returns a
successful HTTP response for that branch, and the client treats every 2xx
response as proof of delivery.

Production evidence on 2026-08-24 showed no Resend record for the affected
submission. A controlled normal request sent immediately afterward was recorded
as delivered, while a request with the honeypot filled returned the same public
response without creating a Resend email.

## Chosen approach

Keep layered abuse protection while removing both causes of the false success:

1. Replace the semantic honeypot name and label with a non-semantic trap that
   password managers are instructed to ignore.
2. Give successful API responses an explicit `delivered: true` receipt only
   after Resend accepts the email.
3. Keep the honeypot response superficially successful for simple bots, but do
   not include the delivery receipt.
4. Require the client to parse and validate that receipt before resetting the
   form or rendering “Request received.” Missing or malformed receipts use the
   existing prefilled-email fallback.
5. Record the PostHog conversion only after delivery is confirmed, so rejected
   or failed attempts do not inflate lead counts.

This is preferred over removing the honeypot, which would weaken protection,
and over renaming it alone, which would leave the false-success contract in
place for future false positives.

## Request flow

The client serializes the visible fields plus the non-semantic empty trap. The
API validates the payload, silently absorbs filled traps, and otherwise sends
the email through Resend. Only the successful Resend path returns
`{ ok: true, delivered: true }`.

The client accepts success only when the HTTP status is successful and the JSON
body contains both markers. Any other response preserves the typed values and
offers the existing `mailto:support@veritio.io` fallback.

## Error handling and observability

Missing configuration and Resend failures retain their current 5xx responses.
The honeypot branch logs a privacy-safe rejection reason without logging form
contents. The delivery receipt is intentionally small and does not expose the
Resend message identifier.

## Verification

Tests must prove that:

- a valid submission receives an explicit delivery receipt;
- the honeypot response lacks that receipt and never calls Resend;
- the client rejects a 2xx response without a delivery receipt;
- the client shows success and records PostHog only after a confirmed receipt;
- the new trap carries autofill-ignore attributes; and
- existing validation, escaping, rate-limit, and routing tests remain green.

After merge, production verification will submit one labelled diagnostic lead,
confirm the API receipt, verify Resend reports it delivered to
`support@veritio.io`, and confirm the live deployment contains the merged SHA.
