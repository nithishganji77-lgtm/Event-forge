// Section marker — just the label, no numbering (dropped per feedback: the "01 / HERO"
// index was more clutter than signal once actually seen on the page).
export function SectionEyebrow({ label, light = false }) {
  return (
    <p className={`text-meta mb-4 ${light ? 'text-(--color-bg)/50' : 'text-(--color-text)/50'}`}>
      {label}
    </p>
  );
}
