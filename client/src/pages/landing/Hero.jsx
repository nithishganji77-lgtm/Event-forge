import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '../../components/ui/Button.jsx';
import { ROUTES } from '../../utils/constants.js';

// Beat 1 of the page's rhythm: HUGE TEXT. Everything else on the page is quieter than this.
export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative px-6 sm:px-12 pt-16 pb-28 sm:pt-20 sm:pb-40 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.6 }}
      >
        

        <h1 className="text-hero font-semibold tracking-tight max-w-5xl">
          We plan,{' '}
          <span
            className="text-(--color-text) px-1 sm:px-1.5 bg-no-repeat bg-[linear-gradient(var(--color-accent),var(--color-accent))] bg-size-[100%_0.72em] bg-position-[0_58%]"
          >
            publish
          </span>
          ,
          <br />
          and fill the room
          <br />
          for corporate teams.
        </h1>

        <p className="mt-8 max-w-md text-lg text-(--color-text)/70">
          One workspace for organizations, events, registrations and the people who run them —
          role-based, real-time, and honest about what's actually happening.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Button as={Link} to={ROUTES.REGISTER} variant="primary" size="lg" className="group overflow-hidden">
            <span className="inline-flex items-center gap-2">
              <span className="transition-transform duration-300 ease-in-out group-hover:translate-x-1">
                Get started
              </span>
              <ChevronRight
                className="size-4 transition-transform duration-300 ease-in-out group-hover:-translate-x-1"
                aria-hidden="true"
              />
            </span>
          </Button>
          <Button as={Link} to={ROUTES.LOGIN} variant="ghost" size="lg">
            Log in
          </Button>
        </div>
      </motion.div>

      <div className="hidden sm:flex items-center gap-2 absolute bottom-10 left-12 text-meta text-(--color-text)/40">
        Scroll
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </div>
    </section>
  );
}
