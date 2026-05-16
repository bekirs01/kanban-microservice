import type {
  LoginAuthDto,
  SubmitRegistrationRequestDto,
  ResponseAuthDto,
} from "@challenge/types";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { AdminPage } from "./pages/AdminPage";
import { KanbanPage } from "./pages/KanbanPage";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";

type User = ResponseAuthDto["user"];

interface AuthContext {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (credentials: LoginAuthDto) => Promise<void>;
  submitRegistrationRequest: (
    dto: SubmitRegistrationRequestDto,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

interface RouterContext {
  auth: AuthContext;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <div>
      <Outlet />
    </div>
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/kanban" });
    }
  },
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: Register,
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/kanban" });
    }
  },
});

const kanbanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/kanban",
  component: KanbanPage,
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
    if (context.auth.user?.role !== "ADMIN") {
      throw redirect({ to: "/kanban" });
    }
  },
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => null,
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/kanban" });
    } else {
      throw redirect({ to: "/login" });
    }
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  kanbanRoute,
  adminRoute,
]);

export const router = createRouter({
  routeTree,
  context: {
    auth: {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      login: async () => {},
      submitRegistrationRequest: async () => {},
      logout: async () => {},
    },
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
