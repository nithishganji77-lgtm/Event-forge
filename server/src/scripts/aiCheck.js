import { config, geminiConfigured } from '../config/env.js';
import { AiProviderError, generateJson, listGenerativeModels } from '../services/ai/gemini.client.js';

// npm run ai:check
// Tells you whether ForgeAI can work with the key in server/.env, and which model names that key can
// use. Google renames and retires models and doesn't publish free-tier limits, so this is the source
// of truth. It never prints the key.

const say = (line = '') => console.log(line);

async function main() {
  if (!geminiConfigured) {
    say('GEMINI_API_KEY is not set in server/.env, so ForgeAI is switched off (the app works without it).');
    say('Get a free key at https://aistudio.google.com/apikey, add GEMINI_API_KEY=... to server/.env, restart, run this again.');
    process.exit(1);
  }

  say(`Configured model: ${config.GEMINI_MODEL}`);
  say('');

  try {
    const models = (await listGenerativeModels()).sort();
    say(`Models this key can call for text (${models.length}):`);
    for (const name of models.slice(0, 50)) say(`  ${name === config.GEMINI_MODEL ? '*' : ' '} ${name}`);
    if (!models.includes(config.GEMINI_MODEL)) {
      say('');
      say(`! "${config.GEMINI_MODEL}" is not in that list. Set GEMINI_MODEL in server/.env to one of the names above (a "flash" or "flash-lite" one is the cheapest).`);
    }
  } catch (err) {
    say(`Could not list models: ${explain(err)}`);
    process.exit(1);
  }

  say('');
  say('Making one small test request...');
  const started = Date.now();
  try {
    const { usage } = await generateJson({
      system: 'You return JSON.',
      prompt: 'Return {"ok": true}.',
      jsonSchema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
      signal: AbortSignal.timeout(20_000),
    });
    say(`OK: answered in ${Date.now() - started} ms (${usage?.promptTokenCount ?? '?'} prompt / ${usage?.candidatesTokenCount ?? '?'} output tokens).`);
    say('ForgeAI is ready. To see your quota, open https://aistudio.google.com/rate-limit');
  } catch (err) {
    say(`Test request failed: ${explain(err)}`);
    process.exit(1);
  }
}

function explain(err) {
  if (!(err instanceof AiProviderError)) return String(err?.message ?? err);
  if (err.kind === 'busy') return 'quota exceeded. Wait a minute, or check your limits at https://aistudio.google.com/rate-limit.';
  if (err.kind === 'timeout') return 'the request timed out. Check your connection and try again.';
  if (err.status === 400 || err.status === 401 || err.status === 403) return 'Google rejected the key. Check GEMINI_API_KEY in server/.env (no quotes, no spaces).';
  if (err.status === 404) return 'that model name does not exist for this key. Pick one from the list above with GEMINI_MODEL.';
  return err.message;
}

main();
