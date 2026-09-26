import { describe, expect, it } from 'vitest';
import { composeDescription, draftToFormPatch, formatAgendaText, registrationDeadlineFor, DESCRIPTION_LIMIT } from './applyDraft.js';
import { conceptToPrompt } from './conceptToPrompt.js';
import { MAX_PROMPT_CHARS } from './presets.js';
import { draftResult } from '../../../../tests/fixtures/ai.js';

const oneDay = [
  { day: 1, time: '09:30', title: 'Welcome', details: 'Doors open' },
  { day: 1, time: '10:30', title: 'Keynote', details: '' },
];

describe('formatAgendaText', () => {
  it('writes one line per item, with details after a dash', () => {
    expect(formatAgendaText(oneDay)).toBe('09:30 Welcome - Doors open\n10:30 Keynote');
  });

  it('adds a heading per day only when there is more than one day', () => {
    expect(formatAgendaText(oneDay)).not.toMatch(/Day 1/);
    expect(formatAgendaText(draftResult.agenda)).toBe(
      ['Day 1', '09:30 Welcome and kickoff - Doors open, badges at the desk', '10:30 Opening keynote', '', 'Day 2', '16:00 Demos and awards - Every team presents'].join('\n')
    );
  });

  it('is empty for no agenda', () => {
    expect(formatAgendaText([])).toBe('');
    expect(formatAgendaText(undefined)).toBe('');
  });
});

describe('composeDescription', () => {
  it('puts the tagline first, then the description, then the agenda under a heading', () => {
    const text = composeDescription({ tagline: 'Tag.', description: 'Body.', agenda: oneDay });
    expect(text).toBe('Tag.\n\nBody.\n\nAgenda\n09:30 Welcome - Doors open\n10:30 Keynote');
  });

  it('leaves out a missing tagline and a missing agenda', () => {
    expect(composeDescription({ tagline: '', description: 'Body.', agenda: [] })).toBe('Body.');
  });

  it('stays within the limit by dropping whole agenda lines, never half of one', () => {
    const agenda = Array.from({ length: 24 }, (_, i) => ({ day: 1, time: '09:00', title: `Session ${i + 1} ${'x'.repeat(100)}`, details: 'y'.repeat(200) }));
    const description = 'd'.repeat(4000);
    const text = composeDescription({ tagline: '', description, agenda });
    expect(text.length).toBeLessThanOrEqual(DESCRIPTION_LIMIT);
    expect(text.startsWith(description)).toBe(true);
    const lines = text.split('\n').slice(3);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((line) => line.endsWith('y'.repeat(200)))).toBe(true);
  });

  it('does not leave an empty "Agenda" heading when no line fits', () => {
    const text = composeDescription({ tagline: '', description: 'd'.repeat(DESCRIPTION_LIMIT - 10), agenda: oneDay });
    expect(text).not.toMatch(/Agenda/);
    expect(text.length).toBeLessThanOrEqual(DESCRIPTION_LIMIT);
  });
});

describe('registrationDeadlineFor', () => {
  const today = new Date(2026, 8, 26); // 26 Sep 2026, local

  it('counts back from the start date across a month boundary', () => {
    expect(registrationDeadlineFor('2026-11-03', 7, today)).toBe('2026-10-27');
  });

  it('can be the day of the event', () => {
    expect(registrationDeadlineFor('2026-11-03', 0, today)).toBe('2026-11-03');
  });

  it('is blank without a start date', () => {
    expect(registrationDeadlineFor('', 7, today)).toBe('');
    expect(registrationDeadlineFor(undefined, 7, today)).toBe('');
  });

  it('is blank when that day has already passed', () => {
    expect(registrationDeadlineFor('2026-09-28', 7, today)).toBe('');
  });

  it('is blank for a number of days that is not a number', () => {
    expect(registrationDeadlineFor('2026-11-03', NaN, today)).toBe('');
  });
});

describe('draftToFormPatch', () => {
  const today = new Date(2026, 8, 26);

  it('fills the name, category, capacity and description', () => {
    const patch = draftToFormPatch(draftResult, { today });
    expect(patch).toMatchObject({ title: draftResult.title, category: 'Workshop', capacity: 40 });
    expect(patch.description).toContain(draftResult.description);
    expect(patch.description).toContain('Agenda');
  });

  it('sets a venue name only when a venue idea was picked', () => {
    expect(draftToFormPatch(draftResult, { today }).venue).toBeUndefined();
    expect(draftToFormPatch(draftResult, { venue: draftResult.venueIdeas[1], today }).venue).toEqual({ name: 'Business hotel ballroom' });
  });

  it('sets the registration deadline only when the start date is known', () => {
    expect(draftToFormPatch(draftResult, { today }).registrationDeadline).toBeUndefined();
    expect(draftToFormPatch(draftResult, { startDate: '2026-11-03', today }).registrationDeadline).toBe('2026-10-27');
  });
});

describe('conceptToPrompt', () => {
  it('names the concept and carries its tagline and reason', () => {
    const prompt = conceptToPrompt({ title: 'Cook-Off', tagline: 'Teams and aprons.', why: 'Breaks silos.' });
    expect(prompt).toBe('Plan "Cook-Off". Teams and aprons. Breaks silos.');
  });

  it('never passes the request limit, and cuts at a word', () => {
    const prompt = conceptToPrompt({ title: 'Cook-Off', tagline: '', why: 'word '.repeat(200) });
    expect(prompt.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
    expect(prompt.endsWith('…')).toBe(true);
    expect(prompt).not.toMatch(/wor…$/);
  });
});
