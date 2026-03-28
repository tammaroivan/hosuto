import type React from "react";
import { cn } from "../../lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Modal = ({ open, onClose, children, className }: ModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-6 shadow-2xl",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
};

export const ModalTitle = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <h3 className={cn("mb-2 text-sm font-bold text-white", className)}>{children}</h3>
  );
};

export const ModalDescription = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <p className={cn("text-sm leading-relaxed text-text-muted", className)}>{children}</p>
  );
};

export const ModalActions = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return <div className={cn("mt-6 flex justify-end gap-2", className)}>{children}</div>;
};
