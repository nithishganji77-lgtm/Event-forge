import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { AiDisabledState } from './AiDisabledState.jsx';
import { EnhanceTab } from './EnhanceTab.jsx';
import { PlanTab } from './PlanTab.jsx';
import { VenuesTab } from './VenuesTab.jsx';
import { VibeTab } from './VibeTab.jsx';
import { QueryError } from '../../../components/ui/QueryError.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Tabs, panelId, tabId } from '../../../components/ui/Tabs.jsx';
import { useAiStatus } from '../hooks/useAi.js';
import { conceptToPrompt } from '../utils/conceptToPrompt.js';

const TABS = [
  { key: 'plan', label: 'Plan an event' },
  { key: 'vibe', label: "What's the vibe?" },
  { key: 'venues', label: 'Venues' },
  { key: 'polish', label: 'Polish text' },
];
const ID = 'forge-ai';

// Everything ForgeAI does, in one panel, so the header button and the event wizard open the same
// thing and differ only in what they do with a result (the callbacks). All four tabs stay mounted
// so a result is still there after a look at another tab.
//
//   onUseDraft(draft, { venue })   the Plan tab's "Use this draft"
//   onUseVenue(venue)              the Venues tab's "Use as venue" (omit where there is no target)
//   onUseText(text)                the Polish tab's "Use this text" (omit where there is no target)
export function ForgeAiPanel({
  orgId,
  initialTab = 'plan',
  initialPrompt = '',
  polishText = '',
  eventTitle = '',
  replaceWarning = null,
  onUseDraft,
  onUseVenue,
  onUseText,
}) {
  const status = useAiStatus(orgId);
  const [tab, setTab] = useState(initialTab);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [focusToken, setFocusToken] = useState(0);

  if (status.isPending) return <Spinner label="Checking ForgeAI" />;
  if (status.isError) return <QueryError error={status.error} title="Couldn't reach ForgeAI" onRetry={() => status.refetch()} isRetrying={status.isFetching} />;
  if (!status.data?.enabled) return <AiDisabledState />;

  function planConcept(concept) {
    setPrompt(conceptToPrompt(concept));
    setFocusToken((n) => n + 1);
    setTab('plan');
  }

  const panels = {
    plan: <PlanTab orgId={orgId} prompt={prompt} onPromptChange={setPrompt} focusToken={focusToken} replaceWarning={replaceWarning} onUseDraft={onUseDraft} />,
    vibe: <VibeTab orgId={orgId} onPlanConcept={planConcept} />,
    venues: <VenuesTab orgId={orgId} onUseVenue={onUseVenue} />,
    polish: <EnhanceTab orgId={orgId} initialText={polishText} eventTitle={eventTitle} onUseText={onUseText} />,
  };

  return (
    <div>
      <Tabs id={ID} tabs={TABS} active={tab} onChange={setTab} />
      {TABS.map(({ key }) => (
        <div key={key} role="tabpanel" id={panelId(ID, key)} aria-labelledby={tabId(ID, key)} hidden={tab !== key}>
          {panels[key]}
        </div>
      ))}
      <p className="mt-8 flex items-start gap-2 border-t border-(--color-border) pt-4 text-xs text-(--color-text)/55">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          What you type here is sent to Google&apos;s Gemini API. Don&apos;t include confidential or personal information such as
          names, emails or phone numbers. ForgeAI can be wrong, so check what it writes before you publish.
        </span>
      </p>
    </div>
  );
}
