import { useTranslation } from "@/i18n/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import type { SubmitRegistrationRequestDto } from "@challenge/types";
import { Link, useNavigate } from "@tanstack/react-router";
import { AxiosError } from "axios";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

type SignupSelectableRole = SubmitRegistrationRequestDto["requestedRole"];

export function Register() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requestedRole, setRequestedRole] =
    useState<SignupSelectableRole>("USER" as SubmitRegistrationRequestDto["requestedRole"]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { submitRegistrationRequest } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("auth.mismatchPasswords"));
      return;
    }

    if (password.length < 6) {
      setError(t("auth.passwordTooShortRegister"));
      return;
    }

    if (username.trim().length < 3) {
      setError(t("validation.usernameMin"));
      return;
    }

    setIsLoading(true);

    try {
      await submitRegistrationRequest({
        username: username.trim(),
        email: email.trim(),
        password,
        requestedRole,
      });
      toast.success(t("auth.registrationSubmitted"));
      navigate({ to: "/login" });
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(
        error.response?.data?.message ?? t("auth.registerFailureFallback"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {t("auth.registerPageTitle")}
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                {t("auth.username")}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={t("auth.usernamePlaceholder")}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                {t("auth.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={t("auth.emailPlaceholder")}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                {t("auth.password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={t("auth.passwordPlaceholderMasked")}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                {t("auth.confirmPasswordLabel")}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={t("auth.passwordPlaceholderMasked")}
              />
            </div>

            <div>
              <label
                htmlFor="requested-role"
                className="block text-sm font-medium text-gray-700"
              >
                {t("auth.requestedRoleLabel")}
              </label>
              <select
                id="requested-role"
                value={requestedRole}
                onChange={(e) =>
                  setRequestedRole(e.target.value as SignupSelectableRole)
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="USER">{t("admin.role.user")}</option>
                <option value="MANAGER">{t("admin.role.manager")}</option>
              </select>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t("auth.registerSubmitBusy") : t("auth.submitSignupRequest")}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">
              {t("auth.linkHasAccountLead")}{" "}
            </span>
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {t("auth.linkToLogin")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
