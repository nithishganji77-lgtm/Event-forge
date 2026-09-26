import { Sparkles } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';

// Shown instead of the panel when the server has no Gemini key. The app works without ForgeAI, so
// this is an explanation and not an error.
export function AiDisabledState() {
  return (
    <EmptyState
      icon={Sparkles}
      title="ForgeAI isn't set up yet"
      description="An admin needs to add a Gemini API key (GEMINI_API_KEY) to the server and restart it. Until then, everything else in EventForge works as usual."
    />
  );
}
