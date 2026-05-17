import type {
  LoginAuthDto,
  ResponseUserDto,
  SubmitRegistrationRequestDto,
  UserRole,
} from "@challenge/types";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { queryClient } from "../providers/QueryProvider";
import { authService } from "../services/auth.service";
import { fetchMyProfile } from "../services/profile.service";
import { submitRegistrationRequestApi } from "../services/registration-request.service";
import { AuthContext } from "./auth-context";

function isApiUserRole(raw: unknown): raw is UserRole {
  return raw === "USER" || raw === "ADMIN";
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<ResponseUserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as ResponseUserDto;
          parsed.role = isApiUserRole(parsed.role)
            ? parsed.role
            : ("USER" as UserRole);
          setUser(parsed);
        } catch {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    void initAuth();
  }, []);

  const login = async (credentials: LoginAuthDto) => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const submitRegistrationRequest = async (dto: SubmitRegistrationRequestDto) => {
    await submitRegistrationRequestApi(dto);
  };

  const logout = async () => {
    await authService.logout();
    queryClient.clear();
    setUser(null);
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const next = await fetchMyProfile();
      setUser(next);
      localStorage.setItem("user", JSON.stringify(next));
    } catch {
      /* keep existing cached user */
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        submitRegistrationRequest,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
