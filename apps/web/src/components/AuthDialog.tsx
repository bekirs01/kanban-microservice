import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/useTranslation";
import {
  buildLoginSchema,
  buildRegisterSchema,
  type LoginFormData,
  type RegisterFormData,
} from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const { login, register: registerUser } = useAuth();

  const loginResolver = useMemo(
    () => zodResolver(buildLoginSchema(t)),
    [t],
  );

  const registerResolver = useMemo(
    () => zodResolver(buildRegisterSchema(t)),
    [t],
  );

  const {
    register: registerLoginForm,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
    reset: resetLogin,
  } = useForm<LoginFormData>({
    resolver: loginResolver,
  });

  const {
    register: registerRegisterForm,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors, isSubmitting: isRegisterSubmitting },
    reset: resetRegister,
  } = useForm<RegisterFormData>({
    resolver: registerResolver,
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      toast.success(t("auth.loginToastSuccess"));
      onOpenChange(false);
      resetLogin();
    } catch (error: any) {
      toast.error(
        typeof error?.response?.data?.message === "string"
          ? error.response.data.message
          : t("auth.loginErrorFallback"),
      );
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data);
      toast.success(t("auth.registerToastSuccess"));
      onOpenChange(false);
      resetRegister();
    } catch (error: any) {
      toast.error(
        typeof error?.response?.data?.message === "string"
          ? error.response.data.message
          : t("auth.registerErrorFallback"),
      );
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetLogin();
    resetRegister();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px]"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isLogin ? t("auth.login") : t("auth.register")}
          </DialogTitle>
          <DialogDescription>
            {isLogin ? t("auth.subtitle") : t("auth.createSubtitle")}
          </DialogDescription>
        </DialogHeader>

        {isLogin ? (
          <form
            onSubmit={handleLoginSubmit(onLoginSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                {...registerLoginForm("email")}
              />
              {loginErrors.email && (
                <p className="text-sm text-destructive">
                  {loginErrors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("auth.passwordPlaceholderMasked")}
                {...registerLoginForm("password")}
              />
              {loginErrors.password && (
                <p className="text-sm text-destructive">
                  {loginErrors.password.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoginSubmitting}
              >
                {isLoginSubmitting
                  ? t("common.loggingIn")
                  : t("auth.loginButton")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={toggleMode}
              >
                {t("auth.toggleToRegister")}
              </Button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={handleRegisterSubmit(onRegisterSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="username">{t("auth.username")}</Label>
              <Input
                id="username"
                placeholder={t("auth.usernamePlaceholder")}
                {...registerRegisterForm("username")}
              />
              {registerErrors.username && (
                <p className="text-sm text-destructive">
                  {registerErrors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email">{t("auth.email")}</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                {...registerRegisterForm("email")}
              />
              {registerErrors.email && (
                <p className="text-sm text-destructive">
                  {registerErrors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password">{t("auth.password")}</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder={t("auth.passwordPlaceholderMasked")}
                {...registerRegisterForm("password")}
              />
              {registerErrors.password && (
                <p className="text-sm text-destructive">
                  {registerErrors.password.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isRegisterSubmitting}
              >
                {isRegisterSubmitting
                  ? t("common.creatingAccount")
                  : t("auth.registerButton")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={toggleMode}
              >
                {t("auth.toggleToLogin")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
