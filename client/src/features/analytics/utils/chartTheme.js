// recharts sets `fill`/`stroke` as plain SVG attributes, not inline `style` declarations — CSS
// custom properties (var(--chart-accent)) don't reliably resolve in that context (confirmed via
// DOM inspection: the <path> had fill="var(--chart-accent)" verbatim, geometry correct, nothing
// visibly painted). Resolving to a literal hex in JS instead sidesteps the issue entirely.
// Values match globals.css's --chart-accent (validated via the dataviz skill's
// validate_palette.js against the OKLCH lightness band per mode: light 0.43-0.77, dark 0.48-0.67
// — the plain #FF5A1F UI accent fails the dark-mode band, hence the separate darker step here).
export function getChartAccentColor() {
  const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDark ? '#E5500F' : '#FF5A1F';
}
