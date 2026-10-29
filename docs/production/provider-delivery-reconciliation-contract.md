# Provider Delivery Receipt Reconciliation Contract

**Status:** Proposed; implementation blocked on provider configuration and credentials  
**Scope:** SMS and email communication delivery receipts  
**Database changes:** None in this proposal

## 1. Current behavior and safety boundary

The CMMS records provider dispatch outcomes in `communication_logs`. A provider accepting a send request is not proof that a recipient handset or mailbox received the message. The application must not infer `DELIVERED` from an HTTP success response.

The current integration surface supports Twilio, AfroMessage, generic REST SMS gateways, Resend, SendGrid and SMTP. These providers do not share one callback authentication format or one event schema. SMTP and generic REST gateways may not expose delivery callbacks at all.

**Do not expose a generic unauthenticated delivery-status endpoint.** Do not accept provider name, recipient, tenant, status or provider message ID as trusted merely because they appear in a callback body.

## 2. Provider-specific enablement gate

Before enabling a provider callback, record and review all of the following for that exact provider/account:

- Official callback documentation and supported event types.
- Signature algorithm and exact canonicalization rules (raw request bytes, timestamp, URL, headers and body fields).
- Secret provisioning, rotation and overlap procedure.
- Provider message identifier format and uniqueness scope.
- Retry policy, event ordering, replay window and duplicate delivery behavior.
- Test/sandbox procedure and a real signed sample event with secrets and personal data removed.
- Whether callback delivery is available for the configured plan/account and sending region.

A provider without documented and testable authenticity verification remains **dispatch-only**. Its records may be reconciled manually by an authorized administrator using provider-console evidence; no callback route should be enabled for it.

## 3. Required callback processing model

Each provider adapter must:

1. Receive the raw request body before JSON parsing or body mutation.
2. Verify the provider signature using the provider's official algorithm and a server-side secret.
3. Validate the signed timestamp/replay window where the provider supports it.
4. Parse only after signature verification and validate a strict provider-specific event schema.
5. Resolve the log by the provider's exact message identifier and provider name; never trust tenant or branch identifiers supplied by the callback.
6. Apply an allowed monotonic status transition in a database transaction.
7. Persist a unique provider event identifier (or a deterministic provider-specific deduplication key) under a unique constraint, so repeated callbacks are idempotent.
8. Record receipt time and provider event time separately.
9. Return the provider-required success response only after the receipt and status transition commit.
10. Emit a security/audit event for invalid signatures, unknown message IDs, replayed events, invalid transitions and tenant/provider mismatches without logging secrets or full message bodies.

## 4. Status transition policy

| Current state | Provider event | Permitted result |
|---|---|---|
| SENT | Delivered | DELIVERED |
| SENT | Definitive delivery failure | FAILED, only if provider semantics establish terminal failure |
| DELIVERED | Duplicate delivered | No-op |
| DELIVERED | Delayed sent/queued event | No-op |
| FAILED | Late delivered event | Require explicit provider semantics and audited reconciliation; do not silently downgrade or overwrite |
| QUEUED with RETRY_OUTCOME_UNKNOWN | Receipt for claimed provider message ID | Reconcile to the verified provider result |
| QUEUED with unknown provider message ID | Any callback | Reject/quarantine; never guess a log match |

Provider event ordering differs. A universal status ordering must not be assumed. The adapter must map each provider's documented event semantics to these guarded transitions.

## 5. Data model requirements before implementation

The current `communication_logs` table has `provider_message_id`, `status`, `sent_at` and `delivered_at`, but no durable provider-event inbox or unique event key.

A reviewed future migration should consider:

- `communication_provider_events`: provider, provider event ID/deduplication key, provider message ID, event type, event timestamp, received timestamp, verification result, processing status and a minimal sanitized payload/hash.
- Unique constraint on (provider, provider event ID) or the provider-specific deduplication key.
- Index on (provider, provider message ID).
- Foreign key/reference to the communication log where feasible.
- Tenant identity derived from the matched communication log, not from untrusted callback content.
- Retention and redaction policy for provider event payloads.

Do not apply a migration as part of this design document. Confirm actual deployed schema, retention requirements, provider semantics and RLS/service-role access before proposing SQL.

## 6. Provider adapter acceptance tests

For each enabled provider, automated tests must cover:

- Valid signed event.
- Invalid signature and missing signature.
- Modified body and modified callback URL/header where relevant.
- Expired timestamp/replay attempt.
- Duplicate event delivery.
- Unknown provider message ID.
- Provider message ID belonging to a different provider.
- Out-of-order events.
- Duplicate delivery after the log is already DELIVERED.
- Database failure before commit (provider must be able to retry).
- Correct tenant attribution from the matched log.
- No PII, message body, API key or signature secret in logs.

Tests must use provider-published signature fixtures or verified sandbox payloads. Do not invent a signature algorithm or use a hand-written substitute for provider SDK verification without a documented reason.

## 7. Operational rollout

1. Identify the actual configured SMS and email provider per environment without exposing credentials.
2. Confirm callback support, account configuration and public callback URL requirements with each provider.
3. Implement and test one provider adapter at a time.
4. Add the reviewed event-inbox migration only after explicit schema approval.
5. Run sandbox callback tests and verify duplicate/out-of-order behavior.
6. Enable callbacks per provider via an explicit server-side feature flag.
7. Monitor signature failures, unknown IDs, callback lag and reconciliation backlog.
8. Keep dispatch-only/manual reconciliation for providers without supported callbacks.

## 8. Production release gate

Delivery-receipt reconciliation is not complete until at least one real configured provider has documented signature verification, idempotent event persistence, integration tests, sandbox evidence and operational monitoring. A Vercel preview or successful build alone does not satisfy this gate.

The current retry outcome marker intentionally remains queued when the provider outcome is ambiguous. It must not be automatically resent until the provider-side outcome is reconciled.
