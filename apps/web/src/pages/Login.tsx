import { AuthDialog } from "@/components/AuthDialog";
import { useTranslation } from "@/i18n/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function Login() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/kanban" });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 to-slate-700">
      <div className="text-center mb-8 absolute top-12">
        <h1 className="text-4xl font-bold text-white">
          {t("loginPage.heroTitle")}
        </h1>
        <p className="text-slate-300 mt-2">{t("loginPage.tagline")}</p>
      </div>
      <AuthDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
