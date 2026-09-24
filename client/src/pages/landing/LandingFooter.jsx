import { Link } from 'react-router-dom';
import { ROUTES } from '../../utils/constants.js';

export function LandingFooter() {
  return (
    <footer className="bg-(--color-text) text-(--color-bg) px-6 sm:px-12 pt-12 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-12 border-b border-(--color-bg)/15 text-meta">
        <span className="text-(--color-bg)/50">&copy; 2026 EventForge</span>
        <div className="flex items-center gap-6">
          <Link to={ROUTES.LOGIN} className="hover:text-(--color-accent)">
            Log in
          </Link>
          <Link to={ROUTES.REGISTER} className="hover:text-(--color-accent)">
            Get started
          </Link>
        </div>
      </div>

      <p
        className="font-black tracking-tight leading-[0.85] pt-8 select-none"
        style={{ fontSize: 'clamp(3.5rem, 14vw, 13rem)' }}
        aria-hidden="true"
      >
        EVENTFORGE
      </p>
    </footer>
  );
}
