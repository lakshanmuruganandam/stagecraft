"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/primitives";

/**
 * Two-step button for destructive or irreversible actions. First press
 * arms it ("Click again to confirm"), second press runs it. Disarms after
 * a few seconds. No blocking browser dialogs.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Click again to confirm",
  variant = "outline",
  size = "md",
  type = "button",
  className,
  disabled,
}: {
  onConfirm?: () => void | Promise<unknown>;
  children: ReactNode;
  confirmLabel?: string;
  variant?: "primary" | "ghost" | "outline" | "danger" | "subtle";
  size?: "sm" | "md" | "lg";
  /** "submit" lets it sit inside a <form action={serverAction}>. */
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <Button
      type={armed ? type : "button"}
      variant={armed ? "danger" : variant}
      size={size}
      className={className}
      disabled={disabled || busy}
      aria-live="polite"
      onClick={async (e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
          return;
        }
        if (type === "submit") return; // the form handles it
        setBusy(true);
        try {
          await onConfirm?.();
        } finally {
          setBusy(false);
          setArmed(false);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
