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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/useTranslation";
import { useCreateTask } from "@/hooks/useTasks";
import {
  generateAiTaskDraft,
  type AiTaskDraft,
} from "@/lib/aiTaskAssistant";
import { buildCreateTaskSchema, type CreateTaskFormData } from "@/lib/schemas";
import type {
  CreateTaskDto,
  TaskChecklistItem,
  TaskPriority,
} from "@challenge/types";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Circle,
  GripVertical,
  ListChecks,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDeadlineISO?: string;
}

function makeChecklistId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof (crypto as Crypto).randomUUID === "function"
  ) {
    return (crypto as Crypto).randomUUID();
  }
  return `cl-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function defaultDeadlineLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      deadline: defaultDeadlineLocal(),
      assignees: [],
      checklist: [],
    },
  });

  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [newStepText, setNewStepText] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPreparedAt, setAiPreparedAt] = useState<number | null>(null);

  useEffect(() => {
    setValue("checklist", checklist, { shouldDirty: true });
  }, [checklist, setValue]);

  useEffect(() => {
    if (!open) return;
    reset({
      title: "",
      description: "",
      priority: "MEDIUM",
      deadline: defaultDeadlineLocal(),
      assignees: [],
      checklist: [],
    });
    setChecklist([]);
    setNewStepText("");
    setAiPrompt("");
    setAiPreparedAt(null);
  }, [open, reset]);

  useEffect(() => {
    if (!open || !initialDeadlineISO) return;
    const d = new Date(initialDeadlineISO);
    if (Number.isNaN(d.getTime())) return;
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setValue("deadline", local, { shouldValidate: true });
  }, [initialDeadlineISO, open, setValue]);

  const addChecklistStep = () => {
    const text = newStepText.trim();
    if (!text) return;
    setChecklist((prev) => [
      ...prev,
      { id: makeChecklistId(), title: text, completed: false },
    ]);
    setNewStepText("");
  };

  const removeChecklistStep = (id: string) => {
    setChecklist((prev) => prev.filter((step) => step.id !== id));
  };

  const updateChecklistStep = (id: string, title: string) => {
    setChecklist((prev) =>
      prev.map((step) => (step.id === id ? { ...step, title } : step)),
    );
  };

  const applyAiDraft = (draft: AiTaskDraft) => {
    setValue("title", draft.title, { shouldValidate: true, shouldDirty: true });
    setValue("description", draft.description, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue("priority", draft.priority as CreateTaskFormData["priority"], {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue("deadline", draft.deadlineLocal, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setChecklist(draft.checklist);
    setAiPreparedAt(Date.now());
  };

  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) {
      toast.error(t("createTask.aiEmptyPrompt"));
      return;
    }
    setAiBusy(true);
    setTimeout(() => {
      try {
        const draft = generateAiTaskDraft(aiPrompt);
        applyAiDraft(draft);
        toast.success(t("createTask.aiAppliedToast"));
      } finally {
        setAiBusy(false);
      }
    }, 350);
  };

  const onSubmit = async (data: CreateTaskFormData) => {
    try {
      const payload: CreateTaskDto = {
        title: data.title,
        description: data.description,
        priority: data.priority as TaskPriority,
        deadline: new Date(data.deadline),
        assignees: data.assignees,
        checklist: checklist.map((item) => ({
          id: item.id,
          title: item.title,
          completed: item.completed,
        })),
      };
      await createTask.mutateAsync(payload);
      toast.success(t("createTask.successToast"));
      onOpenChange(false);
      reset();
      setChecklist([]);
    } catch (error: unknown) {
      const axiosErr = error as {
        response?: { data?: { message?: string } };
      };
      toast.error(
        axiosErr.response?.data?.message ?? t("createTask.errorFallback"),
      );
    }
  };

  const priorityValue = watch("priority");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[920px] max-h-[92vh] overflow-hidden p-0 gap-0">
        <ScrollArea className="max-h-[92vh]">
          <div className="px-7 pt-7 pb-2">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {t("createTask.dialogTitle")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t("createTask.dialogSubtitle")}
              </DialogDescription>
            </DialogHeader>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="px-7 pt-4 pb-7 grid gap-6 md:grid-cols-[1fr_320px]"
          >
            <div className="space-y-5 min-w-0">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  {t("createTask.titleLabel")}
                </Label>
                <Input
                  id="title"
                  placeholder={t("createTask.titlePlaceholder")}
                  className="h-11"
                  {...register("title")}
                />
                {errors.title ? (
                  <p className="text-xs text-destructive">
                    {errors.title.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  {t("createTask.descriptionLabel")}
                </Label>
                <Textarea
                  id="description"
                  placeholder={t("createTask.descriptionPlaceholder")}
                  rows={5}
                  {...register("description")}
                />
                {errors.description ? (
                  <p className="text-xs text-destructive">
                    {errors.description.message}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {t("createTask.aiTitle")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("createTask.aiSubtitle")}
                    </p>
                  </div>
                </div>

                <Textarea
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  placeholder={t("createTask.aiPromptPlaceholder")}
                  rows={3}
                  className="bg-background"
                />

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-muted-foreground flex-1 min-w-[160px]">
                    {aiPreparedAt
                      ? t("createTask.aiPreparedHint")
                      : t("createTask.aiIdleHint")}
                  </p>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleAiGenerate}
                    disabled={aiBusy}
                    className="gap-1.5"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    {aiBusy
                      ? t("createTask.aiBusy")
                      : t("createTask.aiGenerate")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-5 min-w-0">
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-medium">
                  {t("task.priorityField")}
                </Label>
                <Select
                  onValueChange={(value) =>
                    setValue(
                      "priority",
                      value as CreateTaskFormData["priority"],
                      { shouldValidate: true },
                    )
                  }
                  value={priorityValue}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue
                      placeholder={t("createTask.priorityPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">
                      {t("task.priority.low")}
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      {t("task.priority.medium")}
                    </SelectItem>
                    <SelectItem value="HIGH">
                      {t("task.priority.high")}
                    </SelectItem>
                    <SelectItem value="URGENT">
                      {t("task.priority.urgent")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority ? (
                  <p className="text-xs text-destructive">
                    {errors.priority.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline" className="text-sm font-medium">
                  {t("createTask.deadlineLabel")}
                </Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  className="h-11"
                  {...register("deadline")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("createTask.deadlineHelp")}
                </p>
                {errors.deadline ? (
                  <p className="text-xs text-destructive">
                    {errors.deadline.message}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <ListChecks className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {t("createTask.checklistTitle")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("createTask.checklistSubtitle")}
                    </p>
                  </div>
                </div>

                {checklist.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      {t("createTask.checklistEmpty")}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {checklist.map((step, index) => (
                      <li
                        key={step.id}
                        className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5"
                      >
                        <GripVertical
                          className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0"
                          aria-hidden
                        />
                        <span className="text-xs font-medium text-muted-foreground tabular-nums w-5 shrink-0">
                          {index + 1}.
                        </span>
                        <Input
                          value={step.title}
                          onChange={(event) =>
                            updateChecklistStep(step.id, event.target.value)
                          }
                          className="h-8 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeChecklistStep(step.id)}
                          aria-label={t("createTask.checklistRemoveAria")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    value={newStepText}
                    onChange={(event) => setNewStepText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addChecklistStep();
                      }
                    }}
                    placeholder={t("createTask.checklistAddPlaceholder")}
                    className="h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={addChecklistStep}
                    aria-label={t("createTask.checklistAddAria")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {checklist.length > 0 ? (
                  <div className="flex items-center gap-2 pt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">
                      {t("createTask.checklistCount", {
                        count: String(checklist.length),
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <p className="text-xs text-muted-foreground">
                      {t("createTask.checklistNoneHint")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t -mx-7 px-7 pb-0 mt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  reset();
                  setChecklist([]);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[160px]">
                {isSubmitting
                  ? t("createTask.submitBusy")
                  : t("createTask.submitIdle")}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
