import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { ForgeAiModal } from './ForgeAiModal.jsx';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';
import { PERMISSIONS } from '../../../utils/permissions.js';
import { draftToFormPatch } from '../utils/applyDraft.js';

// The app-header entry point. Only people who can create events see it: the server refuses the
// rest, and there would be nothing for them to do with a draft. From here there is no form to fill,
// so "Use this draft" opens the new-event wizard with the draft as its starting values.
export function ForgeAiButton() {
  const { organizationId, organizationSlug, permissions } = useActiveOrganization();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!organizationId || !permissions.has(PERMISSIONS.EVENT_CREATE)) return null;

  function openWizardWithDraft(draft, { venue }) {
    setOpen(false);
    navigate(ROUTES.orgEventNew(organizationSlug), { state: { aiDraft: draftToFormPatch(draft, { venue }) } });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open ForgeAI"
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-(--ef-radius-sm) border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm font-medium transition-colors hover:border-(--color-accent) hover:text-(--color-accent) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
      >
        <Sparkles className="size-4 text-(--color-accent)" aria-hidden="true" />
        <span className="hidden sm:inline">ForgeAI</span>
      </button>
      <ForgeAiModal open={open} onClose={() => setOpen(false)} orgId={organizationId} onUseDraft={openWizardWithDraft} />
    </>
  );
}
