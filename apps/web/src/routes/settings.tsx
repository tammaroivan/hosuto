import { createFileRoute } from "@tanstack/react-router";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";

const INTERVAL_OPTIONS = [
  { label: "12 hours", value: 43200 },
  { label: "1 day", value: 86400 },
  { label: "3 days", value: 259200 },
  { label: "1 week", value: 604800 },
];

const Settings = () => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();

  if (settings.isLoading) {
    return <p className="text-text-muted">Loading settings...</p>;
  }

  if (settings.isError) {
    return <p className="text-accent-rose">Failed to load settings.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
          Update Checks
        </h2>
        <div className="space-y-3">
          <label className="block text-sm text-text-muted">Check for image updates every</label>
          <div className="flex flex-wrap gap-2">
            {INTERVAL_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => updateSettings.mutate({ updateCheckInterval: option.value })}
                disabled={updateSettings.isPending}
                className={`rounded-md border px-3 py-1.5 text-sm font-bold transition-colors ${
                  settings.data?.updateCheckInterval === option.value
                    ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                    : "border-border text-text-muted hover:border-border-hover hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Environment</h2>
        <div className="space-y-3 font-mono text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Stacks Directory</span>
            <span className="text-text-primary">{settings.data?.stacksDir}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Docker Socket</span>
            <span className="text-text-primary">{settings.data?.dockerSocket}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export const Route = createFileRoute("/settings")({
  component: Settings,
});
