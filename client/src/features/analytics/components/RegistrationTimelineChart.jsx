import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { getChartAccentColor } from '../utils/chartTheme.js';

export function RegistrationTimelineChart({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return <EmptyState title="No registrations yet" />;
  }
  const accent = getChartAccentColor();

  return (
    <div className="border border-(--color-border) p-5">
      <p className="text-meta text-(--color-text)/50 mb-4">Registrations Over Time</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={timeline} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="0" />
          <XAxis
            dataKey="date"
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
