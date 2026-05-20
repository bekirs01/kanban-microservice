import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateTask } from "@/hooks/useTasks";
import { useTranslation } from "@/i18n/useTranslation";
import { cn } from "@/lib/utils";
import type {
  ResponseTaskDto,
  TaskChecklistItem,
} from "@challenge/types";
import { Check, ListChecks, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function makeId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof (crypto as Crypto).randomUUID === "function"
  ) {
    return (crypto as Crypto).randomUUID();
  }
  return `cl-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

interface Props {
  task: ResponseTaskDto | undefined;
  canToggle: boolean;
  canManage: boolean;
}

export function TaskChecklist({ task, canToggle, canManage }: Props) {
  const { t } = useTranslation();
  const updateMutation = useUpdateTask();

  const initial = useMemo<TaskChecklistItem[]>(
    () => (Array.isArray(task?.checklist) ? (task!.checklist as TaskChecklistItem[]) : []),
    [task?.checklist],
  );

  const [items, setItems] = useState<TaskChecklistItem[]>(initial);
  const [newStepText, setNewStepText] = useState("");

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  if (!task) return null;

  const persist = async (next: TaskChecklistItem[]) => {
    try {
      await updateMutation.mutateAsync({
        id: task.id,
        data: { checklist: next },
      });
    } catch (err: unknown) {
      const errAny = err as { response?: { data?: { message?: string } } };
      toast.error(
        errAny.response?.data?.message ?? t("task.checklistUpdateError"),
      );
      setItems(initial);
    }
  };

  const toggleStep = async (id: string) => {
    if (!canToggle) return;
    const next = items.map((it) =>
      it.id === id ? { ...it, completed: !it.completed } : it,
    );
    setItems(next);
    await persist(next);
  };

  const addStep = async () => {
    const text = newStepText.trim();
    if (!text || !canManage) return;
    const next: TaskChecklistItem[] = [
      ...items,
      { id: makeId(), title: text, completed: false },
    ];
    setItems(next);
    setNewStepText("");
    await persist(next);
  };

  const removeStep = async (id: string) => {
    if (!canManage) return;
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    await persist(next);
  };

  const total = items.length;
  const completed = items.filter((it) => it.completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("task.checklistSectionTitle")}
        </h3>
        {total > 0 ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("task.checklistProgress", {
              done: String(completed),
              total: String(total),
            })}
          </span>
        ) : null}
      </div>

      {total > 0 ? (
        <div className="flex items-center gap-2">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold tabular-nums text-foreground/90">
            {pct}%
          </span>
        </div>
      ) : null}

      {total === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            {canManage
              ? t("task.checklistEmptyManage")
              : t("task.checklistEmpty")}
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((step, index) => (
            <li
              key={step.id}
              className={cn(
                "group flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 transition-colors",
                step.completed && "border-emerald-200 bg-emerald-50/40",
              )}
            >
              <button
                type="button"
                onClick={() => toggleStep(step.id)}
                disabled={!canToggle}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                  step.completed
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-input bg-background text-transparent",
                  canToggle
                    ? "hover:border-primary"
                    : "cursor-not-allowed opacity-70",
                )}
                aria-pressed={step.completed}
                aria-label={
                  step.completed
                    ? t("task.checklistMarkUndone")
                    : t("task.checklistMarkDone")
                }
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-medium text-muted-foreground tabular-nums w-5 shrink-0">
                {index + 1}.
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm leading-snug [overflow-wrap:anywhere]",
                  step.completed && "line-through text-muted-foreground",
                )}
              >
                {step.title}
              </span>
              {canManage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => removeStep(step.id)}
                  aria-label={t("createTask.checklistRemoveAria")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="flex items-center gap-2">
          <Input
            value={newStepText}
            onChange={(event) => setNewStepText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addStep();
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
            onClick={addStep}
            aria-label={t("createTask.checklistAddAria")}
            disabled={!newStepText.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export default TaskChecklist;
