import { getAllUsers } from '@/services';
import type { ResponseUserDto } from '@challenge/types';
import { useQuery } from '@tanstack/react-query';

export function useAllUsers(enabled = true) {
  return useQuery<ResponseUserDto[], Error>({
    queryKey: ['usersAll'],
    queryFn: () => getAllUsers(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
