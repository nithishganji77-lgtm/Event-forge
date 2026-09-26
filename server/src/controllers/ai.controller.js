import { aiService } from '../services/ai/ai.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

const run = (kind) =>
  asyncHandler(async (req, res) => {
    const { result, cached } = await aiService.run(kind, req.body);
    return sendSuccess(res, { data: { kind, result, cached } });
  });

export const aiStatusHandler = asyncHandler(async (req, res) => sendSuccess(res, { data: aiService.status() }));
export const generateDraftHandler = run('draft');
export const suggestConceptsHandler = run('concepts');
export const suggestVenuesHandler = run('venues');
export const enhanceTextHandler = run('enhance');
