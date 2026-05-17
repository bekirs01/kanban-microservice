import { getUsersByIds } from '@/services';
import type { ResponseUserDto } from '@challenge/types';
import { useQuery } from '@tanstack/react-query';

export function useUsersByIds(ids: string[] | undefined) {
  const enabled = !!ids && ids.length > 0;
  const sortedIds = ids?.length ? [...ids].sort() : [];
  return useQuery<ResponseUserDto[], Error>({
    queryKey: ["usersByIds", sortedIds],
    queryFn: () => getUsersByIds(ids ?? []),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
