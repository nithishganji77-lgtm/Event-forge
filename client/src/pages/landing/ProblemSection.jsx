import { Reveal } from './Reveal.jsx';
import { SectionEyebrow } from './SectionEyebrow.jsx';
import { cn } from '../../lib/cn.js';

const PROBLEMS = [
  {
    number: '01',
    heading: 'Registrations scattered everywhere',
    body: "Spreadsheets, email threads, and sign-up forms that don't talk to each other — nobody has one real headcount.",
    tone: 'neutral',
  },
  {
    number: '02',
    heading: "No visibility once an event is live",
    body: "Who's actually coming? Who's on the waitlist? Without a shared system, that answer lives in someone's inbox.",
    tone: 'dark',
  },
  {
    number: '03',
    heading: 'Manual waitlists, manual chaos',
    body: 'A cancellation should promote the next person automatically — not wait for someone to notice and email around.',
    tone: 'accent',
  },
];

const TONE_STYLES = {
  neutral: { card: 'bg-(--color-bg-secondary)', numeral: 'text-(--color-text)/10' },
  dark: { card: 'bg-(--color-text) text-(--color-bg)', numeral: 'text-(--color-bg)/10' },
  accent: { card: 'bg-(--color-accent) text-(--color-text)', numeral: 'text-(--color-text)/15' },
};

export function ProblemSection() {
  return (
    <section className="px-6 sm:px-12 py-20 sm:py-28">
      <Reveal>
        <SectionEyebrow label="THE PROBLEM" />
        <h2 className="text-section font-semibold tracking-tight max-w-2xl mb-14 sm:mb-20">
          Sound familiar?
        </h2>
      </Reveal>

      <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
        {PROBLEMS.map((problem, index) => {
          const tone = TONE_STYLES[problem.tone];
          return (
            <Reveal key={problem.number} delay={index * 0.08} className="h-full">
              <div className={cn('relative overflow-hidden h-full p-6 sm:p-8 flex flex-col justify-between min-h-[22rem]', tone.card)}>
                <span
                  className={cn('absolute -top-4 -right-2 font-black leading-none select-none', tone.numeral)}
                  style={{ fontSize: 'clamp(6rem, 12vw, 9rem)' }}
                  aria-hidden="true"
                >
                  {problem.number}
                </span>
                <div className="relative">
                  <p className="text-meta opacity-60 mb-4">{problem.number}</p>
                  <h3 className="text-xl font-semibold mb-3 max-w-[14rem]">{problem.heading}</h3>
                </div>
                <p className="relative text-sm opacity-80 max-w-xs">{problem.body}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
