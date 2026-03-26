import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "../components/sidebar";
import { ErrorFallback } from "../components/ErrorFallback";

const RootLayout = () => {
  return (
    <div className="flex h-screen bg-bg text-text-primary">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6">
        <Outlet />
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
            fontSize: "14px",
          },
        }}
      />
    </div>
  );
};

const RootErrorComponent = ({ error }: { error: Error }) => {
  const router = useRouter();

  return (
    <div className="flex h-screen bg-bg text-text-primary">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6">
        <ErrorFallback error={error} resetErrorBoundary={() => router.invalidate()} />
      </main>
    </div>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RootErrorComponent,
});
