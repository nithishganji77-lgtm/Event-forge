import { MAX_PROMPT_CHARS } from './presets.js';

// A concept becomes a request for the Plan tab: not sent, so the person can add the numbers (how
// many people, where) that a concept card does not know.
export function conceptToPrompt(concept) {
  const parts = [`Plan "${concept.title}".`, concept.tagline, concept.why].filter(Boolean);
  let prompt = parts.join(' ');
  if (prompt.length > MAX_PROMPT_CHARS) prompt = `${prompt.slice(0, MAX_PROMPT_CHARS - 1).replace(/\s+\S*$/, '')}…`;
  return prompt;
}
