import { Reveal } from './Reveal.jsx';
import { SectionEyebrow } from './SectionEyebrow.jsx';

// Deliberately not a grid of identical cards — five full-width rows, alternating alignment,
// each its own beat rather than a repeated box shape.
const CHANGES = [
  {
    number: '01',
    heading: 'PLAN IN MINUTES',
    body: 'A five-step wizard turns an idea into a published event — save a draft, come back later, publish when it’s ready.',
    align: 'left',
  },
  {
    number: '02',
    heading: 'FILL THE ROOM',
    body: 'Capacity and waitlists manage themselves. A cancellation promotes the next person automatically — no one has to notice.',
    align: 'right',
  },
  {
    number: '03',
    heading: "SEE WHAT'S REAL",
    body: "Role-aware dashboards and analytics — organizers see their own events, admins see the org, and nothing is a hardcoded number.",
    align: 'left',
  },
  {
    number: '04',
    heading: 'KEEP EVERYONE IN THE LOOP',
    body: 'Notifications go to the right people for the right reason — a publish, a registration, a closing deadline.',
    align: 'right',
  },
  {
    number: '05',
    heading: 'NEVER LOSE THE THREAD',
    body: 'Every change is logged — searchable, filterable, and never a mystery when someone asks "who did this?"',
    align: 'left',
  },
];

export function ChangesSection() {
  return (
    <section className="px-6 sm:px-12 py-20 sm:py-28">
      <Reveal>
        <SectionEyebrow label="WHAT CHANGES" />
        <h2 className="text-section font-semibold tracking-tight max-w-2xl mb-16 sm:mb-24">
          What you get instead.
        </h2>
      </Reveal>

      <div className="divide-y divide-(--color-border)">
        {CHANGES.map((change, index) => (
          <Reveal key={change.number} delay={index * 0.05} className="py-10 sm:py-14">
            <div
              className={`flex flex-col sm:flex-row gap-4 sm:gap-16 ${
                change.align === 'right' ? 'sm:flex-row-reverse sm:text-right' : ''
              }`}
            >
              <div className="sm:w-40 shrink-0">
                <span className="text-meta text-(--color-text)/40">{change.number}</span>
              </div>
              <div className={`flex-1 max-w-2xl ${change.align === 'right' ? 'sm:ml-auto' : ''}`}>
                <h3 className="text-2xl sm:text-4xl font-bold tracking-tight mb-4">{change.heading}</h3>
                <p className={`text-(--color-text)/60 max-w-md ${change.align === 'right' ? 'sm:ml-auto' : ''}`}>
                  {change.body}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
