import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { useTranslation } from "@/i18n/useTranslation";

export function QueuePage() {
  const { t } = useTranslation();
  return (
    <AuthenticatedShell headerTitleKey="nav.queue">
      <div className="mx-auto max-w-[900px] space-y-3 p-4 lg:p-6">
        <p className="text-sm text-muted-foreground">
          {t("dashboard.bottomQueueThroughput")}
        </p>
      </div>
    </AuthenticatedShell>
  );
}
