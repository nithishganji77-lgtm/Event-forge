import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { FormField } from '../../../../../components/ui/FormField.jsx';
import { Label } from '../../../../../components/ui/Label.jsx';
import { Textarea } from '../../../../../components/ui/Textarea.jsx';
import { Select } from '../../../../../components/ui/Select.jsx';
import { Button } from '../../../../../components/ui/Button.jsx';
import { CoverImageUpload } from '../../CoverImageUpload.jsx';
import { ForgeAiModal } from '../../../../ai/components/ForgeAiModal.jsx';
import { draftToFormPatch } from '../../../../ai/utils/applyDraft.js';
import { useActiveOrganization } from '../../../../../hooks/useActiveOrganization.js';
import { PERMISSIONS } from '../../../../../utils/permissions.js';
import { EVENT_CATEGORIES } from '../../../schemas/event.schema.js';

// A value ForgeAI wrote is a suggestion the person will edit: mark it dirty, and re-validate only the
// fields on this step (the rest are on steps that may not be mounted).
const FILL = { shouldDirty: true };
const FILL_AND_VALIDATE = { shouldDirty: true, shouldValidate: true };

export function BasicInfoStep({ eventId, coverImageUrl, onCoverImageFileSelected, organizationId, aiPrefilled = false }) {
  const { register, setValue, getValues, formState: { errors } } = useFormContext();
  const { permissions } = useActiveOrganization();
  const canUseAi = Boolean(organizationId) && permissions.has(PERMISSIONS.EVENT_CREATE);
  const isNew = !eventId;

  const [aiOpen, setAiOpen] = useState(false);
  // Kept after the modal closes: it is still on screen while it animates out.
  const [aiContext, setAiContext] = useState({ tab: 'plan', polishText: '', eventTitle: '', replaceWarning: null });

  function openAi(tab) {
    const { title = '', description = '' } = getValues();
    setAiContext({
      tab,
      polishText: description,
      eventTitle: title,
      replaceWarning:
        title.trim() || description.trim() ? 'This replaces the name and description you have already written.' : null,
    });
    setAiOpen(true);
  }

  function applyDraft(draft, { venue }) {
    // The start date lives on the next step, but the form holds one set of values for all of them.
    const patch = draftToFormPatch(draft, { venue, startDate: getValues('startDate') });
    setValue('title', patch.title, FILL_AND_VALIDATE);
    setValue('description', patch.description, FILL_AND_VALIDATE);
    setValue('category', patch.category, FILL_AND_VALIDATE);
    setValue('capacity', patch.capacity, FILL);
    if (patch.venue) setValue('venue.name', patch.venue.name, FILL);
    if (patch.registrationDeadline) setValue('registrationDeadline', patch.registrationDeadline, FILL);
    setAiOpen(false);
    toast.success('ForgeAI filled in the event', { description: 'Check each step before you publish.' });
  }

  function applyVenue(venue) {
    setValue('venue.name', venue.name, FILL);
    setAiOpen(false);
    toast.success('Venue name filled in', { description: 'Add the address on the Date & Venue step.' });
  }

  function applyText(text) {
    setValue('description', text, FILL_AND_VALIDATE);
    setAiOpen(false);
  }

  return (
    <div className="space-y-5 max-w-xl">
      {canUseAi && isNew && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface) p-4">
          <p className="min-w-0 flex-1 text-sm text-(--color-text)/75">
            {aiPrefilled
              ? 'Filled in by ForgeAI. Check every step before you publish.'
              : 'Describe the event and ForgeAI drafts the name, description, capacity and schedule.'}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => openAi('plan')}>
            <Sparkles className="size-4 text-(--color-accent)" aria-hidden="true" />
            Draft with ForgeAI
          </Button>
        </div>
      )}

      <FormField label="Event name" register={register('title')} error={errors.title?.message} />

      <div>
        <FormField
          as={Textarea}
          label="Description"
          register={register('description')}
          error={errors.description?.message}
        />
        {canUseAi && (
          <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={() => openAi('polish')}>
            <Sparkles className="size-4 text-(--color-accent)" aria-hidden="true" />
            Polish with ForgeAI
          </Button>
        )}
      </div>

      <FormField
        as={Select}
        label="Category"
        register={register('category')}
        error={errors.category?.message}
      >
        {EVENT_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </FormField>

      <div>
        <Label>Cover image</Label>
        <CoverImageUpload
          eventId={eventId}
          currentUrl={coverImageUrl}
          onFileSelected={onCoverImageFileSelected}
        />
      </div>

      {canUseAi && (
        <ForgeAiModal
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          orgId={organizationId}
          initialTab={aiContext.tab}
          polishText={aiContext.polishText}
          eventTitle={aiContext.eventTitle}
          replaceWarning={isNew ? aiContext.replaceWarning : null}
          onUseDraft={isNew ? applyDraft : undefined}
          onUseVenue={applyVenue}
          onUseText={applyText}
        />
      )}
    </div>
  );
}
