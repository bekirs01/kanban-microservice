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
import { useTranslation } from "@/i18n/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import {
  messageForLoginFailure,
  messageForRegistrationFailure,
} from "@/lib/authErrors";
import {
  buildLoginSchema,
  buildSignupRequestSchema,
  type LoginFormData,
  type SignupRequestFormData,
} from "@/lib/schemas";
import { UserRole } from "@challenge/types/enums";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
      requestedRole: UserRole.USER,
    },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      toast.success(t("auth.loginToastSuccess"));
      onOpenChange(false);
      resetLogin();
    } catch (error: unknown) {
      toast.error(messageForLoginFailure(error, t));
    }
  };

  const onSignupSubmit = async (data: SignupRequestFormData) => {
    try {
      await submitRegistrationRequest({
        username: data.username,
        email: data.email,
        password: data.password,
        requestedRole: data.requestedRole,
      });
      toast.success(t("auth.registrationSubmitted"));
      onOpenChange(false);
      resetSignup();
      navigate({ to: "/login" });
    } catch (error: unknown) {
      toast.error(messageForRegistrationFailure(error, t));
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
