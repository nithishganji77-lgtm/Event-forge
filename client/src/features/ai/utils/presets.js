// Starting points. A plan preset fills the request box (it does not send it), so the person can add
// their own numbers first; a vibe preset is sent as it is. Amounts are in rupees because ForgeAI
// assumes India unless the request says otherwise.
export const PLAN_PRESETS = [
  {
    label: 'Plan Team Offsite',
    prompt: 'Plan a 2-day team offsite for 40 people near Bangalore with team-building activities, a leadership session and an evening dinner. Budget ₹8,00,000.',
  },
  {
    label: 'Suggest Friday Social',
    prompt: 'Suggest a relaxed Friday evening social for a 60-person team, with games, food and music, held at the office. Budget ₹60,000.',
  },
  {
    label: 'Generate Hackathon Agenda',
    prompt: 'Plan a 2-day technical hackathon for 40 engineers with keynote sessions, mentoring and evening networking. Budget ₹5,00,000.',
  },
  {
    label: 'Leadership Retreat',
    prompt: 'Plan a 2-day leadership retreat for 25 managers focused on strategy and communication, in a quiet resort setting. Budget ₹6,00,000.',
  },
  {
    label: 'Quarterly Town Hall',
    prompt: 'Plan a half-day quarterly town hall for 200 employees with leadership updates, team awards and an open Q&A, followed by lunch.',
  },
  {
    label: 'Wellness Day',
    prompt: 'Plan a one-day wellness event for 80 employees with yoga, a health talk, healthy food and outdoor activities. Budget ₹1,50,000.',
  },
];

export const VIBE_PRESETS = [
  'Team Bonding & Dinner',
  'Leadership Retreat',
  'Hackathon & Innovation',
  'Wellness & Outdoor',
  'Celebration & Awards',
  'Learning & Skills',
];

export const TONES = [
  { value: 'professional', label: 'More professional' },
  { value: 'energetic', label: 'Add an energetic tone' },
  { value: 'invitation_email', label: 'Invitation email' },
];

export const MAX_PROMPT_CHARS = 500;
export const MAX_ENHANCE_CHARS = 2000;
