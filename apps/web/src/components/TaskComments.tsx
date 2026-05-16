import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/useTranslation";
import type { CommentFormData } from "@/lib/schemas";
import { format } from "date-fns";
import { Paperclip, X } from "lucide-react";
import React, { useRef, useState } from "react";

const COMMENT_IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";

function resolveUploadImageUrl(storedPath: string) {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  const path = storedPath.startsWith("/") ? storedPath : `/${storedPath}`;
  return `${base}${path}`;
}

interface Props {
  comments: Record<string, unknown>[];
  isLoadingComments: boolean;
  getUsername: (id: string) => string;
  register: unknown;
  handleSubmit: any;
  onSubmitComment: (
    data: CommentFormData,
    attachment: File | null,
  ) => void | Promise<void>;
  isSubmitting: boolean;
  isEditing: boolean;
  commentsDisabled?: boolean;
  attachment: File | null;
  attachmentPreviewUrl: string | null;
  commentFileInputRef: React.RefObject<HTMLInputElement | null>;
  onCommentAttachmentPick: () => void;
  onCommentAttachmentInputChange: React.ChangeEventHandler<HTMLInputElement>;
  acceptCommentFilesAttempt: (files: File[]) => void;
  onClearAttachment: () => void;
}

export const TaskComments: React.FC<Props> = ({
  comments,
  isLoadingComments,
  getUsername,
  register,
  handleSubmit,
  onSubmitComment,
  isSubmitting,
  isEditing,
  commentsDisabled = false,
  attachment,
  attachmentPreviewUrl,
  commentFileInputRef,
  onCommentAttachmentPick,
  onCommentAttachmentInputChange,
  acceptCommentFilesAttempt,
  onClearAttachment,
}) => {
  const { t, dateFnsLocale } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const dragDepthRef = useRef(0);

  const reg = register as (
    name: keyof CommentFormData,
  ) => Record<string, unknown>;

  const onInnerDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  };

  const onInnerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onInnerDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  };

  const onInnerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);
    const list = Array.from(e.dataTransfer?.files ?? []);
    acceptCommentFilesAttempt(list);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{t("comments.title")}</h3>
        <Badge variant="secondary" className="text-[10px] h-5">
          {comments.length}
        </Badge>
      </div>

      <div className="space-y-4 pl-4 border-l-2 border-muted">
        {isLoadingComments ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id as string} className="group relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">
                  {getUsername(String(comment.authorId))}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(comment.createdAt as string), "dd MMM yy • HH:mm", {
                    locale: dateFnsLocale,
                  })}
                </span>
              </div>
              {String(comment.content ?? "").trim().length ? (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {String(comment.content ?? "").trim()}
                </p>
              ) : null}
              {typeof comment.imageUrl === "string" && comment.imageUrl.trim().length > 0 ? (
                <button
                  type="button"
                  className="mt-2 inline-block rounded-md overflow-hidden border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-zoom-in bg-muted/40"
                  onClick={() =>
                    window.open(resolveUploadImageUrl(String(comment.imageUrl)), "_blank")
                  }
                >
                  <img
                    src={resolveUploadImageUrl(String(comment.imageUrl))}
                    alt=""
                    className="max-h-56 max-w-full object-contain"
                  />
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {t("comments.emptyHint")}
          </p>
        )}
      </div>

      <div className="h-2" />

      {commentsDisabled ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("comments.archivedLocked")}</p>
      ) : null}

      {!isEditing && !commentsDisabled ? (
        <form
          onSubmit={handleSubmit(async (data: CommentFormData) =>
            onSubmitComment(data, attachment))}
          className="mt-2 space-y-2"
        >
          <input
            ref={commentFileInputRef}
            type="file"
            className="sr-only"
            accept={COMMENT_IMAGE_ACCEPT}
            onChange={onCommentAttachmentInputChange}
          />

          {attachmentPreviewUrl ? (
            <div className="relative inline-block rounded-md border overflow-hidden max-w-[200px]">
              <img
                src={attachmentPreviewUrl}
                alt={t("comments.previewAlt")}
                className="max-h-40 w-auto object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-7 w-7"
                aria-label={t("comments.clearAttachmentAria")}
                onClick={onClearAttachment}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : null}

          <div
            className={cn(
              "relative rounded-md transition-colors border border-transparent",
              dragActive &&
                "ring-2 ring-primary ring-offset-2 ring-offset-background border-dashed border-primary/80",
            )}
            onDragEnter={onInnerDragEnter}
            onDragLeave={onInnerDragLeave}
            onDragOver={onInnerDragOver}
            onDrop={onInnerDrop}
          >
            {dragActive ? (
              <div className="pointer-events-none absolute inset-0 z-10 rounded-md bg-background/80 backdrop-blur-sm flex items-center justify-center border border-dashed border-primary">
                <p className="text-xs font-medium text-foreground">{t("comments.dragHint")}</p>
              </div>
            ) : null}
            <Textarea
              placeholder={t("comments.placeholder")}
              className={cn(
                "min-h-20 pr-[7.75rem] pl-14 resize-none bg-background focus-visible:ring-1",
                dragActive && "opacity-75",
              )}
              {...reg("content")}
            />
            <div className="absolute bottom-2 left-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2"
                disabled={isSubmitting}
                aria-label={t("comments.attachAria")}
                onClick={onCommentAttachmentPick}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute bottom-2 right-2">
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 text-xs"
              >
                {isSubmitting ? t("comments.submitBusy") : t("comments.submitIdle")}
              </Button>
            </div>
          </div>
        </form>
      ) : null}
    </section>
  );
};

export default TaskComments;
