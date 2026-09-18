export interface RecurrenceFields {
  recurrenceType: string | null;
  recurrenceDays: number[];
  recurrenceOrdinals: number[];
  recurrenceAnchor: string | null;
}

export const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const ORDINAL_OPTIONS = [1, 2, 3, 4, -1];
const ORDINAL_LABELS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", [-1]: "last" };

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dayOfWeek(dateStr: string): number {
  return parseDate(dateStr).getUTCDay();
}

function weekStart(d: Date): Date {
  const s = new Date(d);
  s.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return s;
}

function nthWeekdayOfMonth(dateStr: string): number {
  return Math.floor((parseDate(dateStr).getUTCDate() - 1) / 7) + 1;
}

function isLastWeekdayOfMonth(dateStr: string): boolean {
  const d = parseDate(dateStr);
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 7));
  return next.getUTCMonth() !== d.getUTCMonth();
}

// Does this job happen on this specific calendar day?
export function occursOnDate(job: RecurrenceFields, dateStr: string): boolean {
  if (!job.recurrenceType) return false;
  const dow = dayOfWeek(dateStr);

  if (job.recurrenceType === "ONCE") return job.recurrenceAnchor === dateStr;

  if (job.recurrenceType === "WEEKLY") return job.recurrenceDays.includes(dow);

  if (job.recurrenceType === "BIWEEKLY") {
    if (!job.recurrenceDays.includes(dow) || !job.recurrenceAnchor) return false;
    const diffWeeks = Math.round(
      (weekStart(parseDate(dateStr)).getTime() - weekStart(parseDate(job.recurrenceAnchor)).getTime()) / (7 * 86400000)
    );
    return diffWeeks % 2 === 0;
  }

  if (job.recurrenceType === "MONTHLY_NTH") {
    if (!job.recurrenceDays.includes(dow)) return false;
    const ordinal = nthWeekdayOfMonth(dateStr);
    return job.recurrenceOrdinals.includes(ordinal) || (isLastWeekdayOfMonth(dateStr) && job.recurrenceOrdinals.includes(-1));
  }

  return false;
}

// A human-readable summary, auto-generated for display (e.g. in JobCard's
// meta line) so nobody has to hand-type free text like "1st & 3rd Thursday".
export function describeRecurrence(job: RecurrenceFields): string {
  if (!job.recurrenceType) return "";
  const days = [...job.recurrenceDays].sort((a, b) => a - b).map((d) => WEEKDAY_SHORT[d]).join("/");

  switch (job.recurrenceType) {
    case "ONCE":
      return job.recurrenceAnchor ? `One-time on ${job.recurrenceAnchor}` : "One-time";
    case "WEEKLY":
      return days ? `Every ${days}` : "";
    case "BIWEEKLY":
      return days ? `Every other ${days}` : "";
    case "MONTHLY_NTH": {
      const ordinals = [...job.recurrenceOrdinals]
        .sort((a, b) => (a === -1 ? 99 : a) - (b === -1 ? 99 : b))
        .map((o) => ORDINAL_LABELS[o] ?? String(o))
        .join(" & ");
      const dayLabel = job.recurrenceDays[0] != null ? WEEKDAY_LABELS[job.recurrenceDays[0]] : "";
      return ordinals && dayLabel ? `${ordinals} ${dayLabel} of the month` : "";
    }
    default:
      return "";
  }
}
