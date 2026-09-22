import { getGridDays, isSameDay, isSameMonth } from '../utils/monthGrid.js';
import { CalendarEventChip } from './CalendarEventChip.jsx';
import { cn } from '../../../lib/cn.js';

const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function MonthView({ monthDate, events }) {
  const days = getGridDays(monthDate);
  const today = new Date();

  function eventsForDay(day) {
    return events.filter((event) => isSameDay(new Date(event.startDate), day));
  }

  return (
    <div className="border border-(--color-border) overflow-x-auto">
      <div className="min-w-[640px]">
      <div className="grid grid-cols-7 border-b border-(--color-border)">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-meta text-(--color-text)/50 px-2 py-2 text-center">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsForDay(day);
          const inMonth = isSameMonth(day, monthDate);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[7rem] border-b border-r border-(--color-border) p-1.5 space-y-1',
                !inMonth && 'bg-(--color-bg-secondary)/40'
              )}
            >
              <span
                className={cn(
                  'text-xs inline-flex items-center justify-center size-5',
                  !inMonth && 'text-(--color-text)/30',
                  isSameDay(day, today) && 'bg-(--color-accent) text-(--color-accent-foreground) rounded-full'
                )}
              >
                {day.getDate()}
              </span>
              {dayEvents.slice(0, 3).map((event) => (
                <CalendarEventChip key={event._id} event={event} />
              ))}
              {dayEvents.length > 3 && (
                <p className="text-meta text-(--color-text)/40 px-1.5">+{dayEvents.length - 3} more</p>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
