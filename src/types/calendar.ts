export interface CalendarResult {
  /** All active (non-canceled) events with start_time in the range. */
  booked: number;
  /** Subset of `booked` whose start_time is already in the past. Use this as the
   *  denominator when comparing against `attended` (future events can't be attended yet). */
  pastBooked: number;
  /** Past events that were attended — at least one invitee not flagged no-show. */
  attended: number;
  /** Past events whose attendance could not be determined (invitees endpoint failed). */
  attendanceUnknown: number;
  range: { from: string; to: string };
}
