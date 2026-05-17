import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/useTranslation";
import { Link } from "@tanstack/react-router";
import { displayUsername, userInitials } from "@/lib/userDisplay";
import { workerSpecializationTranslationKey } from "@/lib/workerSpecializationI18n";
import { fetchWorkerById, patchMyProfile } from "@/services/profile.service";
import { WorkerSpecialization } from "@challenge/types/enums";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const SPEC_ORDER: WorkerSpecialization[] = [
  WorkerSpecialization.FRONTEND,
  WorkerSpecialization.BACKEND,
  WorkerSpecialization.FULLSTACK,
  WorkerSpecialization.QA,
  WorkerSpecialization.DESIGNER,
  WorkerSpecialization.ANALYST,
  WorkerSpecialization.DEVOPS,
  WorkerSpecialization.OTHER,
];

export function WorkerDetailPage(props: { workerId: string }) {
  const { workerId } = props;
  const { t } = useTranslation();
  const { user: me, refreshProfile } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["workerProfile", workerId],
    queryFn: () => fetchWorkerById(workerId),
    enabled: !!workerId,
  });

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [spec, setSpec] = useState<WorkerSpecialization | "">("");

  useEffect(() => {
    if (!data) return;
    setDisplayName(data.displayName ?? "");
    setBio(data.bio ?? "");
    setSkills((data.skills ?? []).join(", "));
    setSpec((data.specialization as WorkerSpecialization | null) ?? "");
  }, [data]);

  const mutate = useMutation({
    mutationFn: () =>
      patchMyProfile({
        displayName: displayName.trim() ? displayName.trim() : null,
        bio: bio.trim() ? bio.trim() : null,
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        specialization: spec || null,
      }),
    onSuccess: async () => {
      void qc.invalidateQueries({ queryKey: ["workerProfile", workerId] });
      void qc.invalidateQueries({ queryKey: ["workersDirectory"] });
      void qc.invalidateQueries({ queryKey: ["usersByIds"] });
      await qc.refetchQueries({ queryKey: ["profileMine"] });
      await refreshProfile();
      toast.success(t("profile.saveSuccess"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const canEdit = me?.id === workerId && data?.role === "USER";

  if (!data) {
    return (
      <AuthenticatedShell headerTitleKey="workers.pageTitle">
        <div className="p-6 text-sm text-muted-foreground">{t("common.loadingShort")}</div>
      </AuthenticatedShell>
    );
  }

  const isWorkerCard = data.role === "USER";

  return (
    <AuthenticatedShell headerTitleKey="workers.pageTitle">
      <div className="mx-auto max-w-xl space-y-6 p-4 lg:p-6">
        {me?.id === workerId ? (
          <Button asChild variant="link" className="h-auto p-0 text-sm">
            <Link to="/profile">{t("profile.pageTitle")}</Link>
          </Button>
        ) : null}

        <div className="flex items-start gap-4">
          <Avatar className="size-16">
            {data.avatarData ? <AvatarImage src={data.avatarData} alt="" /> : null}
            <AvatarFallback>{userInitials(data)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{displayUsername(data)}</p>
            <p className="text-sm text-muted-foreground">{data.email}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("profile.roleLabel")}:{" "}
              {data.role === "ADMIN" ? t("admin.role.admin") : t("dashboard.roleWorker")}
            </p>
          </div>
        </div>

        {!isWorkerCard ? (
          <p className="text-sm text-muted-foreground">{t("workers.pageSubtitle")}</p>
        ) : (
          <>
            {!canEdit && me?.id !== workerId ? (
              <p className="text-xs text-muted-foreground">{t("profile.peerViewHint")}</p>
            ) : null}

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t("profile.displayName")}</Label>
                <Input value={displayName} disabled={!canEdit} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("profile.skillsLabel")}</Label>
                <Input value={skills} disabled={!canEdit} onChange={(e) => setSkills(e.target.value)} />
                <p className="text-xs text-muted-foreground">{t("profile.skillsHelp")}</p>
              </div>
              <div className="space-y-1">
                <Label>{t("workers.specialization")}</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={spec}
                  disabled={!canEdit}
                  onChange={(e) => setSpec(e.target.value as WorkerSpecialization | "")}
                >
                  <option value="">{String(t("common.dash"))}</option>
                  {SPEC_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {t(workerSpecializationTranslationKey(s))}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t("profile.bioLabel")}</Label>
                <Textarea rows={5} value={bio} disabled={!canEdit} onChange={(e) => setBio(e.target.value)} />
              </div>
            </div>

            {canEdit ? (
              <Button type="button" onClick={() => mutate.mutate()} disabled={mutate.isPending}>
                {t("profile.saveProfile")}
              </Button>
            ) : null}
          </>
        )}
      </div>
    </AuthenticatedShell>
  );
}
