import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/useTranslation";
import { displayUsername, userInitials } from "@/lib/userDisplay";
import { workerSpecializationTranslationKey } from "@/lib/workerSpecializationI18n";
import { fetchMyProfile, patchMyProfile } from "@/services/profile.service";
import { WorkerSpecialization } from "@challenge/types/enums";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function profileQueryErrorDetail(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data;
    if (
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof (payload as { message: unknown }).message === "string"
    ) {
      const m = (payload as { message: string }).message.trim();
      if (m) return m;
    }
    return error.message.trim();
  }
  if (error instanceof Error) return error.message.trim();
  return "";
}

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

function readAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("type"));
      return;
    }
    if (file.size > 120_000) {
      reject(new Error("size"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = String(reader.result ?? "");
      if (!r.startsWith("data:image/")) {
        reject(new Error("data"));
        return;
      }
      resolve(r);
    };
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

export function ProfilePage() {
  const { t } = useTranslation();
  const { user: me, refreshProfile, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profileMine"],
    queryFn: fetchMyProfile,
    enabled: !authLoading && me?.role === "USER",
    retry: 1,
  });
  const data = profileQuery.data;

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [telegram, setTelegram] = useState("");
  const [github, setGithub] = useState("");
  const [spec, setSpec] = useState<WorkerSpecialization | "">("");

  useEffect(() => {
    if (!data) {
      return;
    }
    setDisplayName(data.displayName ?? "");
    setBio(data.bio ?? "");
    setSkills((data.skills ?? []).join(", "));
    setTelegram(data.telegramContact ?? "");
    setGithub(data.githubUrl ?? "");
    setSpec((data.specialization as WorkerSpecialization | null) ?? "");
  }, [data]);

  const mutate = useMutation({
    mutationFn: patchMyProfile,
    onSuccess: async () => {
      await refreshProfile();
      void qc.invalidateQueries({ queryKey: ["usersByIds"] });
      void qc.invalidateQueries({ queryKey: ["workersDirectory"] });
      toast.success(t("profile.saveSuccess"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const onAvatar = async (file: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await readAvatarFile(file);
      mutate.mutate({ avatarData: dataUrl });
    } catch {
      toast.error(t("common.error"));
    }
  };

  if (authLoading) {
    return (
      <AuthenticatedShell headerTitleKey="profile.pageTitle">
        <div className="p-6 text-sm text-muted-foreground">{t("common.loadingShort")}</div>
      </AuthenticatedShell>
    );
  }

  if (!me || me.role !== "USER") {
    return (
      <AuthenticatedShell headerTitleKey="profile.pageTitle">
        <div className="p-6 text-sm text-muted-foreground">{t("common.forbidden")}</div>
      </AuthenticatedShell>
    );
  }

  if (profileQuery.isPending) {
    return (
      <AuthenticatedShell headerTitleKey="profile.pageTitle">
        <div className="p-6 text-sm text-muted-foreground">{t("common.loadingShort")}</div>
      </AuthenticatedShell>
    );
  }

  if (profileQuery.isError || !data) {
    const detail = profileQueryErrorDetail(profileQuery.error);
    return (
      <AuthenticatedShell headerTitleKey="profile.pageTitle">
        <div className="mx-auto max-w-xl space-y-4 p-4 lg:p-6">
          <p className="text-sm text-muted-foreground">{t("profile.loadFailed")}</p>
          {detail ? <p className="break-words font-mono text-xs text-destructive">{detail}</p> : null}
          <Button type="button" variant="outline" onClick={() => void profileQuery.refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      </AuthenticatedShell>
    );
  }

  const save = () => {
    mutate.mutate({
      displayName: displayName.trim() ? displayName.trim() : null,
      bio: bio.trim() ? bio.trim() : null,
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      telegramContact: telegram.trim() ? telegram.trim() : null,
      githubUrl: github.trim() ? github.trim() : null,
      specialization: spec || null,
    });
  };

  return (
    <AuthenticatedShell headerTitleKey="profile.pageTitle">
      <div className="mx-auto max-w-xl space-y-6 p-4 lg:p-6">
        <div className="flex items-start gap-4">
          <Avatar className="size-16">
            {data.avatarData ? <AvatarImage src={data.avatarData} alt="" /> : null}
            <AvatarFallback>{userInitials(data)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{displayUsername(data)}</p>
            <p className="text-sm text-muted-foreground">{data.email}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t("profile.avatarHint")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Input type="file" accept="image/png,image/jpeg" className="max-w-xs" onChange={(e) => void onAvatar(e.target.files?.[0] ?? null)} />
              <Button type="button" variant="outline" size="sm" onClick={() => mutate.mutate({ clearAvatar: true })}>
                {t("profile.clearAvatar")}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{t("profile.emailReadonly")}</Label>
            <Input value={data.email} disabled />
          </div>
          <div className="space-y-1">
            <Label>{t("profile.displayName")}</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("profile.skillsLabel")}</Label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("profile.skillsHelp")}</p>
          </div>
          <div className="space-y-1">
            <Label>{t("workers.specialization")}</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={spec}
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
            <Textarea rows={5} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("profile.telegramLabel")}</Label>
            <Input value={telegram} onChange={(e) => setTelegram(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("profile.githubLabel")}</Label>
            <Input value={github} onChange={(e) => setGithub(e.target.value)} />
          </div>
        </div>

        <Button type="button" onClick={() => save()} disabled={mutate.isPending}>
          {t("profile.saveProfile")}
        </Button>
      </div>
    </AuthenticatedShell>
  );
}
