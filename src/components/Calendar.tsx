"use client";

import { useState } from "react";
import { ClientVisit } from "@/lib/types";
import { fmtClock, fmtDuration, todayStr } from "@/lib/time";

export default function Calendar({ visits }: { visits: ClientVisit[] }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const visitsByDate: Record<string, ClientVisit[]> = {};
  visits.forEach((v) => {
    (visitsByDate[v.date] = visitsByDate[v.date] || []).push(v);
  });

  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = first.toLocaleString("default", { month: "long" });
  const today = todayStr();

  function nav(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  }

  const cells = [];
  for (let i = 0; i < startDow; i++) {
    cells.push(<div key={"e" + i} className="cal-day empty" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const hasVisits = (visitsByDate[dateStr] || []).length > 0;
    const isToday = dateStr === today;
    const isSelected = selected === dateStr;
    cells.push(
      <div
        key={dateStr}
        className={`cal-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
        onClick={() => setSelected(selected === dateStr ? null : dateStr)}
      >
        <div>{d}</div>
        {hasVisits && <div className="cal-dot" />}
      </div>
    );
  }

  const dayVisits = selected ? visitsByDate[selected] || [] : [];

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
          <div className="group-title">{selected}</div>
          {dayVisits.length === 0 ? (
            <div className="empty">No visits logged this day.</div>
          ) : (
            dayVisits.map((v) => {
              let timeInfo = "";
              if (v.startedAt && v.endedAt) {
                timeInfo = `${fmtClock(v.startedAt)}–${fmtClock(v.endedAt)} (${fmtDuration(v.endedAt - v.startedAt)})`;
              } else if (v.status === "IN_PROGRESS" && v.startedAt) {
                timeInfo = `Started ${fmtClock(v.startedAt)} · still in progress`;
              }
              return (
                <div className="visit-item" key={v.id}>
                  <div className="vname">{v.jobLabel}</div>
                  {v.sameDayCheckIn && (
                    <div className="vnote"><strong style={{ color: "var(--damage-text)" }}>&#9889; Same-day check-in</strong></div>
                  )}
                  {timeInfo && <div className="vnote">{timeInfo}</div>}
                  {v.note && <div className="vnote">{v.note}</div>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
