import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n/useTranslation";
import {
  approveRegistrationRequest,
  createAdminUser,
  listAdminUsers,
  listPendingRegistrationRequests,
  patchAdminUserRole,
  rejectRegistrationRequest,
} from "@/services/admin.service";
import type { AdminCreateUserDto, UserRole } from "@challenge/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

const ROLE_OPTIONS = ["USER", "MANAGER", "ADMIN"] as UserRole[];

const ROLE_TRANSLATION_KEYS: Record<UserRole, string> = {
  ADMIN: "admin.role.admin",
  MANAGER: "admin.role.manager",
  USER: "admin.role.user",
};

export function AdminPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState<AdminCreateUserDto>({
    username: "",
    email: "",
    password: "",
    role: "USER" as UserRole,
  });
  const [roleEdits, setRoleEdits] = useState<Record<string, UserRole>>({});

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
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      setRoleEdits((prev) => {
        const next = { ...prev };
        delete next[vars.id];
        return next;
      });
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-semibold">{t("admin.title")}</h1>
          <Button asChild variant="outline" size="sm">
            <Link to="/kanban">{t("board.title")}</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <section className="space-y-4">
            <h2 className="text-lg font-medium">{t("admin.createUser")}</h2>
            <form
              onSubmit={onSubmitCreate}
              className="space-y-3 max-w-md border rounded-xl p-4 bg-muted/20"
            >
              <label className="flex flex-col gap-1 text-sm">
                <span>{t("admin.username")}</span>
                <input
                  className="rounded-md border px-3 py-2 bg-background"
                  value={form.username}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  autoComplete="username"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>{t("admin.email")}</span>
                <input
                  type="email"
                  className="rounded-md border px-3 py-2 bg-background"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  autoComplete="email"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>{t("admin.password")}</span>
                <input
                  type="password"
                  className="rounded-md border px-3 py-2 bg-background"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  autoComplete="new-password"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>{t("admin.roleLabel")}</span>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, role: v as UserRole }))
                  }
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(ROLE_TRANSLATION_KEYS[role])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <Button type="submit" disabled={createMut.isPending}>
                {t("admin.save")}
              </Button>
            </form>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium">{t("admin.users")}</h2>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                {t("common.loadingShort")}
              </p>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left">
                    <tr>
                      <th className="px-3 py-2">{t("admin.username")}</th>
                      <th className="px-3 py-2">{t("admin.email")}</th>
                      <th className="px-3 py-2">{t("admin.roleLabel")}</th>
                      <th className="px-3 py-2 w-[90px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => {
                      const editing = roleEdits[u.id] ?? u.role;
                      return (
                        <tr key={u.id} className="border-t">
                          <td className="px-3 py-2">{u.username}</td>
                          <td className="px-3 py-2">{u.email}</td>
                          <td className="px-3 py-2">
                            <Select
                              value={editing}
                              onValueChange={(v) =>
                                setRoleEdits((prev) => ({
                                  ...prev,
                                  [u.id]: v as UserRole,
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {t(ROLE_TRANSLATION_KEYS[role])}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              type="button"
                              disabled={
                                patchMut.isPending || editing === u.role
                              }
                              onClick={() =>
                                patchMut.mutate({ id: u.id, role: editing })
                              }
                            >
                              {t("admin.save")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-medium">{t("admin.pendingRegistrations")}</h2>
          {pendingLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loadingShort")}</p>
          ) : pendingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.noPendingSignups")}</p>
          ) : (
            <div className="border rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="px-3 py-2">{t("admin.username")}</th>
                    <th className="px-3 py-2">{t("admin.email")}</th>
                    <th className="px-3 py-2">{t("admin.roleLabel")}</th>
                    <th className="px-3 py-2">{t("admin.requestedAt")}</th>
                    <th className="px-3 py-2 w-[200px]" />
                  </tr>
                </thead>
                <tbody>
                  {pendingRows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2">{row.username}</td>
                      <td className="px-3 py-2">{row.email}</td>
                      <td className="px-3 py-2">
                        {t(ROLE_TRANSLATION_KEYS[row.requestedRole as UserRole])}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          type="button"
                          disabled={pendingBusy}
                          onClick={() => approveMut.mutate(row.id)}
                        >
                          {t("admin.approveRequest")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          disabled={pendingBusy}
                          onClick={() => rejectMut.mutate(row.id)}
                        >
                          {t("admin.rejectRequest")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
