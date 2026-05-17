import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { useTranslation } from "@/i18n/useTranslation";

export function AutomationsPage() {
  const { t } = useTranslation();
  return (
    <AuthenticatedShell headerTitleKey="nav.automation">
      <div className="mx-auto max-w-[900px] space-y-3 p-4 lg:p-6">
        <p className="text-sm text-muted-foreground">
          {t("dashboard.bottomAutomationHint")}
        </p>
      </div>
    </AuthenticatedShell>
  );
}
