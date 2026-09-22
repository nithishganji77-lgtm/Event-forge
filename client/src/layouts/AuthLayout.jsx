import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo.jsx';
import { ROUTES } from '../utils/constants.js';

export function AuthLayout({ eyebrow = 'WELCOME', title, children }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-(--color-bg) text-(--color-text)">
      <div className="hidden lg:flex flex-col justify-between border-r border-(--color-border) p-12 bg-(--color-bg-secondary)">
        <Link to={ROUTES.HOME}>
          <Logo />
        </Link>

        <motion.h1
          initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.5 }}
          className="font-semibold leading-[0.95]"
          style={{ fontSize: 'clamp(2.75rem, 4.5vw, 4.5rem)' }}
        >
          EVENTS,
          <br />
          ENGINEERED
          <br />
          FOR PEOPLE.
        </motion.h1>

        <p className="text-meta text-(--color-text)/60 max-w-xs">
          Plan, publish and coordinate corporate events from one intelligent workspace.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <Link to={ROUTES.HOME} className="lg:hidden block mb-10">
            <Logo />
          </Link>

          <p className="text-meta text-(--color-text)/50 mb-2">{eyebrow}</p>
          <h2 className="text-2xl font-semibold mb-8">{title}</h2>

          {children}
        </div>
      </div>
    </div>
  );
}
