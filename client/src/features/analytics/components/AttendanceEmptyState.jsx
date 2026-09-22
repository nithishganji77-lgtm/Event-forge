export function AttendanceEmptyState() {
  return (
    <p className="text-sm text-(--color-text)/50 border border-dashed border-(--color-border) px-4 py-6 text-center">
      Not enough attendance data yet — mark attendees as Attended or No-show from an event's
      Attendees tab to see this rate.
    </p>
  );
}
