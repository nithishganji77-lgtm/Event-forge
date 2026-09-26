import { GoogleGenAI, ApiError as GeminiApiError } from '@google/genai';
import { config } from '../../config/env.js';

// The only file that imports @google/genai. Everything else deals in `generateJson()` and
// AiProviderError, so a change in Google's SDK (its headline API has already moved once, from
// generateContent to interactions) is a change in this file alone.

export class AiProviderError extends Error {
  // kind: 'busy' (quota / rate limit) | 'timeout' | 'blocked' (the model declined) | 'unavailable'
  constructor(kind, message, { status } = {}) {
    super(message);
    this.name = 'AiProviderError';
    this.kind = kind;
    this.status = status;
  }
}

let client = null;
function getClient() {
  client ??= new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  return client;
}

// Google's SDK retries some failures itself; one attempt only, so a struggling request can't quietly
// spend the project's small per-minute quota several times over.
const HTTP_OPTIONS = { timeout: 20_000, retryOptions: { attempts: 1 } };

function toProviderError(err) {
  if (err instanceof AiProviderError) return err;
  if (err instanceof GeminiApiError) {
    if (err.status === 429) return new AiProviderError('busy', 'Gemini quota exceeded', { status: 429 });
    return new AiProviderError('unavailable', `Gemini API error ${err.status}: ${String(err.message).slice(0, 300)}`, { status: err.status });
  }
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError' || /timed? ?out|aborted/i.test(String(err?.message))) {
    return new AiProviderError('timeout', 'Gemini request timed out');
  }
  return new AiProviderError('unavailable', `Gemini request failed: ${String(err?.message ?? err).slice(0, 300)}`);
}

// -> { text, usage }. `text` is the model's JSON, unparsed and untrusted.
export async function generateJson({ system, prompt, jsonSchema, signal }) {
  let response;
  try {
    response = await getClient().models.generateContent({
      model: config.GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: system,
        responseMimeType: 'application/json',
        responseJsonSchema: jsonSchema,
        temperature: 0.7,
        maxOutputTokens: 4096,
        abortSignal: signal,
        httpOptions: HTTP_OPTIONS,
      },
    });
  } catch (err) {
    throw toProviderError(err);
  }

  const text = response.text;
  if (!text) {
    // No text: the request was blocked by Google's safety filters, or the answer was cut off.
    throw new AiProviderError('blocked', `No text returned (${response.promptFeedback?.blockReason ?? response.candidates?.[0]?.finishReason ?? 'unknown'})`);
  }
  return { text, usage: response.usageMetadata ?? null };
}

// For `npm run ai:check` only.
export async function listGenerativeModels() {
  const names = [];
  try {
    const pager = await getClient().models.list({ config: { pageSize: 100 } });
    for await (const model of pager) {
      if (!model.supportedActions || model.supportedActions.includes('generateContent')) names.push(model.name.replace(/^models\//, ''));
    }
  } catch (err) {
    throw toProviderError(err);
  }
  return names;
}
