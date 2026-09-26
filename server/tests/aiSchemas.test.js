import { KIND_SPECS } from '../src/services/ai/schemas.js';

const draft = (overrides = {}) => ({
  status: 'ok',
  draft: {
    title: 'Engineering Hackathon',
    tagline: 'Build something in a weekend.',
    category: 'Workshop',
    description: 'A two-day hackathon.\n\nTeams of four.',
    capacity: 40,
    registrationDeadlineDaysBefore: 14,
    venueIdeas: [{ type: 'Resort', name: 'Lakeside resort', seating: 'Cabaret', mapsQuery: 'resorts near Bangalore' }],
    agenda: [
      { day: 1, time: '09:00', title: 'Registration', details: 'Breakfast' },
      { day: 1, time: '10:00', title: 'Keynote', details: '' },
    ],
    ...overrides,
  },
});
const parseDraft = (value) => KIND_SPECS.draft.parse.parse(value);

describe('draft output validation', () => {
  it('accepts a good draft', () => {
    const result = parseDraft(draft());
    expect(result.status).toBe('ok');
    expect(result.value).toMatchObject({ title: 'Engineering Hackathon', capacity: 40, category: 'Workshop' });
  });

  it('treats an off_topic answer as a refusal, not a draft', () => {
    expect(parseDraft({ status: 'off_topic', reason: 'That is a coding request.' })).toEqual({ status: 'off_topic', reason: 'That is a coding request.' });
  });

  it('rejects an "ok" answer that has no draft in it', () => {
    expect(() => parseDraft({ status: 'ok' })).toThrow();
  });

  it('forces the category into the list rather than trusting the model', () => {
    expect(parseDraft(draft({ category: 'Hackathon' })).value.category).toBe('General');
  });

  it('clamps numbers into their range', () => {
    const { value } = parseDraft(draft({ capacity: 900000, registrationDeadlineDaysBefore: -5 }));
    expect(value.capacity).toBe(5000);
    expect(value.registrationDeadlineDaysBefore).toBe(0);
  });

  it('sorts an out-of-order agenda by day then time instead of failing', () => {
    const { value } = parseDraft(
      draft({
        agenda: [
          { day: 2, time: '09:00', title: 'Demos', details: '' },
          { day: 1, time: '17:00', title: 'Networking', details: '' },
          { day: 1, time: '09:00', title: 'Registration', details: '' },
        ],
      })
    );
    expect(value.agenda.map((a) => `${a.day} ${a.time}`)).toEqual(['1 09:00', '1 17:00', '2 09:00']);
  });

  it('pads a one-digit hour and rejects a time that is not a time', () => {
    expect(parseDraft(draft({ agenda: [{ day: 1, time: '9:30', title: 'Start', details: '' }] })).value.agenda[0].time).toBe('09:30');
    expect(() => parseDraft(draft({ agenda: [{ day: 1, time: 'after lunch', title: 'Start', details: '' }] }))).toThrow();
    expect(() => parseDraft(draft({ agenda: [{ day: 1, time: '25:00', title: 'Start', details: '' }] }))).toThrow();
  });

  it('removes markup and links from every string', () => {
    const { value } = parseDraft(
      draft({
        title: 'Summit <script>alert(1)</script>',
        description: 'Register at https://evil.example/now for <b>free</b> entry.',
        venueIdeas: [{ type: 'Hall', name: 'Hall <img src=x>', seating: 'Theatre', mapsQuery: 'halls <b>near</b> me' }],
      })
    );
    expect(JSON.stringify(value)).not.toMatch(/<|https?:/);
  });

  it('caps an oversized description and an over-long agenda instead of passing them on', () => {
    const { value } = parseDraft(draft({ description: 'word '.repeat(2000) }));
    expect(value.description.length).toBeLessThanOrEqual(2000);
    const many = Array.from({ length: 30 }, (_, i) => ({ day: 1, time: `${String(i % 24).padStart(2, '0')}:00`, title: `Item ${i}`, details: '' }));
    expect(() => parseDraft(draft({ agenda: many }))).toThrow();
  });

  it('rejects an empty title', () => {
    expect(() => parseDraft(draft({ title: '   ' }))).toThrow();
  });
});

describe('the other three tasks', () => {
  const concept = (n) => ({ title: `Concept ${n}`, tagline: 't', category: 'Social', why: 'Because', budgetNote: '₹1L', highlights: ['a'] });

  it('concepts: keeps exactly three, drops extras, and rejects fewer', () => {
    const parse = (n) => KIND_SPECS.concepts.parse.parse({ status: 'ok', concepts: Array.from({ length: n }, (_, i) => concept(i)) });
    expect(parse(5).value.concepts).toHaveLength(3);
    expect(() => parse(2)).toThrow();
  });

  it('venues: needs three to five', () => {
    const venue = (n) => ({ type: 'Resort', name: `V${n}`, seating: 's', capacityFit: 'fits', mapsQuery: 'q', notes: 'n' });
    const parse = (n) => KIND_SPECS.venues.parse.parse({ status: 'ok', venues: Array.from({ length: n }, (_, i) => venue(i)) });
    expect(parse(4).value.venues).toHaveLength(4);
    expect(() => parse(2)).toThrow();
    expect(() => parse(6)).toThrow();
  });

  it('enhance: returns cleaned text and an optional subject', () => {
    const { value } = KIND_SPECS.enhance.parse.parse({ status: 'ok', enhanced: { text: 'Join us <b>today</b> https://x.example', subject: 'You are invited' } });
    expect(value).toEqual({ text: 'Join us today', subject: 'You are invited' });
  });
});

describe('the JSON schemas sent to Gemini', () => {
  it('only use JSON Schema features Gemini supports (no string length or pattern keywords)', () => {
    const banned = /"(minLength|maxLength|pattern|format|uniqueItems|not|if|then|else|patternProperties)"/;
    for (const [kind, spec] of Object.entries(KIND_SPECS)) {
      expect({ kind, offending: banned.exec(JSON.stringify(spec.jsonSchema))?.[0] ?? null }).toEqual({ kind, offending: null });
    }
  });

  it('let the model refuse: every schema has a status field with an off_topic value', () => {
    for (const spec of Object.values(KIND_SPECS)) {
      expect(spec.jsonSchema.properties.status.enum).toContain('off_topic');
      expect(spec.jsonSchema.required).toEqual(['status']);
    }
  });
});
