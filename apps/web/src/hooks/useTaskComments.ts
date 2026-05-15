import { tasksService } from '@/services/tasks.service';
import { useQuery } from '@tanstack/react-query';

export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: ['taskComments', taskId],
    queryFn: () => tasksService.getCommentsByTaskId(taskId!),
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
}
