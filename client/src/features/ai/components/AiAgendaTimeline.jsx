// The generated schedule as a vertical timeline. Multi-day agendas get a "Day N" heading each; a
// one-day one does not need it.
export function AiAgendaTimeline({ agenda }) {
  const days = [];
  for (const item of agenda) {
    const last = days[days.length - 1];
    if (last?.day === item.day) last.items.push(item);
    else days.push({ day: item.day, items: [item] });
  }

  return (
    <div className="space-y-6">
      {days.map((group) => (
        <section key={group.day} aria-label={`Day ${group.day}`}>
          {days.length > 1 && <h4 className="text-meta mb-3 text-(--color-text)/60">Day {group.day}</h4>}
          <ol className="relative ml-1.5 space-y-4 border-l border-(--color-border) pl-5">
            {group.items.map((item, index) => (
              <li key={`${item.time}-${index}`} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-[1.62rem] size-2.5 rounded-full bg-(--color-accent) ring-4 ring-(--color-surface)"
                />
                <p className="text-sm tabular-nums text-(--color-text)/60">{item.time}</p>
                <p className="font-medium leading-snug">{item.title}</p>
                {item.details && <p className="mt-0.5 text-sm text-(--color-text)/60">{item.details}</p>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
