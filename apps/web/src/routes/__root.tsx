import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold tracking-tight">Hosuto</h1>
          <div className="flex gap-4 text-sm">
            <Link to="/" className="hover:text-white [&.active]:text-white">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
