import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Logo } from '../components/Logo.jsx';
import { ROUTES } from '../utils/constants.js';
import { Hero } from './landing/Hero.jsx';
import { OurWorkSection } from './landing/OurWorkSection.jsx';
import { StatementSection } from './landing/StatementSection.jsx';
import { ProblemSection } from './landing/ProblemSection.jsx';
import { ChangesSection } from './landing/ChangesSection.jsx';
import { RolesSection } from './landing/RolesSection.jsx';
import { CtaBand } from './landing/CtaBand.jsx';
import { LandingFooter } from './landing/LandingFooter.jsx';

// Editorial, scroll-cinematic landing page: six numbered sections (01/HERO through 06/WHY US),
// each a deliberately different visual beat — huge type, then quiet text + a horizontal graphic,
// then whitespace + one large statement, then dense numbered blocks, then alternating editorial
// rows (not a repeated card grid), then a full-bleed dark section — closing on an accent CTA band
// and an oversized footer wordmark.
export function LandingPage() {
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

      <main>
        <Hero />
        <OurWorkSection />
        <StatementSection />
        <ProblemSection />
        <ChangesSection />
        <RolesSection />
        <CtaBand />
      </main>

      <LandingFooter />
    </div>
  );
}
