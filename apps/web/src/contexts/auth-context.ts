import type { LoginAuthDto, RegisterAuthDto, ResponseUserDto } from "@challenge/types";
import { createContext } from "react";

export interface AuthContextType {
  user: ResponseUserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginAuthDto) => Promise<void>;
  register: (credentials: RegisterAuthDto) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType
);
