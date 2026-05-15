import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/useTranslation";
import type { CommentFormData } from "@/lib/schemas";
import { format } from "date-fns";
import React from "react";

interface Props {
  comments: Record<string, unknown>[];
  isLoadingComments: boolean;
  getUsername: (id: string) => string;
  register: any;
  handleSubmit: any;
  onSubmitComment: (data: CommentFormData) => Promise<void>;
  isSubmitting: boolean;
  isEditing: boolean;
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
}) => {
  const { t, dateFnsLocale } = useTranslation();

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
              <p className="text-sm text-muted-foreground leading-relaxed">
                {String(comment.content ?? "")}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {t("comments.emptyHint")}
          </p>
        )}
      </div>

      <div className="h-2" />

      {!isEditing ? (
        <form onSubmit={handleSubmit(onSubmitComment)} className="mt-2">
          <div className="relative">
            <Textarea
              placeholder={t("comments.placeholder")}
              className="min-h-20 pr-20 resize-none bg-background focus-visible:ring-1"
              {...register("content")}
            />
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
