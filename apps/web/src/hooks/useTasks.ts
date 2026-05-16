import { tasksService, type TaskCommentSubmit } from "@/services/tasks.service";
import type {
  AssignTaskDto,
  CreateTaskDto,
  PaginationQueryDto,
  UpdateTaskDto
} from "@challenge/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const TASKS_QUERY_ROOT = "tasks";

export function useTasks(filters?: PaginationQueryDto) {
  return useQuery({
    queryKey: [TASKS_QUERY_ROOT, filters],
    queryFn: () => tasksService.getTasks(filters),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => tasksService.getTaskById(id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskDto) => tasksService.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === TASKS_QUERY_ROOT,
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskDto }) =>
      tasksService.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          (q.queryKey[0] === TASKS_QUERY_ROOT ||
            q.queryKey[0] === "task" ||
            q.queryKey[0] === "taskHistory"),
      });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === TASKS_QUERY_ROOT,
      });
    },
  });
}

export function useArchiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksService.archiveTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          (q.queryKey[0] === TASKS_QUERY_ROOT ||
            q.queryKey[0] === "task" ||
            q.queryKey[0] === "taskHistory"),
      });
    },
  });
}

export function useUnarchiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksService.unarchiveTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          (q.queryKey[0] === TASKS_QUERY_ROOT ||
            q.queryKey[0] === "task" ||
            q.queryKey[0] === "taskHistory"),
      });
    },
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignTaskDto }) =>
      tasksService.assignUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          (q.queryKey[0] === TASKS_QUERY_ROOT ||
            q.queryKey[0] === "task" ||
            q.queryKey[0] === "taskHistory"),
      });
    },
  });
}

export function useUnassignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignTaskDto }) =>
      tasksService.unassignUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          (q.queryKey[0] === TASKS_QUERY_ROOT ||
            q.queryKey[0] === "task" ||
            q.queryKey[0] === "taskHistory"),
      });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskCommentSubmit }) =>
      tasksService.addComment(id, data),
    onMutate: async ({ id, data }: { id: string; data: TaskCommentSubmit }) => {
      await queryClient.cancelQueries({ queryKey: ["taskComments", id] });

      const previous = queryClient.getQueryData<any[]>(["taskComments", id]);

      const optimisticComment = {
        id: `temp-${Date.now()}`,
        content: String(data.content ?? ""),
        authorId: (data as unknown as { authorId?: string }).authorId ?? null,
        createdAt: new Date().toISOString(),
        imageUrl: null,
      };

      queryClient.setQueryData(["taskComments", id], (old: any[] | undefined) => [
        ...(old ?? []),
        optimisticComment,
      ]);

      return { previous };
    },
    onError: (__, vars, context: any) => {
      const id = (vars as any).id;
      if (context?.previous) {
        queryClient.setQueryData(["taskComments", id], context.previous);
      }
    },
    onSuccess: (__, vars) => {
      const id = (vars as any).id;
      queryClient.invalidateQueries({ queryKey: ["taskComments", id] });
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      try {
        queryClient.invalidateQueries({ queryKey: ["taskHistory"] });
      } catch (e) {
        queryClient.invalidateQueries();
      }
    },
    onSettled: (_data, _err, vars) => {
      const id = (vars as any).id;
      queryClient.invalidateQueries({ queryKey: ["taskComments", id] });
      try {
        queryClient.invalidateQueries({ queryKey: ["taskHistory"] });
      } catch (e) {
        queryClient.invalidateQueries();
      }
    },
  });
}
