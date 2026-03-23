import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "../components/sidebar";

const RootLayout = () => {
  return (
    <div className="flex h-screen bg-bg text-text-primary">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
});
