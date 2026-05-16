import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/i18n/useTranslation";
import type { AdminListedUser } from "@/services/admin.service";
import { cn } from "@/lib/utils";
import type { ResponseTaskDto, UserRole } from "@challenge/types";

function roleLabelKey(role: UserRole): string {
  const map: Record<UserRole, string> = {
    ADMIN: "admin.role.admin",
    MANAGER: "admin.role.manager",
    USER: "admin.role.user",
  };
  return map[role];
}

interface DashboardParticipantsPanelProps {
  users: AdminListedUser[];
  tasks: ResponseTaskDto[];
}

export function DashboardParticipantsPanel({
  users,
  tasks,
}: DashboardParticipantsPanelProps) {
  const { t } = useTranslation();

  const counts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.id] = 0;
    return acc;
  }, {});
  for (const task of tasks) {
    for (const id of task.assignees || []) {
      if (counts[id] != null) counts[id] += 1;
    }
  }

  const sorted = [...users].sort((a, b) =>
    a.username.localeCompare(b.username),
  );

  return (
    <div
      id="dashboard-participants"
      className="flex max-h-[320px] flex-col rounded-xl border bg-card shadow-md"
    >
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold leading-tight">
          {t("dashboard.participantsPanelTitle")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("dashboard.participantsSummary", { count: sorted.length })}
        </p>
      </div>
      <ScrollArea className="max-h-[240px] flex-1">
        <ul className="divide-y p-1">
          {sorted.map((u) => (
            <li
              key={u.id}
              className="flex items-start gap-3 px-3 py-2.5 text-sm"
            >
              <Avatar className="h-9 w-9 border border-border/60">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {u.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium leading-tight">
                  {u.username}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {t(roleLabelKey(u.role))}
                  </Badge>
                  <span
                    className={cn(
                      "text-[11px] tabular-nums text-muted-foreground",
                    )}
                  >
                    {t("dashboard.participantsAssignedCount", {
                      count: counts[u.id] ?? 0,
                    })}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
