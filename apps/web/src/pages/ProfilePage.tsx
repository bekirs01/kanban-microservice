import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/useTranslation";
import { displayUsername, userInitials } from "@/lib/userDisplay";
import { workerSpecializationTranslationKey } from "@/lib/workerSpecializationI18n";
import { fetchMyProfile, patchMyProfile } from "@/services/profile.service";
import type { PatchWorkerProfileDto, ResponseUserDto } from "@challenge/types";
import { WorkerSpecialization } from "@challenge/types/enums";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
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

const AVATAR_MAX_DATA_URL_LENGTH = 131_000;
const AVATAR_SIZE_STEPS = [192, 160, 128, 96];
const AVATAR_QUALITY_STEPS = [0.78, 0.68, 0.58, 0.48];

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("read"));
    };
    img.src = url;
  });
}

function renderAvatarDataUrl(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number,
): string {
  const sourceWidth = img.naturalWidth || img.width;
  const sourceHeight = img.naturalHeight || img.height;
  if (!sourceWidth || !sourceHeight) {
    throw new Error("data");
  }

  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("data");
  }
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function readAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      reject(new Error("type"));
      return;
    }

    loadImage(file)
      .then((img) => {
        for (const size of AVATAR_SIZE_STEPS) {
          for (const quality of AVATAR_QUALITY_STEPS) {
            const dataUrl = renderAvatarDataUrl(img, size, quality);
            if (dataUrl.length <= AVATAR_MAX_DATA_URL_LENGTH) {
              resolve(dataUrl);
              return;
            }
          }
        }
        reject(new Error("size"));
      })
      .catch(reject);
  });
}

type AvatarLocalChange = null | { kind: "set"; dataUrl: string } | { kind: "clear" };

export function ProfilePage() {
  const { t } = useTranslation();
  const { user: me, refreshProfile, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
  const [spec, setSpec] = useState<WorkerSpecialization | "">("");
  const [avatarLocal, setAvatarLocal] = useState<AvatarLocalChange>(null);
  const didHydrateFormRef = useRef(false);

  useEffect(() => {
    if (!data) {
      return;
    }
    if (!didHydrateFormRef.current) {
      didHydrateFormRef.current = true;
      setDisplayName(data.displayName ?? "");
      setBio(data.bio ?? "");
      setSkills((data.skills ?? []).join(", "));
      setSpec((data.specialization as WorkerSpecialization | null) ?? "");
    }
  }, [data]);

  const mutate = useMutation({
    mutationFn: patchMyProfile,
    onSuccess: async (updated) => {
      qc.setQueryData<ResponseUserDto>(["profileMine"], updated);
      if (me?.id) {
        qc.setQueryData<ResponseUserDto>(["workerProfile", me.id], updated);
      }
      qc.setQueriesData<ResponseUserDto[]>(
        { queryKey: ["usersByIds"] },
        (old) =>
          old?.map((user) => (user.id === updated.id ? updated : user)),
      );
      qc.setQueryData<ResponseUserDto[]>(["workersDirectory"], (old) =>
        old?.map((user) => (user.id === updated.id ? updated : user)),
      );
      setAvatarLocal(null);
      await refreshProfile();
      void qc.invalidateQueries({ queryKey: ["usersByIds"] });
      void qc.invalidateQueries({ queryKey: ["workersDirectory"] });
      toast.success(t("profile.saveSuccess"));
    },
    onError: (error) =>
      toast.error(profileQueryErrorDetail(error) || t("common.error")),
  });

  const onPickAvatarFile = async (file: File | null) => {
    if (!file || mutate.isPending) return;
    let dataUrl: string;
    try {
      dataUrl = await readAvatarFile(file);
    } catch {
      toast.error(t("common.error"));
      return;
    }
    setAvatarLocal({ kind: "set", dataUrl });
    try {
      await mutate.mutateAsync({ avatarData: dataUrl });
    } catch {
      // Keep local preview so the user can retry with "Save profile" if PATCH failed.
    }
  };

  const onClearPersistedAvatar = async () => {
    if (mutate.isPending) return;
    setAvatarLocal({ kind: "clear" });
    try {
      await mutate.mutateAsync({ clearAvatar: true });
    } catch {
      setAvatarLocal(null);
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
    const body: PatchWorkerProfileDto = {
      displayName: displayName.trim() ? displayName.trim() : null,
      bio: bio.trim() ? bio.trim() : null,
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      specialization: spec || null,
    };
    if (avatarLocal !== null) {
      if (avatarLocal.kind === "clear") {
        body.clearAvatar = true;
      } else {
        body.avatarData = avatarLocal.dataUrl;
      }
    }
    mutate.mutate(body);
  };

  const avatarPreviewSrc: string | undefined =
    avatarLocal === null
      ? (data.avatarData ?? undefined)
      : avatarLocal.kind === "clear"
        ? undefined
        : avatarLocal.dataUrl;
  const hasAvatarPreview = Boolean(avatarPreviewSrc);

  return (
    <AuthenticatedShell headerTitleKey="profile.pageTitle">
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="border-b bg-muted/25 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar className="size-24 border-4 border-background shadow-sm ring-1 ring-border">
                {avatarPreviewSrc ? <AvatarImage src={avatarPreviewSrc} alt="" /> : null}
                <AvatarFallback className="text-xl font-semibold">
                  {userInitials(data)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="truncate text-2xl font-semibold tracking-tight">
                    {displayUsername(data)}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{data.email}</p>
                </div>
                <p className="max-w-xl text-sm text-muted-foreground">
                  {t("profile.avatarHint")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    disabled={mutate.isPending}
                    onChange={(e) => {
                      void onPickAvatarFile(e.target.files?.[0] ?? null);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant={hasAvatarPreview ? "outline" : "default"}
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={mutate.isPending}
                  >
                    {hasAvatarPreview ? t("profile.changeAvatar") : t("profile.chooseAvatar")}
                  </Button>
                  {hasAvatarPreview ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void onClearPersistedAvatar()}
                      disabled={mutate.isPending}
                    >
                      {t("profile.clearAvatar")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("profile.displayName")}</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={displayUsername(data)}
                />
              </div>
              <div className="space-y-2">
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
            </div>

            <div className="space-y-2">
              <Label>{t("profile.bioLabel")}</Label>
              <Textarea
                rows={6}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("profile.skillsLabel")}</Label>
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("profile.skillsHelp")}</p>
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button type="button" onClick={() => save()} disabled={mutate.isPending}>
                {mutate.isPending ? t("common.saving") : t("profile.saveProfile")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedShell>
  );
}
