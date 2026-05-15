import { tasksService } from '@/services/tasks.service';
import { useInfiniteQuery } from '@tanstack/react-query';

const DEFAULT_LIMIT = 5;

export function useTaskHistory(taskId: string | null, initialLimit = DEFAULT_LIMIT) {
  return useInfiniteQuery({
    queryKey: ['taskHistory', taskId, initialLimit],
    queryFn: ({ pageParam = 1 }) =>
      tasksService.getTaskHistory(taskId!, { page: pageParam, limit: initialLimit }),
    initialPageParam: 1,
    enabled: !!taskId,
    getNextPageParam: (lastPage: any) => {
      const pageInfo = (lastPage as any)?.data ?? (lastPage as any)?.meta;
      if (pageInfo && typeof pageInfo.currentPage === 'number' && typeof pageInfo.totalPages === 'number') {
        if (pageInfo.currentPage < pageInfo.totalPages) return pageInfo.currentPage + 1;
        return undefined;
      }
      const items = (lastPage as any)?.items ?? [];
      return items.length >= initialLimit ? undefined : undefined;
    },
    staleTime: 30 * 1000,
  });
}
