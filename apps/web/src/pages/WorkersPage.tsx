import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useTranslation } from "@/i18n/useTranslation";
import { sharedBoardQueryFlag } from "@/lib/rbac";
import { userInitials } from "@/lib/userDisplay";
import { workerSpecializationTranslationKey } from "@/lib/workerSpecializationI18n";
import { fetchWorkersDirectory } from "@/services/profile.service";
import type { ResponseTaskDto, ResponseUserDto, WorkerSpecialization } from "@challenge/types";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

function countForWorker(tasks: ResponseTaskDto[], id: string) {
  let open = 0;
  let done = 0;
  for (const t of tasks) {
    const assignees = t.assignees ?? [];
    if (!assignees.includes(id)) continue;
    if (t.status === "DONE") done += 1;
    else open += 1;
  }
  return { open, done };
}

function sortWorkerDisplayName(u: ResponseUserDto) {
  const n = u.displayName?.trim();
  return (n?.length ? n : u.username) ?? "";
}

export function WorkersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["workersDirectory"],
    queryFn: fetchWorkersDirectory,
  });

  const { data: tasksData } = useTasks({
    page: 1,
    limit: 200,
    sharedBoard: sharedBoardQueryFlag(user?.role),
  });

  const tasks = tasksData?.items ?? [];

  const rows = useMemo(() => {
    return [...data].sort((a, b) =>
      sortWorkerDisplayName(a).localeCompare(sortWorkerDisplayName(b)),
    );
  }, [data]);

  return (
    <AuthenticatedShell headerTitleKey="workers.pageTitle">
      <div className="mx-auto max-w-[1200px] space-y-6 p-4 lg:p-6">
        <p className="text-sm text-muted-foreground">{t("workers.pageSubtitle")}</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loadingShort")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("workers.empty")}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((w) => {
              const { open, done } = countForWorker(tasks, w.id);
              const wl = Math.min(98, Math.round(open * 18));
              const spec = w.specialization as WorkerSpecialization | null | undefined;
              return (
                <Link
                  key={w.id}
                  to="/workers/$workerId"
                  params={{ workerId: w.id }}
                  className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="size-11">
                      {w.avatarData ? <AvatarImage src={w.avatarData} alt="" /> : null}
                      <AvatarFallback className="text-xs font-semibold">{userInitials(w)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {w.displayName?.trim() ? w.displayName.trim() : w.username}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {spec
                          ? t(workerSpecializationTranslationKey(spec))
                          : t("workers.noSpecialization")}
                      </p>
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        {t("workers.assignedOpen", { count: open })} ·{" "}
                        {t("workers.completedHint", { count: done })}
                      </p>
                      <div className="mt-3 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${wl}%` }} />
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {t("workers.workloadHint", { pct: wl })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AuthenticatedShell>
  );
}
