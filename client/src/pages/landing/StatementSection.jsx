import { Reveal } from './Reveal.jsx';
import { SectionEyebrow } from './SectionEyebrow.jsx';

// Beat 3: huge whitespace, then one large statement — the page's quietest, most confident moment.
export function StatementSection() {
  return (
    <section className="px-6 sm:px-12 py-32 sm:py-48">
      <Reveal>
        <SectionEyebrow label="WHO WE ARE" />
      </Reveal>

      <Reveal delay={0.1}>
        <p className="text-section font-semibold tracking-tight max-w-4xl">
          We build for the person who ends up owning the event —
          <span className="text-(--color-text)/40"> not the tool that promised to.</span>
        </p>
      </Reveal>
    </section>
  );
}
