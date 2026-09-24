import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Reveal } from './Reveal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ROUTES } from '../../utils/constants.js';

// Full-bleed accent band — the one place on the page the brand color fills the whole surface,
// mirroring the restrained "one accent, used sparingly" rule by spending it here.
export function CtaBand() {
  return (
    <section className="bg-(--color-accent) text-(--color-text) px-6 sm:px-12 py-20 sm:py-28">
      <Reveal className="max-w-3xl">
        <p className="text-section font-semibold tracking-tight mb-10">
          Ready to run an event without the group chat spiraling?
        </p>
        {/* Button's own "primary" variant hovers to bg-accent, which would vanish against this
            section's already-accent-orange background — overridden to hover to near-black
            instead, the one combination that stays visible on this specific surface. */}
        <Button
          as={Link}
          to={ROUTES.REGISTER}
          variant="primary"
          size="lg"
          className="group overflow-hidden hover:!bg-black hover:!text-white"
        >
          <span className="inline-flex items-center gap-2">
            <span className="transition-transform duration-300 ease-in-out group-hover:translate-x-1">
              Create your organization
            </span>
            <ChevronRight
              className="size-4 transition-transform duration-300 ease-in-out group-hover:-translate-x-1"
              aria-hidden="true"
            />
          </span>
        </Button>
      </Reveal>
    </section>
  );
}
