import { useCurrentUser } from '../features/auth/hooks/useCurrentUser.js';

export function useAuth() {
  const { data, isLoading, isError } = useCurrentUser();

  return {
    user: data?.user ?? null,
    memberships: data?.memberships ?? [],
    isAuthenticated: Boolean(data?.user),
    isLoading,
    isError,
  };
}
