import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '../components/ui/Button.jsx';
import { Logo } from '../components/Logo.jsx';
import { ROUTES } from '../utils/constants.js';

// Placeholder landing page establishing the visual identity for Phase 1. The full editorial,
// scroll-cinematic landing experience (problem/platform/preview/how-it-works/RBAC/final-CTA
// sections) is substantial standalone work, scoped for a later, dedicated pass.
export function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-(--color-bg) text-(--color-text)">
      <nav className="flex items-center justify-between px-6 sm:px-12 py-6 border-b border-(--color-border)">
        <Logo />
        <div className="flex items-center gap-6">
          <Link to={ROUTES.LOGIN} className="text-meta hover:text-(--color-accent)">
            Login
          </Link>
          <Button as={Link} to={ROUTES.REGISTER} variant="accent" size="sm">
            Get Started
          </Button>
        </div>
      </nav>

      <main className="px-6 sm:px-12 py-24 sm:py-32">
        <motion.h1
          initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6 }}
          className="font-semibold leading-[0.95] mb-8"
          style={{ fontSize: 'clamp(3rem, 9vw, 9rem)' }}
        >
          EVENTS,
          <br />
          ENGINEERED
          <br />
          <span className="text-(--color-accent)">FOR PEOPLE.</span>
        </motion.h1>

        <p className="max-w-md text-lg text-(--color-text)/70 mb-10">
          Plan, publish and coordinate corporate events from one intelligent workspace.
        </p>

        <div className="flex flex-wrap gap-4">
          <Button as={Link} to={ROUTES.REGISTER} variant="accent" size="lg">
            BUILD YOUR EVENT →
          </Button>
        </div>
      </main>

      <footer className="px-6 sm:px-12 py-8 border-t border-(--color-border) text-meta text-(--color-text)/50">
        © 2026 EventForge
      </footer>
    </div>
  );
}
