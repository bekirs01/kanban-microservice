import TaskComments from "@/components/TaskComments";
import TaskDescription from "@/components/TaskDescription";
import TaskDetailHeader from "@/components/TaskDetailHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAllUsers } from "@/hooks/useAllUsers";
import { useAuth } from "@/hooks/useAuth";
import { useTaskComments } from "@/hooks/useTaskComments";
import { useTaskHistory } from "@/hooks/useTaskHistory";
import {
  useAddComment,
  useArchiveTask,
  useAssignTask,
  useDeleteTask,
  useTask,
  useUnarchiveTask,
  useUnassignTask,
  useUpdateTask,
} from "@/hooks/useTasks";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import { useTranslation } from "@/i18n/useTranslation";
import {
  buildCommentSchema,
  buildUpdateTaskSchema,
  type CommentFormData,
  type UpdateTaskFormData,
} from "@/lib/schemas";
import {
  formatChangedFields,
  getFirstName,
  mapTaskToForm,
} from "@/lib/taskDetailUtils";
import { canManageAssignments } from "@/lib/rbac";
import type { TaskPriority } from "@challenge/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState, useRef, useCallback, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import TaskDetailsPanel from "./TaskDetailsPanel";
import TaskHistory from "./TaskHistory";
import TaskParticipants from "./TaskParticipants";

const COMMENT_IMAGE_UPLOAD_LIMIT = 5 * 1024 * 1024;

interface TaskDetailDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
}: TaskDetailDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const manageAssignments = canManageAssignments(user?.role);

  const archiveMutation = useArchiveTask();
  const unarchiveMutation = useUnarchiveTask();

  const commentSchemaDyn = useMemo(() => buildCommentSchema(t), [t]);
  const updateTaskSchemaDyn = useMemo(() => buildUpdateTaskSchema(t), [t]);

  const { data: task, isLoading } = useTask(taskId || "");
  const { data: comments = [], isLoading: isLoadingComments } =
    useTaskComments(taskId);
  const addComment = useAddComment();

  const {
    data: historyPages,
    isLoading: isLoadingHistory,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTaskHistory(taskId, 5);

  const history = historyPages?.pages?.flatMap((p: any) => p.items) || [];

  const historyAuthorIds = Array.from(
    new Set(history.map((h: any) => h.authorId).filter(Boolean))
  );
  const { data: historyUsers = [] } = useUsersByIds(
    historyAuthorIds.length > 0 ? historyAuthorIds : undefined
  );

  const referencedUserIds = Array.from(
    new Set(
      history.flatMap((h: any) => {
        try {
          const raw = h.rawChanges ?? h.raw_changes ?? h.changes ?? {};
          const oldAssignees = Array.isArray(raw.old?.assignees)
            ? raw.old.assignees
            : raw.old?.assignees
              ? [raw.old.assignees]
              : [];
          const newAssignees = Array.isArray(raw.new?.assignees)
            ? raw.new.assignees
            : raw.new?.assignees
              ? [raw.new.assignees]
              : [];
          return [...oldAssignees, ...newAssignees].filter(Boolean);
        } catch (e) {
          return [] as string[];
        }
      })
    )
  );

  const { data: referencedUsers = [] } = useUsersByIds(
    referencedUserIds.length > 0 ? referencedUserIds : undefined
  );

  const getHistoryUsername = (id?: string) => {
    if (!id) return t("task.history.system");
    const u = historyUsers.find((x) => x.id === id);
    return u?.username || t("task.history.system");
  };

  const userIds = task
    ? [task.creatorId, ...(task.assignees ?? [])].filter(
        (id, idx, arr) => id && arr.indexOf(id) === idx
      )
    : [];
  const { data: users = [] } = useUsersByIds(
    userIds.length > 0 ? userIds : undefined
  );

  const [openAssign, setOpenAssign] = useState(false);

  const { data: allUsers = [], isLoading: isLoadingAllUsers } =
    useAllUsers(manageAssignments);

  const assignMutation = useAssignTask();
  const unassignMutation = useUnassignTask();

  const candidateUsers = (allUsers || []).filter(
    (u) => u.id !== task?.creatorId
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchemaDyn),
    defaultValues: { content: "" },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const [commentAttachment, setCommentAttachment] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(
    null,
  );

  const clearCommentAttachment = useCallback(() => {
    setCommentAttachment(null);
    if (commentFileInputRef.current) commentFileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!commentAttachment) {
      setAttachmentPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(commentAttachment);
    setAttachmentPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [commentAttachment]);

  useEffect(() => {
    reset({ content: "" });
    clearCommentAttachment();
  }, [taskId, reset, clearCommentAttachment]);

  const tryAcceptCommentFiles = useCallback(
    (files: File[]) => {
      const f = files.find((item) =>
        /^image\/(jpeg|png|gif|webp)$/.test(item.type),
      );
      if (!f) {
        if (files.length > 0) toast.error(t("comments.invalidImageType"));
        return;
      }
      if (f.size > COMMENT_IMAGE_UPLOAD_LIMIT) {
        toast.error(t("comments.imageTooLarge"));
        return;
      }
      setCommentAttachment(f);
    },
    [t],
  );

  const onCommentAttachmentInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    tryAcceptCommentFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const pickCommentAttachment = () => commentFileInputRef.current?.click();

  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const {
    register: registerTask,
    handleSubmit: handleSubmitTask,
    formState: { errors: taskErrors, isSubmitting: isUpdating },
    reset: resetTask,
  } = useForm<UpdateTaskFormData>({
    resolver: zodResolver(updateTaskSchemaDyn),
    defaultValues: {
      priority: undefined,
      title: undefined,
      description: undefined,
      deadline: undefined,
      assignees: [] as string[],
    } as any,
  });

  useEffect(() => {
    if (task && !isLoading && isEditing) {
      resetTask(mapTaskToForm(task));
    }
  }, [task, isLoading, isEditing, resetTask]);

  const onSubmitUpdate = async (data: UpdateTaskFormData) => {
    if (!taskId) return;
    try {
      const payload: any = {};
      if (data.title !== undefined) payload.title = data.title;
      if (data.description !== undefined)
        payload.description = data.description;
      if (data.priority !== undefined)
        payload.priority = data.priority as unknown as TaskPriority;
      if (data.deadline !== undefined && data.deadline !== "")
        payload.deadline = new Date(data.deadline);
      if (data.assignees !== undefined) payload.assignees = data.assignees;

      await updateMutation.mutateAsync({ id: taskId, data: payload });
      toast.success(t("task.updateSuccessToast"));
      setIsEditing(false);
    } catch (err: unknown) {
      const errAny = err as { response?: { data?: { message?: string } } };
      toast.error(
        errAny.response?.data?.message ?? t("task.updateErrorFallback"),
      );
    }
  };

  const onSubmitComment = async (
    data: CommentFormData,
    attachmentFromForm: File | null,
  ) => {
    if (!taskId) return;
    if (!attachmentFromForm && data.content.trim().length < 3) {
      toast.error(t("validation.commentMinForTextOnly"));
      return;
    }
    try {
      await addComment.mutateAsync({
        id: taskId,
        data: {
          content: data.content.trim(),
          ...(attachmentFromForm ? { attachment: attachmentFromForm } : {}),
        },
      });
      toast.success(t("task.commentAddedToast"));
      reset({ content: "" });
      clearCommentAttachment();
    } catch (error: unknown) {
      const errAny = error as { response?: { data?: { message?: string } } };
      toast.error(
        errAny.response?.data?.message ?? t("task.commentErrorFallback"),
      );
    }
  };

  const handleToggleAssign = async (userId: string) => {
    if (!taskId) return;
    try {
      const currentlyAssigned = (task?.assignees ?? []).includes(userId);
      if (currentlyAssigned) {
        await unassignMutation.mutateAsync({
          id: taskId,
          data: { assigneeId: userId },
        });
        toast.success(t("task.assigneeInviteRemoved"));
      } else {
        await assignMutation.mutateAsync({
          id: taskId,
          data: { assigneeId: userId },
        });
        toast.success(t("task.assigneeInviteSuccess"));
      }
      setOpenAssign(false);
    } catch (error: unknown) {
      const errAny = error as { response?: { data?: { message?: string } } };
      toast.error(
        errAny.response?.data?.message ?? t("task.assigneeUpdateError"),
      );
      console.error(error);
    }
  };

  const [removingAssignee, setRemovingAssignee] = useState<string | null>(null);

  const handleRemoveAssignee = async (userId: string) => {
    if (!taskId) return;
    try {
      setRemovingAssignee(userId);
      await unassignMutation.mutateAsync({
        id: taskId,
        data: { assigneeId: userId },
      });
      toast.success(t("task.assigneeRemovedSuccess"));
    } catch (error: unknown) {
      const errAny = error as { response?: { data?: { message?: string } } };
      toast.error(
        errAny.response?.data?.message ?? t("task.assigneeRemoveError"),
      );
      console.error(error);
    } finally {
      setRemovingAssignee(null);
    }
  };

  const getUsername = (id: string) =>
    users.find((u) => u.id === id)?.username ?? t("common.unknownUser");

  const handleDelete = async () => {
    if (!taskId) return;
    try {
      await deleteMutation.mutateAsync(taskId);
      toast.success(t("task.deleteSuccessToast"));
      onOpenChange(false);
    } catch (error: unknown) {
      const errAny = error as { response?: { data?: { message?: string } } };
      toast.error(
        errAny.response?.data?.message ?? t("task.deleteErrorFallback"),
      );
    }
  };

  const isArchived = Boolean(task?.archivedAt);
  const showApproveArchive =
    manageAssignments &&
    !isArchived &&
    (task?.status === "REVIEW" || task?.status === "DONE");
  const showRestore = manageAssignments && isArchived;

  useEffect(() => {
    if (isArchived) setIsEditing(false);
  }, [isArchived]);

  const handleApproveArchive = async () => {
    if (!taskId) return;
    try {
      await archiveMutation.mutateAsync(taskId);
      toast.success(t("archive.toastArchived"));
      onOpenChange(false);
    } catch (err: unknown) {
      const errAny = err as { response?: { data?: { message?: string } } };
      const code = errAny.response?.data?.message;
      if (code === "TASK_ARCHIVE_INVALID_STATUS") {
        toast.error(t("archive.errorInvalidStatus"));
      } else {
        toast.error(errAny.response?.data?.message ?? t("archive.errorArchive"));
      }
    }
  };

  const handleRestoreFromArchive = async () => {
    if (!taskId) return;
    try {
      await unarchiveMutation.mutateAsync(taskId);
      toast.success(t("archive.toastRestored"));
      onOpenChange(false);
    } catch (err: unknown) {
      const errAny = err as { response?: { data?: { message?: string } } };
      toast.error(errAny.response?.data?.message ?? t("archive.errorRestore"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] h-[90vh] md:h-[85vh] p-0 overflow-hidden flex flex-col bg-background/95 backdrop-blur-sm">
        <TaskDetailHeader
          task={task}
          taskId={taskId}
          isLoading={isLoading}
          isEditing={isEditing}
          canEditOrDelete={manageAssignments && !isArchived}
          showApproveArchive={showApproveArchive}
          showRestore={showRestore}
          isArchiveBusy={archiveMutation.isPending || unarchiveMutation.isPending}
          onApproveArchive={handleApproveArchive}
          onRestoreFromArchive={handleRestoreFromArchive}
          onStartEdit={() => setIsEditing(true)}
          onCancelEdit={() => {
            if (task) resetTask(mapTaskToForm(task));
            setIsEditing(false);
          }}
          onDelete={() => setShowDeleteDialog(true)}
          registerTask={registerTask}
        />

        <div className="flex-1 overflow-hidden grid md:grid-cols-[1fr_320px] divide-x">
          <div className="flex flex-col h-full overflow-hidden bg-background">
            <div className="flex-1 min-h-0 relative">
              <ScrollArea className="h-full">
                <div className="p-8 space-y-8 pb-4">
                  <TaskDescription
                    task={task}
                    isLoading={isLoading}
                    isEditing={isEditing}
                    registerTask={registerTask}
                    taskErrors={taskErrors}
                  />

                  <Separator />

                  <TaskComments
                    comments={comments}
                    isLoadingComments={isLoadingComments}
                    getUsername={getUsername}
                    register={register}
                    handleSubmit={handleSubmit}
                    onSubmitComment={onSubmitComment}
                    isSubmitting={isSubmitting}
                    isEditing={isEditing}
                    commentsDisabled={isArchived}
                    attachment={commentAttachment}
                    attachmentPreviewUrl={attachmentPreviewUrl}
                    commentFileInputRef={commentFileInputRef}
                    onCommentAttachmentPick={pickCommentAttachment}
                    onCommentAttachmentInputChange={onCommentAttachmentInputChange}
                    acceptCommentFilesAttempt={tryAcceptCommentFiles}
                    onClearAttachment={clearCommentAttachment}
                  />
                </div>
              </ScrollArea>
            </div>

            <div className="p-4 border-t bg-muted/10 shrink-0 z-10">
              {isEditing && !isArchived ? (
                <form onSubmit={handleSubmitTask(onSubmitUpdate)}>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (task) resetTask(mapTaskToForm(task));
                        setIsEditing(false);
                      }}
                      className="h-8 text-xs"
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={isUpdating}
                    >
                      {isUpdating ? t("common.saving") : t("common.save")}
                    </Button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>

          <div className="h-full bg-muted/5 p-6 flex flex-col gap-6 overflow-y-auto border-l">
            <TaskDetailsPanel
              task={task}
              isEditing={isEditing}
              registerTask={registerTask}
              getUsername={getUsername}
            />

            <Separator />

            <TaskParticipants
              taskAssignees={task?.assignees ?? []}
              users={users}
              candidateUsers={candidateUsers}
              isLoadingAllUsers={isLoadingAllUsers}
              openAssign={openAssign}
              setOpenAssign={setOpenAssign}
              handleToggleAssign={handleToggleAssign}
              handleRemoveAssignee={handleRemoveAssignee}
              removingAssignee={removingAssignee}
              manageAssignments={manageAssignments && !task?.archivedAt}
            />

            <Separator />

            <TaskHistory
              history={history}
              isLoadingHistory={isLoadingHistory}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={isFetchingNextPage}
              getHistoryUsername={getHistoryUsername}
              formatChangedFields={(entry: unknown) =>
                formatChangedFields(
                  entry as Record<string, unknown>,
                  referencedUsers,
                  t,
                )
              }
              getFirstName={getFirstName}
            />
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("task.confirmDeleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("task.confirmDeleteDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("common.delete")}
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
