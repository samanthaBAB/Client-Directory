"use client";

import { useState, ReactNode } from "react";
import { ClientJob } from "@/lib/types";
import { occursOnDate } from "@/lib/recurrence";
import { todayStr } from "@/lib/time";

export default function MonthCalendar({
  jobs,
  renderJob,
}: {
  jobs: ClientJob[];
  renderJob: (job: ClientJob) => ReactNode;
}) {
  const today = todayStr();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)) - 1);
  const [selected, setSelected] = useState<string | null>(today);

  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = first.toLocaleString("default", { month: "long" });

  function nav(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  }

  function dateStrFor(d: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const cells = [];
  for (let i = 0; i < startDow; i++) {
    cells.push(<div key={"e" + i} className="cal-day empty" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = dateStrFor(d);
    const dayJobCount = jobs.filter((j) => occursOnDate(j, dateStr)).length;
    const isToday = dateStr === today;
    const isSelected = selected === dateStr;
    cells.push(
      <div
        key={dateStr}
        className={`cal-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
        onClick={() => setSelected(isSelected ? null : dateStr)}
      >
        <div>{d}</div>
        {dayJobCount > 0 && <div className="cal-dot" />}
      </div>
    );
  }

  const dayJobs = selected ? jobs.filter((j) => occursOnDate(j, selected)) : [];

  return (
    <div>
      <div className="cal-header">
        <button className="btn secondary small" onClick={() => nav(-1)}>&lsaquo;</button>
        <div className="cal-title">{monthName} {year}</div>
        <button className="btn secondary small" onClick={() => nav(1)}>&rsaquo;</button>
      </div>
      <div className="cal-grid">
        <div className="cal-dow">S</div><div className="cal-dow">M</div><div className="cal-dow">T</div>
        <div className="cal-dow">W</div><div className="cal-dow">T</div><div className="cal-dow">F</div>
        <div className="cal-dow">S</div>
        {cells}
      </div>
      {selected && (
        <div className="day-detail">
          <div className="group-title">{selected}{selected === today ? " (Today)" : ""}</div>
          {dayJobs.length === 0 ? (
            <div className="empty">No jobs scheduled this day.</div>
          ) : (
            dayJobs.map((j) => <div key={j.id} style={{ marginBottom: 10 }}>{renderJob(j)}</div>)
          )}
        </div>
      )}
    </div>
  );
}
