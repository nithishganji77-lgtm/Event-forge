import { Toaster } from 'sonner';
import { AppRouter } from './routes/AppRouter.jsx';
import { useResolvedTheme } from './hooks/useTheme.js';

export default function App() {
  const theme = useResolvedTheme();

  return (
    <>
      <AppRouter />
      <Toaster position="top-right" richColors theme={theme} />
    </>
  );
}
