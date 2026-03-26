import { AlertTriangle } from "lucide-react";

export const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary?: () => void;
}) => {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg border border-accent-rose/30 bg-accent-rose/5 p-6">
        <div className="mb-4 flex items-center gap-2 text-accent-rose">
          <AlertTriangle size={18} />
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Oops, something is not working
          </h2>
        </div>
        <p className="mb-4 font-mono text-sm text-text-muted">{error.message}</p>
        {resetErrorBoundary && (
          <button
            onClick={resetErrorBoundary}
            className="rounded-md border border-border px-4 py-2 text-sm font-bold text-text-muted transition-colors hover:border-border-hover hover:bg-border hover:text-white"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
};
