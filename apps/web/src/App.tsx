import { Toaster } from "@/components/ui/sonner";
import { RouterProvider } from "@tanstack/react-router";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { useAuth } from "./hooks/useAuth";
import { router } from "./router";

export function App() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <RouterProvider router={router} context={{ auth }} />
      <Toaster />
    </>
  );
}
