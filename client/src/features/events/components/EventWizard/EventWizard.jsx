import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { eventFormSchema, eventFormDefaults, STEP_FIELDS } from '../../schemas/event.schema.js';
import { useCreateEvent, useUpdateEvent } from '../../hooks/useEventMutations.js';
import { uploadCoverImageRequest, publishEventRequest } from '../../../../services/event.service.js';
import { WizardProgress } from './WizardProgress.jsx';
import { BasicInfoStep } from './steps/BasicInfoStep.jsx';
import { DateVenueStep } from './steps/DateVenueStep.jsx';
import { CapacityStep } from './steps/CapacityStep.jsx';
import { OrganizersStep } from './steps/OrganizersStep.jsx';
import { ReviewStep } from './steps/ReviewStep.jsx';
import { Button } from '../../../../components/ui/Button.jsx';
import { Alert } from '../../../../components/ui/Alert.jsx';
import { extractErrorMessage, getErrorInfo } from '../../../../lib/errors.js';
import { useActiveOrganization } from '../../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../../utils/constants.js';

const STEPS = [
  { key: 'basicInfo', label: 'BASIC INFO', Component: BasicInfoStep },
  { key: 'dateVenue', label: 'DATE & VENUE', Component: DateVenueStep },
  { key: 'capacity', label: 'CAPACITY & REGISTRATION', Component: CapacityStep },
  { key: 'organizers', label: 'ORGANIZERS', Component: OrganizersStep },
  { key: 'review', label: 'REVIEW & PUBLISH', Component: ReviewStep },
];

function toDateInputValue(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toISOString().slice(0, 10);
}

function mapEventToFormValues(event) {
  return {
    title: event.title,
    description: event.description || '',
    category: event.category || 'General',
    startDate: toDateInputValue(event.startDate),
    endDate: toDateInputValue(event.endDate),
    startTime: event.startTime || '',
    endTime: event.endTime || '',
    timezone: event.timezone || 'Asia/Kolkata',
    venue: {
      name: event.venue?.name || '',
      address: event.venue?.address || '',
      room: event.venue?.room || '',
      mapUrl: event.venue?.mapUrl || '',
    },
    capacity: event.capacity,
    registrationDeadline: toDateInputValue(event.registrationDeadline),
    organizers: (event.organizers || []).map(String),
  };
}

// Strips empty-string optional fields the server's z.coerce.date() would otherwise choke on
// (new Date('') is an Invalid Date, which fails validation instead of being treated as absent).
function toApiPayload(values) {
  const payload = { ...values };
  if (!payload.registrationDeadline) delete payload.registrationDeadline;
  return payload;
}

// "Draft" only relaxes publish-readiness, not schema completeness — title/dates/capacity are
// Mongoose-required regardless of status, so every step through Capacity must be filled before
// any save (draft or publish). Submit is 1 call for draft, 2 for publish (create/update, then the
// dedicated publish endpoint reusing its own readiness check).
export function EventWizard({ mode, event }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizationId, organizationSlug } = useActiveOrganization();
  const [currentStep, setCurrentStep] = useState(0);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  // Tracks which specific action is in flight, not a shared boolean — otherwise clicking Publish
  // would also flash a loading spinner on the unrelated Save-as-Draft button (both would derive
  // from the same createEvent/updateEvent .isPending, since persistEvent calls one of those either way).
  const [activeAction, setActiveAction] = useState(null); // 'draft' | 'publish' | null

  const form = useForm({
    resolver: zodResolver(eventFormSchema),
    defaultValues: mode === 'edit' ? mapEventToFormValues(event) : eventFormDefaults,
  });
  const { trigger, handleSubmit } = form;

  const createEvent = useCreateEvent(organizationId);
  const updateEvent = useUpdateEvent(organizationId, event?._id);

  const isLastStep = currentStep === STEPS.length - 1;

  // usePublishEvent isn't used here on purpose: it closes over event?._id at hook-creation time,
  // which is undefined in create mode — it can't target an event that doesn't exist yet. The
  // create-then-publish flow needs the freshly-created id, known only after persistEvent resolves.
  function invalidateEventQueries(eventId) {
    queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'events'] });
    queryClient.invalidateQueries({ queryKey: ['events', eventId] });
  }

  // The server validates everything again. If it objects to a field on an earlier step, mark that
  // field and take the person to the step it is on; otherwise they would be looking at the Review
  // screen with a message about a field they can't see.
  function revealServerErrors(err) {
    const { fieldErrors } = getErrorInfo(err);
    let firstStep = -1;
    for (const [path, message] of Object.entries(fieldErrors)) {
      form.setError(path, { type: 'server', message });
      const stepIndex = STEPS.findIndex((step) => STEP_FIELDS[step.key].some((field) => path === field || path.startsWith(`${field}.`)));
      if (stepIndex !== -1 && (firstStep === -1 || stepIndex < firstStep)) firstStep = stepIndex;
    }
    if (firstStep !== -1) setCurrentStep(firstStep);
  }

  async function goNext() {
    const valid = await trigger(STEP_FIELDS[STEPS[currentStep].key]);
    if (valid) setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  async function persistEvent(values) {
    const payload = toApiPayload(values);
    if (mode === 'edit') {
      return updateEvent.mutateAsync(payload);
    }
    const created = await createEvent.mutateAsync(payload);
    if (coverImageFile) {
      await uploadCoverImageRequest(created._id, coverImageFile).catch(() => {
        toast.error('The event was saved, but its cover image could not be uploaded', {
          description: 'Open the event and try adding the image again.',
        });
      });
    }
    return created;
  }

  const onSaveDraft = handleSubmit(async (values) => {
    setSubmitError(null);
    setActiveAction('draft');
    try {
      const saved = await persistEvent(values);
      toast.success('Draft saved');
      navigate(ROUTES.orgEventEdit(organizationSlug, saved._id), { replace: true });
    } catch (err) {
      setSubmitError(err);
      revealServerErrors(err);
    } finally {
      setActiveAction(null);
    }
  });

  const onPublish = handleSubmit(async (values) => {
    setSubmitError(null);
    setActiveAction('publish');
    let saved;
    try {
      saved = await persistEvent(values);
    } catch (err) {
      setSubmitError(err);
      revealServerErrors(err);
      setActiveAction(null);
      return;
    }

    try {
      await publishEventRequest(saved._id);
      invalidateEventQueries(saved._id);
      navigate(ROUTES.orgEventDetail(organizationSlug, saved._id), { replace: true });
    } catch (err) {
      // The create/update already succeeded — don't orphan the user on a dead page, send them to
      // the now-existing draft's editor instead. A toast (not local state) carries the error,
      // since navigating unmounts this component before any inline Alert could be seen.
      toast.error('The event was saved as a draft, but it could not be published', { description: extractErrorMessage(err) });
      invalidateEventQueries(saved._id);
      navigate(ROUTES.orgEventEdit(organizationSlug, saved._id), { replace: true });
    } finally {
      setActiveAction(null);
    }
  });

  const { Component } = STEPS[currentStep];

  return (
    <FormProvider {...form}>
      <div>
        <WizardProgress steps={STEPS} currentStep={currentStep} />

        {submitError && (
          <Alert tone="error" className="mb-6">
            {extractErrorMessage(submitError, 'The event could not be saved. Please try again.')}
          </Alert>
        )}

        <Component
          eventId={mode === 'edit' ? event._id : undefined}
          coverImageUrl={event?.coverImage}
          onCoverImageFileSelected={setCoverImageFile}
          organizationId={organizationId}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 mt-10 pt-6 border-t border-(--color-border) max-w-xl">
          <Button variant="ghost" onClick={goBack} disabled={currentStep === 0}>
            ← Back
          </Button>

          {isLastStep ? (
            <div className="flex gap-3">
              <Button variant="outline" onClick={onSaveDraft} loading={activeAction === 'draft'} disabled={activeAction === 'publish'}>
                Save as Draft
              </Button>
              {(mode === 'create' || event.status !== 'PUBLISHED') && (
                <Button variant="accent" onClick={onPublish} loading={activeAction === 'publish'} disabled={activeAction === 'draft'}>
                  Publish →
                </Button>
              )}
            </div>
          ) : (
            <Button variant="primary" onClick={goNext}>
              Next →
            </Button>
          )}
        </div>
      </div>
    </FormProvider>
  );
}
