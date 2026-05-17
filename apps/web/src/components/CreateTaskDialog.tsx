import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/useTranslation";
import { buildCreateTaskSchema, type CreateTaskFormData } from "@/lib/schemas";
import { useCreateTask } from "@/hooks/useTasks";
import type { CreateTaskDto, TaskPriority } from "@challenge/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDeadlineISO?: string;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  initialDeadlineISO,
}: CreateTaskDialogProps) {
  const { t } = useTranslation();
  const createTask = useCreateTask();
  const schema = useMemo(() => buildCreateTaskSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!open || !initialDeadlineISO) {
      return;
    }
    const d = new Date(initialDeadlineISO);
    if (Number.isNaN(d.getTime())) {
      return;
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setValue("deadline", local, { shouldValidate: true });
  }, [initialDeadlineISO, open, setValue]);

  const onSubmit = async (data: CreateTaskFormData) => {
    try {
      const payload: CreateTaskDto = {
        title: data.title,
        description: data.description,
        priority: data.priority as TaskPriority,
        deadline: new Date(data.deadline),
        assignees: data.assignees,
      };
      await createTask.mutateAsync(payload);
      toast.success(t("createTask.successToast"));
      onOpenChange(false);
      reset();
    } catch (error: unknown) {
      const axiosErr = error as {
        response?: { data?: { message?: string } };
      };
      toast.error(
        axiosErr.response?.data?.message ?? t("createTask.errorFallback"),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("createTask.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("createTask.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("createTask.titleLabel")}</Label>
            <Input
              id="title"
              placeholder={t("createTask.titlePlaceholder")}
              {...register("title")}
            />
            {errors.title ? (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("createTask.descriptionLabel")}</Label>
            <Textarea
              id="description"
              placeholder={t("createTask.descriptionPlaceholder")}
              rows={4}
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">{t("task.priorityField")}</Label>
              <Select
                onValueChange={(value) =>
                  setValue(
                    "priority",
                    value as CreateTaskFormData["priority"],
                  )
                }
                value={watch("priority")}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("createTask.priorityPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">{t("task.priority.low")}</SelectItem>
                  <SelectItem value="MEDIUM">
                    {t("task.priority.medium")}
                  </SelectItem>
                  <SelectItem value="HIGH">{t("task.priority.high")}</SelectItem>
                  <SelectItem value="URGENT">
                    {t("task.priority.urgent")}
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.priority ? (
                <p className="text-sm text-destructive">
                  {errors.priority.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">{t("createTask.deadlineLabel")}</Label>
              <Input
                id="deadline"
                type="datetime-local"
                {...register("deadline")}
              />
              {errors.deadline ? (
                <p className="text-sm text-destructive">{errors.deadline.message}</p>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("createTask.submitBusy") : t("createTask.submitIdle")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
