import { Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants.js';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-(--color-bg) text-(--color-text) px-6 text-center">
      <p className="text-meta text-(--color-text)/50 mb-4">404</p>
      <h1 className="font-semibold leading-[0.95] mb-6" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
        THIS PAGE
        <br />
        DOESN&rsquo;T EXIST.
      </h1>
      <Link to={ROUTES.HOME} className="text-meta border-b border-(--color-accent) text-(--color-accent) pb-1">
        ← BACK TO HOME
      </Link>
    </div>
  );
}
