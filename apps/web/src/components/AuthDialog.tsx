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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import {
  buildLoginSchema,
  buildSignupRequestSchema,
  type LoginFormData,
  type SignupRequestFormData,
} from "@/lib/schemas";
import type { SubmitRegistrationRequestDto } from "@challenge/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

const SIGNUP_ROLE_OPTIONS = ["USER", "MANAGER"] as const;

const ROLE_TRANSLATION_KEYS: Record<(typeof SIGNUP_ROLE_OPTIONS)[number], string> = {
  MANAGER: "admin.role.manager",
  USER: "admin.role.user",
};

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const { login, submitRegistrationRequest } = useAuth();

  const loginResolver = useMemo(
    () => zodResolver(buildLoginSchema(t)),
    [t],
  );

  const signupResolver = useMemo(
    () => zodResolver(buildSignupRequestSchema(t)),
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
    control: signupControl,
    register: registerSignupForm,
    handleSubmit: handleSignupSubmitForm,
    formState: {
      errors: signupErrors,
      isSubmitting: isSignupSubmitting,
    },
    reset: resetSignup,
  } = useForm<SignupRequestFormData>({
    resolver: signupResolver,
    defaultValues: {
      username: "",
      email: "",
      password: "",
      requestedRole: "USER",
    },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      toast.success(t("auth.loginToastSuccess"));
      onOpenChange(false);
      resetLogin();
    } catch (error: unknown) {
      const msg =
        typeof (error as { response?: { data?: { message?: string } } })
          ?.response?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data
              .message
          : t("auth.loginErrorFallback");
      toast.error(msg);
    }
  };

  const onSignupSubmit = async (data: SignupRequestFormData) => {
    try {
      await submitRegistrationRequest({
        username: data.username,
        email: data.email,
        password: data.password,
        requestedRole:
          data.requestedRole as SubmitRegistrationRequestDto["requestedRole"],
      });
      toast.success(t("auth.registrationSubmitted"));
      onOpenChange(false);
      resetSignup();
      navigate({ to: "/login" });
    } catch (error: unknown) {
      const msg =
        typeof (error as { response?: { data?: { message?: string } } })
          ?.response?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data
              .message
          : t("auth.registerErrorFallback");
      toast.error(msg);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetLogin();
    resetSignup();
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
            onSubmit={handleSignupSubmitForm(onSignupSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="username">{t("auth.username")}</Label>
              <Input
                id="username"
                placeholder={t("auth.usernamePlaceholder")}
                {...registerSignupForm("username")}
              />
              {signupErrors.username && (
                <p className="text-sm text-destructive">
                  {signupErrors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email">{t("auth.email")}</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                {...registerSignupForm("email")}
              />
              {signupErrors.email && (
                <p className="text-sm text-destructive">
                  {signupErrors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password">{t("auth.password")}</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder={t("auth.passwordPlaceholderMasked")}
                {...registerSignupForm("password")}
              />
              {signupErrors.password && (
                <p className="text-sm text-destructive">
                  {signupErrors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("auth.requestedRoleLabel")}</Label>
              <Controller
                name="requestedRole"
                control={signupControl}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIGNUP_ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                          {t(ROLE_TRANSLATION_KEYS[role])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {signupErrors.requestedRole && (
                <p className="text-sm text-destructive">
                  {signupErrors.requestedRole.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isSignupSubmitting}
              >
                {isSignupSubmitting
                  ? t("common.creatingAccount")
                  : t("auth.submitSignupRequest")}
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
