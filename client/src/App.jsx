import { Toaster } from 'sonner';
import { AppRouter } from './routes/AppRouter.jsx';

export default function App() {
  return (
    <>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </>
  );
}
