import { Crown, Settings, CalendarDays, Users } from 'lucide-react';
import { Reveal } from './Reveal.jsx';
import { SectionEyebrow } from './SectionEyebrow.jsx';

const ROLES = [
  { icon: Crown, name: 'Owner', body: 'Full control of the organization, including the calls no one else should be able to make.' },
  { icon: Settings, name: 'Admin', body: 'Runs day-to-day operations across every event and every member.' },
  { icon: CalendarDays, name: 'Organizer', body: 'Builds and manages the events they own — nothing more, nothing less.' },
  { icon: Users, name: 'Employee', body: 'Discovers events, registers, and keeps track of their own schedule.' },
];

// Beat 6: full-bleed dark section — the sharpest contrast on the page, reserved for the
// argument that actually differentiates the product (real, granular, additive permissions).
export function RolesSection() {
  return (
    <section className="bg-(--color-text) text-(--color-bg) px-6 sm:px-12 py-20 sm:py-28">
      <Reveal>
        <SectionEyebrow label="WHY US" light />
        <h2 className="text-section font-semibold tracking-tight max-w-2xl mb-6">
          Permissions that match how your org actually works.
        </h2>
        <p className="max-w-md text-(--color-bg)/60 mb-16 sm:mb-20">
          Four roles, and every custom grant is additive on top of them — never a reason to
          invent a new role just to hand someone one extra permission.
        </p>
      </Reveal>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
        {ROLES.map((role, index) => (
          <Reveal key={role.name} delay={index * 0.08}>
            <role.icon className="size-6 mb-5 text-(--color-accent)" aria-hidden="true" />
            <h3 className="text-lg font-semibold mb-2">{role.name}</h3>
            <p className="text-sm text-(--color-bg)/60">{role.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
