import { useFormContext } from 'react-hook-form';

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-(--color-border) text-sm">
      <span className="text-(--color-text)/50">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export function ReviewStep() {
  const { watch } = useFormContext();
  const values = watch();

  return (
    <div className="max-w-xl">
      <p className="text-meta text-(--color-text)/50 mb-4">Review</p>
      <div className="border border-(--color-border) p-5">
        <Row label="Title" value={values.title} />
        <Row label="Category" value={values.category} />
        <Row label="Start" value={`${values.startDate} ${values.startTime || ''}`.trim()} />
        <Row label="End" value={`${values.endDate} ${values.endTime || ''}`.trim()} />
        <Row label="Venue" value={values.venue?.name} />
        <Row label="Capacity" value={values.capacity} />
        <Row label="Registration deadline" value={values.registrationDeadline} />
        <Row label="Organizers" value={values.organizers?.length ? `${values.organizers.length} assigned` : ''} />
      </div>
    </div>
  );
}
