"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "@/app/actions/auth";
import { Button, Field, inputClass } from "@/components/ui/primitives";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, undefined);
  return (
    <form action={action} className="mt-5 grid gap-4 sm:grid-cols-3">
      {hasPassword && (
        <Field label="Current password">
          <input name="current" type="password" required autoComplete="current-password" className={inputClass} />
        </Field>
      )}
      <Field label="New password">
        <input name="next" type="password" required minLength={10} autoComplete="new-password" className={inputClass} />
      </Field>
      <Field label="Confirm new password">
        <input name="confirm" type="password" required minLength={10} autoComplete="new-password" className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <Button disabled={pending}>{pending ? "Saving…" : "Update password"}</Button>
        {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        {state?.ok && <p role="status" className="text-sm text-ok">{state.ok}</p>}
      </div>
    </form>
  );
}
