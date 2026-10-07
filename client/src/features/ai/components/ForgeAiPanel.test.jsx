import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { server } from '../../../../tests/mocks/server.js';
import { createTestQueryClient } from '../../../../tests/test-utils.jsx';
import {
  aiFailure,
  aiStatus,
  aiTask,
  conceptsResult,
  draftResult,
  emailResult,
  enhanceResult,
  venuesResult,
} from '../../../../tests/fixtures/ai.js';
import { ForgeAiPanel } from './ForgeAiPanel.jsx';

function renderPanel(props = {}) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <ForgeAiPanel orgId="org-1" onUseDraft={vi.fn()} {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const promptBox = () => screen.getByLabelText('Describe the event');

describe('ForgeAiPanel', () => {
  it('says ForgeAI is not set up when the server has no key, and offers nothing to click', async () => {
    server.use(aiStatus('org-1', false));
    renderPanel();

    expect(await screen.findByText("ForgeAI isn't set up yet")).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('shows a way to retry when the status cannot be loaded', async () => {
    server.use(
      http.get('http://localhost:4000/api/v1/organizations/org-1/ai/status', () =>
        HttpResponse.json({ success: false, error: { message: 'Down.' } }, { status: 503 })
      )
    );
    renderPanel();

    expect(await screen.findByText("Couldn't reach ForgeAI")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows the four tabs and the privacy notice', async () => {
    server.use(aiStatus('org-1'));
    renderPanel();

    for (const name of ['Plan an event', "What's the vibe?", 'Venues', 'Polish text']) {
      expect(await screen.findByRole('tab', { name })).toBeInTheDocument();
    }
    expect(screen.getByText(/sent to Google's Gemini API/i)).toBeInTheDocument();
  });

  describe('Plan an event', () => {
    it('sends the request, shows the draft, and hands it back with the venue that was picked', async () => {
      const user = userEvent.setup();
      const bodies = [];
      const onUseDraft = vi.fn();
      server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult, { record: (b) => bodies.push(b) }));
      renderPanel({ onUseDraft });

      await user.type(await screen.findByLabelText('Describe the event'), 'A hackathon for 40 engineers');
      await user.click(screen.getByRole('button', { name: /draft with forgeai/i }));

      expect(await screen.findByRole('heading', { name: draftResult.title })).toBeInTheDocument();
      expect(bodies).toEqual([{ prompt: 'A hackathon for 40 engineers' }]);
      expect(screen.getByText('Welcome and kickoff')).toBeInTheDocument();
      expect(screen.getByText('Day 2')).toBeInTheDocument();

      await user.click(screen.getAllByRole('button', { name: 'Use as venue' })[0]);
      expect(screen.getByRole('button', { name: 'Selected as venue' })).toHaveAttribute('aria-pressed', 'true');
      await user.click(screen.getByRole('button', { name: 'Use this draft' }));

      expect(onUseDraft).toHaveBeenCalledWith(draftResult, { venue: draftResult.venueIdeas[0] });
    });

    it('passes no venue when none was picked', async () => {
      const user = userEvent.setup();
      const onUseDraft = vi.fn();
      server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult));
      renderPanel({ onUseDraft });

      await user.type(await screen.findByLabelText('Describe the event'), 'A hackathon');
      await user.click(screen.getByRole('button', { name: /draft with forgeai/i }));
      await user.click(await screen.findByRole('button', { name: 'Use this draft' }));

      expect(onUseDraft).toHaveBeenCalledWith(draftResult, { venue: null });
    });

    it('sends on Ctrl+Enter', async () => {
      const user = userEvent.setup();
      const bodies = [];
      server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult, { record: (b) => bodies.push(b) }));
      renderPanel();

      await user.type(await screen.findByLabelText('Describe the event'), 'A town hall{Control>}{Enter}{/Control}');

      await screen.findByRole('heading', { name: draftResult.title });
      expect(bodies).toEqual([{ prompt: 'A town hall' }]);
    });

    it('fills the request from a preset without sending it', async () => {
      const user = userEvent.setup();
      const bodies = [];
      server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult, { record: (b) => bodies.push(b) }));
      renderPanel();

      await user.click(await screen.findByRole('button', { name: 'Plan Team Offsite' }));

      expect(promptBox().value).toMatch(/team offsite/i);
      expect(bodies).toEqual([]);
    });

    it('includes the chosen category', async () => {
      const user = userEvent.setup();
      const bodies = [];
      server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult, { record: (b) => bodies.push(b) }));
      renderPanel();

      await user.type(await screen.findByLabelText('Describe the event'), 'A workshop');
      await user.selectOptions(screen.getByLabelText('Category (optional)'), 'Workshop');
      await user.click(screen.getByRole('button', { name: /draft with forgeai/i }));

      await screen.findByRole('heading', { name: draftResult.title });
      expect(bodies).toEqual([{ prompt: 'A workshop', category: 'Workshop' }]);
    });

    it('counts characters and will not send a request over the limit', async () => {
      const user = userEvent.setup();
      server.use(aiStatus('org-1'));
      renderPanel();

      await user.click(await screen.findByLabelText('Describe the event'));
      await user.paste('a'.repeat(501));

      expect(screen.getByText('501/500')).toBeInTheDocument();
      expect(screen.getByText('Keep it under 500 characters.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /draft with forgeai/i })).toBeDisabled();
    });

    it('does not send an empty request', async () => {
      server.use(aiStatus('org-1'));
      renderPanel();

      expect(await screen.findByRole('button', { name: /draft with forgeai/i })).toBeDisabled();
    });

    it('asks for another take with fresh: true', async () => {
      const user = userEvent.setup();
      const bodies = [];
      server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult, { record: (b) => bodies.push(b) }));
      renderPanel();

      await user.type(await screen.findByLabelText('Describe the event'), 'A town hall');
      await user.click(screen.getByRole('button', { name: /draft with forgeai/i }));
      await user.click(await screen.findByRole('button', { name: /another take/i }));

      await waitFor(() => expect(bodies).toHaveLength(2));
      expect(bodies[0]).toEqual({ prompt: 'A town hall' });
      expect(bodies[1]).toEqual({ prompt: 'A town hall', fresh: true });
    });

    it('asks before replacing what the person already wrote, and can be told to keep it', async () => {
      const user = userEvent.setup();
      const onUseDraft = vi.fn();
      server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult));
      renderPanel({ onUseDraft, replaceWarning: 'This replaces the name and description you have already written.' });

      await user.type(await screen.findByLabelText('Describe the event'), 'A town hall');
      await user.click(screen.getByRole('button', { name: /draft with forgeai/i }));
      await user.click(await screen.findByRole('button', { name: 'Use this draft' }));

      expect(onUseDraft).not.toHaveBeenCalled();
      expect(screen.getByRole('status')).toHaveTextContent('replaces the name and description');

      await user.click(screen.getByRole('button', { name: 'Keep what I wrote' }));
      expect(onUseDraft).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Use this draft' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Use this draft' }));
      await user.click(screen.getByRole('button', { name: 'Replace and use this draft' }));
      expect(onUseDraft).toHaveBeenCalledTimes(1);
    });

    it('does not ask when there is nothing to replace', async () => {
      const user = userEvent.setup();
      const onUseDraft = vi.fn();
      server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult));
      renderPanel({ onUseDraft, replaceWarning: null });

      await user.type(await screen.findByLabelText('Describe the event'), 'A town hall');
      await user.click(screen.getByRole('button', { name: /draft with forgeai/i }));
      await user.click(await screen.findByRole('button', { name: 'Use this draft' }));

      expect(onUseDraft).toHaveBeenCalledTimes(1);
    });

    it('is read-only when there is nothing to use the draft for', async () => {
      const user = userEvent.setup();
      server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult));
      renderPanel({ onUseDraft: undefined });

      await user.type(await screen.findByLabelText('Describe the event'), 'A town hall');
      await user.click(screen.getByRole('button', { name: /draft with forgeai/i }));

      await screen.findByRole('heading', { name: draftResult.title });
      expect(screen.queryByRole('button', { name: 'Use this draft' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Use as venue' })).not.toBeInTheDocument();
    });

    it('shows the server sentence for an off-topic request', async () => {
      const user = userEvent.setup();
      const message = 'ForgeAI only helps with corporate events, team building, venues and workplace activities.';
      server.use(aiStatus('org-1'), aiFailure('org-1', 'draft', 422, { code: 'AI_OFF_TOPIC', message }));
      renderPanel();

      await user.type(await screen.findByLabelText('Describe the event'), 'Write me a python script');
      await user.click(screen.getByRole('button', { name: /draft with forgeai/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.queryByRole('heading', { name: draftResult.title })).not.toBeInTheDocument();
    });

    it('puts a field problem beside the box and not in a banner', async () => {
      const user = userEvent.setup();
      server.use(
        aiStatus('org-1'),
        aiFailure('org-1', 'draft', 400, {
          code: 'VALIDATION_ERROR',
          message: 'Some details need fixing.',
          details: [{ path: 'prompt', message: 'Remove personal details like emails and phone numbers.' }],
        })
      );
      renderPanel();

      await user.type(await screen.findByLabelText('Describe the event'), 'Email me at a@b.co');
      await user.click(screen.getByRole('button', { name: /draft with forgeai/i }));

      const alerts = await screen.findAllByRole('alert');
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toHaveTextContent('Remove personal details like emails and phone numbers.');
      expect(alerts[0]).not.toHaveTextContent('Some details need fixing');
    });

    it('says ForgeAI is busy on a 429', async () => {
      const user = userEvent.setup();
      const message = 'ForgeAI is busy right now. Please try again in about 20 seconds.';
      server.use(aiStatus('org-1'), aiFailure('org-1', 'draft', 429, { code: 'AI_BUSY', message }));
      renderPanel();

      await user.type(await screen.findByLabelText('Describe the event'), 'A town hall');
      await user.click(screen.getByRole('button', { name: /draft with forgeai/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
    });

    it('says so when ForgeAI was switched off after the panel opened', async () => {
      const user = userEvent.setup();
      server.use(
        aiStatus('org-1'),
        aiFailure('org-1', 'draft', 503, { code: 'AI_DISABLED', message: "ForgeAI isn't set up on this server." })
      );
      renderPanel();

      await user.type(await screen.findByLabelText('Describe the event'), 'A town hall');
      await user.click(screen.getByRole('button', { name: /draft with forgeai/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent("ForgeAI isn't set up on this server.");
    });
  });

  describe("What's the vibe?", () => {
    it('sends a vibe chip straight away and shows three concepts', async () => {
      const user = userEvent.setup();
      const bodies = [];
      server.use(aiStatus('org-1'), aiTask('org-1', 'concepts', 'concepts', conceptsResult, { record: (b) => bodies.push(b) }));
      renderPanel();

      await user.click(await screen.findByRole('tab', { name: "What's the vibe?" }));
      await user.click(screen.getByRole('button', { name: 'Team Bonding & Dinner' }));

      expect(await screen.findByRole('heading', { name: 'Cook-Off Challenge' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Sunset Trek' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Quiz Night' })).toBeInTheDocument();
      expect(bodies).toEqual([{ vibe: 'Team Bonding & Dinner' }]);
    });

    it('sends the department and budget when given', async () => {
      const user = userEvent.setup();
      const bodies = [];
      server.use(aiStatus('org-1'), aiTask('org-1', 'concepts', 'concepts', conceptsResult, { record: (b) => bodies.push(b) }));
      renderPanel();

      await user.click(await screen.findByRole('tab', { name: "What's the vibe?" }));
      await user.type(screen.getByLabelText('Team or department (optional)'), 'Engineering');
      await user.type(screen.getByLabelText('Budget (optional)'), '2 lakh');
      await user.type(screen.getByLabelText('Or describe your own'), 'Calm after a release');
      await user.click(screen.getByRole('button', { name: 'Suggest concepts' }));

      await screen.findByRole('heading', { name: 'Cook-Off Challenge' });
      expect(bodies).toEqual([{ vibe: 'Calm after a release', department: 'Engineering', budget: '2 lakh' }]);
    });

    it('carries a concept to the Plan tab, filled in but not sent', async () => {
      const user = userEvent.setup();
      const drafts = [];
      server.use(
        aiStatus('org-1'),
        aiTask('org-1', 'concepts', 'concepts', conceptsResult),
        aiTask('org-1', 'draft', 'draft', draftResult, { record: (b) => drafts.push(b) })
      );
      renderPanel();

      await user.click(await screen.findByRole('tab', { name: "What's the vibe?" }));
      await user.click(screen.getByRole('button', { name: 'Team Bonding & Dinner' }));
      await user.click((await screen.findAllByRole('button', { name: 'Plan this concept' }))[0]);

      expect(screen.getByRole('tab', { name: 'Plan an event' })).toHaveAttribute('aria-selected', 'true');
      await waitFor(() => expect(promptBox()).toHaveFocus());
      expect(promptBox().value).toContain('Plan "Cook-Off Challenge".');
      expect(drafts).toEqual([]);
    });
  });

  describe('Venues', () => {
    async function findVenues(user, onUseVenue, bodies = []) {
      server.use(aiStatus('org-1'), aiTask('org-1', 'venues', 'venues', venuesResult, { record: (b) => bodies.push(b) }));
      renderPanel({ onUseVenue });
      await user.click(await screen.findByRole('tab', { name: 'Venues' }));
      await user.type(screen.getByLabelText('What is the event?'), 'A leadership offsite');
      await user.type(screen.getByLabelText('How many people?'), '40');
    }

    it('needs a description and a headcount before it will search', async () => {
      const user = userEvent.setup();
      server.use(aiStatus('org-1'));
      renderPanel();

      await user.click(await screen.findByRole('tab', { name: 'Venues' }));
      expect(screen.getByRole('button', { name: 'Find venues' })).toBeDisabled();
    });

    it('shows venue cards with a Google Maps search link', async () => {
      const user = userEvent.setup();
      const bodies = [];
      await findVenues(user, undefined, bodies);
      await user.type(screen.getByLabelText('City or region (optional)'), 'Pune');
      await user.click(screen.getByRole('button', { name: 'Find venues' }));

      expect(await screen.findByRole('heading', { name: 'Resort with a conference hall' })).toBeInTheDocument();
      expect(bodies).toEqual([{ theme: 'A leadership offsite', capacity: 40, city: 'Pune' }]);

      const link = screen.getAllByRole('link', { name: /search on maps/i })[0];
      expect(link.getAttribute('href')).toBe(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('resort with conference hall near Pune')}`
      );
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      // No target for the venue name here, so no button that would do nothing.
      expect(screen.queryByRole('button', { name: 'Use as venue' })).not.toBeInTheDocument();
    });

    it('hands a chosen venue back', async () => {
      const user = userEvent.setup();
      const onUseVenue = vi.fn();
      await findVenues(user, onUseVenue);
      await user.click(screen.getByRole('button', { name: 'Find venues' }));

      await user.click((await screen.findAllByRole('button', { name: 'Use as venue' }))[1]);
      expect(onUseVenue).toHaveBeenCalledWith(venuesResult.venues[1]);
    });

    it('shows different venues on request', async () => {
      const user = userEvent.setup();
      const bodies = [];
      await findVenues(user, undefined, bodies);
      await user.click(screen.getByRole('button', { name: 'Find venues' }));
      await user.click(await screen.findByRole('button', { name: 'Show different venues' }));

      await waitFor(() => expect(bodies).toHaveLength(2));
      expect(bodies[1]).toMatchObject({ fresh: true, capacity: 40 });
    });
  });

  describe('Polish text', () => {
    async function openPolish(user, props = {}) {
      renderPanel({ polishText: 'we are having an offsite', onUseText: vi.fn(), ...props });
      await user.click(await screen.findByRole('tab', { name: 'Polish text' }));
    }

    it('starts with the text it was given', async () => {
      const user = userEvent.setup();
      server.use(aiStatus('org-1'));
      await openPolish(user);

      expect(screen.getByLabelText('Text to polish')).toHaveValue('we are having an offsite');
    });

    it('needs some text before it will rewrite', async () => {
      const user = userEvent.setup();
      server.use(aiStatus('org-1'));
      await openPolish(user, { polishText: '' });

      expect(screen.getByRole('button', { name: 'More professional' })).toBeDisabled();
    });

    it('shows the original beside the rewrite and uses it only when asked', async () => {
      const user = userEvent.setup();
      const bodies = [];
      const onUseText = vi.fn();
      server.use(aiStatus('org-1'), aiTask('org-1', 'enhance', 'enhance', enhanceResult, { record: (b) => bodies.push(b) }));
      await openPolish(user, { onUseText, eventTitle: 'Offsite' });

      await user.click(screen.getByRole('button', { name: 'More professional' }));

      const after = await screen.findByRole('region', { name: "ForgeAI's version" });
      expect(within(after).getByText(enhanceResult.text)).toBeInTheDocument();
      expect(within(screen.getByRole('region', { name: 'Your text' })).getByText('we are having an offsite')).toBeInTheDocument();
      expect(bodies).toEqual([{ text: 'we are having an offsite', mode: 'professional', eventTitle: 'Offsite' }]);
      expect(onUseText).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Use this text' }));
      expect(onUseText).toHaveBeenCalledWith(enhanceResult.text);
    });

    it('offers the invitation email to copy, with its subject, and not as the description', async () => {
      const user = userEvent.setup();
      server.use(aiStatus('org-1'), aiTask('org-1', 'enhance', 'enhance', emailResult));
      await openPolish(user);

      await user.click(screen.getByRole('button', { name: 'Invitation email' }));

      expect(await screen.findByText(emailResult.subject)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Use this text' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Copy' }));
      await waitFor(async () => expect(await navigator.clipboard.readText()).toBe(`Subject: ${emailResult.subject}\n\n${emailResult.text}`));
    });

    it('rewrites again with fresh: true', async () => {
      const user = userEvent.setup();
      const bodies = [];
      server.use(aiStatus('org-1'), aiTask('org-1', 'enhance', 'enhance', enhanceResult, { record: (b) => bodies.push(b) }));
      await openPolish(user);

      await user.click(screen.getByRole('button', { name: 'Add an energetic tone' }));
      await user.click(await screen.findByRole('button', { name: /another take/i }));

      await waitFor(() => expect(bodies).toHaveLength(2));
      expect(bodies[1]).toMatchObject({ mode: 'energetic', fresh: true });
    });
  });
});
