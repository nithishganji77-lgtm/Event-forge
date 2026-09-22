import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getChartAccentColor } from '../utils/chartTheme.js';

// Single series (one metric — registration count — compared across event identities), so no
// legend box per the dataviz skill (title already says what's plotted). Bar spec: <=24px thick,
// 4px rounded top corners, square baseline. Gridlines hairline + recessive.
export function RegistrationsChart({ mostPopularEvents }) {
  const data = mostPopularEvents.map((p) => ({
    title: p.event?.title || 'Untitled',
    registrations: p.registeredCount,
  }));
  const accent = getChartAccentColor();

  return (
    <div className="border border-(--color-border) p-5">
      <p className="text-meta text-(--color-text)/50 mb-4">Most Popular Events</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="0" />
          <XAxis
            dataKey="title"
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
          <Bar dataKey="registrations" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
