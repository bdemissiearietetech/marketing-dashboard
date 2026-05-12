export interface CalendarResult {
  /** Total booked events in the range. Alias of `booked`, kept for back-compat with older callers. */
  total: number;
  /** Active (non-canceled) events with start_time in the range. */
  booked: number;
  /** Past events (start_time < now) whose invitees were NOT all marked as no-show. */
  attended: number;
  range: { from: string; to: string };
}
