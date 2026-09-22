import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Separate from vite.config.js on purpose: that file also wires @tailwindcss/vite, which does
// real CSS-scanning work that's pure overhead for jsdom unit tests asserting on className strings,
// not computed styles.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: false, // explicit `import { describe, it, expect } from 'vitest'` per file, matching
                     // this codebase's existing explicit-import style everywhere else
    css: false,
  },
});
