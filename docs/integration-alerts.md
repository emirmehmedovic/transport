# Volvo and RIO failure notifications

## Volvo

The old per-driver position-lag email check has been removed from cron. Position
age, differences between API and local timestamps, vehicle inactivity and rest days
do not trigger emails. The existing five-minute scheduled position fetch records
one outcome per complete API retrieval (including its pages). No extra health API
request is made. Manual previews/backfills are not counted as scheduled samples.

An incident opens only after at least six consecutive failed observations spanning
at least 30 minutes. A gap exceeding 15 minutes restarts the candidate failure or
recovery streak; restarting a stopped cron must not manufacture sustained evidence.
The same incident remains open until three consecutive successful observations span
at least ten minutes. A brief successful response followed by another failure
therefore cannot create another email. Recovery is silent.

Successful empty responses, including HTTP 204, count as successful contact. HTTP
errors, authentication/configuration problems, invalid response formats and network
failures are classified without placing remote response bodies or secrets in email.
Requests have a 30-second timeout. Database work occurs after the monitored fetch;
a failed local write is not mislabeled as lost API connectivity. Local write errors
remain in the ordinary cron logs.

State persists in `volvo_rfms_api_health_v2`, with a transaction-level advisory lock
and observation ordering checks. The old `volvo_rfms_health_state` is no longer used.
Overlapping five-minute sync executions are skipped within the cron process.

## RIO

The scheduled 00:40 import opts into failure notifications. A full successful import,
including one with zero movement/position records, sends nothing. A completed partial
failure or a fatal failure after the portal's existing retry handling sends one email
for the data date, listing failed/unprocessed vehicles where available. Final failure
status and partial results are now saved for cron failures as well as CLI failures.

Scheduled outcome is recorded separately as `rio_scheduled_run:YYYY-MM-DD` so a later
single-truck or dry-run import cannot overwrite the scheduled health outcome.
Manual/dry-run operations never send automatic failure emails. A successful real
full retry (scheduled or manual) repairs that date’s outcome without a recovery email.

At 07:05 (with checks at 07:20 and 07:35), the cron verifies that yesterday's scheduled
import finished successfully by the morning deadline. A missing or still-running
job generates the same date-deduplicated failure alert. Startup after local 07:00 also
performs this check. All clock comparisons use Europe/Sarajevo, including DST days.
When scheduled RIO imports are disabled, the deadline check stays quiet. On initial
upgrade an old full successful status covering every configured asset is accepted.
If the entire cron process is down, it cannot send an email until it restarts;
monitoring a completely stopped server requires an external watchdog.

## Delivery and rollout

Both integrations retain the existing recipient `emir.m@live.com`. To override it,
set `INTEGRATION_ALERT_RECIPIENTS` to a comma-separated list.

Each mail has a persisted unique claim:
- `integration_alert:volvo:<incident-start>`
- `integration_alert:rio:<data-date>`

Claims are stored before SMTP to prevent duplicates across concurrent attempts or
restarts. Their states are `sending`, `sent` or `delivery_unconfirmed`. SMTP connection,
greeting and socket timeouts are 30 seconds for these alerts only. Existing email
callers retain their prior settings. An uncertain delivery is logged and held for
operator review rather than automatically resent. Before clearing such a claim,
verify the recipient/SMTP logs: SMTP cannot guarantee exactly-once delivery.

No schema migration is required. Deploy the application and restart `transport-cron`
together: an already running old cron will continue its old position-lag checks until
restarted. Deploying these files locally does not update the production process.

Validation: `npm run test:integration-alerts` uses production modules with mocked
PostgreSQL, RIO, Volvo fetches and email. It never contacts live services or sends mail.
