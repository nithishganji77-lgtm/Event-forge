import { EVENT_CATEGORIES } from '../../constants/eventCategories.js';

// Two layers around the model, both plain functions so they are easy to test on their own:
//   input  - what may be sent to Gemini at all
//   output - what may be shown to a person after Gemini answers
//
// Neither is the real defence against a prompt-injection attempt. The real containment is that the
// model has no tools and is never given organization, user or event data, its answer must match a
// schema and is re-validated here, and the client renders it as text. These are speed bumps.

export const MAX_PROMPT_CHARS = 500;
export const MAX_ENHANCE_CHARS = 2000;

// C0 controls (keeping tab and newline), DEL, zero-width and bidi-override characters: none belong
// in an event request, and the last two groups are a way to hide text from a reader.
// eslint-disable-next-line no-control-regex
const HIDDEN_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤﻿]/g;

// Angle brackets are removed from input: the request is passed to the model inside
// <user_request>...</user_request>, so a "</user_request>" typed by the user must not close it.
export function cleanInput(text, { multiline = false } = {}) {
  let out = String(text ?? '').normalize('NFKC').replace(HIDDEN_CHARS, '').replace(/[<>]/g, '');
  out = multiline ? out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : out.replace(/\s+/g, ' ');
  return out.trim();
}

// A deliberately narrow list of the classic phrasings. Each one is something no real event request
// says, and the tests pin benign look-alikes ("ignore the budget", "developer conference") so the
// filter can't quietly grow into blocking legitimate prompts.
const INJECTION_PATTERNS = [
  /\b(ignore|disregard|forget|override)\s+(all\s+|any\s+|the\s+|your\s+|my\s+)*(previous|prior|above|earlier|preceding|system|initial)\s+(instructions?|prompts?|rules?|messages?|guidelines?)/i,
  /\b(reveal|show|print|repeat|output|leak)\s+(me\s+)?(your|the)\s+(system\s+|hidden\s+|initial\s+|original\s+)?(prompt|instructions)\b/i,
  /\b(ignore|disregard|forget|override)\s+(all\s+)?(your|my)\s+(previous\s+|prior\s+|initial\s+)?(instructions?|prompts?|rules?|guidelines?)/i,
  /\bsystem\s+prompt\b/i,
  /\bjailbreak/i,
  /\bdeveloper\s+mode\b/i,
  /\bdo\s+anything\s+now\b/i,
  /\bpretend\s+(that\s+)?you\s+(have\s+no|are\s+not\s+bound|can\s+ignore)/i,
];

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// Ten or more digits in one run once separators are ignored: a phone number, not a budget (Indian
// grouping such as 10,00,000 is seven digits; a ten-digit budget would be a thousand crore).
const PHONE = /(?:\+?\d[\d\s().-]{8,}\d)/;

export const INPUT_MESSAGES = {
  empty: 'Describe what you want to plan.',
  tooLong: (max) => `Keep it under ${max} characters.`,
  injection: "That request tries to change how ForgeAI works, so it can't be used. Describe the event you want to plan.",
  personal: 'Remove personal details like email addresses and phone numbers. Your request is sent to Google to be processed.',
};

// Returns null when the text is fine, else the sentence to show. Used by the zod validators, so the
// message lands on the field it belongs to.
export function findInputProblem(text) {
  if (INJECTION_PATTERNS.some((pattern) => pattern.test(text))) return INPUT_MESSAGES.injection;
  if (EMAIL.test(text)) return INPUT_MESSAGES.personal;
  const phone = PHONE.exec(text);
  if (phone && phone[0].replace(/\D/g, '').length >= 10) return INPUT_MESSAGES.personal;
  return null;
}

// ---- output ----

const TAGS = /<[^>]*>/g;
const URLS = /(?:https?:\/\/|www\.)\S+/gi;

// Everything the model returns is untrusted text. Tags, links and hidden characters are removed
// (a model can be talked into emitting a phishing link), whitespace is tidied and the length capped.
export function sanitizeText(value, { max = 200, multiline = false } = {}) {
  let out = String(value ?? '').replace(HIDDEN_CHARS, '').replace(TAGS, '').replace(URLS, '');
  out = multiline
    ? out.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n')
    : out.replace(/\s+/g, ' ');
  out = out.trim();
  if (out.length <= max) return out;
  // Cut at a word boundary when there is one nearby, so a description never ends mid-word. If the
  // cut already lands between words the last word is whole, so it stays.
  const cut = out.slice(0, max);
  if (/\s/.test(out[max])) return cut.trim();
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

// A Google Maps search string: letters, digits and a little punctuation, nothing that could be
// mistaken for markup or a URL.
export function sanitizeMapsQuery(value) {
  return String(value ?? '')
    .replace(HIDDEN_CHARS, '')
    .replace(/[^\p{L}\p{N}\s,.&'\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function coerceCategory(value) {
  return EVENT_CATEGORIES.includes(value) ? value : 'General';
}
