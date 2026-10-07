import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { AiField } from './AiField.jsx';
import { DraftPreview } from './DraftPreview.jsx';
import { ForgeAiTransition } from './ForgeAiTransition.jsx';
import { PromptChips } from './PromptChips.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';
import { cn } from '../../../lib/cn.js';
import { useGenerateDraft } from '../hooks/useAi.js';
import { useForgeTransition } from '../hooks/useForgeTransition.js';
import { describeAiError } from '../utils/aiErrors.js';
import { MAX_PROMPT_CHARS, PLAN_PRESETS } from '../utils/presets.js';
import { EVENT_CATEGORIES } from '../../events/schemas/event.schema.js';

const FIELDS = ['prompt', 'category'];
const EASE = [0.22, 1, 0.36, 1];

export function PlanTab({ orgId, prompt, onPromptChange, focusToken, replaceWarning, onUseDraft }) {
  const [category, setCategory] = useState('');
  const draft = useGenerateDraft(orgId);
  const transition = useForgeTransition();
  const reduceMotion = useReducedMotion();
  const textareaRef = useRef(null);
  const buttonRef = useRef(null);
  const resultRef = useRef(null);
  const resultTopRef = useRef(null);
  const { fieldErrors, banner } = describeAiError(draft.error, FIELDS);

  // "Plan this concept" on another tab fills the request and lands here: put the cursor in it.
  useEffect(() => {
    if (focusToken) textareaRef.current?.focus();
  }, [focusToken]);

  // The AI layer has handed back: a draft takes focus and scrolls into view; after an error the
  // banner is already showing and the Draft button is ready for another try.
  useEffect(() => {
    if (transition.phase !== 'done' || draft.isPending) return;
    if (transition.outcome === 'success' && resultRef.current) {
      resultRef.current.focus({ preventScroll: true });
      // Scroll to an untransformed anchor: the result itself is mid-animation (scaled and offset),
      // and scrolling to that box would leave it ~30px too high once it settles.
      resultTopRef.current?.scrollIntoView?.({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    } else {
      buttonRef.current?.focus();
    }
  }, [transition.phase, transition.outcome, draft.isPending, reduceMotion]);

  // `busy` drives what the button shows from the very first frame. Whether another request may start
  // follows the request alone, never the animation: a click is a discrete event, so React re-renders
  // straight after it and the button is already disabled by the time a second click could land.
  const busy = transition.processing || draft.isPending;
  const tooLong = prompt.length > MAX_PROMPT_CHARS;
  const canSend = prompt.trim().length > 0 && !tooLong && !draft.isPending;

  function send({ fresh = false } = {}) {
    if (!canSend) return;
    transition.begin(buttonRef.current);
    draft.mutate(
      { prompt, ...(category && { category }), ...(fresh && { fresh: true }) },
      { onSettled: (_data, error) => transition.settle(error ? 'error' : 'success') }
    );
  }

  const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 };
  const shown = { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, delay: reduceMotion ? 0 : 0.15, ease: EASE } };

  return (
    <>
      <motion.div
        className="space-y-5"
        initial={false}
        animate={{ opacity: transition.processing ? 0.35 : 1, scale: transition.processing && !reduceMotion ? 0.985 : 1 }}
        transition={{ duration: 0.2 }}
      >
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
          <motion.span
            className="mb-6 inline-flex"
            animate={{ scale: busy && !reduceMotion ? 0.98 : 1 }}
            transition={{ duration: 0.15 }}
          >
            <Button ref={buttonRef} type="button" variant="accent" onClick={() => send()} disabled={!canSend} aria-busy={busy}>
              <Sparkles className={cn('size-4', busy && 'animate-pulse')} aria-hidden="true" />
              {/* Both labels share one grid cell, so the button keeps the width of the longer one. */}
              <span className="grid">
                <span className={cn('col-start-1 row-start-1', busy && 'invisible')} aria-hidden={busy || undefined}>
                  Draft with ForgeAI
                </span>
                <span className={cn('col-start-1 row-start-1', !busy && 'invisible')} aria-hidden={!busy || undefined}>
                  ForgeAI is thinking…
                </span>
              </span>
            </Button>
          </motion.span>
        </div>

        <div aria-live="polite">
          {banner && <Alert tone="error">{banner}</Alert>}
          {draft.isPending && (
            <p role="status" className="text-sm text-(--color-text)/60">
              ForgeAI is drafting your event. This usually takes a few seconds.
            </p>
          )}
          {draft.data && !draft.isPending && (
            <>
              <div ref={resultTopRef} className="scroll-mt-6" />
              <motion.div
                ref={resultRef}
                tabIndex={-1}
                className={cn('outline-none', transition.phase === 'done' && transition.outcome === 'success' && 'forge-reveal')}
                initial={hidden}
                animate={transition.processing ? hidden : shown}
              >
                <DraftPreview
                  key={draft.submittedAt}
                  draft={draft.data.result}
                  onUse={onUseDraft}
                  replaceWarning={replaceWarning}
                  onRegenerate={() => send({ fresh: true })}
                />
              </motion.div>
            </>
          )}
        </div>
      </motion.div>
      <ForgeAiTransition active={transition.processing} origin={transition.origin} />
    </>
  );
}
