import { ApiError } from '../../utils/ApiError.js';
import { ERROR_CODES } from '../../constants/errorCodes.js';
import { config, geminiConfigured } from '../../config/env.js';
import { logger as appLogger } from '../../config/logger.js';
import { AiProviderError, generateJson as geminiGenerateJson } from './gemini.client.js';
import { KIND_SPECS } from './schemas.js';
import { SYSTEM_INSTRUCTION, buildPrompt } from './prompts.js';
import { cacheKey, createCache, createQuotaBucket } from './cache.js';
import { findInputProblem } from './guardrails.js';

// The pipeline for every ForgeAI request. Reached only after the route has checked who is asking
// (authenticate -> organization member -> EVENT_CREATE) and the per-user limiter has let it through:
//   input check -> cache -> shared quota -> Gemini (persona + JSON schema) -> output validation.
// It sends the model the person's own text and nothing else: no organization, user or event data.

const REQUEST_TIMEOUT_MS = 25_000;

export const aiErrors = {
  disabled: () =>
    new ApiError(503, ERROR_CODES.AI_DISABLED, "ForgeAI isn't set up on this server yet. Ask an admin to add a Gemini API key."),
  offTopic: () =>
    new ApiError(
      422,
      ERROR_CODES.AI_OFF_TOPIC,
      'ForgeAI only helps with corporate events, team building, venues and workplace activities. Try describing an event you want to plan.'
    ),
  declined: () =>
    new ApiError(422, ERROR_CODES.AI_OFF_TOPIC, "ForgeAI couldn't respond to that request. Try rephrasing it as an event you want to plan."),
  busy: (seconds) =>
    new ApiError(429, ERROR_CODES.AI_BUSY, `ForgeAI is busy right now. Please try again in about ${seconds} seconds.`),
  badOutput: () =>
    new ApiError(502, ERROR_CODES.AI_BAD_OUTPUT, "ForgeAI returned something we couldn't use. Try again, or rephrase your request."),
  unavailable: () =>
    new ApiError(503, ERROR_CODES.AI_UNAVAILABLE, 'ForgeAI is unavailable right now. Please try again in a few minutes.'),
  timeout: () => new ApiError(504, ERROR_CODES.AI_TIMEOUT, 'ForgeAI took too long to answer. Please try again.'),
};

function fromProviderError(err) {
  if (!(err instanceof AiProviderError)) return aiErrors.unavailable();
  if (err.kind === 'busy') return aiErrors.busy(60);
  if (err.kind === 'timeout') return aiErrors.timeout();
  if (err.kind === 'blocked') return aiErrors.declined();
  return aiErrors.unavailable();
}

export function createAiService({
  generateJson = geminiGenerateJson,
  cache = createCache({ ttlMs: config.AI_CACHE_TTL_SECONDS * 1000 }),
  quota = createQuotaBucket({ perMinute: config.AI_GLOBAL_RPM }),
  isEnabled = () => geminiConfigured,
  model = config.GEMINI_MODEL,
  timeoutMs = REQUEST_TIMEOUT_MS,
  logger = appLogger,
} = {}) {
  return {
    status() {
      return { enabled: isEnabled() };
    },

    async run(kind, params) {
      if (!isEnabled()) throw aiErrors.disabled();
      const spec = KIND_SPECS[kind];

      // The validators have already checked these; a second look costs nothing and keeps this
      // function safe to call from anywhere.
      for (const value of spec.freeText(params)) {
        const problem = value ? findInputProblem(value) : null;
        if (problem) throw ApiError.badRequest(problem);
      }

      const key = cacheKey(kind, params);
      const hit = cache.get(key);
      if (hit) {
        logger.info({ kind, cached: true }, 'ForgeAI request');
        return { ...hit, cached: true };
      }

      const slot = quota.tryAcquire();
      if (!slot.ok) throw aiErrors.busy(slot.retryAfterSeconds);

      const started = Date.now();
      let raw;
      try {
        raw = await generateJson({
          system: SYSTEM_INSTRUCTION,
          prompt: buildPrompt(kind, params),
          jsonSchema: spec.jsonSchema,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        // The provider's own message can name the model or quota; it goes to the log, not the person.
        logger.error({ kind, providerKind: err?.kind, status: err?.status, message: err?.message }, 'ForgeAI provider error');
        throw fromProviderError(err);
      }

      let parsed;
      try {
        parsed = spec.parse.parse(JSON.parse(raw.text));
      } catch (err) {
        logger.warn({ kind, reason: err?.name }, 'ForgeAI output rejected');
        throw aiErrors.badOutput();
      }
      if (parsed.status === 'off_topic') throw aiErrors.offTopic();

      const result = { kind, result: parsed.value };
      cache.set(key, result); // only a validated success is worth reusing
      // Sizes and timings only: never the prompt or the answer.
      logger.info(
        {
          kind,
          model,
          cached: false,
          ms: Date.now() - started,
          promptTokens: raw.usage?.promptTokenCount,
          outputTokens: raw.usage?.candidatesTokenCount,
        },
        'ForgeAI request'
      );
      return { ...result, cached: false };
    },
  };
}

export const aiService = createAiService();
