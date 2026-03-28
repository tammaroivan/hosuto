import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "../components/sidebar";
import { ErrorFallback } from "../components/ErrorFallback";
import { DeployOutput } from "../components/DeployOutput";
import { useDockerEvents } from "../hooks/useDockerEvents";

const RootLayout = () => {
  const { deployOutput, clearDeployOutput } = useDockerEvents();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg font-sans text-text-primary mesh-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
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
      {deployOutput && <DeployOutput output={deployOutput} onClose={clearDeployOutput} />}
    </div>
  );
};

const RootErrorComponent = ({ error }: { error: Error }) => {
  const router = useRouter();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg font-sans text-text-primary mesh-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6">
        <ErrorFallback error={error} resetErrorBoundary={() => router.invalidate()} />
      </div>
    </div>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RootErrorComponent,
});
