import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/useTranslation";
import {
  approveRegistrationRequest,
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  listPendingRegistrationRequests,
  patchAdminUserRole,
  rejectRegistrationRequest,
} from "@/services/admin.service";
import type { AdminCreateUserDto, UserRole } from "@challenge/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

const TABLE_ROLE_OPTIONS = ["USER", "ADMIN"] as UserRole[];

const CREATE_FORM_ROLE_OPTIONS = ["USER", "ADMIN"] as UserRole[];

const ROLE_TRANSLATION_KEYS: Record<UserRole, string> = {
  ADMIN: "admin.role.admin",
  USER: "admin.role.user",
};

export function AdminPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<AdminCreateUserDto>({
    username: "",
    email: "",
    password: "",
    role: "USER" as UserRole,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => listAdminUsers(),
  });

  const { data: pendingRows = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["adminRegistrationRequests"],
    queryFn: () => listPendingRegistrationRequests(),
  });

  const createMut = useMutation({
    mutationFn: (dto: AdminCreateUserDto) => createAdminUser(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success(t("admin.userCreated"));
      setForm({
        username: "",
        email: "",
        password: "",
        role: "USER" as UserRole,
      });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? t("common.error"));
    },
  });

  const patchMut = useMutation({
    mutationFn: ({
      id,
      role,
    }: {
      id: string;
      role: UserRole;
    }) => patchAdminUserRole(id, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success(t("admin.roleUpdated"));
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? t("common.error"));
    },
  });

  const approveMut = useMutation({
    mutationFn: (requestId: string) => approveRegistrationRequest(requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminRegistrationRequests"] });
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success(t("admin.requestApproved"));
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? t("common.error"));
    },
  });

  const rejectMut = useMutation({
    mutationFn: (requestId: string) => rejectRegistrationRequest(requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminRegistrationRequests"] });
      toast.success(t("admin.requestRejected"));
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? t("common.error"));
    },
  });

  const deleteMut = useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success(t("admin.userDeleted"));
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? t("common.error"));
    },
  });

  const pendingBusy = approveMut.isPending || rejectMut.isPending;

  const onSubmitCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error(t("common.error"));
      return;
    }
    createMut.mutate(form);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("admin.title")}
          </h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/kanban">{t("board.title")}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(280px,400px)_minmax(0,1fr)] xl:items-start xl:gap-12">
          <section className="space-y-5">
            <h2 className="text-xl font-semibold tracking-tight">
              {t("admin.createUser")}
            </h2>
            <form
              onSubmit={onSubmitCreate}
              className="space-y-4 rounded-xl border bg-card p-6 shadow-sm"
            >
              <label className="flex flex-col gap-2 text-sm font-medium">
                <span>{t("admin.username")}</span>
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.username}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  autoComplete="username"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                <span>{t("admin.email")}</span>
                <input
                  type="email"
                  className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  autoComplete="email"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                <span>{t("admin.password")}</span>
                <input
                  type="password"
                  className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  autoComplete="new-password"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                <span>{t("admin.roleLabel")}</span>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, role: v as UserRole }))
                  }
                >
                  <SelectTrigger className="h-10 w-full bg-background shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREATE_FORM_ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(ROLE_TRANSLATION_KEYS[role])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <Button
                type="submit"
                className="mt-2 h-10 w-full sm:w-auto"
                disabled={createMut.isPending}
              >
                {t("admin.save")}
              </Button>
            </form>
          </section>

          <section className="min-w-0 space-y-5">
            <h2 className="text-xl font-semibold tracking-tight">
              {t("admin.users")}
            </h2>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                {t("common.loadingShort")}
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed border-collapse text-sm">
                    <thead className="border-b bg-muted/40 text-left">
                      <tr>
                        <th className="w-[18%] px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("admin.username")}
                        </th>
                        <th className="w-[36%] px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("admin.email")}
                        </th>
                        <th className="w-[26%] px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("admin.roleLabel")}
                        </th>
                        <th className="w-[20%] px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("admin.actionsColumn")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((u) => {
                        const isSelf = u.id === currentUser?.id;
                        const rowBusyPatch =
                          patchMut.isPending &&
                          patchMut.variables?.id === u.id;
                        const rowBusyDelete =
                          deleteMut.isPending && deleteMut.variables === u.id;
                        return (
                          <tr key={u.id} className="hover:bg-muted/30">
                            <td className="px-2 py-2 align-middle">
                              <span className="block truncate font-medium" title={u.username}>
                                {u.username}
                              </span>
                            </td>
                            <td className="px-2 py-2 align-middle">
                              <span className="block truncate text-muted-foreground" title={u.email}>
                                {u.email}
                              </span>
                            </td>
                            <td className="px-2 py-2 align-middle">
                              <Select
                                value={
                                  TABLE_ROLE_OPTIONS.includes(u.role)
                                    ? u.role
                                    : ""
                                }
                                onValueChange={(v) => {
                                  const next = v as UserRole;
                                  if (next === u.role) return;
                                  patchMut.mutate({ id: u.id, role: next });
                                }}
                                disabled={rowBusyPatch || rowBusyDelete}
                              >
                                <SelectTrigger className="h-9 w-full bg-background text-xs shadow-sm">
                                  <SelectValue
                                    placeholder={t(ROLE_TRANSLATION_KEYS[u.role])}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {TABLE_ROLE_OPTIONS.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {t(ROLE_TRANSLATION_KEYS[role])}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-2 py-2 align-middle">
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 shrink-0 px-3 text-xs"
                                  disabled={
                                    rowBusyDelete ||
                                    rowBusyPatch ||
                                    isSelf
                                  }
                                  title={
                                    isSelf
                                      ? t("admin.cannotDeleteSelf")
                                      : undefined
                                  }
                                  onClick={() => deleteMut.mutate(u.id)}
                                >
                                  {t("common.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="space-y-5">
          <h2 className="text-xl font-semibold tracking-tight">
            {t("admin.pendingRegistrations")}
          </h2>
          {pendingLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loadingShort")}</p>
          ) : pendingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.noPendingSignups")}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b bg-muted/40 text-left">
                    <tr>
                      <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("admin.username")}
                      </th>
                      <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("admin.email")}
                      </th>
                      <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("admin.roleLabel")}
                      </th>
                      <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("admin.requestedAt")}
                      </th>
                      <th className="w-[1%] whitespace-nowrap px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("admin.actionsColumn")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pendingRows.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 align-middle font-medium">
                          {row.username}
                        </td>
                        <td className="px-4 py-3 align-middle text-muted-foreground">
                          {row.email}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {t(ROLE_TRANSLATION_KEYS[row.requestedRole as UserRole])}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-middle text-muted-foreground">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-nowrap items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              type="button"
                              className="h-9 shrink-0"
                              disabled={pendingBusy}
                              onClick={() => approveMut.mutate(row.id)}
                            >
                              {t("admin.approveRequest")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              className="h-9 shrink-0"
                              disabled={pendingBusy}
                              onClick={() => rejectMut.mutate(row.id)}
                            >
                              {t("admin.rejectRequest")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
