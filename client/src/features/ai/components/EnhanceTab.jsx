import { useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AiField } from './AiField.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';
import { useEnhanceText } from '../hooks/useAi.js';
import { describeAiError } from '../utils/aiErrors.js';
import { MAX_ENHANCE_CHARS, TONES } from '../utils/presets.js';

const FIELDS = ['text', 'mode'];

// Rewrites text the person already has. The original stays on screen beside the result so they can
// see what changed, and nothing touches the event until they choose "Use this text".
export function EnhanceTab({ orgId, initialText = '', eventTitle = '', onUseText }) {
  const [text, setText] = useState(initialText);
  const enhance = useEnhanceText(orgId);
  const { fieldErrors, banner } = describeAiError(enhance.error, FIELDS);

  const tooLong = text.length > MAX_ENHANCE_CHARS;
  const canSend = text.trim().length > 0 && !tooLong && !enhance.isPending;
  const sentMode = enhance.variables?.mode;
  const result = enhance.data?.result;
  const isEmail = sentMode === 'invitation_email';

  function send(mode, { fresh = false } = {}) {
    if (!canSend) return;
    enhance.mutate({ text, mode, ...(eventTitle && { eventTitle }), ...(fresh && { fresh: true }) });
  }

  async function copy() {
    const full = result.subject ? `Subject: ${result.subject}\n\n${result.text}` : result.text;
    try {
      await navigator.clipboard.writeText(full);
      toast.success('Copied to the clipboard');
    } catch {
      toast.error("Couldn't copy automatically", { description: 'Select the text and copy it yourself.' });
    }
  }

  return (
    <div className="space-y-5">
      <AiField
        id="forge-enhance-text"
        label="Text to polish"
        hint="Paste or type an event description, an announcement or a reminder."
        error={tooLong ? `Keep it under ${MAX_ENHANCE_CHARS} characters.` : fieldErrors.text}
        count={text.length}
        max={MAX_ENHANCE_CHARS}
      >
        <Textarea
          id="forge-enhance-text"
          rows={6}
          value={text}
          invalid={Boolean(fieldErrors.text) || tooLong}
          onChange={(event) => setText(event.target.value)}
        />
      </AiField>

      <div role="group" aria-label="How to rewrite it" className="flex flex-wrap gap-3">
        {TONES.map((tone) => (
          <Button
            key={tone.value}
            type="button"
            variant="outline"
            onClick={() => send(tone.value)}
            loading={enhance.isPending && sentMode === tone.value}
            disabled={!canSend && !(enhance.isPending && sentMode === tone.value)}
          >
            {tone.label}
          </Button>
        ))}
      </div>

      <div aria-live="polite">
        {banner && <Alert tone="error">{banner}</Alert>}
        {enhance.isPending && (
          <p role="status" className="text-sm text-(--color-text)/60">
            Rewriting…
          </p>
        )}
        {result && !enhance.isPending && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <section aria-label="Your text" className="rounded-(--ef-radius) border border-(--color-border) p-4">
                <h4 className="text-meta mb-2 text-(--color-text)/60">Before</h4>
                <p className="whitespace-pre-line text-sm leading-relaxed text-(--color-text)/70">{enhance.variables.text}</p>
              </section>
              <section aria-label="ForgeAI's version" className="rounded-(--ef-radius) border border-(--color-accent) bg-(--color-surface) p-4">
                <h4 className="text-meta mb-2 text-(--color-accent)">After</h4>
                {result.subject && (
                  <p className="mb-2 text-sm">
                    <span className="text-(--color-text)/60">Subject: </span>
                    <span className="font-medium">{result.subject}</span>
                  </p>
                )}
                <p className="whitespace-pre-line text-sm leading-relaxed">{result.text}</p>
              </section>
            </div>
            <div className="flex flex-wrap gap-3">
              {onUseText && !isEmail && (
                <Button type="button" variant="accent" onClick={() => onUseText(result.text)}>
                  Use this text
                </Button>
              )}
              <Button type="button" variant={onUseText && !isEmail ? 'outline' : 'accent'} onClick={copy}>
                <Copy className="size-4" aria-hidden="true" />
                Copy
              </Button>
              <Button type="button" variant="outline" onClick={() => send(sentMode, { fresh: true })} disabled={!canSend}>
                <RefreshCw className="size-4" aria-hidden="true" />
                Another take
              </Button>
            </div>
            {isEmail && <p className="text-xs text-(--color-text)/50">This is an email to copy into your mail tool. The event description stays as it is.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
