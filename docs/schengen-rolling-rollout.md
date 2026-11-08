# Schengen rolling calculation and daily report

The reference date is a Europe/Sarajevo calendar date. The window includes that date
and its preceding 179 dates. `SchengenDay.date` is a date-only key encoded at UTC
midnight, not an instant at which a driver crossed a border. No fixed reset applies.

## Accounting and evidence

- Count distinct calendar dates, including entry and exit dates. 23:55 and 00:10 on
  consecutive dates count as two days, regardless of elapsed minutes.
- Ignore GPS samples with reported accuracy worse than 250 metres.
- For the supported BiH–Schengen–BiH routes, infer continuity between consecutive
  inside observations, including rest days with no driving. Absence of GPS samples
  is not an error or evidence of exit. An open stay still needs a new observation
  to confirm its end; continuation beyond the latest observation is an assumption.
- A region transition between samples at most 30 minutes apart uses a midpoint
  estimate. A transition spanning midnight is flagged for date verification.
- Never extend an unmatched entry beyond the latest observed position. In
  particular, a nightly report for yesterday does not confirm presence today.
- Accounting does not depend on notification confirmation thresholds. Notification
  detection retains its noise filters, but no longer discards a rapid return.
- Read paths overlay the last three calendar dates from positions on historical
  aggregate rows, so live data and late nightly imports are reflected promptly.
- A full rebuild reloads the entire first date plus one preceding usable position,
  and replaces all computed rows in the requested range, removing obsolete inferred
  rows. It does not delete raw positions or dated corrections.

Legacy scalar balances remain in the database for historical reference, but are not
used in a rolling calculation. They cannot identify dates that expire. The driver
page now edits a specific date as inside/outside; clearing that correction restores
GPS-based calculation. Corrections are stored separately in Setting and logged in
AuditLog. Old clients attempting a scalar override receive a validation error.
OEM audits compare the rolling window with local calendar boundaries; an audit can
be saved but cannot install a scalar balance. Date corrections are a separate,
explicit action. OEM audit comparisons show raw evidence, not manual corrections.

## Daily delivery

The existing PM2 `transport-cron` process schedules the daily report at 07:00 in
Europe/Sarajevo, with pre-send failure retries at 07:15 and 07:30. Restarting the cron process
after 07:00 also attempts the current date, subject to the persisted claim. The earlier 04:30
aggregation remains; the daily job refreshes aggregation before creating its report.
Report preparation starts at 07:00; delivery follows completion of aggregation.
A running/failed/late RIO import does not block all drivers' reports: affected
vehicles are explicitly marked as missing a successful import for yesterday.
A successful asset result is required, not merely a successful global job flag.
Volvo device identifiers take precedence over static RIO truck mappings.

The report contains the rolling period, usage, remaining days, last position,
source, per-vehicle import status, neutral notices about no recent positions, possible continuing
stay, and hypothetical usage including today. Today is never double-counted. The
hypothesis does not write presence and does not project a maximum continuous future
stay. Prior-day crossings are shown as detected events, not guaranteed complete
border records.

Existing recipient configuration, enabled flag, API routes and Setting keys are
retained. Their `weekly` names are compatibility names only. History retains 180
recent delivery attempts. No email is sent by tests or rebuild scripts.

Daily claims use `schengen_daily_job:YYYY-MM-DD` Setting keys. States are pending,
aggregating, failed, sending, sent, or skipped:<reason>. Only pending/failed claims
can run. Concurrent cron processes cannot claim the same date twice. If the process
stops while aggregating, inspect the job before resetting it to failed. If it stops
while sending or SMTP returns an ambiguous error, inspect delivery before retrying;
SMTP cannot provide exactly-once delivery. Sending/sent claims are not automatically
reclaimed. Manual sending remains an explicit separate action.

## Rollout

1. Run `npm run test:schengen` and `npm run build`.
2. In the deployment environment, pause the cron process during the initial rebuild
   to avoid overlapping old/new writers. Preserve the normal database backup.
3. Run `npm run schengen:rebuild` and retain its JSON-lines output. The default is
   read-only: it lists added/removed dates and old/new counts per driver for the
   current window. It does not send mail or apply dated corrections to the diff.
4. Inspect differences, especially midnight transitions, missing history and old
   open intervals. Run `npm run schengen:rebuild -- --apply` to replace derived rows.
   Raw GPS and date corrections are preserved. The script is repeatable per driver.
5. Deploy/restart the application and cron together, retaining mail recipients and
   enabled state. Verify the first daily job and report. Deploy the mobile update
   for the new freshness display; older clients still receive compatible counters.

The local implementation and synthetic regression tests do not establish how many
production records changed. The read-only rebuild comparison provides that evidence.

A successful empty nightly import is valid (for example, a rest day). It is not
marked stale solely because the last position predates yesterday. Likewise, an old
live position is not proof of a failed feed: its timestamp and a neutral rest-day
notice remain visible. Failed/missing imports and no known location still warn.
