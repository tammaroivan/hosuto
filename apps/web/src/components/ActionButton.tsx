export const ActionButton = ({
  label,
  className = "",
  disabled,
  onClick,
}: {
  label: string;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border border-border px-2.5 py-1 text-xs font-bold text-text-muted transition-colors hover:border-border-hover hover:bg-border hover:text-white disabled:opacity-50 ${className}`}
    >
      {label}
    </button>
  );
};
