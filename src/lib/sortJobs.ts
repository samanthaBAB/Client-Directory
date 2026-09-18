import { ClientJob } from "./types";
import { timeStrToMinutes } from "./time";

function timeSortKey(j: ClientJob) {
  if (j.startTime) return timeStrToMinutes(j.startTime);
  return 24 * 60 + 1;
}

export function sortJobsChronologically(list: ClientJob[]) {
  return [...list].sort((a, b) => {
    const diff = timeSortKey(a) - timeSortKey(b);
    if (diff !== 0) return diff;
    const la = (a.property || a.address || "").toLowerCase();
    const lb = (b.property || b.address || "").toLowerCase();
    return la.localeCompare(lb);
  });
}
