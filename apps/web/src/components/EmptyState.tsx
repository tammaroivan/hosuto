import { Activity, Box, Layers } from "lucide-react";
import { Text } from "./ui/text";

interface EmptyStateProps {
  onCreateStack: () => void;
}

export const EmptyState = ({ onCreateStack }: EmptyStateProps) => {
  return (
    <div className="flex flex-1 items-center justify-center p-12">
      <div className="grid w-full max-w-5xl grid-cols-1 items-center gap-16 md:grid-cols-2">
        <div className="relative hidden h-[400px] items-center justify-center md:flex">
          <div className="animate-float relative flex h-64 w-64 items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary/5">
            <div className="absolute -right-6 -top-6 flex h-24 w-24 items-center justify-center rounded-xl border-2 border-primary/40 bg-surface-elevated shadow-xl">
              <Box size={30} className="text-primary" />
            </div>
            <div className="absolute -bottom-8 -left-8 flex h-32 w-32 flex-col items-center justify-center rounded-xl border-2 border-primary/30 bg-surface p-4 shadow-xl">
              <div className="mb-2 h-2 w-full rounded-full bg-primary/20" />
              <div className="mb-4 h-2 w-2/3 rounded-full bg-primary/10" />
              <Activity size={20} className="text-primary/60" />
            </div>
            <div className="flex flex-col items-center space-y-3">
              <div className="flex space-x-2">
                <div className="h-4 w-4 rounded bg-primary/60" />
                <div className="h-4 w-4 rounded bg-primary/30" />
              </div>
              <div className="h-1 w-24 rounded-full bg-primary/40" />
              <Layers size={48} className="text-primary" />
            </div>
            <div className="-m-4 absolute inset-0 animate-pulse rounded-2xl border-2 border-dashed border-primary/10" />
          </div>
        </div>

        <div className="flex flex-col space-y-10">
          <div className="space-y-3">
            <Text as="h2" size="2xl" weight="bold" color="white" className="tracking-tight">
              Welcome to Hosuto
            </Text>
            <Text as="p" size="base" color="secondary" className="leading-relaxed">
              Hosuto is ready to help you manage your Docker stacks. Let's get you set up in a few
              seconds.
            </Text>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
                1
              </div>
              <div className="space-y-2">
                <Text as="h3" size="base" weight="semibold">
                  Mount your compose directory
                </Text>
                <Text as="p" size="sm" color="muted">
                  Point Hosuto to the folder where you store your Docker Compose files.
                </Text>
                <div className="mt-3 rounded-lg border border-border bg-surface p-3">
                  <pre className="select-all whitespace-pre font-mono text-[11px] leading-relaxed text-primary/80">
                    {`volumes:\n  - /path/to/stacks:/stacks`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
                2
              </div>
              <div className="space-y-1">
                <Text as="h3" size="base" weight="semibold">
                  Hosuto auto-discovers your stacks
                </Text>
                <Text as="p" size="sm" color="muted">
                  Any valid compose file found in the directory will automatically appear in your
                  dashboard.
                </Text>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
                3
              </div>
              <div className="space-y-1">
                <Text as="h3" size="base" weight="semibold">
                  Manage everything from here
                </Text>
                <Text as="p" size="sm" color="muted">
                  Start, stop, update, and monitor your containers with a single click.
                </Text>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-4">
            <button
              onClick={onCreateStack}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-bold text-bg shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-95"
            >
              Create First Stack
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
