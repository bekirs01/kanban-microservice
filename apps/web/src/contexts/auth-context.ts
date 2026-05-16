import type {
  LoginAuthDto,
  ResponseUserDto,
  SubmitRegistrationRequestDto,
} from "@challenge/types";
import { createContext } from "react";

export interface AuthContextType {
  user: ResponseUserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginAuthDto) => Promise<void>;
  submitRegistrationRequest: (dto: SubmitRegistrationRequestDto) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType,
);
