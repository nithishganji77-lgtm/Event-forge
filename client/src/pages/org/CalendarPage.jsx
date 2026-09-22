import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendarEvents } from '../../features/calendar/hooks/useCalendarEvents.js';
import { MonthView } from '../../features/calendar/components/MonthView.jsx';
import { AgendaView } from '../../features/calendar/components/AgendaView.jsx';
import { Tabs, tabId, panelId } from '../../components/ui/Tabs.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { useActiveOrganization } from '../../hooks/useActiveOrganization.js';
import { extractErrorMessage } from '../../lib/axios.js';

// Month + Agenda only — Week view is cut deliberately: it needs real hour-of-day layout math, but
// startTime/endTime are free-text strings with no format contract (Phase 3's own documented
// simplification), not suitable for pixel-precise grid placement. Agenda already gives the same
// compact per-day breakdown a Week view would add, from the same data.
export function CalendarPage() {
  const { organizationId } = useActiveOrganization();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [view, setView] = useState('month');

  const { data, isLoading, isError, error } = useCalendarEvents(organizationId, monthDate);

  function shiftMonth(delta) {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-meta text-(--color-text)/50 mb-2">CALENDAR</p>
          <h1 className="text-2xl font-semibold">
            {monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMonthDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="sm" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="outline" size="sm" aria-label="Next month" onClick={() => shiftMonth(1)}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <Tabs
        id="calendar-view"
        tabs={[{ key: 'month', label: 'MONTH' }, { key: 'agenda', label: 'AGENDA' }]}
        active={view}
        onChange={setView}
      />

      {isError && <Alert tone="error">{extractErrorMessage(error, 'Could not load events')}</Alert>}
      {isLoading && <Spinner />}

      {data && view === 'month' && (
        <div id={panelId('calendar-view', 'month')} role="tabpanel" aria-labelledby={tabId('calendar-view', 'month')}>
          <MonthView monthDate={monthDate} events={data.data} />
        </div>
      )}
      {data && view === 'agenda' && (
        <div id={panelId('calendar-view', 'agenda')} role="tabpanel" aria-labelledby={tabId('calendar-view', 'agenda')}>
          <AgendaView events={data.data} />
        </div>
      )}
    </div>
  );
}
