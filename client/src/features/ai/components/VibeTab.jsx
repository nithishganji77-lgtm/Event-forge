import { useState } from 'react';
import { AiField } from './AiField.jsx';
import { ConceptCards } from './ConceptCards.jsx';
import { PromptChips } from './PromptChips.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { useSuggestConcepts } from '../hooks/useAi.js';
import { describeAiError } from '../utils/aiErrors.js';
import { VIBE_PRESETS } from '../utils/presets.js';

const FIELDS = ['vibe', 'department', 'budget'];

export function VibeTab({ orgId, onPlanConcept }) {
  const [vibe, setVibe] = useState('');
  const [department, setDepartment] = useState('');
  const [budget, setBudget] = useState('');
  const concepts = useSuggestConcepts(orgId);
  const { fieldErrors, banner } = describeAiError(concepts.error, FIELDS);

  function suggest(text) {
    if (!text.trim() || concepts.isPending) return;
    concepts.mutate({
      vibe: text,
      ...(department.trim() && { department }),
      ...(budget.trim() && { budget }),
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <AiField id="forge-vibe-department" label="Team or department (optional)" error={fieldErrors.department}>
          <Input id="forge-vibe-department" value={department} maxLength={60} placeholder="e.g. Engineering" onChange={(e) => setDepartment(e.target.value)} />
        </AiField>
        <AiField id="forge-vibe-budget" label="Budget (optional)" error={fieldErrors.budget}>
          <Input id="forge-vibe-budget" value={budget} maxLength={60} placeholder={'e.g. ₹2,00,000'} onChange={(e) => setBudget(e.target.value)} />
        </AiField>
      </div>

      <div>
        <p className="text-meta mb-2">Pick a vibe</p>
        <PromptChips
          label="Vibes"
          chips={VIBE_PRESETS}
          disabled={concepts.isPending}
          onPick={(chip) => {
            setVibe(chip);
            suggest(chip);
          }}
        />
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          suggest(vibe);
        }}
      >
        <AiField id="forge-vibe-text" label="Or describe your own" error={fieldErrors.vibe} className="min-w-0 flex-1">
          <Input id="forge-vibe-text" value={vibe} maxLength={200} placeholder="e.g. Something calm after a hectic release" onChange={(e) => setVibe(e.target.value)} />
        </AiField>
        <Button type="submit" variant="outline" loading={concepts.isPending} disabled={!vibe.trim() && !concepts.isPending} className="mb-6">
          Suggest concepts
        </Button>
      </form>

      <div aria-live="polite">
        {banner && <Alert tone="error">{banner}</Alert>}
        {concepts.isPending && <p role="status" className="text-sm text-(--color-text)/60">Finding three concepts for you…</p>}
        {concepts.data && !concepts.isPending && <ConceptCards concepts={concepts.data.result.concepts} onPlan={onPlanConcept} />}
      </div>
    </div>
  );
}
