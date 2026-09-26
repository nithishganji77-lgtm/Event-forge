import { http, HttpResponse } from 'msw';

// What the server sends back for each ForgeAI task, and the handlers that send it. Shapes match
// server/src/services/ai/schemas.js (the server has already cleaned everything by then).

export const draftResult = {
  title: 'Two-Day Engineering Hackathon',
  tagline: 'Build something in 48 hours.',
  category: 'Workshop',
  description: 'A two-day hackathon for engineers with keynotes, mentoring and evening networking.',
  capacity: 40,
  registrationDeadlineDaysBefore: 7,
  venueIdeas: [
    { type: 'Co-working space', name: 'Tech campus event hall', seating: 'Theatre and cluster tables', mapsQuery: 'co-working space with event hall Bangalore' },
    { type: 'Hotel', name: 'Business hotel ballroom', seating: 'Banquet', mapsQuery: 'business hotel ballroom Bangalore' },
  ],
  agenda: [
    { day: 1, time: '09:30', title: 'Welcome and kickoff', details: 'Doors open, badges at the desk' },
    { day: 1, time: '10:30', title: 'Opening keynote', details: '' },
    { day: 2, time: '16:00', title: 'Demos and awards', details: 'Every team presents' },
  ],
};

export const conceptsResult = {
  concepts: [
    { title: 'Cook-Off Challenge', tagline: 'Teams, aprons, bragging rights.', category: 'Social', why: 'Cooking together breaks down silos.', budgetNote: 'About 2,000 per head', highlights: ['Team recipes', 'Judging panel'] },
    { title: 'Sunset Trek', tagline: 'Fresh air, fresh ideas.', category: 'Team Offsite', why: 'A shared effort outdoors builds trust.', budgetNote: '', highlights: [] },
    { title: 'Quiz Night', tagline: 'Trivia with a twist.', category: 'Social', why: 'Low cost and easy to run.', budgetNote: '', highlights: ['Team rounds'] },
  ],
};

export const venuesResult = {
  venues: [
    { type: 'Resort', name: 'Resort with a conference hall', seating: 'Theatre, 60', capacityFit: 'Comfortable for 40', mapsQuery: 'resort with conference hall near Pune', notes: 'Book rooms with the hall.' },
    { type: 'Co-working space', name: 'Co-working event space', seating: 'Flexible', capacityFit: 'Fits 40', mapsQuery: 'co-working event space Pune', notes: '' },
    { type: 'Restaurant', name: 'Private dining room', seating: 'Banquet, 45', capacityFit: 'Snug for 40', mapsQuery: 'restaurant private dining Pune', notes: '' },
  ],
};

export const enhanceResult = { text: 'Join us for a focused, well-run offsite.' };
export const emailResult = { text: 'We would love to see you at the offsite.', subject: 'You are invited: team offsite' };

const aiBase = (orgId) => `http://localhost:4000/api/v1/organizations/${orgId}/ai`;

export const aiStatus = (orgId, enabled = true) =>
  http.get(`${aiBase(orgId)}/status`, () => HttpResponse.json({ success: true, data: { enabled } }));

// `record` receives each request body, so a test can assert on what was sent.
export function aiTask(orgId, path, kind, result, { record, cached = false } = {}) {
  return http.post(`${aiBase(orgId)}/${path}`, async ({ request }) => {
    record?.(await request.json());
    return HttpResponse.json({ success: true, data: { kind, result, cached } });
  });
}

export function aiFailure(orgId, path, status, error) {
  return http.post(`${aiBase(orgId)}/${path}`, () => HttpResponse.json({ success: false, error }, { status }));
}
