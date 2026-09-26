import { useMutation, useQuery } from '@tanstack/react-query';
import {
  fetchAiStatus,
  requestConcepts,
  requestDraft,
  requestEnhance,
  requestVenues,
} from '../../../services/ai.service.js';

// Whether the server has a Gemini key. Asked only when something needs the answer (the panel is
// open), and remembered for a while: it changes only when an admin edits the server's .env.
export function useAiStatus(orgId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['organizations', orgId, 'ai', 'status'],
    queryFn: () => fetchAiStatus(orgId),
    enabled: Boolean(orgId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// One mutation per task. Their errors are shown inside the panel beside the field they belong to,
// so they carry no `errorToast`.
export const useGenerateDraft = (orgId) => useMutation({ mutationFn: (body) => requestDraft(orgId, body) });
export const useSuggestConcepts = (orgId) => useMutation({ mutationFn: (body) => requestConcepts(orgId, body) });
export const useSuggestVenues = (orgId) => useMutation({ mutationFn: (body) => requestVenues(orgId, body) });
export const useEnhanceText = (orgId) => useMutation({ mutationFn: (body) => requestEnhance(orgId, body) });
