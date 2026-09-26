import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AiField } from './AiField.jsx';
import { DraftPreview } from './DraftPreview.jsx';
import { PromptChips } from './PromptChips.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';
import { useGenerateDraft } from '../hooks/useAi.js';
import { describeAiError } from '../utils/aiErrors.js';
import { MAX_PROMPT_CHARS, PLAN_PRESETS } from '../utils/presets.js';
import { EVENT_CATEGORIES } from '../../events/schemas/event.schema.js';

const FIELDS = ['prompt', 'category'];

export function PlanTab({ orgId, prompt, onPromptChange, focusToken, replaceWarning, onUseDraft }) {
  const [category, setCategory] = useState('');
  const draft = useGenerateDraft(orgId);
  const textareaRef = useRef(null);
  const { fieldErrors, banner } = describeAiError(draft.error, FIELDS);

  // "Plan this concept" on another tab fills the request and lands here: put the cursor in it.
  useEffect(() => {
    if (focusToken) textareaRef.current?.focus();
  }, [focusToken]);

  const tooLong = prompt.length > MAX_PROMPT_CHARS;
  const canSend = prompt.trim().length > 0 && !tooLong && !draft.isPending;

  function send({ fresh = false } = {}) {
    if (!canSend) return;
    draft.mutate({ prompt, ...(category && { category }), ...(fresh && { fresh: true }) });
  }

  return (
    <div className="space-y-5">
      <AiField
        id="forge-plan-prompt"
        label="Describe the event"
        hint="Say who it is for, how many people, where, the budget and what should happen. Ctrl or ⌘ + Enter to send."
        error={tooLong ? `Keep it under ${MAX_PROMPT_CHARS} characters.` : fieldErrors.prompt}
        count={prompt.length}
        max={MAX_PROMPT_CHARS}
      >
        <Textarea
          id="forge-plan-prompt"
          ref={textareaRef}
          rows={4}
          value={prompt}
          invalid={Boolean(fieldErrors.prompt) || tooLong}
          placeholder="e.g. Plan a 2-day technical hackathon for 40 engineers in Bangalore with a ₹5,00,000 budget, including keynotes and evening networking."
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              send();
            }
          }}
        />
      </AiField>

      <PromptChips
        label="Starting points"
        chips={PLAN_PRESETS}
        onPick={(preset) => {
          onPromptChange(preset.prompt);
          textareaRef.current?.focus();
        }}
      />

      <div className="flex flex-wrap items-end gap-4">
        <AiField id="forge-plan-category" label="Category (optional)" className="w-full sm:w-56">
          <Select id="forge-plan-category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Let ForgeAI choose</option>
            {EVENT_CATEGORIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </AiField>
        <Button type="button" variant="accent" onClick={() => send()} loading={draft.isPending} disabled={!canSend && !draft.isPending} className="mb-6">
          <Sparkles className="size-4" aria-hidden="true" />
          {draft.isPending ? 'Planning…' : 'Draft with ForgeAI'}
        </Button>
      </div>

      <div aria-live="polite">
        {banner && <Alert tone="error">{banner}</Alert>}
        {draft.isPending && (
          <p role="status" className="text-sm text-(--color-text)/60">
            ForgeAI is drafting your event. This usually takes a few seconds.
          </p>
        )}
        {draft.data && !draft.isPending && (
          <DraftPreview
            key={draft.submittedAt}
            draft={draft.data.result}
            onUse={onUseDraft}
            replaceWarning={replaceWarning}
            onRegenerate={() => send({ fresh: true })}
          />
        )}
      </div>
    </div>
  );
}
