import { QuickActionsBar } from './QuickActionsBar.jsx';
import { MyEventsBoard } from './MyEventsBoard.jsx';

export function OrganizerDashboard() {
  return (
    <div>
      <QuickActionsBar />
      <h2 className="text-lg font-semibold mb-4">My Events</h2>
      <MyEventsBoard />
    </div>
  );
}
