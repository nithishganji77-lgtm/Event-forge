import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getChartAccentColor } from '../utils/chartTheme.js';
import { useResolvedTheme } from '../../../hooks/useTheme.js';

// The timeline's dates are UTC calendar days ("2026-09-24"), so they are formatted in UTC too;
// reading them in the viewer's zone would show the previous day west of UTC.
const dayFormat = new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric' });
const formatDay = (value) => dayFormat.format(new Date(`${value}T00:00:00Z`));

export function RegistrationTimelineChart({ timeline }) {
  const accent = getChartAccentColor(useResolvedTheme()); // before the early return: hook order
  const frame = 'rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface) p-5';

  // The frame is always there so the panel never collapses to a blank page: with no data it holds
  // an empty chart (a baseline and gridlines) and says why.
  if (!timeline || timeline.length === 0) {
    return (
      <div className={frame}>
        <p className="text-meta text-(--color-text)/50 mb-4">Registrations Over Time</p>
        <div className="relative h-[220px]">
          <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="border-b border-dashed border-(--color-border)" />
            ))}
          </div>
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-(--color-text)/50">
            No registrations yet. This fills in as people sign up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={frame}>
      <p className="text-meta text-(--color-text)/50 mb-4">Registrations Over Time</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={timeline} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tick={{ fill: 'var(--color-text)', fontSize: 11, opacity: 0.6 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--color-text)', fontSize: 11, opacity: 0.6 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            labelFormatter={formatDay}
            cursor={{ fill: 'var(--color-bg-secondary)' }}
            contentStyle={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 0,
              fontSize: 13,
            }}
          />
          <Bar dataKey="count" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
